-- Avatar URL on operators
ALTER TABLE public.operators ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- XP on operators
ALTER TABLE public.operators ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.calc_level(xp_val INTEGER)
RETURNS INTEGER LANGUAGE sql IMMUTABLE AS $$
  SELECT LEAST(10, GREATEST(1, 1 + (COALESCE(xp_val,0) / 100)));
$$;

CREATE OR REPLACE FUNCTION public.award_xp(op_id TEXT, amount INTEGER)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.operators
  SET xp = COALESCE(xp,0) + amount,
      level = public.calc_level(COALESCE(xp,0) + amount)
  WHERE id = op_id AND role = 'operator';
  UPDATE public.operators
  SET xp = COALESCE(xp,0) + amount
  WHERE id = op_id AND role <> 'operator';
END;
$$;

CREATE OR REPLACE FUNCTION public.xp_on_entry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN PERFORM public.award_xp(NEW.operator_id, 25); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.xp_on_signal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN PERFORM public.award_xp(NEW.operator_id, 5); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.xp_on_reaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN PERFORM public.award_xp(NEW.operator_id, 1); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.xp_on_profile_signal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN PERFORM public.award_xp(NEW.author_id, 5); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_xp_entry ON public.entries;
CREATE TRIGGER trg_xp_entry AFTER INSERT ON public.entries
FOR EACH ROW EXECUTE FUNCTION public.xp_on_entry();

DROP TRIGGER IF EXISTS trg_xp_signal ON public.signals;
CREATE TRIGGER trg_xp_signal AFTER INSERT ON public.signals
FOR EACH ROW EXECUTE FUNCTION public.xp_on_signal();

DROP TRIGGER IF EXISTS trg_xp_reaction ON public.entry_reactions;
CREATE TRIGGER trg_xp_reaction AFTER INSERT ON public.entry_reactions
FOR EACH ROW EXECUTE FUNCTION public.xp_on_reaction();

DROP TRIGGER IF EXISTS trg_xp_profile_signal ON public.profile_signals;
CREATE TRIGGER trg_xp_profile_signal AFTER INSERT ON public.profile_signals
FOR EACH ROW EXECUTE FUNCTION public.xp_on_profile_signal();

-- Friendships
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id TEXT NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  addressee_id TEXT NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  CONSTRAINT no_self_friend CHECK (requester_id <> addressee_id),
  CONSTRAINT unique_pair UNIQUE (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships(addressee_id);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friendships read all" ON public.friendships;
CREATE POLICY "friendships read all" ON public.friendships FOR SELECT USING (true);

DROP POLICY IF EXISTS "friendships insert own" ON public.friendships;
CREATE POLICY "friendships insert own" ON public.friendships
  FOR INSERT WITH CHECK (
    requester_id IN (SELECT id FROM public.operators WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS "friendships update party" ON public.friendships;
CREATE POLICY "friendships update party" ON public.friendships
  FOR UPDATE USING (
    requester_id IN (SELECT id FROM public.operators WHERE auth_id = auth.uid())
    OR addressee_id IN (SELECT id FROM public.operators WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS "friendships delete party" ON public.friendships;
CREATE POLICY "friendships delete party" ON public.friendships
  FOR DELETE USING (
    requester_id IN (SELECT id FROM public.operators WHERE auth_id = auth.uid())
    OR addressee_id IN (SELECT id FROM public.operators WHERE auth_id = auth.uid())
  );

UPDATE public.operators SET xp = (
  COALESCE((SELECT COUNT(*) FROM public.entries WHERE operator_id = operators.id), 0) * 25 +
  COALESCE((SELECT COUNT(*) FROM public.signals WHERE operator_id = operators.id), 0) * 5 +
  COALESCE((SELECT COUNT(*) FROM public.entry_reactions WHERE operator_id = operators.id), 0) * 1 +
  COALESCE((SELECT COUNT(*) FROM public.profile_signals WHERE author_id = operators.id), 0) * 5
);
