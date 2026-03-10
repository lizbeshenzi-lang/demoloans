
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  entity_type text,
  entity_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast user queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can mark their own as read
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- System (via triggers) can insert
CREATE POLICY "System insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger function: notify on loan status change
CREATE OR REPLACE FUNCTION public.notify_loan_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _loan_officer_id uuid;
  _branch_id uuid;
  _client_user_id uuid;
  _staff record;
  _status_label text;
BEGIN
  -- Only fire on status change
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  _loan_officer_id := NEW.loan_officer_id;
  _branch_id := NEW.branch_id;
  _client_user_id := NEW.user_id;
  _status_label := initcap(NEW.status);

  -- Notify the client
  IF _client_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
    VALUES (_client_user_id, 'Loan ' || _status_label, 'Your loan application for ' || COALESCE(NEW.financing_amount, 'N/A') || ' has been ' || lower(NEW.status) || '.', 
      CASE WHEN NEW.status = 'rejected' THEN 'error' WHEN NEW.status IN ('approved','disbursed') THEN 'success' ELSE 'info' END,
      'loan', NEW.id);
  END IF;

  -- Notify the loan officer (if not the one who changed it)
  IF _loan_officer_id IS NOT NULL AND _loan_officer_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) THEN
    INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
    VALUES (_loan_officer_id, 'Loan ' || _status_label, NEW.full_name || '''s loan (' || COALESCE(NEW.financing_amount, 'N/A') || ') was ' || lower(NEW.status) || '.',
      'info', 'loan', NEW.id);
  END IF;

  -- Notify branch manager
  IF _branch_id IS NOT NULL THEN
    FOR _staff IN 
      SELECT sa.user_id FROM staff_assignments sa
      JOIN user_roles ur ON ur.user_id = sa.user_id
      WHERE sa.branch_id = _branch_id AND ur.role = 'branch_manager'
      AND sa.user_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    LOOP
      INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
      VALUES (_staff.user_id, 'Loan ' || _status_label, NEW.full_name || '''s loan (' || COALESCE(NEW.financing_amount, 'N/A') || ') was ' || lower(NEW.status) || '.',
        'info', 'loan', NEW.id);
    END LOOP;
  END IF;

  -- Notify executives (CEO, GM)
  FOR _staff IN
    SELECT ur.user_id FROM user_roles ur
    WHERE ur.role IN ('ceo', 'gm')
    AND ur.user_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
  LOOP
    INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
    VALUES (_staff.user_id, 'Loan ' || _status_label, NEW.full_name || '''s loan (' || COALESCE(NEW.financing_amount, 'N/A') || ') was ' || lower(NEW.status) || '.',
      'info', 'loan', NEW.id);
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_loan_status_notification
  AFTER UPDATE ON public.loan_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_loan_status_change();

-- Trigger function: notify on new loan application
CREATE OR REPLACE FUNCTION public.notify_new_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _staff record;
BEGIN
  -- Notify assigned loan officer
  IF NEW.loan_officer_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
    VALUES (NEW.loan_officer_id, 'New Application', NEW.full_name || ' submitted a loan application for ' || COALESCE(NEW.financing_amount, 'N/A') || '.',
      'info', 'loan', NEW.id);
  END IF;

  -- Notify branch manager
  IF NEW.branch_id IS NOT NULL THEN
    FOR _staff IN
      SELECT sa.user_id FROM staff_assignments sa
      JOIN user_roles ur ON ur.user_id = sa.user_id
      WHERE sa.branch_id = NEW.branch_id AND ur.role = 'branch_manager'
    LOOP
      INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
      VALUES (_staff.user_id, 'New Application', NEW.full_name || ' submitted a loan application for ' || COALESCE(NEW.financing_amount, 'N/A') || '.',
        'info', 'loan', NEW.id);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_new_application_notification
  AFTER INSERT ON public.loan_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_application();

-- Trigger: notify on payment received
CREATE OR REPLACE FUNCTION public.notify_payment_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _loan record;
  _staff record;
BEGIN
  IF OLD.status != 'paid' AND NEW.status = 'paid' THEN
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
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payment_notification
  AFTER UPDATE ON public.loan_repayments
  FOR EACH ROW EXECUTE FUNCTION public.notify_payment_received();
