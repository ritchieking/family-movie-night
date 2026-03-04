-- Movies table (seeded with 100 movies)
CREATE TABLE movies (
  id INT PRIMARY KEY,
  title TEXT NOT NULL,
  year INT NOT NULL,
  youtube_id TEXT NOT NULL,
  genre TEXT NOT NULL
);

-- Watched movies
CREATE TABLE watched (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id INT UNIQUE NOT NULL REFERENCES movies(id),
  score INT,
  watched_at TIMESTAMPTZ DEFAULT now()
);

-- Removed movies (not interested)
CREATE TABLE removed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id INT UNIQUE NOT NULL REFERENCES movies(id),
  removed_at TIMESTAMPTZ DEFAULT now()
);

-- Current selection for voting
CREATE TABLE current_selection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id INT UNIQUE NOT NULL REFERENCES movies(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE watched ENABLE ROW LEVEL SECURITY;
ALTER TABLE removed ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_selection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON movies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON watched FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON removed FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON current_selection FOR ALL USING (true) WITH CHECK (true);
