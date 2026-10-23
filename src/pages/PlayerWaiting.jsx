import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import AppShell from '../components/AppShell.jsx'
import { ensureSignedIn, supabase } from '../lib/supabase.js'

function PlayerWaiting() {
  const { code } = useParams()
  const navigate = useNavigate()

  const [name, setName] = useState(null)
  const [playerCount, setPlayerCount] = useState(null)
  const [loadError, setLoadError] = useState(null)

  // Load this device's player row for this game, or send them to Join.
  useEffect(() => {
    let ignore = false // set on unmount, so a late answer doesn't update state

    async function loadPlayer() {
      try {
        const user = await ensureSignedIn()
        const { data, error } = await supabase
          .from('players')
          .select('name, games!inner(code)')
          .eq('games.code', code.toUpperCase())
          .eq('user_id', user.id)
          .maybeSingle()
        if (error) throw error
        if (ignore) return
        if (!data) {
          navigate(`/join/${code}`, { replace: true })
          return
        }
        setName(data.name)
      } catch (error) {
        if (!ignore) setLoadError(error.message)
      }
    }

    loadPlayer()
    return () => {
      ignore = true
    }
  }, [code, navigate])

  // Poll the player count every 3 seconds (players don't use Realtime).
  useEffect(() => {
    async function loadCount() {
      try {
        await ensureSignedIn()
        const { data, error } = await supabase.rpc('game_player_count', {
          p_code: code,
        })
        if (!error) setPlayerCount(data)
      } catch {
        // Bad Wi-Fi: keep the last count and try again on the next tick.
      }
    }

    loadCount()
    const intervalId = setInterval(loadCount, 3000)
    return () => clearInterval(intervalId)
  }, [code])

  return (
    <AppShell>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {loadError ? (
          <p role="alert" className="text-coral">
            {loadError}
          </p>
        ) : name === null ? (
          <p className="text-lavender">Loading…</p>
        ) : (
          <>
            <h1 className="text-3xl font-bold">You’re in, {name}</h1>
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
