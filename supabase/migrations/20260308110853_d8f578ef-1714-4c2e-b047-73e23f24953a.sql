-- Fix loan_applications insert policy to require authentication
DROP POLICY IF EXISTS "Users can create applications" ON public.loan_applications;

CREATE POLICY "Authenticated users can create applications"
  ON public.loan_applications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);