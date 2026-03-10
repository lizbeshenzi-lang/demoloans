
-- FIX 1: Restrict loan_applications INSERT — users can only create with safe defaults
DROP POLICY IF EXISTS "Authenticated users can create applications" ON loan_applications;
CREATE POLICY "Authenticated users can create applications"
ON loan_applications FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (user_id IS NULL OR user_id = auth.uid())
  AND status = 'pending'
  AND approval_level = 'pending'
  AND amount_approved IS NULL
  AND approved_by IS NULL
  AND disbursed_by IS NULL
  AND disbursement_date IS NULL
  AND disbursement_method IS NULL
  AND disbursement_reference IS NULL
  AND ai_recommendation IS NULL
  AND risk_score IS NULL
);

-- FIX 1b: Restrict user self-UPDATE — only allow editing non-admin fields
DROP POLICY IF EXISTS "Users can update their own applications" ON loan_applications;
CREATE POLICY "Users can update their own applications"
ON loan_applications FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND approval_level = 'pending'
  AND amount_approved IS NULL
  AND approved_by IS NULL
  AND disbursed_by IS NULL
  AND ai_recommendation IS NULL
  AND risk_score IS NULL
);

-- FIX 2: Re-scope policies from public to authenticated on sensitive tables
-- job_applications
DROP POLICY IF EXISTS "Admins manage applications" ON job_applications;
CREATE POLICY "Admins manage applications" ON job_applications FOR ALL TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Executives manage applications" ON job_applications;
CREATE POLICY "Executives manage applications" ON job_applications FOR ALL TO authenticated
USING (is_executive()) WITH CHECK (is_executive());

DROP POLICY IF EXISTS "Anyone can apply" ON job_applications;
CREATE POLICY "Anyone can apply" ON job_applications FOR INSERT TO authenticated
WITH CHECK (true);

-- job_postings
DROP POLICY IF EXISTS "Admins manage job postings" ON job_postings;
CREATE POLICY "Admins manage job postings" ON job_postings FOR ALL TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Executives manage job postings" ON job_postings;
CREATE POLICY "Executives manage job postings" ON job_postings FOR ALL TO authenticated
USING (is_executive()) WITH CHECK (is_executive());

-- Keep public read for open jobs (this is intentional)
DROP POLICY IF EXISTS "Anyone can view open jobs" ON job_postings;
CREATE POLICY "Anyone can view open jobs" ON job_postings FOR SELECT
USING (status = 'open');

-- interview_schedules
DROP POLICY IF EXISTS "Admins manage interviews" ON interview_schedules;
CREATE POLICY "Admins manage interviews" ON interview_schedules FOR ALL TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Executives manage interviews" ON interview_schedules;
CREATE POLICY "Executives manage interviews" ON interview_schedules FOR ALL TO authenticated
USING (is_executive()) WITH CHECK (is_executive());

DROP POLICY IF EXISTS "Authenticated view own interviews" ON interview_schedules;
CREATE POLICY "Authenticated view own interviews" ON interview_schedules FOR SELECT TO authenticated
USING (
  is_admin() OR is_executive()
  OR interviewer_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM job_applications ja
    WHERE ja.id = interview_schedules.application_id
    AND ja.applicant_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
  )
);

-- interview_recordings
DROP POLICY IF EXISTS "Admins manage recordings" ON interview_recordings;
CREATE POLICY "Admins manage recordings" ON interview_recordings FOR ALL TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Executives view recordings" ON interview_recordings;
CREATE POLICY "Executives view recordings" ON interview_recordings FOR SELECT TO authenticated
USING (is_executive());

-- user_roles: fix executive view scope
DROP POLICY IF EXISTS "Executives can view all roles" ON user_roles;
CREATE POLICY "Executives can view all roles" ON user_roles FOR SELECT TO authenticated
USING (is_executive());
