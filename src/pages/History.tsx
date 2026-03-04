import {
  useMovies,
  unwatchMovie,
  restoreMovie as restoreMovieMutation,
} from '../lib/hooks.ts'

export default function History() {
  const { movies, watched, removed, reload } = useMovies()

  const sortedWatched = [...watched]
    .sort((a, b) => {
      if (a.score !== null && b.score !== null) return b.score - a.score
      if (a.score !== null) return -1
      if (b.score !== null) return 1
      const mA = movies.find(m => m.id === a.movie_id)
      const mB = movies.find(m => m.id === b.movie_id)
      return (mA?.title ?? '').localeCompare(mB?.title ?? '')
    })

  async function handleUnwatch(movieId: number) {
    await unwatchMovie(movieId)
    await reload()
  }

  async function handleRestore(movieId: number) {
    await restoreMovieMutation(movieId)
    await reload()
  }

  return (
    <div className="px-4 pt-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-100 mb-6">History</h1>

      {/* Watched Section */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-200 mb-3">Movies We've Watched</h2>
        {sortedWatched.length === 0 ? (
          <p className="text-slate-500 text-sm py-4">No movies watched yet</p>
        ) : (
          <div className="space-y-2">
            {sortedWatched.map(w => {
              const movie = movies.find(m => m.id === w.movie_id)
              if (!movie) return null
              return (
                <div
                  key={w.id}
                  className="flex items-center justify-between gap-3 p-3 bg-slate-800/60 rounded-lg border-l-4 border-l-emerald-500 flex-wrap"
                >
                  <div className="flex-1 min-w-[150px]">
                    <span className="text-slate-100 text-sm font-medium">{movie.title}</span>
                    <span className="text-slate-500 text-xs ml-2">({movie.year})</span>
                  </div>
                  {w.score !== null ? (
                    <span className="text-amber-400 font-semibold text-sm">{w.score} pts</span>
                  ) : (
                    <span className="text-slate-600 text-sm">No score</span>
                  )}
                  <button
                    onClick={() => handleUnwatch(movie.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                  >
                    Unmark
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Removed Section */}
      <section>
        <h2 className="text-lg font-semibold text-slate-200 mb-3">Removed Movies</h2>
        {removed.length === 0 ? (
          <p className="text-slate-500 text-sm py-4">No removed movies</p>
        ) : (
          <div className="space-y-2">
            {removed.map(r => {
              const movie = movies.find(m => m.id === r.movie_id)
              if (!movie) return null
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 p-3 bg-slate-800/60 rounded-lg border-l-4 border-l-red-500 flex-wrap"
                >
                  <div className="flex-1 min-w-[150px]">
                    <span className="text-slate-100 text-sm font-medium">{movie.title}</span>
                    <span className="text-slate-500 text-xs ml-2">({movie.year})</span>
                  </div>
                  <button
                    onClick={() => handleRestore(movie.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-blue-800/60 text-blue-300 hover:bg-blue-800 transition-colors"
                  >
                    Restore
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
