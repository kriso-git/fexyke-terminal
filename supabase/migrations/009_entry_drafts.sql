-- Draft / published status on entries
ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published'
  CHECK (status IN ('draft', 'published'));

CREATE INDEX IF NOT EXISTS idx_entries_status ON public.entries(status);
