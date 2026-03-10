-- Create regions table
CREATE TABLE public.regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can view regions" ON public.regions FOR SELECT TO authenticated USING (true);

-- Create branches table
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can view branches" ON public.branches FOR SELECT TO authenticated USING (true);

-- Create loan_products table
CREATE TABLE public.loan_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  min_amount NUMERIC(12,2) NOT NULL DEFAULT 5000,
  max_amount NUMERIC(12,2) NOT NULL DEFAULT 60000,
  term_weeks INTEGER NOT NULL,
  interest_rate NUMERIC(5,2) NOT NULL,
  processing_fee_percent NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.loan_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can view products" ON public.loan_products FOR SELECT TO authenticated USING (true);

-- Create staff_assignments table
CREATE TABLE public.staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.staff_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own assignment" ON public.staff_assignments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Managers view all assignments" ON public.staff_assignments FOR SELECT TO authenticated USING (public.is_manager());

-- Add columns to loan_applications
ALTER TABLE public.loan_applications 
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.loan_products(id),
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id),
  ADD COLUMN IF NOT EXISTS loan_officer_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS amount_approved NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS disbursement_date DATE,
  ADD COLUMN IF NOT EXISTS expected_completion_date DATE,
  ADD COLUMN IF NOT EXISTS risk_score INTEGER,
  ADD COLUMN IF NOT EXISTS ai_recommendation TEXT;

-- Create loan_repayments table
CREATE TABLE public.loan_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  amount_due NUMERIC(12,2) NOT NULL,
  amount_paid NUMERIC(12,2) DEFAULT 0,
  due_date DATE NOT NULL,
  paid_date DATE,
  week_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.loan_repayments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own repayments" ON public.loan_repayments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.loan_applications la WHERE la.id = loan_id AND la.user_id = auth.uid())
);
CREATE POLICY "Staff view repayments" ON public.loan_repayments FOR SELECT TO authenticated USING (public.is_manager());
CREATE POLICY "Staff insert repayments" ON public.loan_repayments FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY "Staff update repayments" ON public.loan_repayments FOR UPDATE TO authenticated USING (public.is_manager());

-- Create ai_insights table
CREATE TABLE public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  target_roles TEXT[] NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Role-based insight access" ON public.ai_insights FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = ANY(target_roles))
  OR target_roles = '{}'
);

-- Additional loan_applications RLS policies for hierarchy
CREATE POLICY "Loan officers view assigned apps" ON public.loan_applications FOR SELECT TO authenticated USING (loan_officer_id = auth.uid());
CREATE POLICY "Branch mgrs view branch apps" ON public.loan_applications FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.staff_assignments sa WHERE sa.user_id = auth.uid() AND sa.branch_id = loan_applications.branch_id)
);
CREATE POLICY "Regional mgrs view region apps" ON public.loan_applications FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.staff_assignments sa JOIN public.branches b ON b.id = loan_applications.branch_id WHERE sa.user_id = auth.uid() AND sa.region_id = b.region_id)
);
CREATE POLICY "Executives view all apps" ON public.loan_applications FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('ceo', 'gm'))
);

-- Loan officers can update assigned applications
CREATE POLICY "Loan officers update assigned apps" ON public.loan_applications FOR UPDATE TO authenticated USING (loan_officer_id = auth.uid());
CREATE POLICY "Branch mgrs update branch apps" ON public.loan_applications FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.staff_assignments sa WHERE sa.user_id = auth.uid() AND sa.branch_id = loan_applications.branch_id)
);