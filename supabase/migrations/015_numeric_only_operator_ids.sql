-- Strip the F3X- prefix from every operator ID; keep only the 4-digit
-- sequential number (KRISO → 0001, the next-registered → 0002, …).
-- Self-contained: works whether migration 014 has been applied or not.

BEGIN;

-- 1. Build the old_id → new_id map ordered by registration date.
CREATE TEMP TABLE _op_id_map AS
SELECT id AS old_id,
       LPAD((ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC))::text, 4, '0') AS new_id
FROM public.operators;

-- 2. Drop every FK that points at operators(id).
ALTER TABLE public.entries                  DROP CONSTRAINT IF EXISTS entries_operator_id_fkey;
ALTER TABLE public.signals                  DROP CONSTRAINT IF EXISTS signals_operator_id_fkey;
ALTER TABLE public.profile_signals          DROP CONSTRAINT IF EXISTS profile_signals_author_id_fkey;
ALTER TABLE public.profile_signals          DROP CONSTRAINT IF EXISTS profile_signals_target_id_fkey;
ALTER TABLE public.entry_reactions          DROP CONSTRAINT IF EXISTS entry_reactions_operator_id_fkey;
ALTER TABLE public.signal_reactions         DROP CONSTRAINT IF EXISTS signal_reactions_operator_id_fkey;
ALTER TABLE public.profile_signal_reactions DROP CONSTRAINT IF EXISTS profile_signal_reactions_operator_id_fkey;
ALTER TABLE public.friendships              DROP CONSTRAINT IF EXISTS friendships_requester_id_fkey;
ALTER TABLE public.friendships              DROP CONSTRAINT IF EXISTS friendships_addressee_id_fkey;
ALTER TABLE public.messages                 DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages                 DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;

-- 3. Rewrite every reference.
UPDATE public.entries          e   SET operator_id  = m.new_id FROM _op_id_map m WHERE e.operator_id  = m.old_id;
UPDATE public.signals          s   SET operator_id  = m.new_id FROM _op_id_map m WHERE s.operator_id  = m.old_id;
UPDATE public.profile_signals  ps  SET author_id    = m.new_id FROM _op_id_map m WHERE ps.author_id   = m.old_id;
UPDATE public.profile_signals  ps  SET target_id    = m.new_id FROM _op_id_map m WHERE ps.target_id   = m.old_id;
UPDATE public.entry_reactions  er  SET operator_id  = m.new_id FROM _op_id_map m WHERE er.operator_id = m.old_id;
UPDATE public.signal_reactions sr  SET operator_id  = m.new_id FROM _op_id_map m WHERE sr.operator_id = m.old_id;
UPDATE public.profile_signal_reactions psr SET operator_id = m.new_id FROM _op_id_map m WHERE psr.operator_id = m.old_id;
UPDATE public.friendships      f   SET requester_id = m.new_id FROM _op_id_map m WHERE f.requester_id = m.old_id;
UPDATE public.friendships      f   SET addressee_id = m.new_id FROM _op_id_map m WHERE f.addressee_id = m.old_id;
UPDATE public.messages         msg SET sender_id    = m.new_id FROM _op_id_map m WHERE msg.sender_id  = m.old_id;
UPDATE public.messages         msg SET receiver_id  = m.new_id FROM _op_id_map m WHERE msg.receiver_id = m.old_id;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables  WHERE table_schema='public' AND table_name='entry_read_log') THEN
    EXECUTE 'UPDATE public.entry_read_log erl SET operator_id = m.new_id FROM _op_id_map m WHERE erl.operator_id = m.old_id';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables  WHERE table_schema='public' AND table_name='admin_audit_log') THEN
    EXECUTE 'UPDATE public.admin_audit_log al SET actor_id  = m.new_id FROM _op_id_map m WHERE al.actor_id  = m.old_id';
    EXECUTE 'UPDATE public.admin_audit_log al SET target_id = m.new_id FROM _op_id_map m WHERE al.target_id = m.old_id';
  END IF;
END $$;

-- 4. Renumber operators themselves.
UPDATE public.operators o SET id = m.new_id FROM _op_id_map m WHERE o.id = m.old_id;

-- 5. Recreate FKs.
ALTER TABLE public.entries                  ADD CONSTRAINT entries_operator_id_fkey                  FOREIGN KEY (operator_id) REFERENCES public.operators(id);
ALTER TABLE public.signals                  ADD CONSTRAINT signals_operator_id_fkey                  FOREIGN KEY (operator_id) REFERENCES public.operators(id);
ALTER TABLE public.profile_signals          ADD CONSTRAINT profile_signals_author_id_fkey            FOREIGN KEY (author_id)   REFERENCES public.operators(id);
ALTER TABLE public.profile_signals          ADD CONSTRAINT profile_signals_target_id_fkey            FOREIGN KEY (target_id)   REFERENCES public.operators(id) ON DELETE CASCADE;
ALTER TABLE public.entry_reactions          ADD CONSTRAINT entry_reactions_operator_id_fkey          FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE CASCADE;
ALTER TABLE public.signal_reactions         ADD CONSTRAINT signal_reactions_operator_id_fkey         FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE CASCADE;
ALTER TABLE public.profile_signal_reactions ADD CONSTRAINT profile_signal_reactions_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE CASCADE;
ALTER TABLE public.friendships              ADD CONSTRAINT friendships_requester_id_fkey             FOREIGN KEY (requester_id) REFERENCES public.operators(id) ON DELETE CASCADE;
ALTER TABLE public.friendships              ADD CONSTRAINT friendships_addressee_id_fkey             FOREIGN KEY (addressee_id) REFERENCES public.operators(id) ON DELETE CASCADE;
ALTER TABLE public.messages                 ADD CONSTRAINT messages_sender_id_fkey                   FOREIGN KEY (sender_id)    REFERENCES public.operators(id) ON DELETE CASCADE;
ALTER TABLE public.messages                 ADD CONSTRAINT messages_receiver_id_fkey                 FOREIGN KEY (receiver_id)  REFERENCES public.operators(id) ON DELETE CASCADE;

DROP TABLE _op_id_map;

-- 6. Sequence + RPC now return numeric-only IDs.
CREATE SEQUENCE IF NOT EXISTS public.operator_seq;

SELECT setval(
  'public.operator_seq',
  GREATEST(
    1,
    COALESCE((SELECT MAX(id::int) FROM public.operators WHERE id ~ '^\d+$'), 0)
  )
);

CREATE OR REPLACE FUNCTION public.next_operator_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT LPAD(NEXTVAL('public.operator_seq')::text, 4, '0')
$$;

REVOKE ALL ON FUNCTION public.next_operator_id() FROM public;
REVOKE ALL ON FUNCTION public.next_operator_id() FROM anon;
REVOKE ALL ON FUNCTION public.next_operator_id() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.next_operator_id() TO service_role;

COMMIT;
