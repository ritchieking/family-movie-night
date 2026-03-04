import { useEffect } from 'react'

interface TrailerModalProps {
  youtubeId: string
  onClose: () => void
}

export default function TrailerModal({ youtubeId, onClose }: TrailerModalProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-[90%] max-w-[900px]">
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white text-3xl font-light hover:text-slate-300"
        >
          &times;
        </button>
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full aspect-video rounded-lg border-0"
        />
      </div>
    </div>
  )
}
