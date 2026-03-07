-- =============================================================================
-- Migration 012: AI
-- =============================================================================
-- Design: ai_chunks for RAG (embeddings stored in pgvector or external; chunk
-- metadata here). ai_prompt_templates: reusable prompts. ai_interaction_logs:
-- audit trail. ai_saved_outputs: user-saved AI responses (mnemonics, flashcards).
-- =============================================================================

-- pgvector: Enable for local embeddings. Run: CREATE EXTENSION IF NOT EXISTS vector;
-- Then add: embedding vector(1536) to ai_chunks and create ivfflat index.

-- -----------------------------------------------------------------------------
-- ai_chunks
-- -----------------------------------------------------------------------------
-- Chunk metadata for RAG. Embedding vector stored in embedding column (pgvector)
-- or in external service. content_type + content_id links to source.
CREATE TABLE ai_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL, -- 'study_section', 'topic_summary', 'question_stem'
  content_id UUID NOT NULL,
  chunk_index INT NOT NULL,
  chunk_text TEXT NOT NULL,
  -- Optional: pgvector embedding. Uncomment if using local embeddings.
  -- embedding vector(1536), -- OpenAI text-embedding-3-small
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(content_type, content_id, chunk_index)
);

CREATE INDEX idx_ai_chunks_content ON ai_chunks(content_type, content_id);
-- For vector similarity search (when using pgvector):
-- CREATE INDEX idx_ai_chunks_embedding ON ai_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- -----------------------------------------------------------------------------
-- ai_prompt_templates
-- -----------------------------------------------------------------------------
-- Reusable prompts for explain, mnemonic, flashcards, summarize, weak-area coaching.
CREATE TABLE ai_prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL, -- With {{placeholders}}
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_prompt_templates_slug ON ai_prompt_templates(slug);

-- -----------------------------------------------------------------------------
-- ai_interaction_logs
-- -----------------------------------------------------------------------------
-- Audit trail for AI usage. Rate limiting, debugging, compliance.
CREATE TABLE ai_interaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  interaction_type TEXT NOT NULL, -- 'explain', 'mnemonic', 'flashcards', 'summarize', 'coaching'
  prompt_tokens INT,
  completion_tokens INT,
  model TEXT,
  -- Optional: content referenced (for RAG)
  content_refs JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_interaction_logs_user ON ai_interaction_logs(user_id);
CREATE INDEX idx_ai_interaction_logs_created ON ai_interaction_logs(created_at DESC);
-- Partitioning note: Consider partitioning by created_at (monthly) for scale

-- -----------------------------------------------------------------------------
-- ai_saved_outputs
-- -----------------------------------------------------------------------------
-- User-saved AI outputs: mnemonics, generated flashcards, summaries.
CREATE TABLE ai_saved_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  output_type TEXT NOT NULL, -- 'mnemonic', 'flashcard_set', 'summary', 'explanation'
  -- Source context
  source_content_type TEXT,
  source_content_id UUID,
  source_highlight_text TEXT,
  -- Output content
  output_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_saved_outputs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ai_saved_outputs_user ON ai_saved_outputs(user_id);
CREATE INDEX idx_ai_saved_outputs_type ON ai_saved_outputs(user_id, output_type);
