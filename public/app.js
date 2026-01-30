// State management
let state = {
    available: [],      // Movies not yet watched or removed
    watched: [],        // { movie, score }
    removed: [],        // Movies removed from consideration
    currentSelection: [] // Current 6 movies being voted on
};

// API helpers
async function apiGet(endpoint) {
    const response = await fetch(endpoint);
    return response.json();
}

async function apiPost(endpoint, data) {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return response.json();
}

async function apiDelete(endpoint) {
    const response = await fetch(endpoint, { method: 'DELETE' });
    return response.json();
}

// Load state from server
async function loadState() {
    try {
        const data = await apiGet('/api/state');

        // Build watched list with full movie objects
        state.watched = data.watched.map(w => ({
            movie: MOVIES_DATABASE.find(m => m.id === w.movieId),
            score: w.score
        })).filter(w => w.movie);

        // Build removed list with full movie objects
        state.removed = data.removed
            .map(id => MOVIES_DATABASE.find(m => m.id === id))
            .filter(m => m);

        // Build current selection with full movie objects
        state.currentSelection = data.currentSelection
            .map(id => MOVIES_DATABASE.find(m => m.id === id))
            .filter(m => m);

        // Available = all movies minus watched and removed
        const watchedIds = new Set(state.watched.map(w => w.movie.id));
        const removedIds = new Set(state.removed.map(m => m.id));
        state.available = MOVIES_DATABASE.filter(m =>
            !watchedIds.has(m.id) && !removedIds.has(m.id)
        );

        renderAll();
    } catch (err) {
        console.error('Failed to load state:', err);
        // Fallback to all movies available
        state.available = [...MOVIES_DATABASE];
        renderAll();
    }
}

// Render all UI components
function renderAll() {
    renderMovieSelection();
    renderWatchedList();
    renderRemovedList();
}

// Get YouTube thumbnail URL
function getThumbnail(youtubeId) {
    return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
}

// Weighted random selection - higher scored movies get more weight
function selectMovies(count = 6) {
    if (state.available.length === 0) {
        return [];
    }

    // Create weighted pool
    const weightedPool = state.available.map(movie => {
        // Find if we've watched similar movies (same genre) with high scores
        const sameGenreWatched = state.watched.filter(w =>
            w.movie.genre === movie.genre && w.score !== null
        );
        let weight = 1;

        if (sameGenreWatched.length > 0) {
            const genreAvgScore = sameGenreWatched.reduce((sum, w) => sum + w.score, 0) / sameGenreWatched.length;
            // Higher weight for genres we've enjoyed
            weight = 1 + (genreAvgScore / 10);
        }

        return { movie, weight };
    });

    // Weighted random selection
    const selected = [];
    const poolCopy = [...weightedPool];

    while (selected.length < count && poolCopy.length > 0) {
        const totalWeight = poolCopy.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < poolCopy.length; i++) {
            random -= poolCopy[i].weight;
            if (random <= 0) {
                selected.push(poolCopy[i].movie);
                poolCopy.splice(i, 1);
                break;
            }
        }
    }

    return selected;
}

// Render current movie selection
function renderMovieSelection() {
    const grid = document.getElementById('movies-grid');

    if (state.currentSelection.length === 0) {
        grid.innerHTML = '<p class="empty-message">Click "Get New Movies" to start!</p>';
        document.getElementById('voting-section').classList.add('hidden');
        return;
    }

    grid.innerHTML = state.currentSelection.map(movie => `
        <div class="movie-card" data-id="${movie.id}">
            <div class="movie-poster" onclick="openTrailer('${movie.youtubeId}')">
                <img src="${getThumbnail(movie.youtubeId)}" alt="${movie.title}" onerror="this.style.display='none'">
                <div class="play-overlay">
                    <div class="play-icon"></div>
                </div>
            </div>
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
                <p class="movie-year">${movie.year} &bull; ${movie.genre}</p>
                <div class="movie-actions">
                    <button class="btn btn-danger btn-small" onclick="removeMovie(${movie.id})">Not Interested</button>
                </div>
            </div>
        </div>
    `).join('');

    // Show and setup voting section
    document.getElementById('voting-section').classList.remove('hidden');
    setupVoting();
}

