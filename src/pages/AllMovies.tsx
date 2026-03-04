import { useState } from 'react'
import {
  useMovies,
  markWatched,
  removeMovie as removeMovieMutation,
  restoreMovie as restoreMovieMutation,
  unwatchMovie,
} from '../lib/hooks.ts'
import { GENRES } from '../types.ts'
import type { Genre, MovieWithStatus } from '../types.ts'
import TrailerModal from '../components/TrailerModal.tsx'

export default function AllMovies() {
  const { moviesWithStatus, reload } = useMovies()
  const [search, setSearch] = useState('')
  const [genreFilter, setGenreFilter] = useState<Genre | ''>('')
  const [statusFilter, setStatusFilter] = useState<'available' | 'watched' | 'removed' | ''>('')
  const [trailerYoutubeId, setTrailerYoutubeId] = useState<string | null>(null)

  const filtered = moviesWithStatus
    .filter(m => {
      if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false
      if (genreFilter && m.genre !== genreFilter) return false
      if (statusFilter && m.status !== statusFilter) return false
      return true
    })
    .sort((a, b) => {
      const order = { available: 0, watched: 1, removed: 2 }
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
      return a.title.localeCompare(b.title)
    })

  async function handleMarkWatched(movieId: number) {
    await markWatched(movieId, null)
    await reload()
  }

  async function handleUnwatch(movieId: number) {
    await unwatchMovie(movieId)
    await reload()
  }

  async function handleRemove(movieId: number) {
    await removeMovieMutation(movieId)
    await reload()
  }

  async function handleRestore(movieId: number) {
    await restoreMovieMutation(movieId)
    await reload()
  }

  return (
    <div className="px-4 pt-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-100 mb-4">All Movies</h1>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search movies..."
          className="flex-1 min-w-[200px] px-4 py-2.5 rounded-lg bg-slate-800 text-slate-100 text-sm border border-slate-700 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={genreFilter}
          onChange={(e) => setGenreFilter(e.target.value as Genre | '')}
          className="px-3 py-2.5 rounded-lg bg-slate-800 text-slate-100 text-sm border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Genres</option>
          {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'available' | 'watched' | 'removed' | '')}
          className="px-3 py-2.5 rounded-lg bg-slate-800 text-slate-100 text-sm border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="watched">Watched</option>
          <option value="removed">Removed</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-slate-500 text-center py-8">No movies match your filters</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(movie => (
            <MovieRow
              key={movie.id}
              movie={movie}
              onTrailer={setTrailerYoutubeId}
              onMarkWatched={handleMarkWatched}
              onUnwatch={handleUnwatch}
              onRemove={handleRemove}
              onRestore={handleRestore}
            />
          ))}
        </div>
      )}

      {trailerYoutubeId && (
        <TrailerModal youtubeId={trailerYoutubeId} onClose={() => setTrailerYoutubeId(null)} />
      )}
    </div>
  )
}

function MovieRow({
  movie,
  onTrailer,
  onMarkWatched,
  onUnwatch,
  onRemove,
  onRestore,
}: {
  movie: MovieWithStatus
  onTrailer: (id: string) => void
  onMarkWatched: (id: number) => void
  onUnwatch: (id: number) => void
  onRemove: (id: number) => void
  onRestore: (id: number) => void
}) {
  const borderClass =
    movie.status === 'watched' ? 'border-l-emerald-500' :
    movie.status === 'removed' ? 'border-l-red-500 opacity-70' :
    'border-l-transparent'

  return (
    <div
      className={`flex items-center justify-between gap-3 p-3 bg-slate-800/60 rounded-lg border-l-4 ${borderClass} flex-wrap`}
    >
      <div className="flex-1 min-w-[180px]">
        <div className="text-slate-100 font-medium text-sm">{movie.title}</div>
        <div className="text-slate-500 text-xs mt-0.5">{movie.year} &bull; {movie.genre}</div>
      </div>

      {movie.status === 'watched' && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400">
          Watched{movie.score !== null ? ` (${movie.score} pts)` : ''}
        </span>
      )}
      {movie.status === 'removed' && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-400">Removed</span>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => onTrailer(movie.youtube_id)}
          className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
        >
          Trailer
        </button>
        {movie.status === 'available' && (
          <>
            <button
              onClick={() => onMarkWatched(movie.id)}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-800/60 text-emerald-300 hover:bg-emerald-800 transition-colors"
            >
              Mark Watched
            </button>
            <button
              onClick={() => onRemove(movie.id)}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-900/40 text-red-300 hover:bg-red-900/60 transition-colors"
            >
              Remove
            </button>
          </>
        )}
        {movie.status === 'watched' && (
          <button
            onClick={() => onUnwatch(movie.id)}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
          >
            Unmark
          </button>
        )}
        {movie.status === 'removed' && (
          <button
            onClick={() => onRestore(movie.id)}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-800/60 text-blue-300 hover:bg-blue-800 transition-colors"
          >
            Restore
          </button>
        )}
      </div>
    </div>
  )
}
