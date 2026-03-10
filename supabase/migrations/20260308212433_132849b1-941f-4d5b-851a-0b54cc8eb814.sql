
-- 1. job_postings table
CREATE TABLE public.job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  department text NOT NULL,
  location text NOT NULL DEFAULT 'Nairobi, Kenya',
  employment_type text NOT NULL DEFAULT 'full-time',
  description text NOT NULL,
  requirements text NOT NULL,
  salary_range text,
  status text NOT NULL DEFAULT 'open',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

-- Public read for open jobs
CREATE POLICY "Anyone can view open jobs" ON public.job_postings FOR SELECT USING (status = 'open');
-- Admin/executive full access
CREATE POLICY "Admins manage job postings" ON public.job_postings FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Executives manage job postings" ON public.job_postings FOR ALL USING (is_executive()) WITH CHECK (is_executive());

-- 2. job_applications table
CREATE TABLE public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  applicant_name text NOT NULL,
  applicant_email text NOT NULL,
  applicant_phone text NOT NULL,
  resume_file_path text,
  cover_letter text,
  status text NOT NULL DEFAULT 'applied',
  notes text,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage applications" ON public.job_applications FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Executives manage applications" ON public.job_applications FOR ALL USING (is_executive()) WITH CHECK (is_executive());
-- Public insert for applicants
CREATE POLICY "Anyone can apply" ON public.job_applications FOR INSERT WITH CHECK (true);

-- 3. interview_schedules table
CREATE TABLE public.interview_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  interviewer_user_id uuid,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  interview_type text NOT NULL DEFAULT 'video',
  meeting_link text,
  status text NOT NULL DEFAULT 'scheduled',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage interviews" ON public.interview_schedules FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Executives manage interviews" ON public.interview_schedules FOR ALL USING (is_executive()) WITH CHECK (is_executive());
-- Anyone with the meeting link can view their interview
CREATE POLICY "Public view interview by id" ON public.interview_schedules FOR SELECT USING (true);

-- 4. interview_recordings table
CREATE TABLE public.interview_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES public.interview_schedules(id) ON DELETE CASCADE,
  video_url text,
  duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage recordings" ON public.interview_recordings FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Executives view recordings" ON public.interview_recordings FOR SELECT USING (is_executive());

-- 5. Resumes storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);

-- Storage RLS for resumes
CREATE POLICY "Anyone can upload resumes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'resumes');
CREATE POLICY "Admins can read resumes" ON storage.objects FOR SELECT USING (bucket_id = 'resumes' AND (public.is_admin() OR public.is_executive()));

-- 6. Updated_at triggers
CREATE TRIGGER update_job_postings_updated_at BEFORE UPDATE ON public.job_postings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON public.job_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Enable realtime for interview signaling
ALTER PUBLICATION supabase_realtime ADD TABLE public.interview_schedules;
