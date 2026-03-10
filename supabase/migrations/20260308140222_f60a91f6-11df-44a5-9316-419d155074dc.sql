
-- Internal messaging system for hierarchy communication
CREATE TABLE public.internal_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID,
  recipient_role TEXT,
  branch_id UUID REFERENCES public.branches(id),
  region_id UUID REFERENCES public.regions(id),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  is_read BOOLEAN NOT NULL DEFAULT false,
  parent_id UUID REFERENCES public.internal_messages(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;

-- Users can see messages sent to them directly
CREATE POLICY "Users see own messages" ON public.internal_messages
FOR SELECT USING (
  auth.uid() = recipient_id 
  OR auth.uid() = sender_id
);

-- Managers can see messages sent to their role
CREATE POLICY "Role-based message access" ON public.internal_messages
FOR SELECT USING (
  recipient_role IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role::text = internal_messages.recipient_role
  )
);

-- Broadcast messages to branch
CREATE POLICY "Branch broadcast access" ON public.internal_messages
FOR SELECT USING (
  branch_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.staff_assignments 
    WHERE user_id = auth.uid() 
    AND staff_assignments.branch_id = internal_messages.branch_id
  )
);

-- Region broadcast access
CREATE POLICY "Region broadcast access" ON public.internal_messages
FOR SELECT USING (
  region_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.staff_assignments 
    WHERE user_id = auth.uid() 
    AND staff_assignments.region_id = internal_messages.region_id
  )
);

-- Authenticated users can send messages
CREATE POLICY "Authenticated send messages" ON public.internal_messages
FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Users can mark their own messages as read
CREATE POLICY "Mark own messages read" ON public.internal_messages
FOR UPDATE USING (auth.uid() = recipient_id OR auth.uid() = sender_id);

-- Admins full access
CREATE POLICY "Admin full message access" ON public.internal_messages
FOR ALL USING (is_admin());

-- Add approval_level to loan_applications for multi-step approval
ALTER TABLE public.loan_applications ADD COLUMN IF NOT EXISTS approval_level TEXT DEFAULT 'pending';
ALTER TABLE public.loan_applications ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE public.loan_applications ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_messages;
