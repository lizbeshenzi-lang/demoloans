
-- Create is_marketing_lead() helper
CREATE OR REPLACE FUNCTION public.is_marketing_lead()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'marketing_lead'
  )
$$;

-- Update is_manager() to include marketing_lead
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('ceo', 'gm', 'regional_manager', 'branch_manager', 'admin', 'marketing_lead')
  )
$$;

-- marketing_lead full access on sms_campaigns
CREATE POLICY "Marketing lead full access campaigns"
ON public.sms_campaigns FOR ALL
TO authenticated
USING (is_marketing_lead())
WITH CHECK (is_marketing_lead());

-- marketing_lead on sms_messages
CREATE POLICY "Marketing lead view all sms messages"
ON public.sms_messages FOR SELECT
TO authenticated
USING (is_marketing_lead());

CREATE POLICY "Marketing lead insert sms messages"
ON public.sms_messages FOR INSERT
TO authenticated
WITH CHECK (is_marketing_lead());

-- marketing_lead SELECT on loan_applications
CREATE POLICY "Marketing lead view all loans"
ON public.loan_applications FOR SELECT
TO authenticated
USING (is_marketing_lead());

-- marketing_lead SELECT on loan_repayments
CREATE POLICY "Marketing lead view all repayments"
ON public.loan_repayments FOR SELECT
TO authenticated
USING (is_marketing_lead());

-- marketing_lead SELECT on profiles
CREATE POLICY "Marketing lead view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (is_marketing_lead());

-- Update staff INSERT policies to include marketing_lead
DROP POLICY IF EXISTS "Staff create campaigns" ON public.sms_campaigns;
CREATE POLICY "Staff create campaigns"
ON public.sms_campaigns FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY (ARRAY['ceo'::app_role, 'gm'::app_role, 'regional_manager'::app_role, 'branch_manager'::app_role, 'loan_officer'::app_role, 'admin'::app_role, 'marketing_lead'::app_role])
  )
);

DROP POLICY IF EXISTS "Staff insert messages" ON public.sms_messages;
CREATE POLICY "Staff insert messages"
ON public.sms_messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY (ARRAY['ceo'::app_role, 'gm'::app_role, 'regional_manager'::app_role, 'branch_manager'::app_role, 'loan_officer'::app_role, 'admin'::app_role, 'marketing_lead'::app_role])
  )
);

-- marketing_lead can view audit_log
CREATE POLICY "Marketing lead view audit"
ON public.audit_log FOR SELECT
TO authenticated
USING (is_marketing_lead());
