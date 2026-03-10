
-- Create function to call sms-triggers edge function on loan approval
CREATE OR REPLACE FUNCTION public.trigger_approval_sms()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when status changes to 'approved' or specific approval levels
  IF (OLD.status IS DISTINCT FROM NEW.status) AND 
     NEW.status IN ('approved', 'disbursed') THEN
    -- Use pg_net to call the edge function asynchronously
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/sms-triggers',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'trigger_type', 'approval_welcome',
        'loan_id', NEW.id::text
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to loan_applications table
CREATE TRIGGER on_loan_approved_send_sms
  AFTER UPDATE ON public.loan_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_approval_sms();
