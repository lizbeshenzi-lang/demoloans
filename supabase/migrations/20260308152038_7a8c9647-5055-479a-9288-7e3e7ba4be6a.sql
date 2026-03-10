CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON public.user_roles(user_id, role);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_user_id ON public.staff_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_branch_id ON public.staff_assignments(branch_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_region_id ON public.staff_assignments(region_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_branch_id ON public.loan_applications(branch_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_loan_officer_id ON public.loan_applications(loan_officer_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_user_id ON public.loan_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON public.loan_applications(status);