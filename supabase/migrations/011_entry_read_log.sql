-- Per-operator read log used to rate-limit incrementReads (one increment / 10 min)
CREATE TABLE IF NOT EXISTS public.entry_read_log (
  id          BIGSERIAL PRIMARY KEY,
  entry_id    TEXT NOT NULL,
  operator_id TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_read_log_lookup
  ON public.entry_read_log(entry_id, operator_id, created_at DESC);

ALTER TABLE public.entry_read_log ENABLE ROW LEVEL SECURITY;
-- Service role only; no user-facing policies.
