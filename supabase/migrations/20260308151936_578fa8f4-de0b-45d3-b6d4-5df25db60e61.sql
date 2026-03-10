-- Fix ALL RLS policies from RESTRICTIVE to PERMISSIVE across all tables

-- ============ loan_applications ============
DROP POLICY IF EXISTS "Admins can view all applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Admins can delete applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Authenticated users can create applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Users can view their own applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Users can update their own applications" ON public.loan_applications;
DROP POLICY IF EXISTS "Executives view all apps" ON public.loan_applications;
DROP POLICY IF EXISTS "Regional mgrs view region apps" ON public.loan_applications;
DROP POLICY IF EXISTS "Branch mgrs view branch apps" ON public.loan_applications;
DROP POLICY IF EXISTS "Branch mgrs update branch apps" ON public.loan_applications;
DROP POLICY IF EXISTS "Loan officers view assigned apps" ON public.loan_applications;
DROP POLICY IF EXISTS "Loan officers update assigned apps" ON public.loan_applications;

CREATE POLICY "Admins can view all applications" ON public.loan_applications FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins can update all applications" ON public.loan_applications FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can delete applications" ON public.loan_applications FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Authenticated users can create applications" ON public.loan_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can view their own applications" ON public.loan_applications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own applications" ON public.loan_applications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Executives view all apps" ON public.loan_applications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('ceo', 'gm')));
CREATE POLICY "Regional mgrs view region apps" ON public.loan_applications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM staff_assignments sa JOIN branches b ON b.id = loan_applications.branch_id WHERE sa.user_id = auth.uid() AND sa.region_id = b.region_id));
CREATE POLICY "Branch mgrs view branch apps" ON public.loan_applications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM staff_assignments sa WHERE sa.user_id = auth.uid() AND sa.branch_id = loan_applications.branch_id));
CREATE POLICY "Branch mgrs update branch apps" ON public.loan_applications FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM staff_assignments sa WHERE sa.user_id = auth.uid() AND sa.branch_id = loan_applications.branch_id));
CREATE POLICY "Loan officers view assigned apps" ON public.loan_applications FOR SELECT TO authenticated USING (loan_officer_id = auth.uid());
CREATE POLICY "Loan officers update assigned apps" ON public.loan_applications FOR UPDATE TO authenticated USING (loan_officer_id = auth.uid());

-- ============ loan_repayments ============
DROP POLICY IF EXISTS "Admins can delete repayments" ON public.loan_repayments;
DROP POLICY IF EXISTS "Admins can insert repayments" ON public.loan_repayments;
DROP POLICY IF EXISTS "Admins can update repayments" ON public.loan_repayments;
DROP POLICY IF EXISTS "Staff insert repayments" ON public.loan_repayments;
DROP POLICY IF EXISTS "Staff update repayments" ON public.loan_repayments;
DROP POLICY IF EXISTS "Staff view repayments" ON public.loan_repayments;
DROP POLICY IF EXISTS "Users view own repayments" ON public.loan_repayments;

CREATE POLICY "Admins can delete repayments" ON public.loan_repayments FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admins can insert repayments" ON public.loan_repayments FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update repayments" ON public.loan_repayments FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Staff insert repayments" ON public.loan_repayments FOR INSERT TO authenticated WITH CHECK (is_manager());
CREATE POLICY "Staff update repayments" ON public.loan_repayments FOR UPDATE TO authenticated USING (is_manager());
CREATE POLICY "Staff view repayments" ON public.loan_repayments FOR SELECT TO authenticated USING (is_manager());
CREATE POLICY "Users view own repayments" ON public.loan_repayments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM loan_applications la WHERE la.id = loan_repayments.loan_id AND la.user_id = auth.uid()));

-- ============ kyc_documents ============
DROP POLICY IF EXISTS "Admins delete kyc" ON public.kyc_documents;
DROP POLICY IF EXISTS "Admins select kyc" ON public.kyc_documents;
DROP POLICY IF EXISTS "Admins update kyc" ON public.kyc_documents;
DROP POLICY IF EXISTS "Managers update kyc" ON public.kyc_documents;
DROP POLICY IF EXISTS "Managers view kyc" ON public.kyc_documents;
DROP POLICY IF EXISTS "Users insert own kyc" ON public.kyc_documents;
DROP POLICY IF EXISTS "Users view own kyc" ON public.kyc_documents;

CREATE POLICY "Admins delete kyc" ON public.kyc_documents FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admins select kyc" ON public.kyc_documents FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins update kyc" ON public.kyc_documents FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Managers update kyc" ON public.kyc_documents FOR UPDATE TO authenticated USING (is_manager());
CREATE POLICY "Managers view kyc" ON public.kyc_documents FOR SELECT TO authenticated USING (is_manager());
CREATE POLICY "Users insert own kyc" ON public.kyc_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own kyc" ON public.kyc_documents FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ notifications ============
DROP POLICY IF EXISTS "Admins can delete notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;

