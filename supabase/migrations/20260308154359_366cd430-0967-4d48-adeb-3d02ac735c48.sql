
-- ============================================================
-- COMPREHENSIVE RLS HIERARCHY FIX
-- ============================================================

-- 1. Create helper function: check if user is an executive (CEO/GM)
CREATE OR REPLACE FUNCTION public.is_executive()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('ceo', 'gm')
  )
$$;

-- 2. Create helper: check if user is loan officer for a given loan
CREATE OR REPLACE FUNCTION public.is_loan_officer_for(_loan_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.loan_applications
    WHERE id = _loan_id
    AND loan_officer_id = auth.uid()
  )
$$;

-- 3. Create helper: check if user's branch matches a loan's branch
CREATE OR REPLACE FUNCTION public.is_branch_staff_for_loan(_loan_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.loan_applications la
    JOIN public.staff_assignments sa ON sa.branch_id = la.branch_id
    WHERE la.id = _loan_id
    AND sa.user_id = auth.uid()
  )
$$;

-- 4. Create helper: check if user's region matches a loan's branch region
CREATE OR REPLACE FUNCTION public.is_region_staff_for_loan(_loan_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.loan_applications la
    JOIN public.branches b ON b.id = la.branch_id
    JOIN public.staff_assignments sa ON sa.region_id = b.region_id
    WHERE la.id = _loan_id
    AND sa.user_id = auth.uid()
  )
$$;

-- ============================================================
-- FIX loan_repayments: Replace broad is_manager() with hierarchy
-- ============================================================

-- Drop overly broad policies
DROP POLICY IF EXISTS "Staff view repayments" ON public.loan_repayments;
DROP POLICY IF EXISTS "Staff update repayments" ON public.loan_repayments;
DROP POLICY IF EXISTS "Staff insert repayments" ON public.loan_repayments;

-- Executives see all repayments
CREATE POLICY "Executives view all repayments"
ON public.loan_repayments FOR SELECT
TO authenticated
USING (is_executive());

-- Regional managers see repayments for loans in their region
CREATE POLICY "Regional mgrs view region repayments"
ON public.loan_repayments FOR SELECT
TO authenticated
USING (is_region_staff_for_loan(loan_id));

-- Branch managers see repayments for loans in their branch
CREATE POLICY "Branch mgrs view branch repayments"
ON public.loan_repayments FOR SELECT
TO authenticated
USING (is_branch_staff_for_loan(loan_id));

-- Loan officers see repayments for their assigned loans
CREATE POLICY "Loan officers view assigned repayments"
ON public.loan_repayments FOR SELECT
TO authenticated
USING (is_loan_officer_for(loan_id));

-- Branch managers and above can update repayments in their scope
CREATE POLICY "Branch mgrs update branch repayments"
ON public.loan_repayments FOR UPDATE
TO authenticated
USING (is_branch_staff_for_loan(loan_id));

CREATE POLICY "Regional mgrs update region repayments"
ON public.loan_repayments FOR UPDATE
TO authenticated
USING (is_region_staff_for_loan(loan_id));

CREATE POLICY "Executives update all repayments"
ON public.loan_repayments FOR UPDATE
TO authenticated
USING (is_executive());

-- Branch managers and above can insert repayments in their scope
CREATE POLICY "Branch mgrs insert branch repayments"
ON public.loan_repayments FOR INSERT
TO authenticated
WITH CHECK (is_branch_staff_for_loan(loan_id));

CREATE POLICY "Regional mgrs insert region repayments"
ON public.loan_repayments FOR INSERT
TO authenticated
WITH CHECK (is_region_staff_for_loan(loan_id));

CREATE POLICY "Executives insert all repayments"
ON public.loan_repayments FOR INSERT
TO authenticated
WITH CHECK (is_executive());

-- ============================================================
-- FIX kyc_documents: Replace broad is_manager() with hierarchy
-- ============================================================

DROP POLICY IF EXISTS "Managers view kyc" ON public.kyc_documents;
DROP POLICY IF EXISTS "Managers update kyc" ON public.kyc_documents;

-- Executives see all KYC
CREATE POLICY "Executives view all kyc"
ON public.kyc_documents FOR SELECT
TO authenticated
USING (is_executive());

-- Regional managers see KYC for loans in their region
CREATE POLICY "Regional mgrs view region kyc"
ON public.kyc_documents FOR SELECT
TO authenticated
USING (loan_id IS NOT NULL AND is_region_staff_for_loan(loan_id));

-- Branch managers see KYC for loans in their branch
CREATE POLICY "Branch mgrs view branch kyc"
ON public.kyc_documents FOR SELECT
TO authenticated
USING (loan_id IS NOT NULL AND is_branch_staff_for_loan(loan_id));

