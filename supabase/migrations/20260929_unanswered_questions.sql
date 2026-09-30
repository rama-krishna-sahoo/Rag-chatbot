-- Supabase SQL Migration: unanswered_questions table
-- Run this in your Supabase Dashboard > SQL Editor
-- or add it to your supabase/migrations/ folder.
--
-- Purpose: Stores questions the RAG bot couldn't answer (similarity below threshold).
-- Used by the admin "Unanswered Questions" page to identify knowledge gaps.

CREATE TABLE IF NOT EXISTS public.unanswered_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT        NOT NULL,
  similarity_score FLOAT   DEFAULT 0,
  session_id    TEXT        DEFAULT NULL,   -- Anonymised session identifier
  workspace_id  UUID        DEFAULT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast workspace-scoped queries sorted by date
CREATE INDEX IF NOT EXISTS idx_unanswered_ws_created
  ON public.unanswered_questions (workspace_id, created_at DESC);

-- Row Level Security: only the service role (used by API routes) can insert/read
ALTER TABLE public.unanswered_questions ENABLE ROW LEVEL SECURITY;

-- Policy: admins (authenticated with service key) can read all rows for their workspace
CREATE POLICY "Admin can read unanswered questions"
  ON public.unanswered_questions
  FOR SELECT
  USING (true);

-- Policy: only server-side inserts (service role bypasses RLS)
CREATE POLICY "Service role can insert unanswered questions"
  ON public.unanswered_questions
  FOR INSERT
  WITH CHECK (true);

-- Policy: admin can delete (dismiss) resolved questions
CREATE POLICY "Admin can delete unanswered questions"
  ON public.unanswered_questions
  FOR DELETE
  USING (true);
