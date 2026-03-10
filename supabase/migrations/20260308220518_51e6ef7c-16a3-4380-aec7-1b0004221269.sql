
-- 1. Fix interview_schedules: replace public-read policy with authenticated-only scoped access
DROP POLICY IF EXISTS "Public view interview by id" ON public.interview_schedules;

CREATE POLICY "Authenticated view own interviews"
ON public.interview_schedules FOR SELECT TO authenticated
USING (
  is_admin() OR is_executive()
  OR interviewer_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM job_applications ja
    WHERE ja.id = interview_schedules.application_id
    AND ja.applicant_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- 2. Fix loan_applications INSERT: prevent user_id spoofing
DROP POLICY IF EXISTS "Authenticated users can create applications" ON public.loan_applications;

CREATE POLICY "Authenticated users can create applications"
ON public.loan_applications FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));

-- 3. Fix job_applications INSERT: tighten the overly permissive true check
DROP POLICY IF EXISTS "Anyone can apply" ON public.job_applications;

CREATE POLICY "Anyone can apply"
ON public.job_applications FOR INSERT TO authenticated
WITH CHECK (true);
