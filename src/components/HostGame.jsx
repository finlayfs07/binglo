import { useEffect, useRef, useState } from 'react'
import HostShell from './HostShell.jsx'
import { rankPlayers } from '../lib/game.js'
import { supabase } from '../lib/supabase.js'

// Wait this long after ends_at before closing, so photos mid-upload still count
// (the server accepts marks up to 5 s after ends_at).
const CLOSE_DELAY_MS = 6000

// 65 -> "1:05"
function toMinSec(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

// Countdown: round up, never negative.
function formatClock(ms) {
  return toMinSec(Math.max(0, Math.ceil(ms / 1000)))
}

// Finish time: round down (6:41.9 shows as 6:41).
function formatElapsed(ms) {
  return toMinSec(Math.max(0, Math.floor(ms / 1000)))
}

// Rank badge colours: 1 pink, 2 periwinkle, 3 mint, the rest plain.
const badgeClass = {
  1: 'bg-pink text-navy',
  2: 'bg-periwinkle text-navy',
  3: 'bg-mint text-navy',
}

// Replace the item if it's already in the list, otherwise add it.
function replaceOrAdd(list, item, isSame) {
  return list.some(isSame)
    ? list.map((x) => (isSame(x) ? item : x))
    : [...list, item]
}

// Build the feed from timestamps: squares marked, bingos, late joins.
// Newest first, max 8.
function buildFeed(players, marks, startedAt) {
  const nameById = new Map(players.map((p) => [p.id, p.name]))
  const events = []

  // Group marks by player so each one can say "3 squares" etc.
  const marksByPlayer = new Map()
  for (const mark of marks) {
    if (!nameById.has(mark.player_id)) continue
    if (!marksByPlayer.has(mark.player_id)) marksByPlayer.set(mark.player_id, [])
    marksByPlayer.get(mark.player_id).push(mark)
  }

  for (const [playerId, list] of marksByPlayer) {
    list.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
    list.forEach((mark, i) => {
      const count = i + 1
      events.push({
        key: `mark-${playerId}-${mark.cell_index}`,
        at: Date.parse(mark.created_at),
        text: `${nameById.get(playerId)} · ${count} ${count === 1 ? 'square' : 'squares'}`,
        bingo: false,
      })
    })
  }

  for (const player of players) {
    if (player.finished_at) {
      const finishedAt = Date.parse(player.finished_at)
      events.push({
        key: `bingo-${player.id}`,
        at: finishedAt,
        text: `${player.name} got bingo in ${formatElapsed(finishedAt - startedAt)}`,
        bingo: true,
      })
    }
    if (Date.parse(player.joined_at) > startedAt) {
      events.push({
        key: `join-${player.id}`,
        at: Date.parse(player.joined_at),
        text: `${player.name} joined late`,
        bingo: false,
      })
    }
  }

  // Newest first. A bingo and its last square share a timestamp: bingo on top.
  events.sort((a, b) => b.at - a.at || b.bingo - a.bingo)
  return events.slice(0, 8)
}

function HostGame({ game, onClosed }) {
  const [now, setNow] = useState(() => Date.now())
  const [endsAt, setEndsAt] = useState(() => new Date(game.ends_at).getTime())
  const [players, setPlayers] = useState([])
  const [marks, setMarks] = useState([])
  const [loadError, setLoadError] = useState(null)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [ending, setEnding] = useState(false)
  const [endError, setEndError] = useState(null)
  const closingRef = useRef(false)

  // Tick 4 times a second so the clock never looks stuck.
  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(intervalId)
  }, [])

  // Load this game's players and marks, then keep them up to date live.
  useEffect(() => {
    let ignore = false
    let channel = null

    async function load() {
      const { data: playerRows, error: playersError } = await supabase
        .from('players')
        .select('id, name, board, finished_at, joined_at')
        .eq('game_id', game.id)
      if (ignore) return
      if (playersError) return setLoadError(playersError.message)

      // marks has no game_id, so filter through the players table.
      const { data: markRows, error: marksError } = await supabase
        .from('marks')
        .select('player_id, cell_index, created_at, players!inner(game_id)')
        .eq('players.game_id', game.id)
      if (ignore) return
      if (marksError) return setLoadError(marksError.message)

      setPlayers(playerRows)
      setMarks(markRows)

      channel = supabase
        .channel(`host-game-${game.id}`)
        // New players (late joiners) and finished_at changes (bingo).
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'players',
            filter: `game_id=eq.${game.id}`,
          },
          (payload) => {
            if (payload.eventType === 'DELETE') return
            const row = payload.new
            setPlayers((current) => replaceOrAdd(current, row, (p) => p.id === row.id))
          },
        )
        // New marks and retakes. marks has no game_id to filter on, but RLS
        // only sends this host's game, and rankPlayers ignores unknown players.
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'marks' },
          (payload) => {
            if (payload.eventType === 'DELETE') return
            const row = payload.new
            setMarks((current) =>
              replaceOrAdd(
                current,
                row,
                (m) => m.player_id === row.player_id && m.cell_index === row.cell_index,
              ),
            )
          },
        )
        .subscribe()
    }

    load()
    return () => {
      ignore = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [game.id])

  // Close the game once, 6 s after time is up (timer ran out or host ended it).
  useEffect(() => {
    if (now < endsAt + CLOSE_DELAY_MS || closingRef.current) return
    closingRef.current = true

    supabase.rpc('close_game', { p_game_id: game.id }).then(({ data, error }) => {
      if (error) {
        // e.g. this laptop's clock is a little ahead of the server: try again in 2 s.
        console.error('close_game failed:', error.message)
        setTimeout(() => {
          closingRef.current = false
        }, 2000)
        return
      }
      onClosed(data) // 'review' or 'finished'
    })
  }, [now, endsAt, game.id, onClosed])

  async function handleEndNow() {
    setEnding(true)
    setEndError(null)
    const { data, error } = await supabase.rpc('end_game_now', { p_game_id: game.id })
    setEnding(false)
    if (error) return setEndError(error.message)
    setEndsAt(new Date(data).getTime()) // clock drops to 0, close runs 6 s later
    setConfirmOpen(false)
  }

  const msLeft = endsAt - now
  const timeUp = msLeft <= 0
  const startedAt = new Date(game.started_at).getTime()
  const top10 = rankPlayers(players, marks).slice(0, 10)
  const finishedCount = players.filter((p) => p.finished_at).length
  const feed = buildFeed(players, marks, startedAt)

  return (
    <HostShell>
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-2xl font-bold text-lavender">Code {game.code}</p>
          <p className="mt-1 text-xl text-lavender">
            {finishedCount} / {players.length} finished
          </p>
        </div>

        <div className="flex flex-col items-end gap-3">
          {timeUp ? (
            <div className="text-right">
              <p className="text-5xl font-extrabold">Time's up</p>
              <p className="mt-1 text-xl text-lavender">Collecting last photos…</p>
            </div>
          ) : (
            <>
              <p className="text-7xl font-extrabold tabular-nums">{formatClock(msLeft)}</p>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="h-12 rounded-full border-2 border-coral px-6 font-bold text-coral"
              >
                End game now
              </button>
            </>
          )}
        </div>
      </div>

      {loadError ? (
        <p className="mt-10 text-xl text-coral">{loadError}</p>
      ) : (
        <div className="mt-10 grid gap-12 lg:grid-cols-[2fr_1fr]">
          <section>
            <p className="text-lg font-bold text-lavender">Live · final after review</p>
            <ol className="mt-4">
              {top10.map((row, i) => (
                <li
                  key={row.id}
                  className="flex items-center gap-4 border-b border-navy-light py-3 text-2xl"
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-extrabold ${
                      badgeClass[i + 1] ?? 'text-lavender'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate font-bold">{row.name}</span>
                  {row.finishedAt ? (
                    <span className="font-bold tabular-nums text-pink">
                      Bingo · {formatElapsed(Date.parse(row.finishedAt) - startedAt)}
                    </span>
                  ) : (
                    <span className="text-lavender">
                      {row.total} {row.total === 1 ? 'square' : 'squares'}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </section>

          <section>
            <p className="text-lg font-bold text-lavender">Feed</p>
            {feed.length === 0 ? (
              <p className="mt-4 text-xl text-lavender">Waiting for the first square…</p>
            ) : (
              <ul className="mt-4">
                {feed.map((event) => (
                  <li
                    key={event.key}
                    className={`border-b border-navy-light py-3 text-xl ${
                      event.bingo ? 'font-bold text-pink' : 'text-soft-white'
                    }`}
                  >
                    {event.text}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/80 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="end-game-title"
            className="w-full max-w-md rounded-2xl bg-navy-light p-8 text-center"
          >
            <h2 id="end-game-title" className="text-2xl font-bold">
              End the game for everyone?
            </h2>
            <p className="mt-3 text-lavender">No more squares can be marked.</p>
            {endError && (
              <p role="alert" className="mt-3 text-coral">
                {endError}
              </p>
            )}
            <div className="mt-8 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={ending}
                className="h-12 rounded-full border-2 border-lavender px-6 font-bold text-soft-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEndNow}
                disabled={ending}
                className="h-12 rounded-full bg-coral px-6 font-bold text-navy disabled:opacity-50"
              >
                {ending ? 'Ending…' : 'End game'}
              </button>
            </div>
          </div>
        </div>
      )}
    </HostShell>
  )
}

export default HostGame