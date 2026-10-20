import { Link } from 'react-router'
import AppShell from '../components/AppShell.jsx'

function NotFound() {
  return (
    <AppShell>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-bold">Page not found</h1>
        <p className="mt-2 text-lavender">This page doesn’t exist.</p>
        <Link
          to="/"
          className="mt-4 flex min-h-11 items-center font-semibold text-lavender underline"
        >
          Back to home
        </Link>
      </div>
    </AppShell>
  )
}

export default NotFound
