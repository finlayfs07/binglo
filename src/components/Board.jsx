import { useEffect, useState } from 'react'
import { findCompletedLine } from '../lib/game.js'
import BottomSheet from './BottomSheet.jsx'

// Full class names, so Tailwind can find them in the source.
const gridColsBySize = { 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6' }
const textSizeBySize = { 4: 'text-[13px]', 5: 'text-[11px]', 6: 'text-[10px]' }

const mainButtonClass =
  'h-14 w-full rounded-full bg-periwinkle text-lg font-bold text-navy shadow-[0_4px_0_#6569D4] active:translate-y-1 active:shadow-none'

const outlinedButtonClass =
  'h-14 w-full rounded-full border-2 border-lavender text-lg font-bold text-soft-white'

// 75000 → "1:15"
function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function Board({ board, gridSize, endsAt }) {
  const [marked, setMarked] = useState(() => new Set())
  const [openIndex, setOpenIndex] = useState(null) // square whose sheet is open
  const [now, setNow] = useState(() => Date.now())

  // Tick once a second for the countdown.
  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(intervalId)
  }, [])

  const timeLeft = Math.max(0, new Date(endsAt).getTime() - now)
  const timeUp = timeLeft === 0

  // The FREE square always counts as marked.
  const markedWithFree = new Set(marked)
  board.forEach((square, i) => {
    if (square.type === 'free') markedWithFree.add(i)
  })
  const completedLine = findCompletedLine(markedWithFree, gridSize)

  const openSquare = openIndex === null ? null : board[openIndex]
  const sheetOpen = openSquare !== null && !timeUp

  function setSquareMarked(index, isMarked) {
    setMarked((current) => {
      const next = new Set(current) // copy: never change state in place
      if (isMarked) next.add(index)
      else next.delete(index)
      return next
    })
    setOpenIndex(null)
  }

  return (
    <div className="flex flex-col py-4">
      <div className="text-center">
        {timeUp ? (
          <p className="text-4xl font-extrabold text-coral">Time’s up</p>
        ) : (
          <p className="text-4xl font-extrabold tabular-nums">
            {formatTime(timeLeft)}
          </p>
        )}
      </div>

      {completedLine && (
        <div role="status" className="mt-4 rounded-2xl bg-pink p-4 text-center text-navy">
          <p className="text-2xl font-extrabold">Bingo!</p>
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
          return (
            <button
              key={i}
              type="button"
              disabled={timeUp}
              onClick={() => setOpenIndex(i)}
              aria-label={`${square.text}${isMarked ? ', marked' : ''}`}
              className={`${base} ${
                isMarked ? 'bg-mint text-navy' : 'bg-navy-light text-soft-white'
              }`}
            >
              {square.text}
              {isMarked && (
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
            {marked.has(openIndex) ? (
              <button
                type="button"
                onClick={() => setSquareMarked(openIndex, false)}
                className={`mt-6 ${outlinedButtonClass}`}
              >
                Unmark (test)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSquareMarked(openIndex, true)}
                className={`mt-6 ${mainButtonClass}`}
              >
                Mark (test)
              </button>
            )}
          </>
        )}
      </BottomSheet>
    </div>
  )
}

export default Board
