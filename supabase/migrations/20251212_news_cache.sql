-- News Articles Cache Table
-- Stores fetched news articles to reduce API calls and improve performance

CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL, -- Original ID from the API
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  source TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  category TEXT DEFAULT 'general',
  image_url TEXT,
  read_time TEXT,
  
  -- Metadata for cache management
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  keywords TEXT[], -- Store keywords used to fetch this article
  
  -- Prevent duplicates
  UNIQUE(url)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_news_articles_category ON news_articles(category);
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_fetched_at ON news_articles(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_keywords ON news_articles USING GIN(keywords);

-- Function to clean old articles (keep last 400 days for ~1 year of data)
CREATE OR REPLACE FUNCTION clean_old_news_articles()
RETURNS void AS $$
BEGIN
  DELETE FROM news_articles 
  WHERE published_at < NOW() - INTERVAL '400 days';
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to clean old articles weekly
-- Run this manually or set up a cron job:
-- SELECT clean_old_news_articles();

-- Enable Row Level Security
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read articles
CREATE POLICY "Anyone can read news articles"
  ON news_articles FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert/update/delete (from edge functions)
CREATE POLICY "Service role can manage news articles"
  ON news_articles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE news_articles IS 'Cached news articles from external APIs to reduce API calls and improve performance';
