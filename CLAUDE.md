# Project Instructions

## Package Manager

- Always use `rpm` instead of `npm` (it is an alias for npm).
- Always use `rpx` instead of `npx` (it is an alias for npx).

## Project Overview

Family movie night picker PWA. Picks 6 random movies (weighted by genre scores), 4 family members vote using Borda count, winner is announced. Tracks watched/removed movies. No authentication.

## Tech Stack

- React (Vite) + TypeScript, configured as a PWA
- Supabase (Postgres + REST API) — client at `src/lib/supabase.ts`
- Tailwind CSS — dark mode only (`bg-slate-950` base)
- React Router — bottom tab nav (Pick / All Movies / History)

## Key Files

- `src/types.ts` — all TypeScript types (Movie, WatchedMovie, RemovedMovie, CurrentSelection, MovieWithStatus, Genre, VOTERS)
- `src/lib/hooks.ts` — data hooks (`useMovies`, `useCurrentSelection`) + standalone functions (`selectMovies`, `calculateWinner`) + mutations (`setCurrentSelection`, `markWatched`, `unwatchMovie`, `removeMovie`, `restoreMovie`)
- `src/lib/supabase.ts` — Supabase client init
- `src/components/Layout.tsx` — bottom tab bar shell
- `src/pages/` — PickMovie, AllMovies, History
- `src/components/` — MovieCard, TrailerModal, VotingPanel
- `supabase-schema.sql` — full DB schema (movies, watched, removed, current_selection)
- `seed-data.sql` — 100 movie INSERT statements

## Design Principles

- Dark mode only, mobile-first
- No React Context — hooks only
- Snake_case types matching Postgres columns
- Movies use INT primary keys (static seed data)
- 4 voters: Ritchie, Emily, Ada, Roxy

## Key Algorithms

### Weighted Random Selection
- Weight = 1 + (genre avg score / 10) — higher scored genres get more picks
- Weighted random without replacement, pick 6

### Borda Count Voting
- 4 voters rank all 6 movies (1-6)
- Points = numMovies - rank + 1 (1st = 6 pts)
- Highest total wins

## DB Tables

`movies` (100 seeded) → `watched` + `removed` + `current_selection`
