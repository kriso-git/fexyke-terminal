-- Swap the operator IDs of KRISO and ADMIN in lock-step across every
-- table that references operators(id). Idempotent on already-swapped
-- state: if KRISO is already '0001', the migration is a no-op.

BEGIN;

DO $$
DECLARE
  admin_old text;
  kriso_old text;
  temp_id   text := '__SWAP_KRISO_ADMIN__';
BEGIN
  SELECT id INTO admin_old FROM public.operators WHERE callsign = 'ADMIN' LIMIT 1;
  SELECT id INTO kriso_old FROM public.operators WHERE callsign = 'KRISO' LIMIT 1;

  IF admin_old IS NULL OR kriso_old IS NULL THEN
    RAISE NOTICE 'KRISO or ADMIN missing — nothing to swap.';
    RETURN;
  END IF;
  IF admin_old = kriso_old THEN
    RAISE NOTICE 'Both rows have the same id — impossible state, aborting.';
    RETURN;
  END IF;

  -- If KRISO is already the lower-numbered ID we want, skip.
  IF kriso_old::int < admin_old::int THEN
    RAISE NOTICE 'KRISO already has id % — no swap needed.', kriso_old;
    RETURN;
  END IF;

  -- Drop FKs that point at operators(id)
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

  -- Phase 1: ADMIN → temp (frees up admin_old for KRISO)
  UPDATE public.operators SET id = temp_id WHERE id = admin_old;
  UPDATE public.entries          SET operator_id  = temp_id WHERE operator_id  = admin_old;
  UPDATE public.signals          SET operator_id  = temp_id WHERE operator_id  = admin_old;
  UPDATE public.profile_signals  SET author_id    = temp_id WHERE author_id    = admin_old;
  UPDATE public.profile_signals  SET target_id    = temp_id WHERE target_id    = admin_old;
  UPDATE public.entry_reactions  SET operator_id  = temp_id WHERE operator_id  = admin_old;
  UPDATE public.signal_reactions SET operator_id  = temp_id WHERE operator_id  = admin_old;
  UPDATE public.profile_signal_reactions SET operator_id = temp_id WHERE operator_id = admin_old;
  UPDATE public.friendships      SET requester_id = temp_id WHERE requester_id = admin_old;
  UPDATE public.friendships      SET addressee_id = temp_id WHERE addressee_id = admin_old;
  UPDATE public.messages         SET sender_id    = temp_id WHERE sender_id    = admin_old;
  UPDATE public.messages         SET receiver_id  = temp_id WHERE receiver_id  = admin_old;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='entry_read_log') THEN
    EXECUTE format('UPDATE public.entry_read_log SET operator_id = %L WHERE operator_id = %L', temp_id, admin_old);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='admin_audit_log') THEN
    EXECUTE format('UPDATE public.admin_audit_log SET actor_id  = %L WHERE actor_id  = %L', temp_id, admin_old);
    EXECUTE format('UPDATE public.admin_audit_log SET target_id = %L WHERE target_id = %L', temp_id, admin_old);
  END IF;

  -- Phase 2: KRISO → admin_old
  UPDATE public.operators SET id = admin_old WHERE id = kriso_old;
  UPDATE public.entries          SET operator_id  = admin_old WHERE operator_id  = kriso_old;
  UPDATE public.signals          SET operator_id  = admin_old WHERE operator_id  = kriso_old;
  UPDATE public.profile_signals  SET author_id    = admin_old WHERE author_id    = kriso_old;
  UPDATE public.profile_signals  SET target_id    = admin_old WHERE target_id    = kriso_old;
  UPDATE public.entry_reactions  SET operator_id  = admin_old WHERE operator_id  = kriso_old;
  UPDATE public.signal_reactions SET operator_id  = admin_old WHERE operator_id  = kriso_old;
  UPDATE public.profile_signal_reactions SET operator_id = admin_old WHERE operator_id = kriso_old;
  UPDATE public.friendships      SET requester_id = admin_old WHERE requester_id = kriso_old;
  UPDATE public.friendships      SET addressee_id = admin_old WHERE addressee_id = kriso_old;
  UPDATE public.messages         SET sender_id    = admin_old WHERE sender_id    = kriso_old;
  UPDATE public.messages         SET receiver_id  = admin_old WHERE receiver_id  = kriso_old;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='entry_read_log') THEN
    EXECUTE format('UPDATE public.entry_read_log SET operator_id = %L WHERE operator_id = %L', admin_old, kriso_old);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='admin_audit_log') THEN
    EXECUTE format('UPDATE public.admin_audit_log SET actor_id  = %L WHERE actor_id  = %L', admin_old, kriso_old);
    EXECUTE format('UPDATE public.admin_audit_log SET target_id = %L WHERE target_id = %L', admin_old, kriso_old);
  END IF;

  -- Phase 3: temp → kriso_old (ADMIN gets KRISO's old number)
  UPDATE public.operators SET id = kriso_old WHERE id = temp_id;
  UPDATE public.entries          SET operator_id  = kriso_old WHERE operator_id  = temp_id;
  UPDATE public.signals          SET operator_id  = kriso_old WHERE operator_id  = temp_id;
  UPDATE public.profile_signals  SET author_id    = kriso_old WHERE author_id    = temp_id;
  UPDATE public.profile_signals  SET target_id    = kriso_old WHERE target_id    = temp_id;
  UPDATE public.entry_reactions  SET operator_id  = kriso_old WHERE operator_id  = temp_id;
  UPDATE public.signal_reactions SET operator_id  = kriso_old WHERE operator_id  = temp_id;
  UPDATE public.profile_signal_reactions SET operator_id = kriso_old WHERE operator_id = temp_id;
  UPDATE public.friendships      SET requester_id = kriso_old WHERE requester_id = temp_id;
  UPDATE public.friendships      SET addressee_id = kriso_old WHERE addressee_id = temp_id;
  UPDATE public.messages         SET sender_id    = kriso_old WHERE sender_id    = temp_id;
  UPDATE public.messages         SET receiver_id  = kriso_old WHERE receiver_id  = temp_id;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='entry_read_log') THEN
    EXECUTE format('UPDATE public.entry_read_log SET operator_id = %L WHERE operator_id = %L', kriso_old, temp_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='admin_audit_log') THEN
    EXECUTE format('UPDATE public.admin_audit_log SET actor_id  = %L WHERE actor_id  = %L', kriso_old, temp_id);
    EXECUTE format('UPDATE public.admin_audit_log SET target_id = %L WHERE target_id = %L', kriso_old, temp_id);
  END IF;

  -- Recreate FKs
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

  RAISE NOTICE 'Swapped: KRISO % → %, ADMIN % → %', kriso_old, admin_old, admin_old, kriso_old;
END $$;

COMMIT;