-- Loan officers see KYC for their assigned loans
CREATE POLICY "Loan officers view assigned kyc"
ON public.kyc_documents FOR SELECT
TO authenticated
USING (loan_id IS NOT NULL AND is_loan_officer_for(loan_id));

-- Executives can update all KYC
CREATE POLICY "Executives update all kyc"
ON public.kyc_documents FOR UPDATE
TO authenticated
USING (is_executive());

-- Branch managers update KYC in their branch
CREATE POLICY "Branch mgrs update branch kyc"
ON public.kyc_documents FOR UPDATE
TO authenticated
USING (loan_id IS NOT NULL AND is_branch_staff_for_loan(loan_id));

-- Regional managers update KYC in their region
CREATE POLICY "Regional mgrs update region kyc"
ON public.kyc_documents FOR UPDATE
TO authenticated
USING (loan_id IS NOT NULL AND is_region_staff_for_loan(loan_id));

-- ============================================================
-- FIX ai_insights: Add entity-based scoping
-- ============================================================

DROP POLICY IF EXISTS "Role-based insight access" ON public.ai_insights;

-- Global insights (no entity) visible to target roles
CREATE POLICY "Global insights by role"
ON public.ai_insights FOR SELECT
TO authenticated
USING (
  entity_id IS NULL
  AND (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (ur.role)::text = ANY (ai_insights.target_roles)
    )
    OR target_roles = '{}'::text[]
  )
);

-- Branch-scoped insights visible to staff in that branch + executives
CREATE POLICY "Branch insights scoped"
ON public.ai_insights FOR SELECT
TO authenticated
USING (
  entity_type = 'branch'
  AND entity_id IS NOT NULL
  AND (
    is_executive()
    OR EXISTS (
      SELECT 1 FROM staff_assignments sa
      WHERE sa.user_id = auth.uid()
      AND sa.branch_id = entity_id
    )
    OR EXISTS (
      SELECT 1 FROM staff_assignments sa
      JOIN branches b ON b.id = entity_id
      WHERE sa.user_id = auth.uid()
      AND sa.region_id = b.region_id
    )
  )
);

-- Region-scoped insights visible to staff in that region + executives
CREATE POLICY "Region insights scoped"
ON public.ai_insights FOR SELECT
TO authenticated
USING (
  entity_type = 'region'
  AND entity_id IS NOT NULL
  AND (
    is_executive()
    OR EXISTS (
      SELECT 1 FROM staff_assignments sa
      WHERE sa.user_id = auth.uid()
      AND sa.region_id = entity_id
    )
  )
);

-- Loan-scoped insights visible to assigned officer, branch, region, executives
CREATE POLICY "Loan insights scoped"
ON public.ai_insights FOR SELECT
TO authenticated
USING (
  entity_type = 'loan'
  AND entity_id IS NOT NULL
  AND (
    is_executive()
    OR is_loan_officer_for(entity_id)
    OR is_branch_staff_for_loan(entity_id)
    OR is_region_staff_for_loan(entity_id)
  )
);

-- Other entity types fall back to role check
CREATE POLICY "Other insights by role"
ON public.ai_insights FOR SELECT
TO authenticated
USING (
  entity_type NOT IN ('branch', 'region', 'loan')
  AND entity_id IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (ur.role)::text = ANY (ai_insights.target_roles)
    )
    OR target_roles = '{}'::text[]
  )
);

-- ============================================================
-- FIX loan_applications: Add missing RM UPDATE + LO hierarchy
-- ============================================================

-- Regional managers can update applications in their region
CREATE POLICY "Regional mgrs update region apps"
ON public.loan_applications FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_assignments sa
    JOIN branches b ON b.id = loan_applications.branch_id
    WHERE sa.user_id = auth.uid()
    AND sa.region_id = b.region_id
  )
);

-- Executives can update all applications
CREATE POLICY "Executives update all apps"
ON public.loan_applications FOR UPDATE
TO authenticated
USING (is_executive());

-- ============================================================
-- FIX profiles: Add staff visibility for loan processing
-- ============================================================

-- Executives can view all profiles
CREATE POLICY "Executives view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (is_executive());

-- Staff can view profiles of users with loans in their scope
CREATE POLICY "Staff view client profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM loan_applications la
    WHERE la.user_id = profiles.user_id
    AND (
      la.loan_officer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM staff_assignments sa
        WHERE sa.user_id = auth.uid()
        AND sa.branch_id = la.branch_id
      )
      OR EXISTS (
        SELECT 1 FROM staff_assignments sa
        JOIN branches b ON b.id = la.branch_id
        WHERE sa.user_id = auth.uid()
        AND sa.region_id = b.region_id
      )
    )
  )
);

-- ============================================================
-- FIX internal_messages: Executives see all messages
-- ============================================================

CREATE POLICY "Executives view all messages"
ON public.internal_messages FOR SELECT
TO authenticated
USING (is_executive());
