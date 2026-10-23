import { useEffect, useState } from 'react'
import HostShell from './HostShell.jsx'

// 65_000 ms -> "1:05". Never shows a negative time.
function formatClock(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function HostGame({ game }) {
  const [now, setNow] = useState(Date.now())

  // Tick 4 times a second so the clock never looks stuck.
  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(intervalId)
  }, [])

  const msLeft = new Date(game.ends_at).getTime() - now

  return (
    <HostShell>
      <div className="flex items-center justify-between">
        <p className="text-2xl font-bold text-lavender">Code {game.code}</p>
        <p className="text-7xl font-extrabold tabular-nums">{formatClock(msLeft)}</p>
      </div>
      <p className="mt-10 text-xl text-lavender">Live view · leaderboard comes next</p>
    </HostShell>
  )
}

export default HostGame