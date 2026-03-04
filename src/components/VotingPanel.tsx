import type { Movie } from '../types.ts'
import { VOTERS } from '../types.ts'

interface VotingPanelProps {
  movies: Movie[]
  votes: Record<string, Record<number, number>>
  onVoteChange: (voter: string, movieId: number, rank: number) => void
}

export default function VotingPanel({ movies, votes, onVoteChange }: VotingPanelProps) {
  const numMovies = movies.length
  const rankOptions = Array.from({ length: numMovies }, (_, i) => i + 1)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {VOTERS.map((voter) => (
        <div key={voter} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
          <h3 className="text-blue-400 font-medium text-center mb-3">{voter}</h3>
          <div className="space-y-2">
            {movies.map((movie) => (
              <div
                key={movie.id}
                className="flex items-center justify-between gap-2 p-2 bg-slate-900/50 rounded-lg"
              >
                <span className="text-slate-300 text-sm flex-1 truncate">{movie.title}</span>
                <select
                  value={votes[voter]?.[movie.id] || ''}
                  onChange={(e) => onVoteChange(voter, movie.id, parseInt(e.target.value) || 0)}
                  className="w-14 px-1 py-1 rounded-md bg-slate-700 text-slate-100 text-sm border-0 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-</option>
                  {rankOptions.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
