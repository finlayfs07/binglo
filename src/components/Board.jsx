import { useEffect, useState } from 'react'
import { findCompletedLine } from '../lib/game.js'
import { uploadProof } from '../lib/proofs.js'
import { supabase } from '../lib/supabase.js'
import BottomSheet from './BottomSheet.jsx'
import Camera from './Camera.jsx'

// Full class names, so Tailwind can find them in the source.
const gridColsBySize = { 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6' }
const textSizeBySize = { 4: 'text-[13px]', 5: 'text-[11px]', 6: 'text-[10px]' }

const mainButtonClass =
  'h-14 w-full rounded-full bg-periwinkle text-lg font-bold text-navy shadow-[0_4px_0_#6569D4] enabled:active:translate-y-1 enabled:active:shadow-none disabled:opacity-50'

const outlinedButtonClass =
  'h-14 w-full rounded-full border-2 border-lavender text-lg font-bold text-soft-white'

// 75 → "1:15"
function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function Board({
  playerId,
  gameId,
  board,
  gridSize,
  startedAt,
  endsAt,
  finishedAt: initialFinishedAt,
}) {
  const [marked, setMarked] = useState(() => new Set())
  const [finishedAt, setFinishedAt] = useState(initialFinishedAt)
  const [openIndex, setOpenIndex] = useState(null) // square whose sheet is open
  const [cameraIndex, setCameraIndex] = useState(null) // square the camera is for
  // Uploads by square: { [index]: { photo, status: 'uploading' | 'failed', error } }
  const [uploads, setUploads] = useState({})
  const [now, setNow] = useState(() => Date.now())

  // Tick once a second for the countdown.
  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(intervalId)
  }, [])

  // Load this player's saved marks (e.g. after a refresh).
  useEffect(() => {
    let ignore = false
    supabase
      .from('marks')
      .select('cell_index')
      .eq('player_id', playerId)
      .then(({ data, error }) => {
        if (ignore || error) return
        setMarked((current) => {
          const next = new Set(current)
          data.forEach((row) => next.add(row.cell_index))
          return next
        })
      })
    return () => {
      ignore = true
    }
  }, [playerId])

  const timeLeft = Math.max(0, new Date(endsAt).getTime() - now)
  const timeUp = timeLeft === 0
  const locked = timeUp || finishedAt !== null

  // The FREE square always counts as marked.
  const markedWithFree = new Set(marked)
  board.forEach((square, i) => {
    if (square.type === 'free') markedWithFree.add(i)
  })
  const completedLine = finishedAt
    ? findCompletedLine(markedWithFree, gridSize)
    : null

  const openSquare = openIndex === null ? null : board[openIndex]
  const openUpload = openIndex === null ? null : uploads[openIndex]
  const sheetOpen = openSquare !== null && !locked

  function setUpload(index, upload) {
    setUploads((current) => {
      const next = { ...current }
      if (upload) next[index] = upload
      else delete next[index]
      return next
    })
  }

  async function sendPhoto(index, photo) {
    setUpload(index, { photo, status: 'uploading' })
    try {
      const player = await uploadProof({
        gameId,
        playerId,
        cellIndex: index,
        photo,
      })
      setMarked((current) => new Set(current).add(index))
      setUpload(index, null)
      setOpenIndex((current) => (current === index ? null : current))
      if (player.finished_at) setFinishedAt(player.finished_at)
    } catch (error) {
      // Keep the photo so "Try again" can resend it.
      setUpload(index, { photo, status: 'failed', error: error.message })
    }
  }

  function handleUsePhoto(photo) {
    const index = cameraIndex
    setCameraIndex(null)
    sendPhoto(index, photo)
  }

  const finishSeconds = finishedAt
    ? Math.floor(
        (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000,
      )
    : null

  return (
    <div className="flex flex-col py-4">
      <div className="text-center">
        {timeUp ? (
          <p className="text-4xl font-extrabold text-coral">Time’s up</p>
        ) : (
          <p className="text-4xl font-extrabold tabular-nums">
            {formatTime(Math.ceil(timeLeft / 1000))}
          </p>
        )}
      </div>

      {finishedAt && (
        <div role="status" className="mt-4 rounded-2xl bg-pink p-4 text-center text-navy">
          <p className="text-2xl font-extrabold">Bingo!</p>
          <p className="font-bold">Your time: {formatTime(finishSeconds)}</p>
          <p className="font-semibold">Your time will be checked by the host</p>
        </div>
      )}

      <div className={`mt-4 grid gap-1.5 ${gridColsBySize[gridSize]}`}>
        {board.map((square, i) => {
          const inLine = completedLine?.includes(i)
          const ring = inLine ? 'ring-[3px] ring-pink' : ''
          const base = `relative flex aspect-square items-center justify-center overflow-hidden rounded-xl p-1 text-center leading-tight font-semibold hyphens-auto break-words ${textSizeBySize[gridSize]} ${ring}`

          if (square.type === 'free') {
            return (
              <div key={i} className={`${base} bg-pink text-navy`}>
                FREE
              </div>
            )
          }

          const isMarked = marked.has(i)
          const isUploading = uploads[i]?.status === 'uploading'
          return (
            <button
              key={i}
              type="button"
              disabled={locked}
              onClick={() => setOpenIndex(i)}
              aria-label={`${square.text}${isUploading ? ', uploading' : isMarked ? ', marked' : ''}`}
              className={`${base} ${
                isMarked ? 'bg-mint text-navy' : 'bg-navy-light text-soft-white'
              }`}
            >
              {isUploading ? 'Uploading…' : square.text}
              {isMarked && !isUploading && (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="absolute top-1 right-1 size-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 12l5 5L20 6" />
                </svg>
              )}
            </button>
          )
        })}
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setOpenIndex(null)}
        title={openSquare?.text}
      >
        {openSquare && (
          <>
            <p className="mt-2 text-lavender">
              {openSquare.type === 'person'
                ? 'Take a photo with this person'
                : 'Take a photo of this'}
            </p>
            {openSquare.group === 'country' && (
              <p className="mt-1 text-lavender">On trust, just ask them.</p>
            )}

            {openUpload?.status === 'uploading' ? (
              <button type="button" disabled className={`mt-6 ${mainButtonClass}`}>
                Uploading…
              </button>
            ) : openUpload?.status === 'failed' ? (
              <>
                <p role="alert" className="mt-6 text-coral">
                  {openUpload.error}
                </p>
                <button
                  type="button"
                  onClick={() => sendPhoto(openIndex, openUpload.photo)}
                  className={`mt-3 ${mainButtonClass}`}
                >
                  Try again
                </button>
              </>
            ) : marked.has(openIndex) ? (
              <button
                type="button"
                onClick={() => setCameraIndex(openIndex)}
                className={`mt-6 ${outlinedButtonClass}`}
              >
                Retake photo
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCameraIndex(openIndex)}
                className={`mt-6 ${mainButtonClass}`}
              >
                Take photo
              </button>
            )}
          </>
        )}
      </BottomSheet>

      {cameraIndex !== null && !locked && (
        <Camera
          prompt={board[cameraIndex].text}
          onClose={() => setCameraIndex(null)}
          onUsePhoto={handleUsePhoto}
        />
      )}
    </div>
  )
}

export default Board
