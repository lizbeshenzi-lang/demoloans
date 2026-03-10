
-- Add scheduling columns to sms_campaigns
ALTER TABLE public.sms_campaigns 
  ADD COLUMN IF NOT EXISTS recurrence text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS next_run_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_run_at timestamp with time zone DEFAULT NULL;

-- Add comment for recurrence values
COMMENT ON COLUMN public.sms_campaigns.recurrence IS 'none, daily, weekly, biweekly, monthly';
