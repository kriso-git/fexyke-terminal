-- Drop unused tables: threads/thread_entries were created in 001_init.sql
-- but never wired into a feature. The home page queried `threads` and
-- forwarded the rows as an unused prop.

BEGIN;

DROP TABLE IF EXISTS public.thread_entries;
DROP TABLE IF EXISTS public.threads;

COMMIT;
