-- Reactions on entry comments (signals)
CREATE TABLE IF NOT EXISTS public.signal_reactions (
  signal_id   UUID NOT NULL REFERENCES public.signals(id) ON DELETE CASCADE,
  operator_id TEXT NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (signal_id, operator_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_signal_rx_signal ON public.signal_reactions(signal_id);

ALTER TABLE public.signal_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signal_rx read all" ON public.signal_reactions;
CREATE POLICY "signal_rx read all" ON public.signal_reactions FOR SELECT USING (true);

-- Reactions on profile signals (wall messages)
CREATE TABLE IF NOT EXISTS public.profile_signal_reactions (
  signal_id   UUID NOT NULL REFERENCES public.profile_signals(id) ON DELETE CASCADE,
  operator_id TEXT NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (signal_id, operator_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_psig_rx_signal ON public.profile_signal_reactions(signal_id);

ALTER TABLE public.profile_signal_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "psig_rx read all" ON public.profile_signal_reactions;
CREATE POLICY "psig_rx read all" ON public.profile_signal_reactions FOR SELECT USING (true);

-- Pinned profile signal flag
ALTER TABLE public.profile_signals ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_profile_signals_pinned ON public.profile_signals(target_id, pinned);

-- Operator interests (array of tag strings, max ~12)
ALTER TABLE public.operators ADD COLUMN IF NOT EXISTS interests TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
