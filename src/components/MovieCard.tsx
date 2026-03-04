import type { Movie } from '../types.ts'

interface MovieCardProps {
  movie: Movie
  onTrailer: (youtubeId: string) => void
  onRemove?: (movieId: number) => void
}

export default function MovieCard({ movie, onTrailer, onRemove }: MovieCardProps) {
  return (
    <div className="bg-slate-800/60 rounded-xl overflow-hidden border border-slate-700/50">
      <div
        className="relative w-full aspect-video bg-slate-900 cursor-pointer group"
        onClick={() => onTrailer(movie.youtube_id)}
      >
        <img
          src={`https://img.youtube.com/vi/${movie.youtube_id}/mqdefault.jpg`}
          alt={movie.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center">
            <div className="w-0 h-0 border-l-[18px] border-l-slate-800 border-t-[11px] border-t-transparent border-b-[11px] border-b-transparent ml-1" />
          </div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-slate-100 font-semibold text-base mb-1 leading-snug">{movie.title}</h3>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-slate-400 text-sm">{movie.year}</span>
          <span className="text-slate-600 text-sm">&bull;</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">{movie.genre}</span>
        </div>
        {onRemove && (
          <button
            onClick={() => onRemove(movie.id)}
            className="text-sm px-3 py-1.5 rounded-lg bg-red-900/40 text-red-300 hover:bg-red-900/60 transition-colors"
          >
            Not Interested
          </button>
        )}
      </div>
    </div>
  )
}
