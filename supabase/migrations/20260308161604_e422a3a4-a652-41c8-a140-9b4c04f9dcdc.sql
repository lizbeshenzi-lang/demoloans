
-- SMS Campaigns table
CREATE TABLE public.sms_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  campaign_type text NOT NULL DEFAULT 'marketing',
  target_hierarchy text NOT NULL DEFAULT 'all',
  template text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamp with time zone,
  created_by uuid NOT NULL,
  branch_id uuid REFERENCES public.branches(id),
  region_id uuid REFERENCES public.regions(id),
  sms_provider text NOT NULL DEFAULT 'twilio',
  total_sent integer DEFAULT 0,
  total_delivered integer DEFAULT 0,
  total_failed integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- SMS Messages table
CREATE TABLE public.sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.sms_campaigns(id) ON DELETE CASCADE,
  recipient_phone text NOT NULL,
  recipient_name text,
  recipient_user_id uuid,
  loan_id uuid REFERENCES public.loan_applications(id),
  message_body text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  provider_message_id text,
  error_message text,
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Client Photos table
CREATE TABLE public.client_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id uuid NOT NULL,
  loan_id uuid REFERENCES public.loan_applications(id),
  uploaded_by uuid NOT NULL,
  photo_type text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_photos ENABLE ROW LEVEL SECURITY;

-- SMS Campaigns RLS
CREATE POLICY "Admins full access campaigns" ON public.sms_campaigns FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Executives view all campaigns" ON public.sms_campaigns FOR SELECT TO authenticated USING (is_executive());
CREATE POLICY "Managers view own campaigns" ON public.sms_campaigns FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Staff create campaigns" ON public.sms_campaigns FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('ceo','gm','regional_manager','branch_manager','loan_officer','admin'))
);
CREATE POLICY "Staff update own campaigns" ON public.sms_campaigns FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Regional mgrs view region campaigns" ON public.sms_campaigns FOR SELECT TO authenticated 
  USING (region_id IS NOT NULL AND EXISTS (SELECT 1 FROM staff_assignments sa WHERE sa.user_id = auth.uid() AND sa.region_id = sms_campaigns.region_id));
CREATE POLICY "Branch mgrs view branch campaigns" ON public.sms_campaigns FOR SELECT TO authenticated 
  USING (branch_id IS NOT NULL AND EXISTS (SELECT 1 FROM staff_assignments sa WHERE sa.user_id = auth.uid() AND sa.branch_id = sms_campaigns.branch_id));

-- SMS Messages RLS
CREATE POLICY "Admins full access messages" ON public.sms_messages FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Executives view all messages" ON public.sms_messages FOR SELECT TO authenticated USING (is_executive());
CREATE POLICY "Staff view campaign messages" ON public.sms_messages FOR SELECT TO authenticated 
  USING (campaign_id IS NOT NULL AND EXISTS (SELECT 1 FROM sms_campaigns c WHERE c.id = sms_messages.campaign_id AND c.created_by = auth.uid()));
CREATE POLICY "Staff insert messages" ON public.sms_messages FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('ceo','gm','regional_manager','branch_manager','loan_officer','admin')));

-- Client Photos RLS
CREATE POLICY "Admins full access photos" ON public.client_photos FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Executives view all photos" ON public.client_photos FOR SELECT TO authenticated USING (is_executive());
CREATE POLICY "Staff upload photos" ON public.client_photos FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('ceo','gm','regional_manager','branch_manager','loan_officer','admin')));
CREATE POLICY "Staff view uploaded photos" ON public.client_photos FOR SELECT TO authenticated USING (uploaded_by = auth.uid());
CREATE POLICY "Clients view own photos" ON public.client_photos FOR SELECT TO authenticated USING (client_user_id = auth.uid());
CREATE POLICY "Branch staff view loan photos" ON public.client_photos FOR SELECT TO authenticated 
  USING (loan_id IS NOT NULL AND is_branch_staff_for_loan(loan_id));
CREATE POLICY "Region staff view loan photos" ON public.client_photos FOR SELECT TO authenticated 
  USING (loan_id IS NOT NULL AND is_region_staff_for_loan(loan_id));
CREATE POLICY "LO view assigned loan photos" ON public.client_photos FOR SELECT TO authenticated 
  USING (loan_id IS NOT NULL AND is_loan_officer_for(loan_id));

-- Storage bucket for client photos
INSERT INTO storage.buckets (id, name, public) VALUES ('client-photos', 'client-photos', false);

-- Storage policies for client-photos bucket
CREATE POLICY "Staff upload client photos" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'client-photos' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('ceo','gm','regional_manager','branch_manager','loan_officer','admin')));
CREATE POLICY "Authenticated view client photos" ON storage.objects FOR SELECT TO authenticated 
  USING (bucket_id = 'client-photos');
CREATE POLICY "Admin delete client photos" ON storage.objects FOR DELETE TO authenticated 
  USING (bucket_id = 'client-photos' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Triggers for updated_at
CREATE TRIGGER set_sms_campaigns_updated_at BEFORE UPDATE ON public.sms_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
