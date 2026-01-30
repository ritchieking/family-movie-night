const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Create tables
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS watched (
      movie_id INTEGER PRIMARY KEY,
      score INTEGER,
      watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS removed (
      movie_id INTEGER PRIMARY KEY,
      removed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS current_selection (
      movie_id INTEGER PRIMARY KEY,
      selected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Database tables initialized');
}

// API Routes

// Get current state
app.get('/api/state', async (req, res) => {
  try {
    const watched = await pool.query('SELECT movie_id, score FROM watched');
    const removed = await pool.query('SELECT movie_id FROM removed');
    const currentSelection = await pool.query('SELECT movie_id FROM current_selection');

    res.json({
      watched: watched.rows.map(w => ({ movieId: w.movie_id, score: w.score })),
      removed: removed.rows.map(r => r.movie_id),
      currentSelection: currentSelection.rows.map(c => c.movie_id)
    });
  } catch (err) {
    console.error('Error fetching state:', err);
    res.status(500).json({ error: 'Failed to fetch state' });
  }
});

// Set current selection
app.post('/api/selection', async (req, res) => {
  const { movieIds } = req.body;

  try {
    await pool.query('DELETE FROM current_selection');

    for (const id of movieIds) {
      await pool.query('INSERT INTO current_selection (movie_id) VALUES ($1)', [id]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error setting selection:', err);
    res.status(500).json({ error: 'Failed to set selection' });
  }
});

// Mark movie as watched
app.post('/api/watched', async (req, res) => {
  const { movieId, score } = req.body;

  try {
    // Remove from current selection and removed if present
    await pool.query('DELETE FROM current_selection WHERE movie_id = $1', [movieId]);
    await pool.query('DELETE FROM removed WHERE movie_id = $1', [movieId]);

    // Add to watched (upsert)
    await pool.query(`
      INSERT INTO watched (movie_id, score) VALUES ($1, $2)
      ON CONFLICT (movie_id) DO UPDATE SET score = EXCLUDED.score
    `, [movieId, score]);

    res.json({ success: true });
  } catch (err) {
    console.error('Error marking watched:', err);
    res.status(500).json({ error: 'Failed to mark as watched' });
  }
});

// Unwatch a movie
app.delete('/api/watched/:movieId', async (req, res) => {
  const movieId = parseInt(req.params.movieId);

  try {
    await pool.query('DELETE FROM watched WHERE movie_id = $1', [movieId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error unwatching:', err);
    res.status(500).json({ error: 'Failed to unwatch' });
  }
});

// Remove movie from consideration
app.post('/api/removed', async (req, res) => {
  const { movieId } = req.body;

  try {
    // Remove from current selection and watched if present
    await pool.query('DELETE FROM current_selection WHERE movie_id = $1', [movieId]);
    await pool.query('DELETE FROM watched WHERE movie_id = $1', [movieId]);

    // Add to removed (ignore if already there)
    await pool.query(`
      INSERT INTO removed (movie_id) VALUES ($1)
      ON CONFLICT (movie_id) DO NOTHING
    `, [movieId]);

    res.json({ success: true });
  } catch (err) {
    console.error('Error removing:', err);
    res.status(500).json({ error: 'Failed to remove' });
  }
});

// Restore a removed movie
app.delete('/api/removed/:movieId', async (req, res) => {
  const movieId = parseInt(req.params.movieId);

  try {
    await pool.query('DELETE FROM removed WHERE movie_id = $1', [movieId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error restoring:', err);
    res.status(500).json({ error: 'Failed to restore' });
  }
});

// Catch-all: serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
