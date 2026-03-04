import { useState } from 'react'
import {
  useMovies,
  useCurrentSelection,
  selectMovies,
  calculateWinner,
  setCurrentSelection,
  markWatched,
  removeMovie as removeMovieMutation,
} from '../lib/hooks.ts'
import { VOTERS } from '../types.ts'
import type { Movie } from '../types.ts'
import MovieCard from '../components/MovieCard.tsx'
import VotingPanel from '../components/VotingPanel.tsx'
import TrailerModal from '../components/TrailerModal.tsx'

export default function PickMovie() {
  const { movies, watched, available, reload: reloadMovies } = useMovies()
  const { selectedMovies, reload: reloadSelection } = useCurrentSelection(movies)
  const [votes, setVotes] = useState<Record<string, Record<number, number>>>({})
  const [winner, setWinner] = useState<{ movie: Movie; score: number } | null>(null)
  const [trailerYoutubeId, setTrailerYoutubeId] = useState<string | null>(null)
  const [voteError, setVoteError] = useState<string | null>(null)

  async function handleGetNewMovies() {
    const picks = selectMovies(available, watched, movies, 6)
    await setCurrentSelection(picks.map(m => m.id))
    setVotes({})
    setWinner(null)
    setVoteError(null)
    await reloadSelection()
  }

  function handleVoteChange(voter: string, movieId: number, rank: number) {
    setVotes(prev => ({
      ...prev,
      [voter]: { ...prev[voter], [movieId]: rank },
    }))
    setVoteError(null)
  }

  function handleCalculateWinner() {
    // Check all voters have voted
    for (const voter of VOTERS) {
      if (!votes[voter]) {
        setVoteError(`${voter} hasn't voted yet`)
        return
      }
      for (const movie of selectedMovies) {
        if (!votes[voter][movie.id]) {
          setVoteError(`${voter} hasn't ranked all movies`)
          return
        }
      }
    }

    const result = calculateWinner(selectedMovies, votes)
    if (!result) {
      setVoteError(`Please make sure all voters have ranked all movies with unique rankings (1-${selectedMovies.length})`)
      return
    }
    setWinner({ movie: result.winner, score: result.score })
  }

  async function handleMarkWatched(movieId: number, score: number) {
    await markWatched(movieId, score)
    await setCurrentSelection([])
    setWinner(null)
    setVotes({})
    await Promise.all([reloadMovies(), reloadSelection()])
  }

  async function handleRemove(movieId: number) {
    await removeMovieMutation(movieId)
    await Promise.all([reloadMovies(), reloadSelection()])
  }

  return (
    <div className="px-4 pt-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Tonight's Choices</h1>
        <button
          onClick={handleGetNewMovies}
          className="px-5 py-2.5 rounded-full bg-blue-600 text-white font-medium text-sm hover:bg-blue-500 transition-colors"
        >
          Get New Movies
        </button>
      </div>

      {selectedMovies.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-400 text-lg">Click "Get New Movies" to start!</p>
          <p className="text-slate-500 text-sm mt-2">{available.length} movies available</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {selectedMovies.map(movie => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onTrailer={setTrailerYoutubeId}
                onRemove={handleRemove}
              />
            ))}
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-100 mb-2">Vote for Your Favorite!</h2>
            <p className="text-slate-400 text-sm mb-4">
              Each person ranks the movies from 1 (best) to {selectedMovies.length} (least preferred)
            </p>
            <VotingPanel
              movies={selectedMovies}
              votes={votes}
              onVoteChange={handleVoteChange}
            />
          </div>

          {voteError && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-800/50 text-red-300 text-sm text-center">
              {voteError}
            </div>
          )}

          <div className="text-center mb-8">
            <button
              onClick={handleCalculateWinner}
              className="px-6 py-3 rounded-full bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors"
            >
              Find the Winner!
            </button>
          </div>

          {winner && (
            <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-amber-900/20 to-red-900/20 border border-amber-800/30 text-center">
              <h3 className="text-amber-400 text-lg font-semibold mb-2">Tonight's Winner!</h3>
              <p className="text-2xl font-bold text-slate-100 mb-2">{winner.movie.title}</p>
              <p className="text-slate-400 mb-4">{winner.score} points</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <button
                  onClick={() => setTrailerYoutubeId(winner.movie.youtube_id)}
                  className="px-5 py-2.5 rounded-full bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition-colors"
                >
                  Watch Trailer
                </button>
                <button
                  onClick={() => handleMarkWatched(winner.movie.id, winner.score)}
                  className="px-5 py-2.5 rounded-full bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors"
                >
                  We Watched It!
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {trailerYoutubeId && (
        <TrailerModal youtubeId={trailerYoutubeId} onClose={() => setTrailerYoutubeId(null)} />
      )}
    </div>
  )
}
