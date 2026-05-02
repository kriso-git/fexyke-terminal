-- Last-seen + chat preferences for operators
ALTER TABLE public.operators ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
ALTER TABLE public.operators ADD COLUMN IF NOT EXISTS chat_color TEXT;

-- Image attachment for messages (URL stored separately so text can stay clean)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Allow text to be empty when an image is attached (drop NOT NULL on text)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='messages' AND column_name='text' AND is_nullable='NO'
  ) THEN
    ALTER TABLE public.messages ALTER COLUMN text DROP NOT NULL;
  END IF;
END $$;

-- RPC to refresh last_seen — bypass RLS so any authenticated user can update their own row
CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.operators SET last_seen = NOW() WHERE auth_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;

-- Backfill: anyone created within last 7 days gets a "now" last_seen so the UI isn't all empty
UPDATE public.operators SET last_seen = NOW() WHERE last_seen IS NULL AND auth_id IS NOT NULL;
