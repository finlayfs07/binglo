import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import AppShell from '../components/AppShell.jsx'
import { ensureSignedIn, supabase } from '../lib/supabase.js'

const inputClass =
  'h-14 w-full rounded-2xl border-2 border-transparent bg-navy-light px-4 text-soft-white placeholder:text-lavender focus:border-periwinkle focus:outline-none'

const mainButtonClass =
  'h-14 w-full rounded-full bg-periwinkle text-lg font-bold text-navy shadow-[0_4px_0_#6569D4] enabled:active:translate-y-1 enabled:active:shadow-none disabled:opacity-50'

// Codes are 6 characters, uppercase, no spaces.
function cleanCode(value) {
  return value.toUpperCase().replace(/\s/g, '').slice(0, 6)
}

function JoinGame() {
  // On /join/:code this is the code from the QR link; on /join it's undefined.
  const params = useParams()
  const navigate = useNavigate()

  const [code, setCode] = useState(cleanCode(params.code ?? ''))
  const [name, setName] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState(null)

  const canJoin = code.length === 6 && name.trim() !== ''

  async function handleSubmit(event) {
    event.preventDefault()
    setJoining(true)
    setJoinError(null)
    try {
      // join_game uses auth.uid(), so we must be signed in first.
      await ensureSignedIn()
      const { error } = await supabase.rpc('join_game', {
        p_code: code,
        p_name: name.trim(),
      })
      if (error) throw error
      navigate(`/game/${code}`)
    } catch (error) {
      setJoinError(error.message)
      setJoining(false)
    }
  }

  return (
    <AppShell>
      <Link
        to="/"
        className="mt-4 flex min-h-11 items-center self-start font-semibold text-lavender"
      >
        Back
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Join game</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-1 flex-col">
        <label htmlFor="game-code" className="mb-2 block font-semibold">
          Game code
        </label>
        <input
          id="game-code"
          type="text"
          value={code}
          onChange={(event) => setCode(cleanCode(event.target.value))}
          maxLength={6}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className={`${inputClass} text-center text-2xl font-bold tracking-widest`}
        />

        <label htmlFor="player-name" className="mt-6 mb-2 block font-semibold">
          Your name
        </label>
        <input
          id="player-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Aisha"
          maxLength={20}
          autoComplete="off"
          className={inputClass}
        />

        <div className="mt-auto pt-6 pb-8">
          {joinError && (
            <p role="alert" className="mb-3 text-coral">
              {joinError}
            </p>
          )}
          <button
            type="submit"
            disabled={!canJoin || joining}
            className={mainButtonClass}
          >
            {joining ? 'Joining…' : 'Join'}
          </button>
        </div>
      </form>
    </AppShell>
  )
}

export default JoinGame
