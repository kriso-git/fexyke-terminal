ALTER TABLE public.profile_signals ADD COLUMN IF NOT EXISTS image_url TEXT;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profile_signals' AND column_name='text' AND is_nullable='NO'
  ) THEN
    ALTER TABLE public.profile_signals ALTER COLUMN text DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS image_url TEXT;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='signals' AND column_name='text' AND is_nullable='NO'
  ) THEN
    ALTER TABLE public.signals ALTER COLUMN text DROP NOT NULL;
  END IF;
END $$;
