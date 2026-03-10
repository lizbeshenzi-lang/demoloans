
-- Tighten insert policy: only allow inserting notifications for yourself (triggers bypass RLS via SECURITY DEFINER)
DROP POLICY "System insert notifications" ON public.notifications;
CREATE POLICY "Users insert own notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
