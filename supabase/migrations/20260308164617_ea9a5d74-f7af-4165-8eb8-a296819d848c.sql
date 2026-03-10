
-- Fix overly permissive INSERT policy on audit_log
DROP POLICY "System insert audit" ON public.audit_log;

CREATE POLICY "Authenticated insert audit" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
