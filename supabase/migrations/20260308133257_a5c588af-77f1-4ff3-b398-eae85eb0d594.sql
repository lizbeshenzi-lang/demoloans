
-- Admin CRUD policies for branches
CREATE POLICY "Admins can insert branches" ON public.branches FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update branches" ON public.branches FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete branches" ON public.branches FOR DELETE TO authenticated USING (public.is_admin());

-- Admin CRUD policies for regions
CREATE POLICY "Admins can insert regions" ON public.regions FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update regions" ON public.regions FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete regions" ON public.regions FOR DELETE TO authenticated USING (public.is_admin());

-- Admin CRUD policies for loan_products
CREATE POLICY "Admins can insert products" ON public.loan_products FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update products" ON public.loan_products FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete products" ON public.loan_products FOR DELETE TO authenticated USING (public.is_admin());

-- Admin CRUD policies for user_roles
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_admin());

-- Admin CRUD policies for staff_assignments
CREATE POLICY "Admins can insert assignments" ON public.staff_assignments FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update assignments" ON public.staff_assignments FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete assignments" ON public.staff_assignments FOR DELETE TO authenticated USING (public.is_admin());

-- Admin CRUD policies for loan_repayments
CREATE POLICY "Admins can insert repayments" ON public.loan_repayments FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update repayments" ON public.loan_repayments FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete repayments" ON public.loan_repayments FOR DELETE TO authenticated USING (public.is_admin());

-- Admin CRUD policies for notifications
CREATE POLICY "Admins can delete notifications" ON public.notifications FOR DELETE TO authenticated USING (public.is_admin());

-- Admin CRUD policies for ai_insights
CREATE POLICY "Admins can insert insights" ON public.ai_insights FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update insights" ON public.ai_insights FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete insights" ON public.ai_insights FOR DELETE TO authenticated USING (public.is_admin());

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin());
