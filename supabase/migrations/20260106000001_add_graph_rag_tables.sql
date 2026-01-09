-- ============================================================================
-- GRAPH RAG TABLES - Entity-Relationship Storage for Agentic Retrieval
-- ============================================================================
-- This migration creates the graph structure needed for:
-- 1. Entity extraction and storage
-- 2. Relationship tracking between entities
-- 3. Document-entity mappings
-- 4. Query plan caching
-- ============================================================================

-- ============================================================================
-- ENTITY TYPES ENUM
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE entity_type AS ENUM (
        'organization',      -- SA Government departments, agencies
        'program',          -- Government programs, initiatives
        'policy',           -- Policies, regulations
        'funding',          -- Grants, funding allocations
        'skill',            -- Job skills, competencies
        'occupation',       -- Job titles, career paths
        'location',         -- SA regions, suburbs
        'sector',           -- Industry sectors
        'qualification',    -- Certifications, degrees
        'date_period',      -- Budget years, time periods
        'metric',           -- Statistics, KPIs
        'person'            -- Key officials (if public)
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- RELATIONSHIP TYPES ENUM
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE relationship_type AS ENUM (
        'funds',            -- Organization funds Program
        'employs',          -- Organization employs Occupation
        'requires',         -- Occupation requires Skill
        'located_in',       -- Organization located in Location
        'part_of',          -- Program part of Policy
        'targets',          -- Program targets Sector
        'leads_to',         -- Qualification leads to Occupation
        'replaces',         -- Policy replaces Policy
        'contradicts',      -- Policy contradicts Policy
        'supports',         -- Program supports Program
        'competes_with',    -- Organization competes with Organization
        'related_to',       -- Generic relationship
        'mentions',         -- Document mentions Entity
        'allocates',        -- Budget allocates Funding
        'certifies'         -- Organization certifies Qualification
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- ENTITIES TABLE - Core entity storage
-- ============================================================================
CREATE TABLE IF NOT EXISTS graph_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Entity identification
    name TEXT NOT NULL,
    canonical_name TEXT NOT NULL,  -- Normalized name for matching
    entity_type entity_type NOT NULL,
    
    -- Entity metadata
    description TEXT,
    aliases TEXT[] DEFAULT '{}',   -- Alternative names
    properties JSONB DEFAULT '{}', -- Type-specific properties
    
    -- Source tracking
    source_documents TEXT[] DEFAULT '{}',  -- Document IDs where entity appears
    first_seen_document TEXT,
    confidence_score DECIMAL(3,2) DEFAULT 0.80,  -- 0-1 extraction confidence
    
    -- Temporal tracking
    valid_from DATE,               -- When entity became relevant
    valid_until DATE,              -- When entity became obsolete (null = still valid)
    
    -- Embedding for semantic matching
    embedding vector(1536),        -- For finding similar entities
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    extraction_method TEXT DEFAULT 'manual',  -- 'manual', 'gpt4', 'ner', 'regex'
    
    -- Constraints
    CONSTRAINT unique_entity UNIQUE (canonical_name, entity_type)
);

-- ============================================================================
-- RELATIONSHIPS TABLE - Entity connections
-- ============================================================================
CREATE TABLE IF NOT EXISTS graph_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationship endpoints
    source_entity_id UUID NOT NULL REFERENCES graph_entities(id) ON DELETE CASCADE,
    target_entity_id UUID NOT NULL REFERENCES graph_entities(id) ON DELETE CASCADE,
    relationship_type relationship_type NOT NULL,
    
    -- Relationship metadata
    description TEXT,
    properties JSONB DEFAULT '{}',  -- Type-specific properties
    strength DECIMAL(3,2) DEFAULT 0.80,  -- 0-1 relationship strength
    
    -- Source tracking
    source_document TEXT,           -- Document where relationship was found
    source_chunk_id TEXT,           -- Specific chunk
    evidence_text TEXT,             -- Text that supports this relationship
    
    -- Temporal tracking
    valid_from DATE,
    valid_until DATE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    extraction_method TEXT DEFAULT 'manual',
    
    -- Constraints
    CONSTRAINT no_self_relationship CHECK (source_entity_id != target_entity_id),
    CONSTRAINT unique_relationship UNIQUE (source_entity_id, target_entity_id, relationship_type)
);

