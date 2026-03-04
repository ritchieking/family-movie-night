import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.tsx'
import PickMovie from './pages/PickMovie.tsx'
import AllMovies from './pages/AllMovies.tsx'
import History from './pages/History.tsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<PickMovie />} />
        <Route path="/all" element={<AllMovies />} />
        <Route path="/history" element={<History />} />
      </Route>
    </Routes>
  )
}
