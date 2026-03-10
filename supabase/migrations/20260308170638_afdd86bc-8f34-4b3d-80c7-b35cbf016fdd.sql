
CREATE OR REPLACE FUNCTION public.trigger_approval_sms()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _url text;
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) AND 
     NEW.status IN ('approved', 'disbursed') THEN
    _url := current_setting('app.settings.supabase_url', true);
    IF _url IS NOT NULL AND _url != '' THEN
      PERFORM net.http_post(
        url := _url || '/functions/v1/sms-triggers',
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
  END IF;
  RETURN NEW;
END;
$function$;
