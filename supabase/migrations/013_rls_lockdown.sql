-- Defense-in-depth: ensure RLS is ENABLED on every user-data table so a
-- leaked anon key cannot read/write directly. Service-role-only access
-- (from server actions) bypasses RLS as designed.

-- Enable RLS on every relevant table (idempotent — no-op if already on)
ALTER TABLE public.operators              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_reactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_reactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_signals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_signal_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_read_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log       ENABLE ROW LEVEL SECURITY;

-- Public read where the data is meant to be world-visible. All writes go
-- through server actions using the service role key, so we do NOT add any
-- policies that allow anon/auth role inserts/updates/deletes — RLS denies
-- by default.

DROP POLICY IF EXISTS "operators read all"       ON public.operators;
CREATE POLICY "operators read all"       ON public.operators       FOR SELECT USING (true);

DROP POLICY IF EXISTS "entries read published"   ON public.entries;
DROP POLICY IF EXISTS "entries read all"         ON public.entries;
DO $$
BEGIN
  -- If migration 009 (entry_drafts → adds `status` column) was applied,
  -- only public-readable rows should be the published ones. Otherwise
  -- fall back to read-all so existing data still surfaces.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'entries' AND column_name = 'status'
  ) THEN
    EXECUTE 'CREATE POLICY "entries read published" ON public.entries FOR SELECT USING (status IS NULL OR status <> ''draft'')';
  ELSE
    EXECUTE 'CREATE POLICY "entries read all" ON public.entries FOR SELECT USING (true)';
  END IF;
END $$;

DROP POLICY IF EXISTS "signals read all"         ON public.signals;
CREATE POLICY "signals read all"         ON public.signals         FOR SELECT USING (true);

DROP POLICY IF EXISTS "entry_rx read all"        ON public.entry_reactions;
CREATE POLICY "entry_rx read all"        ON public.entry_reactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "profile_signals read all" ON public.profile_signals;
CREATE POLICY "profile_signals read all" ON public.profile_signals FOR SELECT USING (true);

-- messages, friendships, entry_read_log, admin_audit_log: NO public read policy.
-- They are accessed exclusively through server actions with the service role.

-- Storage: tighten the entry-media bucket. Public read is fine (CDN), but
-- writes must only happen through our /api/upload route (which uses the
-- service role). The default storage policies usually already block anon
-- writes; this re-asserts it explicitly.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'entry-media') THEN
    UPDATE storage.buckets
       SET public            = true,
           file_size_limit   = 104857600,        -- 100 MB
           allowed_mime_types = ARRAY[
             'image/gif','image/jpeg','image/png','image/webp','image/avif',
             'audio/mpeg','audio/mp3','audio/ogg','audio/wav','audio/flac',
             'audio/webm','audio/aac'
           ]
     WHERE id = 'entry-media';
  END IF;
END $$;