// Setup voting UI
function setupVoting() {
    const voters = document.querySelectorAll('.voter');
    const numMovies = state.currentSelection.length;

    voters.forEach(voter => {
        const inputs = voter.querySelector('.rank-inputs');
        inputs.innerHTML = state.currentSelection.map(movie => `
            <div class="rank-input-row">
                <span>${movie.title}</span>
                <select data-movie-id="${movie.id}">
                    <option value="">-</option>
                    ${Array.from({length: numMovies}, (_, i) => i + 1).map(n => `<option value="${n}">${n}</option>`).join('')}
                </select>
            </div>
        `).join('');
    });

    // Reset winner display
    document.getElementById('winner-display').classList.add('hidden');
}

// Calculate winner using Borda count (rank order voting)
function calculateWinner() {
    const votes = {};
    state.currentSelection.forEach(movie => {
        votes[movie.id] = 0;
    });

    const voters = document.querySelectorAll('.voter');
    let allVotesValid = true;
    const numMovies = state.currentSelection.length;

    voters.forEach(voter => {
        const selects = voter.querySelectorAll('select');
        const ranksUsed = new Set();
        let voterValid = true;

        selects.forEach(select => {
            const rank = parseInt(select.value);
            if (!rank) {
                voterValid = false;
            } else if (ranksUsed.has(rank)) {
                voterValid = false;
            } else {
                ranksUsed.add(rank);
            }
        });

        if (!voterValid || ranksUsed.size !== numMovies) {
            allVotesValid = false;
            return;
        }

        // Borda count: 1st place gets N points, 2nd gets N-1, etc.
        selects.forEach(select => {
            const movieId = parseInt(select.dataset.movieId);
            const rank = parseInt(select.value);
            const points = numMovies - rank + 1;
            votes[movieId] += points;
        });
    });

    if (!allVotesValid) {
        alert(`Please make sure all voters have ranked all movies with unique rankings (1-${numMovies})`);
        return;
    }

    // Find winner
    let winnerId = null;
    let maxPoints = -1;

    for (const [movieId, points] of Object.entries(votes)) {
        if (points > maxPoints) {
            maxPoints = points;
            winnerId = parseInt(movieId);
        }
    }

    const winner = state.currentSelection.find(m => m.id === winnerId);
    const score = maxPoints;

    // Display winner
    const winnerDisplay = document.getElementById('winner-display');
    winnerDisplay.innerHTML = `
        <h3>Tonight's Winner!</h3>
        <div class="winner-title">${winner.title}</div>
        <p>Score: ${score} points</p>
        <button class="btn btn-primary" onclick="openTrailer('${winner.youtubeId}')">Watch Trailer</button>
        <button class="btn btn-success" onclick="markWatched(${winner.id}, ${score})">We Watched It!</button>
    `;
    winnerDisplay.classList.remove('hidden');
}

// Mark movie as watched
async function markWatched(movieId, score) {
    const movie = MOVIES_DATABASE.find(m => m.id === movieId);
    if (!movie) return;

    await apiPost('/api/watched', { movieId, score });

    // Update local state
    state.available = state.available.filter(m => m.id !== movieId);
    state.currentSelection = state.currentSelection.filter(m => m.id !== movieId);
    state.removed = state.removed.filter(m => m.id !== movieId);

    // Remove existing watched entry if any, then add new one
    state.watched = state.watched.filter(w => w.movie.id !== movieId);
    state.watched.push({ movie, score });

    // Save empty selection to server
    await apiPost('/api/selection', { movieIds: [] });
    state.currentSelection = [];

    renderAll();
}

// Remove movie from consideration
async function removeMovie(movieId) {
    const movie = MOVIES_DATABASE.find(m => m.id === movieId);
    if (!movie) return;

    await apiPost('/api/removed', { movieId });

    // Update local state
    state.available = state.available.filter(m => m.id !== movieId);
    state.currentSelection = state.currentSelection.filter(m => m.id !== movieId);
    state.watched = state.watched.filter(w => w.movie.id !== movieId);

    if (!state.removed.some(m => m.id === movieId)) {
        state.removed.push(movie);
    }

    renderMovieSelection();
    renderRemovedList();
}