-- ============================================================================
-- DOCUMENT-ENTITY MAPPING - Which entities appear in which documents
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_entity_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Mapping
    document_id TEXT NOT NULL,
    chunk_id TEXT,                  -- Optional specific chunk
    entity_id UUID NOT NULL REFERENCES graph_entities(id) ON DELETE CASCADE,
    
    -- Context
    mention_count INTEGER DEFAULT 1,
    mention_positions INTEGER[] DEFAULT '{}',  -- Character positions in document
    context_snippets TEXT[] DEFAULT '{}',      -- Surrounding text for each mention
    is_primary_topic BOOLEAN DEFAULT FALSE,    -- Is this entity the main topic?
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_doc_entity UNIQUE (document_id, entity_id, chunk_id)
);

-- ============================================================================
-- QUERY PLANS CACHE - Store successful agentic query plans
-- ============================================================================
CREATE TABLE IF NOT EXISTS agentic_query_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Query identification
    query_text TEXT NOT NULL,
    query_embedding vector(1536),   -- For finding similar queries
    query_hash TEXT NOT NULL,       -- SHA256 hash for exact matching
    
    -- Plan details
    plan JSONB NOT NULL,            -- The query plan
    strategy TEXT NOT NULL,         -- 'multi_step', 'graph_traversal', 'hybrid'
    
    -- Execution stats
    execution_count INTEGER DEFAULT 1,
    avg_execution_time_ms INTEGER,
    success_rate DECIMAL(3,2) DEFAULT 1.0,
    last_executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Quality metrics
    avg_user_rating DECIMAL(3,2),
    avg_confidence DECIMAL(3,2),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_query_hash UNIQUE (query_hash)
);

-- ============================================================================
-- CONTRADICTION TRACKING - Track discovered contradictions
-- ============================================================================
CREATE TABLE IF NOT EXISTS graph_contradictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Contradiction details
    contradiction_type TEXT NOT NULL,  -- 'policy_conflict', 'funding_mismatch', 'data_inconsistency'
    severity TEXT NOT NULL DEFAULT 'medium',  -- 'high', 'medium', 'low'
    
    -- Sources
    source1_document TEXT NOT NULL,
    source1_chunk_id TEXT,
    source1_text TEXT,
    
    source2_document TEXT NOT NULL,
    source2_chunk_id TEXT,
    source2_text TEXT,
    
    -- Analysis
    description TEXT NOT NULL,
    resolution_notes TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    
    -- Entity references (if applicable)
    related_entity_ids UUID[] DEFAULT '{}',
    
    -- Metadata
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    discovered_by TEXT DEFAULT 'agentic_rag',  -- 'agentic_rag', 'manual', 'user_report'
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Entity indexes
CREATE INDEX IF NOT EXISTS idx_entities_type ON graph_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_canonical ON graph_entities(canonical_name);
CREATE INDEX IF NOT EXISTS idx_entities_valid ON graph_entities(valid_from, valid_until);

