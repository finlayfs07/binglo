import { Link } from 'react-router'
import AppShell from '../components/AppShell.jsx'

function CreateGame() {
  return (
    <AppShell>
      <Link
        to="/"
        className="mt-4 flex min-h-11 items-center self-start font-semibold text-lavender"
      >
        Back
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Create game</h1>
    </AppShell>
  )
}

export default CreateGame
