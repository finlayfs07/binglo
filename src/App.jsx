import { useEffect } from 'react'
import { Route, Routes } from 'react-router'
import { ensureSignedIn } from './lib/supabase.js'
import CreateGame from './pages/CreateGame.jsx'
import Home from './pages/Home.jsx'
import JoinGame from './pages/JoinGame.jsx'
import NotFound from './pages/NotFound.jsx'

function App() {
  // Give this browser an anonymous Supabase user when the app loads.
  useEffect(() => {
    ensureSignedIn()
      .then((user) => console.log('Signed in as', user.id))
      .catch((error) => console.error('Sign-in failed:', error.message))
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<CreateGame />} />
      <Route path="/join" element={<JoinGame />} />
      <Route path="/join/:code" element={<JoinGame />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
