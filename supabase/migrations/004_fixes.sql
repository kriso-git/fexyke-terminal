-- increment_reads stored procedure (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.increment_reads(entry_id TEXT)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.entries SET reads = reads + 1 WHERE id = entry_id;
$$;

-- entry_reactions: authenticated insert policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='entry_reactions' AND policyname='auth insert reactions'
  ) THEN
    CREATE POLICY "auth insert reactions" ON public.entry_reactions
      FOR INSERT WITH CHECK (
        operator_id IN (SELECT id FROM public.operators WHERE auth_id = auth.uid())
      );
  END IF;
END $$;

-- entry_reactions: delete own reactions only
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='entry_reactions' AND policyname='auth delete own reactions'
  ) THEN
    CREATE POLICY "auth delete own reactions" ON public.entry_reactions
      FOR DELETE USING (
        operator_id IN (SELECT id FROM public.operators WHERE auth_id = auth.uid())
      );
  END IF;
END $$;

-- operators: allow updating own record
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='operators' AND policyname='operators update self'
  ) THEN
    CREATE POLICY "operators update self" ON public.operators
      FOR UPDATE USING (auth_id = auth.uid())
      WITH CHECK (auth_id = auth.uid());
  END IF;
END $$;

-- operators: level constraint allows up to 10 (superadmin setup needs this)
ALTER TABLE public.operators DROP CONSTRAINT IF EXISTS operators_level_check;
ALTER TABLE public.operators ADD CONSTRAINT operators_level_check CHECK (level BETWEEN 1 AND 10);
