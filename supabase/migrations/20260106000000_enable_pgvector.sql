-- Enable pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension is available
COMMENT ON EXTENSION vector IS 'pgvector extension for vector similarity search';