// Restore removed movie
async function restoreMovie(movieId) {
    await apiDelete(`/api/removed/${movieId}`);

    const movie = state.removed.find(m => m.id === movieId);
    if (movie) {
        state.removed = state.removed.filter(m => m.id !== movieId);
        state.available.push(movie);
    }

    renderRemovedList();
}

// Render watched list
function renderWatchedList() {
    const list = document.getElementById('watched-list');

    if (state.watched.length === 0) {
        list.innerHTML = '<p class="empty-message">No movies watched yet</p>';
        return;
    }

    // Sort: scored movies first (by score descending), then unscored alphabetically
    const sorted = [...state.watched].sort((a, b) => {
        if (a.score !== null && b.score !== null) {
            return b.score - a.score;
        }
        if (a.score !== null) return -1;
        if (b.score !== null) return 1;
        return a.movie.title.localeCompare(b.movie.title);
    });

    list.innerHTML = sorted.map(({ movie, score }) => `
        <div class="watched-item">
            <span class="movie-name">${movie.title} (${movie.year})</span>
            ${score !== null ? `<span class="score">${score} pts</span>` : '<span class="score" style="opacity: 0.5">No score</span>'}
            <button class="btn btn-secondary btn-small" onclick="unwatchMovie(${movie.id})">Unmark</button>
        </div>
    `).join('');
}

// Render removed list
function renderRemovedList() {
    const list = document.getElementById('removed-list');

    if (state.removed.length === 0) {
        list.innerHTML = '<p class="empty-message">No removed movies</p>';
        return;
    }

    list.innerHTML = state.removed.map(movie => `
        <div class="removed-item">
            <span class="movie-name">${movie.title} (${movie.year})</span>
            <button class="btn btn-primary btn-small" onclick="restoreMovie(${movie.id})">Restore</button>
        </div>
    `).join('');
}

// Open trailer modal
function openTrailer(youtubeId) {
    const modal = document.getElementById('trailer-modal');
    const container = document.getElementById('trailer-container');

    container.innerHTML = `
        <iframe
            src="https://www.youtube.com/embed/${youtubeId}?autoplay=1"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen>
        </iframe>
    `;

    modal.classList.remove('hidden');
}

// Close trailer modal
function closeTrailer() {
    const modal = document.getElementById('trailer-modal');
    const container = document.getElementById('trailer-container');

    container.innerHTML = '';
    modal.classList.add('hidden');
}

// Get new movie selection
async function getNewMovies() {
    state.currentSelection = selectMovies(6);

    // Save to server
    await apiPost('/api/selection', {
        movieIds: state.currentSelection.map(m => m.id)
    });

    renderMovieSelection();
}

// Tab switching
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });

    // Render all movies list when switching to that tab
    if (tabName === 'all') {
        renderAllMoviesList();
    }
}

// Get movie status
function getMovieStatus(movieId) {
    if (state.watched.some(w => w.movie.id === movieId)) return 'watched';
    if (state.removed.some(m => m.id === movieId)) return 'removed';
    return 'available';
}

// Get movie score if watched
function getMovieScore(movieId) {
    const watched = state.watched.find(w => w.movie.id === movieId);
    return watched ? watched.score : null;
}

// Populate genre filter
function populateGenreFilter() {
    const genres = [...new Set(MOVIES_DATABASE.map(m => m.genre))].sort();
    const select = document.getElementById('genre-filter');
    select.innerHTML = '<option value="">All Genres</option>' +
        genres.map(g => `<option value="${g}">${g}</option>`).join('');
}

