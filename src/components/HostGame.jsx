import { useEffect, useState } from 'react'
import HostShell from './HostShell.jsx'
import { rankPlayers } from '../lib/game.js'
import { supabase } from '../lib/supabase.js'

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

function HostGame({ game }) {
  const [now, setNow] = useState(() => Date.now())
  const [players, setPlayers] = useState([])
  const [marks, setMarks] = useState([])
  const [loadError, setLoadError] = useState(null)

  // Tick 4 times a second so the clock never looks stuck.
  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(intervalId)
  }, [])

  // Load this game's players and marks once.
  useEffect(() => {
    let ignore = false

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
        .select('player_id, cell_index, players!inner(game_id)')
        .eq('players.game_id', game.id)
      if (ignore) return
      if (marksError) return setLoadError(marksError.message)

      setPlayers(playerRows)
      setMarks(markRows)
    }

    load()
    return () => {
      ignore = true
    }
  }, [game.id])

  const msLeft = new Date(game.ends_at).getTime() - now
  const startedAt = new Date(game.started_at).getTime()
  const top10 = rankPlayers(players, marks).slice(0, 10)
  const finishedCount = players.filter((p) => p.finished_at).length

  return (
    <HostShell>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-lavender">Code {game.code}</p>
          <p className="mt-1 text-xl text-lavender">
            {finishedCount} / {players.length} finished
          </p>
        </div>
        <p className="text-7xl font-extrabold tabular-nums">{formatClock(msLeft)}</p>
      </div>

      <section className="mt-10 max-w-3xl">
        <p className="text-lg font-bold text-lavender">Live · final after review</p>

        {loadError ? (
          <p className="mt-4 text-xl text-coral">{loadError}</p>
        ) : (
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
        )}
      </section>
    </HostShell>
  )
}

export default HostGame