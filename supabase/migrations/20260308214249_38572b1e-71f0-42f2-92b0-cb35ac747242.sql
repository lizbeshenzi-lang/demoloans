
-- Allow CEO/GM to view all user roles (needed for staff oversight)
CREATE POLICY "Executives can view all roles"
ON public.user_roles FOR SELECT
USING (is_executive());
