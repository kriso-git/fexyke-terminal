-- Update kind check constraint to allow POSZT and VIDEÓ
ALTER TABLE public.entries DROP CONSTRAINT IF EXISTS entries_kind_check;
ALTER TABLE public.entries ADD CONSTRAINT entries_kind_check
  CHECK (kind IN ('POSZT', 'VIDEÓ', 'ÁTVITEL', 'RIASZTÁS', 'MEZŐNAPLÓ', 'MEMÓRIADIFF', 'ADÁS'));
