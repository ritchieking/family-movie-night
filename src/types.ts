export type Genre = 'Animated' | 'Adventure' | 'Fantasy' | 'Comedy'

export interface Movie {
  id: number
  title: string
  year: number
  youtube_id: string
  genre: Genre
}

export interface WatchedMovie {
  id: string
  movie_id: number
  score: number | null
  watched_at: string
}

export interface RemovedMovie {
  id: string
  movie_id: number
  removed_at: string
}

export interface CurrentSelection {
  id: string
  movie_id: number
  created_at: string
}

export interface MovieWithStatus extends Movie {
  status: 'available' | 'watched' | 'removed'
  score: number | null
}

export const GENRES: Genre[] = ['Animated', 'Adventure', 'Fantasy', 'Comedy']
export const VOTERS = ['Ritchie', 'Emily', 'Ada', 'Roxy'] as const