CREATE POLICY "Admins can delete notifications" ON public.notifications FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Users insert own notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ profiles ============
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ user_roles ============
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ staff_assignments ============
DROP POLICY IF EXISTS "Admins can delete assignments" ON public.staff_assignments;
DROP POLICY IF EXISTS "Admins can insert assignments" ON public.staff_assignments;
DROP POLICY IF EXISTS "Admins can update assignments" ON public.staff_assignments;
DROP POLICY IF EXISTS "Managers view all assignments" ON public.staff_assignments;
DROP POLICY IF EXISTS "View own assignment" ON public.staff_assignments;

CREATE POLICY "Admins can delete assignments" ON public.staff_assignments FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admins can insert assignments" ON public.staff_assignments FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update assignments" ON public.staff_assignments FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Managers view all assignments" ON public.staff_assignments FOR SELECT TO authenticated USING (is_manager());
CREATE POLICY "View own assignment" ON public.staff_assignments FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ ai_insights ============
DROP POLICY IF EXISTS "Admins can delete insights" ON public.ai_insights;
DROP POLICY IF EXISTS "Admins can insert insights" ON public.ai_insights;
DROP POLICY IF EXISTS "Admins can update insights" ON public.ai_insights;
DROP POLICY IF EXISTS "Role-based insight access" ON public.ai_insights;

CREATE POLICY "Admins can delete insights" ON public.ai_insights FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admins can insert insights" ON public.ai_insights FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update insights" ON public.ai_insights FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Role-based insight access" ON public.ai_insights FOR SELECT TO authenticated USING ((EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role)::text = ANY (ai_insights.target_roles))) OR (target_roles = '{}'::text[]));

-- ============ internal_messages ============
DROP POLICY IF EXISTS "Admin full message access" ON public.internal_messages;
DROP POLICY IF EXISTS "Authenticated send messages" ON public.internal_messages;
DROP POLICY IF EXISTS "Branch broadcast access" ON public.internal_messages;
DROP POLICY IF EXISTS "Region broadcast access" ON public.internal_messages;
DROP POLICY IF EXISTS "Role-based message access" ON public.internal_messages;
DROP POLICY IF EXISTS "Users see own messages" ON public.internal_messages;
DROP POLICY IF EXISTS "Mark own messages read" ON public.internal_messages;

CREATE POLICY "Admin full message access" ON public.internal_messages FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Authenticated send messages" ON public.internal_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Branch broadcast access" ON public.internal_messages FOR SELECT TO authenticated USING (branch_id IS NOT NULL AND EXISTS (SELECT 1 FROM staff_assignments WHERE staff_assignments.user_id = auth.uid() AND staff_assignments.branch_id = internal_messages.branch_id));
CREATE POLICY "Region broadcast access" ON public.internal_messages FOR SELECT TO authenticated USING (region_id IS NOT NULL AND EXISTS (SELECT 1 FROM staff_assignments WHERE staff_assignments.user_id = auth.uid() AND staff_assignments.region_id = internal_messages.region_id));
CREATE POLICY "Role-based message access" ON public.internal_messages FOR SELECT TO authenticated USING (recipient_role IS NOT NULL AND EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND (user_roles.role)::text = internal_messages.recipient_role));
CREATE POLICY "Users see own messages" ON public.internal_messages FOR SELECT TO authenticated USING (auth.uid() = recipient_id OR auth.uid() = sender_id);
CREATE POLICY "Mark own messages read" ON public.internal_messages FOR UPDATE TO authenticated USING (auth.uid() = recipient_id OR auth.uid() = sender_id);

-- ============ branches, regions, loan_products ============
DROP POLICY IF EXISTS "Admins can delete branches" ON public.branches;
DROP POLICY IF EXISTS "Admins can insert branches" ON public.branches;
DROP POLICY IF EXISTS "Admins can update branches" ON public.branches;
DROP POLICY IF EXISTS "All authenticated can view branches" ON public.branches;

CREATE POLICY "Admins can delete branches" ON public.branches FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admins can insert branches" ON public.branches FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update branches" ON public.branches FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "All authenticated can view branches" ON public.branches FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can delete regions" ON public.regions;
DROP POLICY IF EXISTS "Admins can insert regions" ON public.regions;
DROP POLICY IF EXISTS "Admins can update regions" ON public.regions;
DROP POLICY IF EXISTS "All authenticated can view regions" ON public.regions;

CREATE POLICY "Admins can delete regions" ON public.regions FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admins can insert regions" ON public.regions FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update regions" ON public.regions FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "All authenticated can view regions" ON public.regions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can delete products" ON public.loan_products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.loan_products;
DROP POLICY IF EXISTS "Admins can update products" ON public.loan_products;
DROP POLICY IF EXISTS "All authenticated can view products" ON public.loan_products;

CREATE POLICY "Admins can delete products" ON public.loan_products FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admins can insert products" ON public.loan_products FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update products" ON public.loan_products FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "All authenticated can view products" ON public.loan_products FOR SELECT TO authenticated USING (true);