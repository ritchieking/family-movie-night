const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite database
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'movies.db');
const db = new Database(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS watched (
    movie_id INTEGER PRIMARY KEY,
    score INTEGER,
    watched_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS removed (
    movie_id INTEGER PRIMARY KEY,
    removed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS current_selection (
    movie_id INTEGER PRIMARY KEY,
    selected_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// API Routes

// Get current state
app.get('/api/state', (req, res) => {
  const watched = db.prepare('SELECT movie_id, score FROM watched').all();
  const removed = db.prepare('SELECT movie_id FROM removed').all();
  const currentSelection = db.prepare('SELECT movie_id FROM current_selection').all();

  res.json({
    watched: watched.map(w => ({ movieId: w.movie_id, score: w.score })),
    removed: removed.map(r => r.movie_id),
    currentSelection: currentSelection.map(c => c.movie_id)
  });
});

// Set current selection
app.post('/api/selection', (req, res) => {
  const { movieIds } = req.body;

  db.prepare('DELETE FROM current_selection').run();

  const insert = db.prepare('INSERT INTO current_selection (movie_id) VALUES (?)');
  const insertMany = db.transaction((ids) => {
    for (const id of ids) {
      insert.run(id);
    }
  });

  insertMany(movieIds);
  res.json({ success: true });
});

// Mark movie as watched
app.post('/api/watched', (req, res) => {
  const { movieId, score } = req.body;

  // Remove from current selection and removed if present
  db.prepare('DELETE FROM current_selection WHERE movie_id = ?').run(movieId);
  db.prepare('DELETE FROM removed WHERE movie_id = ?').run(movieId);

  // Add to watched (upsert)
  db.prepare(`
    INSERT INTO watched (movie_id, score) VALUES (?, ?)
    ON CONFLICT(movie_id) DO UPDATE SET score = excluded.score
  `).run(movieId, score);

  res.json({ success: true });
});

// Unwatch a movie
app.delete('/api/watched/:movieId', (req, res) => {
  const movieId = parseInt(req.params.movieId);
  db.prepare('DELETE FROM watched WHERE movie_id = ?').run(movieId);
  res.json({ success: true });
});

// Remove movie from consideration
app.post('/api/removed', (req, res) => {
  const { movieId } = req.body;

  // Remove from current selection and watched if present
  db.prepare('DELETE FROM current_selection WHERE movie_id = ?').run(movieId);
  db.prepare('DELETE FROM watched WHERE movie_id = ?').run(movieId);

  // Add to removed (ignore if already there)
  db.prepare('INSERT OR IGNORE INTO removed (movie_id) VALUES (?)').run(movieId);

  res.json({ success: true });
});

// Restore a removed movie
app.delete('/api/removed/:movieId', (req, res) => {
  const movieId = parseInt(req.params.movieId);
  db.prepare('DELETE FROM removed WHERE movie_id = ?').run(movieId);
  res.json({ success: true });
});

// Catch-all: serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
