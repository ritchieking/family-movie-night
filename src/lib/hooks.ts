import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase.ts'
import type { Movie, WatchedMovie, RemovedMovie, CurrentSelection, MovieWithStatus } from '../types.ts'

// ── useMovies ──────────────────────────────────────────────────────────────────

export function useMovies() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [watched, setWatched] = useState<WatchedMovie[]>([])
  const [removed, setRemoved] = useState<RemovedMovie[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [moviesRes, watchedRes, removedRes] = await Promise.all([
      supabase.from('movies').select('*').order('id'),
      supabase.from('watched').select('*'),
      supabase.from('removed').select('*'),
    ])
    if (moviesRes.data) setMovies(moviesRes.data)
    if (watchedRes.data) setWatched(watchedRes.data)
    if (removedRes.data) setRemoved(removedRes.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const watchedIds = new Set(watched.map(w => w.movie_id))
  const removedIds = new Set(removed.map(r => r.movie_id))

  const moviesWithStatus: MovieWithStatus[] = movies.map(m => {
    if (watchedIds.has(m.id)) {
      const w = watched.find(w => w.movie_id === m.id)!
      return { ...m, status: 'watched' as const, score: w.score }
    }
    if (removedIds.has(m.id)) {
      return { ...m, status: 'removed' as const, score: null }
    }
    return { ...m, status: 'available' as const, score: null }
  })

  const available = moviesWithStatus.filter(m => m.status === 'available')

  return { movies, watched, removed, moviesWithStatus, available, loading, reload: load }
}

// ── useCurrentSelection ────────────────────────────────────────────────────────

export function useCurrentSelection(allMovies: Movie[]) {
  const [selection, setSelection] = useState<CurrentSelection[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase.from('current_selection').select('*').order('created_at')
    if (data) setSelection(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const selectedMovies: Movie[] = selection
    .map(s => allMovies.find(m => m.id === s.movie_id))
    .filter((m): m is Movie => m !== undefined)

  return { selection, selectedMovies, loading, reload: load }
}

// ── selectMovies (weighted random) ─────────────────────────────────────────────

export function selectMovies(available: Movie[], watched: WatchedMovie[], allMovies: Movie[], count = 6): Movie[] {
  if (available.length === 0) return []

  const weightedPool = available.map(movie => {
    const sameGenreWatched = watched.filter(w => {
      const wMovie = allMovies.find(m => m.id === w.movie_id)
      return wMovie && wMovie.genre === movie.genre && w.score !== null
    })

    let weight = 1
    if (sameGenreWatched.length > 0) {
      const genreAvgScore = sameGenreWatched.reduce((sum, w) => sum + (w.score ?? 0), 0) / sameGenreWatched.length
      weight = 1 + (genreAvgScore / 10)
    }

    return { movie, weight }
  })

  const selected: Movie[] = []
  const poolCopy = [...weightedPool]

  while (selected.length < count && poolCopy.length > 0) {
    const totalWeight = poolCopy.reduce((sum, item) => sum + item.weight, 0)
    let random = Math.random() * totalWeight

    for (let i = 0; i < poolCopy.length; i++) {
      random -= poolCopy[i].weight
      if (random <= 0) {
        selected.push(poolCopy[i].movie)
        poolCopy.splice(i, 1)
        break
      }
    }
  }

  return selected
}

// ── calculateWinner (Borda count) ──────────────────────────────────────────────

export function calculateWinner(
  selectionMovies: Movie[],
  votes: Record<string, Record<number, number>> // voter -> movieId -> rank
): { winner: Movie; score: number } | null {
  const numMovies = selectionMovies.length
  const movieIds = selectionMovies.map(m => m.id)

  // Validate all voters ranked all movies with unique rankings
  for (const voter of Object.keys(votes)) {
    const rankings = votes[voter]
    const ranksUsed = new Set<number>()

    for (const movieId of movieIds) {
      const rank = rankings[movieId]
      if (!rank || rank < 1 || rank > numMovies) return null
      if (ranksUsed.has(rank)) return null
      ranksUsed.add(rank)
    }

    if (ranksUsed.size !== numMovies) return null
  }

  // Calculate Borda count
  const points: Record<number, number> = {}
  for (const movieId of movieIds) {
    points[movieId] = 0
  }

  for (const voter of Object.keys(votes)) {
    for (const movieId of movieIds) {
      const rank = votes[voter][movieId]
      points[movieId] += numMovies - rank + 1
    }
  }

  // Find winner
  let winnerId: number | null = null
  let maxPoints = -1

  for (const [movieId, pts] of Object.entries(points)) {
    if (pts > maxPoints) {
      maxPoints = pts
      winnerId = parseInt(movieId)
    }
  }

  const winner = selectionMovies.find(m => m.id === winnerId)
  if (!winner) return null

  return { winner, score: maxPoints }
}

// ── Mutations ──────────────────────────────────────────────────────────────────

export async function setCurrentSelection(movieIds: number[]) {
  await supabase.from('current_selection').delete().neq('id', '')
  if (movieIds.length > 0) {
    await supabase.from('current_selection').insert(movieIds.map(id => ({ movie_id: id })))
  }
}

export async function markWatched(movieId: number, score: number | null) {
  await supabase.from('current_selection').delete().eq('movie_id', movieId)
  await supabase.from('removed').delete().eq('movie_id', movieId)
  await supabase.from('watched').upsert({ movie_id: movieId, score }, { onConflict: 'movie_id' })
}

export async function unwatchMovie(movieId: number) {
  await supabase.from('watched').delete().eq('movie_id', movieId)
}

export async function removeMovie(movieId: number) {
  await supabase.from('current_selection').delete().eq('movie_id', movieId)
  await supabase.from('watched').delete().eq('movie_id', movieId)
  await supabase.from('removed').upsert({ movie_id: movieId }, { onConflict: 'movie_id' })
}

export async function restoreMovie(movieId: number) {
  await supabase.from('removed').delete().eq('movie_id', movieId)
}
