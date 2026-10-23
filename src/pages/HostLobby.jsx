import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import HostShell from '../components/HostShell.jsx'
import HostGame from '../components/HostGame.jsx'
import { ensureSignedIn, supabase } from '../lib/supabase.js'

const outlinedButtonClass =
  'h-12 rounded-full border-2 border-lavender px-6 font-bold text-soft-white'

const mainButtonClass =
  'h-14 w-full max-w-md rounded-full bg-periwinkle text-lg font-bold text-navy shadow-[0_4px_0_#6569D4] enabled:active:translate-y-1 enabled:active:shadow-none disabled:opacity-50'

function HostLobby() {
  const { code } = useParams()

  const [game, setGame] = useState(null)
  const [players, setPlayers] = useState([])
  // 'loading' | 'ready' | 'not-found' | 'not-host' | 'error'
  const [pageState, setPageState] = useState('loading')
  const [loadError, setLoadError] = useState(null)

  const [copied, setCopied] = useState(false)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState(null)

  const joinUrl = `${window.location.origin}/join/${code}`
  const canShare = typeof navigator.share === 'function'
  const canStart = players.length >= 2

  // Load the game and its players, then listen for new players live.
  useEffect(() => {
    let ignore = false
    let channel = null

    async function load() {
      try {
        const user = await ensureSignedIn()

        const { data: gameRow, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('code', code.toUpperCase())
          .maybeSingle()
        if (gameError) throw gameError
        if (ignore) return
        if (!gameRow) return setPageState('not-found')
        if (gameRow.host_id !== user.id) return setPageState('not-host')

        const { data: playerRows, error: playersError } = await supabase
          .from('players')
          .select('id, name, joined_at')
          .eq('game_id', gameRow.id)
          .order('joined_at')
        if (playersError) throw playersError
        if (ignore) return

        setGame(gameRow)
        setPlayers(playerRows)
        setPageState('ready')

        channel = supabase
          .channel(`lobby-${gameRow.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'players',
              filter: `game_id=eq.${gameRow.id}`,
            },
            (payload) => {
              const { id, name, joined_at } = payload.new
              // Skip it if we already have this player (e.g. loaded just now).
              setPlayers((current) =>
                current.some((p) => p.id === id)
                  ? current
                  : [...current, { id, name, joined_at }],
              )
            },
          )
          .subscribe()
      } catch (error) {
        if (!ignore) {
          setLoadError(error.message)
          setPageState('error')
        }
      }
    }

    load()
    return () => {
      ignore = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [code])

  // After "Copied", switch the label back after 2 seconds.
  useEffect(() => {
    if (!copied) return
    const timeoutId = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timeoutId)
  }, [copied])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
    } catch {
      // Clipboard blocked (e.g. not https): nothing to do, the code is on screen.
    }
  }

  async function handleShare() {
    try {
      await navigator.share({ title: 'Join my Binglo game', url: joinUrl })
    } catch {
      // The host closed the share sheet.
    }
  }

  async function handleStart() {
    setStarting(true)
    setStartError(null)
    try {
      const { error } = await supabase.rpc('start_game', { p_game_id: game.id })
      if (error) throw error
      // Reload the game so we have the server's started_at and ends_at.
      const { data, error: reloadError } = await supabase
        .from('games')
        .select('*')
        .eq('id', game.id)
        .single()
      if (reloadError) throw reloadError
      setGame(data)
    } catch (error) {
      setStartError(error.message)
    }
    setStarting(false)
  }

  if (pageState !== 'ready') {
    const messages = {
      loading: 'Loading…',
      'not-found': 'Game not found',
      'not-host': 'Only the host can open this page',
      error: loadError,
    }
    return (
      <HostShell>
        <div className="flex flex-1 items-center justify-center text-center">
          <p
            className={`text-2xl font-bold ${
              pageState === 'loading' ? 'text-lavender' : 'text-coral'
            }`}
          >
            {messages[pageState]}
          </p>
        </div>
      </HostShell>
    )
  }

  // Placeholder until the host game view is built.
  if (game.status === 'playing') {
    return <HostGame game={game} />
  }

  return (
    <HostShell>
      <div className="grid flex-1 gap-12 lg:grid-cols-2">
        <section className="flex flex-col items-center text-center">
          <p className="text-xl text-lavender">Join at binglo.vercel.app</p>
          <p className="mt-2 text-8xl font-extrabold tracking-[0.2em]">{code}</p>
          <div className="mt-6 rounded-2xl bg-soft-white p-4">
            <QRCodeSVG
              value={joinUrl}
              size={240}
              fgColor="#1C1F4A"
              bgColor="#F4F4FB"
              title={`QR code to join game ${code}`}
            />
          </div>
          <div className="mt-6 flex gap-3">
            <button type="button" onClick={handleCopy} className={outlinedButtonClass}>
              {copied ? 'Copied' : 'Copy link'}
            </button>
            {canShare && (
              <button type="button" onClick={handleShare} className={outlinedButtonClass}>
                Share
              </button>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold">Players</h2>
            <span className="rounded-full bg-mint px-3 py-1 text-lg font-bold text-navy">
              {players.length}
            </span>
          </div>
          {players.length === 0 ? (
            <p className="mt-6 text-xl text-lavender">Waiting for players to join…</p>
          ) : (
            <ul className="mt-6 flex flex-wrap gap-3">
              {players.map((player) => (
                <li
                  key={player.id}
                  className="rounded-full bg-navy-light px-4 py-2 text-lg"
                >
                  {player.name}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-10 flex flex-col items-center gap-3">
        {startError && (
          <p role="alert" className="text-coral">
            {startError}
          </p>
        )}
        <button
          type="button"
          disabled={!canStart || starting}
          onClick={handleStart}
          className={mainButtonClass}
        >
          {starting ? 'Starting…' : 'Start game'}
        </button>
        {!canStart && <p className="text-lavender">Need at least 2 players</p>}
      </div>
    </HostShell>
  )
}

export default HostLobby
