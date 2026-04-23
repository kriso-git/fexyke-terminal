-- Media fields
ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS media_url   TEXT,
  ADD COLUMN IF NOT EXISTS media_type  TEXT CHECK (media_type IN ('youtube','image','audio')),
  ADD COLUMN IF NOT EXISTS media_label TEXT;

-- Reactions
CREATE TABLE IF NOT EXISTS public.entry_reactions (
  entry_id    TEXT        NOT NULL REFERENCES public.entries(id)   ON DELETE CASCADE,
  operator_id TEXT        NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  emoji       TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entry_id, operator_id, emoji)
);

ALTER TABLE public.entry_reactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='entry_reactions' AND policyname='reactions_read') THEN
    CREATE POLICY reactions_read ON public.entry_reactions FOR SELECT USING (true);
  END IF;
END $$;
