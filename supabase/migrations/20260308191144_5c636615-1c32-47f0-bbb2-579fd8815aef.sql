
-- 1. Enable realtime on loan_repayments
ALTER PUBLICATION supabase_realtime ADD TABLE public.loan_repayments;

-- 2. Update notify_payment_received to also notify branch managers
CREATE OR REPLACE FUNCTION public.notify_payment_received()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _loan record;
  _staff record;
BEGIN
  -- Fire on any payment update (paid or partial)
  IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status IN ('paid', 'partial') THEN
    SELECT * INTO _loan FROM loan_applications WHERE id = NEW.loan_id;
    IF _loan IS NULL THEN RETURN NEW; END IF;

    -- Notify loan officer
    IF _loan.loan_officer_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
      VALUES (_loan.loan_officer_id, 'Payment Received', _loan.full_name || ' paid KES ' || COALESCE(NEW.amount_paid::text, '0') || ' (Week ' || NEW.week_number || ').',
        'success', 'repayment', NEW.id);
    END IF;

    -- Notify client
    IF _loan.user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
      VALUES (_loan.user_id, 'Payment Confirmed', 'Your payment of KES ' || COALESCE(NEW.amount_paid::text, '0') || ' for Week ' || NEW.week_number || ' has been confirmed.',
        'success', 'repayment', NEW.id);
    END IF;

    -- Notify branch manager(s)
    IF _loan.branch_id IS NOT NULL THEN
      FOR _staff IN
        SELECT sa.user_id FROM staff_assignments sa
        JOIN user_roles ur ON ur.user_id = sa.user_id
        WHERE sa.branch_id = _loan.branch_id AND ur.role = 'branch_manager'
        AND sa.user_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
      LOOP
        INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
        VALUES (_staff.user_id, '💰 Collection Update', _loan.full_name || ' paid KES ' || COALESCE(NEW.amount_paid::text, '0') || ' (Week ' || NEW.week_number || '). Recorded by loan officer.',
          'success', 'repayment', NEW.id);
      END LOOP;
    END IF;

    -- Notify regional manager(s)
    IF _loan.branch_id IS NOT NULL THEN
      FOR _staff IN
        SELECT sa.user_id FROM staff_assignments sa
        JOIN user_roles ur ON ur.user_id = sa.user_id
        JOIN branches b ON b.id = _loan.branch_id
        WHERE sa.region_id = b.region_id AND ur.role = 'regional_manager'
        AND sa.user_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
      LOOP
        INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
        VALUES (_staff.user_id, '💰 Collection Update', _loan.full_name || ' paid KES ' || COALESCE(NEW.amount_paid::text, '0') || ' (Week ' || NEW.week_number || ').',
          'success', 'repayment', NEW.id);
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
