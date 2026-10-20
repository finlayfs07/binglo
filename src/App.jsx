import { Route, Routes } from 'react-router'
import CreateGame from './pages/CreateGame.jsx'
import Home from './pages/Home.jsx'
import JoinGame from './pages/JoinGame.jsx'
import NotFound from './pages/NotFound.jsx'

function App() {
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
