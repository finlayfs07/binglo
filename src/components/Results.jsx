import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// 401 -> "6:41"
function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

// Bingo players show their time; everyone else their squares.
function resultText(row) {
  if (row.time_sec !== null) return formatTime(row.time_sec)
  return `${row.total} ${row.total === 1 ? 'square' : 'squares'}`
}

const badgeClass = {
  1: 'bg-pink text-navy',
  2: 'bg-periwinkle text-navy',
  3: 'bg-mint text-navy',
}

// Podium block heights: 1st tallest.
const podiumHeight = {
  1: 'h-32 sm:h-40',
  2: 'h-24 sm:h-28',
  3: 'h-16 sm:h-20',
}

function Results({ code, isHost = false }) {
  const [results, setResults] = useState(null)
  const [loadError, setLoadError] = useState(null)

  // Results are final once published, so one load is enough.
  useEffect(() => {
    let ignore = false
    supabase.rpc('game_results', { p_code: code }).then(({ data, error }) => {
      if (ignore) return
      if (error) setLoadError(error.message)
      else setResults(data)
    })
    return () => {
      ignore = true
    }
  }, [code])

  if (loadError) {
    return <p className="py-10 text-center text-xl text-coral">{loadError}</p>
  }
  if (!results) {
    return <p className="py-10 text-center text-xl text-lavender">Loading results…</p>
  }

  const { top, me, winners_count: winnersCount, player_count: playerCount } = results
  const podium = [top[1], top[0], top[2]] // 2nd, 1st, 3rd
  const rest = top.slice(3)
  const isMe = (row) => me !== null && me.rank === row.rank

  return (
    <div className="flex flex-col py-4">
      <h1 className={`text-center font-extrabold ${isHost ? 'text-5xl' : 'text-3xl'}`}>
        Results
      </h1>

      {me && (
        <div className="mt-4 rounded-2xl bg-navy-light p-4 text-center">
          <p className="font-semibold text-lavender">Your rank</p>
          <p className="text-4xl font-extrabold">
            #{me.rank} <span className="text-xl text-lavender">of {playerCount}</span>
          </p>
          <p className="font-semibold">
            {me.time_sec !== null ? `Bingo in ${formatTime(me.time_sec)}` : resultText(me)}
          </p>
        </div>
      )}

      <div
        className={`mx-auto mt-8 grid w-full grid-cols-3 items-end gap-3 ${
          isHost ? 'max-w-3xl' : ''
        }`}
      >
        {podium.map((row, i) =>
          row ? (
            <div key={row.rank} className="flex flex-col items-center text-center">
              <span
                className={`flex size-12 items-center justify-center rounded-full text-xl font-extrabold ${badgeClass[row.rank]}`}
              >
                {row.rank}
              </span>
              <p className={`mt-2 w-full truncate font-bold ${isHost ? 'text-2xl' : 'text-lg'}`}>
                {row.name}
                {isMe(row) && ' (you)'}
              </p>
              <p className="tabular-nums text-lavender">{resultText(row)}</p>
              <div className={`mt-2 w-full rounded-t-2xl bg-navy-light ${podiumHeight[row.rank]}`} />
            </div>
          ) : (
            <div key={`empty-${i}`} />
          ),
        )}
      </div>

      {rest.length > 0 && (
        <ol className={`mx-auto mt-8 w-full ${isHost ? 'max-w-3xl text-2xl' : 'text-lg'}`}>
          {rest.map((row) => (
            <li
              key={row.rank}
              className={`flex items-center gap-4 border-b border-navy-light py-3 ${
                isMe(row) ? 'text-mint' : ''
              }`}
            >
              <span className="w-8 font-extrabold text-lavender">{row.rank}</span>
              <span className="flex-1 truncate font-bold">
                {row.name}
                {isMe(row) && ' (you)'}
              </span>
              {row.rank <= winnersCount && (
                <span className="rounded-full bg-mint px-3 py-1 text-sm font-bold text-navy">
                  Top {winnersCount}
                </span>
              )}
              <span className="tabular-nums text-lavender">{resultText(row)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default Results