-- Relationship indexes
CREATE INDEX IF NOT EXISTS idx_relationships_source ON graph_relationships(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON graph_relationships(target_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_type ON graph_relationships(relationship_type);

-- Document-entity map indexes
CREATE INDEX IF NOT EXISTS idx_doc_entity_document ON document_entity_map(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_entity_entity ON document_entity_map(entity_id);
CREATE INDEX IF NOT EXISTS idx_doc_entity_primary ON document_entity_map(is_primary_topic) WHERE is_primary_topic = TRUE;

-- Query plans indexes
CREATE INDEX IF NOT EXISTS idx_query_plans_hash ON agentic_query_plans(query_hash);

-- Vector indexes for semantic search (using pgvector)
CREATE INDEX IF NOT EXISTS idx_entities_embedding ON graph_entities 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_query_plans_embedding ON agentic_query_plans 
    USING ivfflat (query_embedding vector_cosine_ops) WITH (lists = 50);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get all entities related to a given entity (1-hop)
CREATE OR REPLACE FUNCTION get_related_entities(
    p_entity_id UUID,
    p_relationship_type relationship_type DEFAULT NULL,
    p_direction TEXT DEFAULT 'both'  -- 'outgoing', 'incoming', 'both'
)
RETURNS TABLE (
    entity_id UUID,
    entity_name TEXT,
    entity_type entity_type,
    relationship relationship_type,
    relationship_strength DECIMAL,
    direction TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.entity_type,
        r.relationship_type,
        r.strength,
        CASE WHEN r.source_entity_id = p_entity_id THEN 'outgoing' ELSE 'incoming' END
    FROM graph_entities e
    JOIN graph_relationships r ON (
        (p_direction IN ('both', 'outgoing') AND r.source_entity_id = p_entity_id AND r.target_entity_id = e.id)
        OR
        (p_direction IN ('both', 'incoming') AND r.target_entity_id = p_entity_id AND r.source_entity_id = e.id)
    )
    WHERE (p_relationship_type IS NULL OR r.relationship_type = p_relationship_type)
    AND (e.valid_until IS NULL OR e.valid_until > CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- Function to find path between two entities (up to 3 hops)
CREATE OR REPLACE FUNCTION find_entity_path(
    p_source_id UUID,
    p_target_id UUID,
    p_max_depth INTEGER DEFAULT 3
)
RETURNS TABLE (
    path_depth INTEGER,
    path_entities UUID[],
    path_relationships relationship_type[]
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE entity_paths AS (
        -- Base case: direct relationships
        SELECT 
            1 AS depth,
            ARRAY[p_source_id, r.target_entity_id] AS entities,
            ARRAY[r.relationship_type] AS relationships
        FROM graph_relationships r
        WHERE r.source_entity_id = p_source_id
        
        UNION ALL
        
        -- Recursive case: extend paths
        SELECT 
            ep.depth + 1,
            ep.entities || r.target_entity_id,
            ep.relationships || r.relationship_type
        FROM entity_paths ep
        JOIN graph_relationships r ON r.source_entity_id = ep.entities[array_length(ep.entities, 1)]
        WHERE ep.depth < p_max_depth
        AND NOT (r.target_entity_id = ANY(ep.entities))  -- Avoid cycles
    )
    SELECT 
        ep.depth,
        ep.entities,
        ep.relationships
    FROM entity_paths ep
    WHERE ep.entities[array_length(ep.entities, 1)] = p_target_id
    ORDER BY ep.depth
    LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Function to get entities by document
CREATE OR REPLACE FUNCTION get_document_entities(
    p_document_id TEXT,
    p_primary_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    entity_id UUID,
    entity_name TEXT,
    entity_type entity_type,
    mention_count INTEGER,
    is_primary BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.entity_type,
        dem.mention_count,
        dem.is_primary_topic
    FROM graph_entities e
    JOIN document_entity_map dem ON dem.entity_id = e.id
    WHERE dem.document_id = p_document_id
    AND (NOT p_primary_only OR dem.is_primary_topic = TRUE)
    ORDER BY dem.is_primary_topic DESC, dem.mention_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to find similar queries (for plan reuse)
CREATE OR REPLACE FUNCTION find_similar_query_plans(
    p_query_embedding vector(1536),
    p_similarity_threshold DECIMAL DEFAULT 0.85,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    plan_id UUID,
    query_text TEXT,
    plan JSONB,
    similarity DECIMAL,
    success_rate DECIMAL,
    execution_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qp.id,
        qp.query_text,
        qp.plan,
        (1 - (qp.query_embedding <=> p_query_embedding))::DECIMAL AS sim,
        qp.success_rate,
        qp.execution_count
    FROM agentic_query_plans qp
    WHERE qp.query_embedding IS NOT NULL
    AND (1 - (qp.query_embedding <=> p_query_embedding)) >= p_similarity_threshold
    ORDER BY sim DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE graph_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_entity_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentic_query_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_contradictions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all graph data
CREATE POLICY "Allow authenticated read on graph_entities"
    ON graph_entities FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated read on graph_relationships"
    ON graph_relationships FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated read on document_entity_map"
    ON document_entity_map FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated read on agentic_query_plans"
    ON agentic_query_plans FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated read on graph_contradictions"
    ON graph_contradictions FOR SELECT
    TO authenticated
    USING (true);

-- Allow service role full access (for Azure Functions)
CREATE POLICY "Allow service role all on graph_entities"
    ON graph_entities FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service role all on graph_relationships"
    ON graph_relationships FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service role all on document_entity_map"
    ON document_entity_map FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service role all on agentic_query_plans"
    ON agentic_query_plans FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service role all on graph_contradictions"
    ON graph_contradictions FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- SEED INITIAL ENTITIES (SA Government)
-- ============================================================================

INSERT INTO graph_entities (name, canonical_name, entity_type, description, properties) VALUES
-- Major SA Government Organizations
('Department for Education', 'department_for_education', 'organization', 
 'SA Government department responsible for education policy and schools',
 '{"portfolio": "education", "url": "https://www.education.sa.gov.au"}'),

('SA Health', 'sa_health', 'organization',
 'SA Government health department',
 '{"portfolio": "health", "url": "https://www.sahealth.sa.gov.au"}'),

('Department for Industry, Innovation and Science', 'diis', 'organization',
 'SA Government department for industry and innovation',
 '{"portfolio": "industry"}'),

('TAFE SA', 'tafe_sa', 'organization',
 'South Australia''s largest vocational education provider',
 '{"type": "education_provider", "url": "https://www.tafesa.edu.au"}'),

('Skills SA', 'skills_sa', 'program',
 'SA Government skills and workforce development initiative',
 '{"focus": "workforce_development"}'),

-- Key Sectors
('Healthcare', 'healthcare', 'sector', 'Healthcare and medical services sector', '{}'),
('Education', 'education', 'sector', 'Education and training sector', '{}'),
('Information Technology', 'information_technology', 'sector', 'IT and digital services sector', '{}'),
('Defence', 'defence', 'sector', 'Defence and space industry sector', '{}'),
('Renewable Energy', 'renewable_energy', 'sector', 'Clean energy and sustainability sector', '{}'),
('Construction', 'construction', 'sector', 'Building and construction sector', '{}'),
('Agriculture', 'agriculture', 'sector', 'Farming and agribusiness sector', '{}'),

-- Key Locations
('Adelaide', 'adelaide', 'location', 'South Australia''s capital city', '{"type": "city"}'),
('Adelaide CBD', 'adelaide_cbd', 'location', 'Central business district', '{"type": "district"}'),
('Northern Adelaide', 'northern_adelaide', 'location', 'Northern suburbs region', '{"type": "region"}'),
('Southern Adelaide', 'southern_adelaide', 'location', 'Southern suburbs region', '{"type": "region"}'),
('Regional SA', 'regional_sa', 'location', 'Regional South Australia', '{"type": "region"}')

ON CONFLICT (canonical_name, entity_type) DO NOTHING;

-- Add some initial relationships
INSERT INTO graph_relationships (source_entity_id, target_entity_id, relationship_type, description, strength)
SELECT 
    s.id, t.id, 'located_in'::relationship_type, 'Organization located in Adelaide', 0.95
FROM graph_entities s, graph_entities t
WHERE s.canonical_name IN ('department_for_education', 'sa_health', 'tafe_sa', 'skills_sa')
AND t.canonical_name = 'adelaide'
ON CONFLICT (source_entity_id, target_entity_id, relationship_type) DO NOTHING;

INSERT INTO graph_relationships (source_entity_id, target_entity_id, relationship_type, description, strength)
SELECT 
    s.id, t.id, 'targets'::relationship_type, 'Program targets sector', 0.90
FROM graph_entities s, graph_entities t
WHERE s.canonical_name = 'skills_sa'
AND t.entity_type = 'sector'
ON CONFLICT (source_entity_id, target_entity_id, relationship_type) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE graph_entities IS 'Stores entities extracted from documents for graph RAG';
COMMENT ON TABLE graph_relationships IS 'Stores relationships between entities';
COMMENT ON TABLE document_entity_map IS 'Maps entities to their source documents';
COMMENT ON TABLE agentic_query_plans IS 'Caches successful query plans for reuse';
COMMENT ON TABLE graph_contradictions IS 'Tracks contradictions found between documents';

COMMENT ON FUNCTION get_related_entities IS 'Returns entities connected to a given entity';
COMMENT ON FUNCTION find_entity_path IS 'Finds paths between two entities up to N hops';
COMMENT ON FUNCTION get_document_entities IS 'Returns all entities mentioned in a document';
COMMENT ON FUNCTION find_similar_query_plans IS 'Finds similar cached query plans using embeddings';
