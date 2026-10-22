import { useParams } from 'react-router'
import AppShell from '../components/AppShell.jsx'

function HostLobby() {
  const { code } = useParams()

  return (
    <AppShell>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-lavender">Game code</p>
        <p className="mt-2 text-6xl font-bold tracking-widest">{code}</p>
      </div>
    </AppShell>
  )
}

export default HostLobby
