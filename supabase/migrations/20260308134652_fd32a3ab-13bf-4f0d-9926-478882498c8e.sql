
-- KYC Documents table
CREATE TABLE public.kyc_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  loan_id UUID REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  review_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

-- Users can view their own KYC docs
CREATE POLICY "Users view own kyc" ON public.kyc_documents FOR SELECT USING (auth.uid() = user_id);
-- Users can upload their own KYC docs
CREATE POLICY "Users insert own kyc" ON public.kyc_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Admins full access
CREATE POLICY "Admins select kyc" ON public.kyc_documents FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins update kyc" ON public.kyc_documents FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins delete kyc" ON public.kyc_documents FOR DELETE USING (public.is_admin());
-- Managers can view
CREATE POLICY "Managers view kyc" ON public.kyc_documents FOR SELECT USING (public.is_manager());
-- Managers can update (review)
CREATE POLICY "Managers update kyc" ON public.kyc_documents FOR UPDATE USING (public.is_manager());

-- Storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false);

-- Storage policies
CREATE POLICY "Users upload own kyc files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users view own kyc files" ON storage.objects FOR SELECT USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins view all kyc files" ON storage.objects FOR SELECT USING (bucket_id = 'kyc-documents' AND public.is_admin());
CREATE POLICY "Managers view all kyc files" ON storage.objects FOR SELECT USING (bucket_id = 'kyc-documents' AND public.is_manager());
CREATE POLICY "Admins delete kyc files" ON storage.objects FOR DELETE USING (bucket_id = 'kyc-documents' AND public.is_admin());

-- Add updated_at trigger for kyc_documents
CREATE TRIGGER update_kyc_documents_updated_at BEFORE UPDATE ON public.kyc_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for kyc_documents
ALTER PUBLICATION supabase_realtime ADD TABLE public.kyc_documents;
