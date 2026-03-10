
-- Add national_id to profiles (unique single source of truth)
ALTER TABLE public.profiles ADD COLUMN national_id text UNIQUE;

-- Add national_id to loan_applications
ALTER TABLE public.loan_applications ADD COLUMN national_id text;

-- Add applicant_national_id to job_applications
ALTER TABLE public.job_applications ADD COLUMN applicant_national_id text;

-- Create index for fast lookups
CREATE INDEX idx_profiles_national_id ON public.profiles (national_id) WHERE national_id IS NOT NULL;
CREATE INDEX idx_loan_applications_national_id ON public.loan_applications (national_id) WHERE national_id IS NOT NULL;
