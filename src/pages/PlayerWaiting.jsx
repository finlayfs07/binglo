import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import AppShell from '../components/AppShell.jsx'
import Board from '../components/Board.jsx'
import Results from '../components/Results.jsx'
import { ensureSignedIn, supabase } from '../lib/supabase.js'

function PlayerWaiting() {
  const { code } = useParams()
  const navigate = useNavigate()

  const [player, setPlayer] = useState(null) // { id, game_id, name, board, finished_at, winning_line }
  const [playerCount, setPlayerCount] = useState(null)
  const [finishedCount, setFinishedCount] = useState(null)
  const [game, setGame] = useState(null) // { status, grid_size, started_at, ends_at }
  const [loadError, setLoadError] = useState(null)

  // Load this device's player row for this game, or send them to Join.
  useEffect(() => {
    let ignore = false // set on unmount, so a late answer doesn't update state

    async function loadPlayer() {
      try {
        const user = await ensureSignedIn()
        const { data, error } = await supabase
          .from('players')
          .select('id, game_id, name, board, finished_at, winning_line, games!inner(code)')
          .eq('games.code', code.toUpperCase())
          .eq('user_id', user.id)
          .maybeSingle()
        if (error) throw error
        if (ignore) return
        if (!data) {
          navigate(`/join/${code}`, { replace: true })
          return
        }
        setPlayer(data)
      } catch (error) {
        if (!ignore) setLoadError(error.message)
      }
    }

    loadPlayer()
    return () => {
      ignore = true
    }
  }, [code, navigate])

  // Poll the counts and game status every 3 seconds
  // (players don't use Realtime).
  useEffect(() => {
    async function poll() {
      try {
        await ensureSignedIn()
        const [progressResult, gameResult] = await Promise.all([
          supabase.rpc('game_progress', { p_code: code }),
          supabase
            .from('games')
            .select('status, grid_size, started_at, ends_at')
            .eq('code', code.toUpperCase())
            .maybeSingle(),
        ])
        if (!progressResult.error && progressResult.data) {
          setPlayerCount(progressResult.data.players)
          setFinishedCount(progressResult.data.finished)
        }
        if (!gameResult.error && gameResult.data) {
          setGame(gameResult.data)
        }
      } catch {
        // Bad Wi-Fi: keep the last values and try again on the next tick.
      }
    }

    poll()
    const intervalId = setInterval(poll, 3000)
    return () => clearInterval(intervalId)
  }, [code])

    // Results published: show them (the 3 s poll notices status = finished).
  if (!loadError && player && game?.status === 'finished') {
    return (
      <AppShell>
        <Results code={code} />
      </AppShell>
    )
  }

  // Playing, review or finished: show the board (it locks itself at time's up).
  if (!loadError && player && game && game.status !== 'lobby') {
    return (
      <AppShell>
        <Board
          playerId={player.id}
          gameId={player.game_id}
          board={player.board}
          gridSize={game.grid_size}
          startedAt={game.started_at}
          endsAt={game.ends_at}
          finishedAt={player.finished_at}
          winningLine={player.winning_line}
          playerCount={playerCount}
          finishedCount={finishedCount}
        />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {loadError ? (
          <p role="alert" className="text-coral">
            {loadError}
          </p>
        ) : player === null ? (
          <p className="text-lavender">Loading…</p>
        ) : (
          <>
            <h1 className="text-3xl font-bold">You’re in, {player.name}</h1>
            <p className="mt-2 text-lavender">Waiting for the host to start</p>
            {playerCount !== null && (
              <p className="mt-6 font-semibold">{playerCount} players joined</p>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}

export default PlayerWaiting