
-- 1. Attach all 6 trigger functions to their tables

-- Loan status change notifications
CREATE TRIGGER trg_notify_loan_status_change
  AFTER UPDATE ON public.loan_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_loan_status_change();

-- New application notifications
CREATE TRIGGER trg_notify_new_application
  AFTER INSERT ON public.loan_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_application();

-- Payment received notifications
CREATE TRIGGER trg_notify_payment_received
  AFTER UPDATE ON public.loan_repayments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_payment_received();

-- Loan audit logging
CREATE TRIGGER trg_log_loan_audit
  AFTER UPDATE ON public.loan_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.log_loan_audit();

-- Repayment audit logging
CREATE TRIGGER trg_log_repayment_audit
  AFTER UPDATE ON public.loan_repayments
  FOR EACH ROW
  EXECUTE FUNCTION public.log_repayment_audit();

-- SMS trigger on approval/disbursement
CREATE TRIGGER trg_approval_sms
  AFTER UPDATE ON public.loan_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_approval_sms();

-- 2. Auto-assign 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', '')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$function$;

-- 3. Loan officer UPDATE policy on repayments
CREATE POLICY "Loan officers update assigned repayments"
  ON public.loan_repayments
  FOR UPDATE
  TO authenticated
  USING (is_loan_officer_for(loan_id));

-- 4. Internal message notification trigger
CREATE OR REPLACE FUNCTION public.notify_new_internal_message()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Direct message to a specific recipient
  IF NEW.recipient_id IS NOT NULL AND NEW.recipient_id != NEW.sender_id THEN
    INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id)
    VALUES (NEW.recipient_id, 'New Message: ' || NEW.subject, LEFT(NEW.body, 120),
      CASE WHEN NEW.priority = 'urgent' THEN 'warning' ELSE 'info' END,
      'message', NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_notify_new_internal_message
  AFTER INSERT ON public.internal_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_internal_message();
