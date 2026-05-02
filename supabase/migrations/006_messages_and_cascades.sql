-- 1. Cascade FK deletes for operator-owned content (so deleteOperator works without manual cascading)
ALTER TABLE public.entries DROP CONSTRAINT IF EXISTS entries_operator_id_fkey;
ALTER TABLE public.entries ADD CONSTRAINT entries_operator_id_fkey
  FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE CASCADE;

ALTER TABLE public.signals DROP CONSTRAINT IF EXISTS signals_operator_id_fkey;
ALTER TABLE public.signals ADD CONSTRAINT signals_operator_id_fkey
  FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE CASCADE;

ALTER TABLE public.signals DROP CONSTRAINT IF EXISTS signals_entry_id_fkey;
ALTER TABLE public.signals ADD CONSTRAINT signals_entry_id_fkey
  FOREIGN KEY (entry_id) REFERENCES public.entries(id) ON DELETE CASCADE;

ALTER TABLE public.entry_reactions DROP CONSTRAINT IF EXISTS entry_reactions_operator_id_fkey;
ALTER TABLE public.entry_reactions ADD CONSTRAINT entry_reactions_operator_id_fkey
  FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE CASCADE;

ALTER TABLE public.entry_reactions DROP CONSTRAINT IF EXISTS entry_reactions_entry_id_fkey;
ALTER TABLE public.entry_reactions ADD CONSTRAINT entry_reactions_entry_id_fkey
  FOREIGN KEY (entry_id) REFERENCES public.entries(id) ON DELETE CASCADE;

ALTER TABLE public.profile_signals DROP CONSTRAINT IF EXISTS profile_signals_author_id_fkey;
ALTER TABLE public.profile_signals ADD CONSTRAINT profile_signals_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.operators(id) ON DELETE CASCADE;

ALTER TABLE public.profile_signals DROP CONSTRAINT IF EXISTS profile_signals_target_id_fkey;
ALTER TABLE public.profile_signals ADD CONSTRAINT profile_signals_target_id_fkey
  FOREIGN KEY (target_id) REFERENCES public.operators(id) ON DELETE CASCADE;

-- 2. Direct messages between friends
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   TEXT NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_message CHECK (sender_id <> receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_pair      ON public.messages(sender_id, receiver_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_recv      ON public.messages(receiver_id, read);
CREATE INDEX IF NOT EXISTS idx_messages_created   ON public.messages(created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages read own" ON public.messages;
CREATE POLICY "messages read own" ON public.messages
  FOR SELECT USING (
    sender_id   IN (SELECT id FROM public.operators WHERE auth_id = auth.uid())
    OR receiver_id IN (SELECT id FROM public.operators WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS "messages insert own" ON public.messages;
CREATE POLICY "messages insert own" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id IN (SELECT id FROM public.operators WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS "messages update own" ON public.messages;
CREATE POLICY "messages update own" ON public.messages
  FOR UPDATE USING (
    receiver_id IN (SELECT id FROM public.operators WHERE auth_id = auth.uid())
  );