// Render all movies list
function renderAllMoviesList() {
    const list = document.getElementById('all-movies-list');
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const genreFilter = document.getElementById('genre-filter').value;
    const statusFilter = document.getElementById('status-filter').value;

    let movies = MOVIES_DATABASE.filter(movie => {
        // Search filter
        if (searchTerm && !movie.title.toLowerCase().includes(searchTerm)) {
            return false;
        }
        // Genre filter
        if (genreFilter && movie.genre !== genreFilter) {
            return false;
        }
        // Status filter
        if (statusFilter) {
            const status = getMovieStatus(movie.id);
            if (status !== statusFilter) {
                return false;
            }
        }
        return true;
    });

    // Sort: available first, then watched, then removed
    movies.sort((a, b) => {
        const statusOrder = { available: 0, watched: 1, removed: 2 };
        const statusA = getMovieStatus(a.id);
        const statusB = getMovieStatus(b.id);
        if (statusOrder[statusA] !== statusOrder[statusB]) {
            return statusOrder[statusA] - statusOrder[statusB];
        }
        return a.title.localeCompare(b.title);
    });

    if (movies.length === 0) {
        list.innerHTML = '<p class="empty-message">No movies match your filters</p>';
        return;
    }

    list.innerHTML = movies.map(movie => {
        const status = getMovieStatus(movie.id);
        const score = getMovieScore(movie.id);

        let statusBadge = '';
        if (status === 'watched') {
            statusBadge = `<span class="movie-status-badge watched">Watched${score ? ` (${score} pts)` : ''}</span>`;
        } else if (status === 'removed') {
            statusBadge = '<span class="movie-status-badge removed">Removed</span>';
        }

        let actions = '';
        if (status === 'available') {
            actions = `
                <button class="btn btn-watched btn-small" onclick="markWatchedFromList(${movie.id})">Mark Watched</button>
                <button class="btn btn-danger btn-small" onclick="removeMovie(${movie.id}); renderAllMoviesList();">Remove</button>
            `;
        } else if (status === 'watched') {
            actions = `<button class="btn btn-secondary btn-small" onclick="unwatchMovie(${movie.id})">Unmark</button>`;
        } else if (status === 'removed') {
            actions = `<button class="btn btn-primary btn-small" onclick="restoreMovie(${movie.id}); renderAllMoviesList();">Restore</button>`;
        }

        return `
            <div class="all-movie-item status-${status}">
                <div class="movie-details">
                    <div class="movie-name">${movie.title}</div>
                    <div class="movie-meta">${movie.year} &bull; ${movie.genre}</div>
                </div>
                ${statusBadge}
                <div class="movie-actions">
                    <button class="btn btn-secondary btn-small" onclick="openTrailer('${movie.youtubeId}')">Trailer</button>
                    ${actions}
                </div>
            </div>
        `;
    }).join('');
}

// Mark movie as watched from the all movies list (without score)
async function markWatchedFromList(movieId) {
    const movie = MOVIES_DATABASE.find(m => m.id === movieId);
    if (!movie) return;

    await apiPost('/api/watched', { movieId, score: null });

    // Update local state
    state.available = state.available.filter(m => m.id !== movieId);
    state.currentSelection = state.currentSelection.filter(m => m.id !== movieId);
    state.watched.push({ movie, score: null });

    renderAllMoviesList();
    renderWatchedList();
    renderMovieSelection();
}

// Unwatch a movie (move back to available)
async function unwatchMovie(movieId) {
    await apiDelete(`/api/watched/${movieId}`);

    const watchedEntry = state.watched.find(w => w.movie.id === movieId);
    if (watchedEntry) {
        state.watched = state.watched.filter(w => w.movie.id !== movieId);
        state.available.push(watchedEntry.movie);
    }

    renderAllMoviesList();
    renderWatchedList();
}

// Event listeners
document.getElementById('new-selection-btn').addEventListener('click', getNewMovies);
document.getElementById('calculate-winner-btn').addEventListener('click', calculateWinner);
document.querySelector('.modal-close').addEventListener('click', closeTrailer);
document.getElementById('trailer-modal').addEventListener('click', (e) => {
    if (e.target.id === 'trailer-modal') {
        closeTrailer();
    }
});

// Tab event listeners
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// Filter event listeners
document.getElementById('search-input').addEventListener('input', renderAllMoviesList);
document.getElementById('genre-filter').addEventListener('change', renderAllMoviesList);
document.getElementById('status-filter').addEventListener('change', renderAllMoviesList);

// Keyboard escape to close modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeTrailer();
    }
});

// Initialize
populateGenreFilter();
loadState();
