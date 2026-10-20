import { Link, useParams } from 'react-router'
import AppShell from '../components/AppShell.jsx'

function JoinGame() {
  // On /join/:code this is the code from the URL; on /join it's undefined.
  const { code } = useParams()

  return (
    <AppShell>
      <Link
        to="/"
        className="mt-4 flex min-h-11 items-center self-start font-semibold text-lavender"
      >
        Back
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Join game</h1>
      {code && <p className="mt-2 text-lavender">Code: {code}</p>}
    </AppShell>
  )
}

export default JoinGame
