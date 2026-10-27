import { useEffect, useRef, useState } from 'react'
import HostShell from './HostShell.jsx'
import { supabase } from '../lib/supabase.js'

const mainButtonClass =
  'h-14 w-full max-w-md rounded-full bg-periwinkle text-lg font-bold text-navy shadow-[0_4px_0_#6569D4] enabled:active:translate-y-1 enabled:active:shadow-none disabled:opacity-50'

// Full class names, so Tailwind can find them.
const photoColsBySize = { 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6' }

// 401 -> "6:41"
function formatElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

// Status of each finisher. The "window" = the first N who aren't disqualified.
function withStatus(finishers, winnersCount) {
  let place = 0
  return finishers.map((player) => {
    if (player.disqualified) return { ...player, place: null, status: 'disqualified' }
    place += 1
    if (player.approved) return { ...player, place, status: 'approved' }
    if (place <= winnersCount) return { ...player, place, status: 'needs-review' }
    return { ...player, place, status: 'not-needed' }
  })
}

const statusLabel = {
  'needs-review': { text: 'Needs review', className: 'border-2 border-periwinkle text-periwinkle' },
  approved: { text: 'Approved', className: 'bg-mint text-navy' },
  disqualified: { text: 'Disqualified', className: 'bg-coral text-navy' },
  'not-needed': { text: 'Not needed', className: 'text-lavender' },
}

function HostReview({ game }) {
  const [confirmedPrivate, setConfirmedPrivate] = useState(false)
  const [finishers, setFinishers] = useState(null) // null = loading
  const [loadError, setLoadError] = useState(null)

  const [selectedId, setSelectedId] = useState(null)
  const [photos, setPhotos] = useState(null) // [{ cell, square, url }]
  const [photoError, setPhotoError] = useState(null)
  const latestRequest = useRef(null) // ignore slow answers for an old selection

  // Load everyone who got bingo, fastest first.
  useEffect(() => {
    let ignore = false
    supabase
      .from('players')
      .select('id, name, board, finished_at, winning_line, approved, disqualified')
      .eq('game_id', game.id)
      .not('finished_at', 'is', null)
      .order('finished_at')
      .then(({ data, error }) => {
        if (ignore) return
        if (error) setLoadError(error.message)
        else setFinishers(data)
      })
    return () => {
      ignore = true
    }
  }, [game.id])

  async function selectFinisher(player) {
    setSelectedId(player.id)
    setPhotos(null)
    setPhotoError(null)
    latestRequest.current = player.id

    const line = player.winning_line ?? []
    const { data: markRows, error } = await supabase
      .from('marks')
      .select('cell_index, photo_path')
      .eq('player_id', player.id)
      .in('cell_index', line)
    if (latestRequest.current !== player.id) return
    if (error) return setPhotoError(error.message)

    // Private bucket: ask for links that work for 10 minutes.
    const paths = markRows.map((m) => m.photo_path)
    let urlByPath = new Map()
    if (paths.length > 0) {
      const { data: signed, error: signError } = await supabase.storage
        .from('proofs')
        .createSignedUrls(paths, 600)
      if (latestRequest.current !== player.id) return
      if (signError) return setPhotoError(signError.message)
      urlByPath = new Map(signed.map((s) => [s.path, s.signedUrl]))
    }

    const pathByCell = new Map(markRows.map((m) => [m.cell_index, m.photo_path]))
    setPhotos(
      line.map((cell) => ({
        cell,
        square: player.board[cell],
        url: urlByPath.get(pathByCell.get(cell)) ?? null,
      })),
    )
  }

  // 1. Gate: nothing with photos appears until the host confirms.
  if (!confirmedPrivate) {
    return (
      <HostShell>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <h1 className="text-4xl font-extrabold">Stop projecting before you continue</h1>
          <p className="mt-4 max-w-xl text-xl text-lavender">
            The next screen shows players’ photos. They must never be on the projector or a
            shared screen.
          </p>
          <button
            type="button"
            onClick={() => setConfirmedPrivate(true)}
            className={`mt-10 ${mainButtonClass}`}
          >
            I’ve stopped projecting
          </button>
        </div>
      </HostShell>
    )
  }

  if (loadError || finishers === null) {
    return (
      <HostShell>
        <p className={`text-2xl font-bold ${loadError ? 'text-coral' : 'text-lavender'}`}>
          {loadError ?? 'Loading…'}
        </p>
      </HostShell>
    )
  }

  const startedAt = new Date(game.started_at).getTime()
  const rows = withStatus(finishers, game.winners_count)
  const selected = rows.find((r) => r.id === selectedId) ?? null

  return (
    <HostShell>
      <div>
        <h1 className="text-4xl font-extrabold">Review · top {game.winners_count}</h1>
        <p className="mt-2 text-lg text-lavender">
          Check each photo shows the prompt, with a different person in each. Country squares
          are on trust.
        </p>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_2fr]">
        {/* Finishers, fastest first */}
        <ol>
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => selectFinisher(row)}
                className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left text-xl ${
                  row.id === selectedId ? 'bg-navy-light' : ''
                }`}
              >
                <span className="w-8 font-extrabold text-lavender">{row.place ?? '–'}</span>
                <span className="flex-1 truncate font-bold">{row.name}</span>
                <span className="tabular-nums text-lavender">
                  {formatElapsed(Date.parse(row.finished_at) - startedAt)}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-bold ${statusLabel[row.status].className}`}
                >
                  {statusLabel[row.status].text}
                </span>
              </button>
            </li>
          ))}
        </ol>

        {/* Winning-line photos of the selected finisher */}
        <section>
          {!selected ? (
            <p className="text-xl text-lavender">Tap a player to see their bingo line.</p>
          ) : photoError ? (
            <p className="text-xl text-coral">{photoError}</p>
          ) : photos === null ? (
            <p className="text-xl text-lavender">Loading photos…</p>
          ) : (
            <>
              <h2 className="text-2xl font-bold">{selected.name}’s line</h2>
              <div className={`mt-4 grid gap-3 ${photoColsBySize[game.grid_size]}`}>
                {photos.map(({ cell, square, url }) => (
                  <figure key={cell} className="flex flex-col">
                    {square.type === 'free' ? (
                      <div className="flex aspect-square items-center justify-center rounded-xl bg-pink font-extrabold text-navy">
                        FREE
                      </div>
                    ) : url ? (
                      <img
                        src={url}
                        alt={`Proof for: ${square.text}`}
                        className="aspect-square w-full rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square items-center justify-center rounded-xl bg-navy-light text-coral">
                        No photo
                      </div>
                    )}
                    <figcaption className="mt-2 text-sm font-semibold leading-tight">
                      {square.type === 'free' ? 'Free square' : square.text}
                      {square.group === 'country' && (
                        <span className="mt-1 block text-lavender">On trust</span>
                      )}
                    </figcaption>
                  </figure>
                ))}
              </div>
              <p className="mt-6 text-lavender">Approve / Disqualify comes next.</p>
            </>
          )}
        </section>
      </div>
    </HostShell>
  )
}

export default HostReview