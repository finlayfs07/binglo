import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import AppShell from '../components/AppShell.jsx'
import Board from '../components/Board.jsx'
import { ensureSignedIn, supabase } from '../lib/supabase.js'

function PlayerWaiting() {
  const { code } = useParams()
  const navigate = useNavigate()

  const [player, setPlayer] = useState(null) // { name, board }
  const [playerCount, setPlayerCount] = useState(null)
  const [game, setGame] = useState(null) // { status, grid_size, ends_at }
  const [loadError, setLoadError] = useState(null)

  // Load this device's player row for this game, or send them to Join.
  useEffect(() => {
    let ignore = false // set on unmount, so a late answer doesn't update state

    async function loadPlayer() {
      try {
        const user = await ensureSignedIn()
        const { data, error } = await supabase
          .from('players')
          .select('name, board, games!inner(code)')
          .eq('games.code', code.toUpperCase())
          .eq('user_id', user.id)
          .maybeSingle()
        if (error) throw error
        if (ignore) return
        if (!data) {
          navigate(`/join/${code}`, { replace: true })
          return
        }
        setPlayer({ name: data.name, board: data.board })
      } catch (error) {
        if (!ignore) setLoadError(error.message)
      }
    }

    loadPlayer()
    return () => {
      ignore = true
    }
  }, [code, navigate])

  // Poll the player count and game status every 3 seconds
  // (players don't use Realtime).
  useEffect(() => {
    async function poll() {
      try {
        await ensureSignedIn()
        const [countResult, gameResult] = await Promise.all([
          supabase.rpc('game_player_count', { p_code: code }),
          supabase
            .from('games')
            .select('status, grid_size, ends_at')
            .eq('code', code.toUpperCase())
            .maybeSingle(),
        ])
        if (!countResult.error) setPlayerCount(countResult.data)
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

  if (!loadError && player && game?.status === 'playing') {
    return (
      <AppShell>
        <Board
          board={player.board}
          gridSize={game.grid_size}
          endsAt={game.ends_at}
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
