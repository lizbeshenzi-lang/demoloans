-- Grant marketing_lead SELECT on kyc_documents (org-wide)
CREATE POLICY "Marketing lead view all kyc"
ON public.kyc_documents FOR SELECT
TO authenticated
USING (is_marketing_lead());

-- Grant marketing_lead broader staff_assignments access (already in is_manager via SELECT)
-- Already covered by "Managers view all assignments" policy

-- Grant marketing_lead access to notifications insert (for workflow triggers)
CREATE POLICY "Marketing lead insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (is_marketing_lead());

-- Create sms_automation_rules table for workflow triggers
CREATE TABLE public.sms_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_condition text NOT NULL, -- e.g. 'overdue_days_gt_7', 'new_disbursement', 'kyc_pending_3_days'
  trigger_params jsonb DEFAULT '{}'::jsonb,
  action_template text NOT NULL, -- SMS template
  action_campaign_type text NOT NULL DEFAULT 'recovery',
  target_hierarchy text NOT NULL DEFAULT 'all',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  last_triggered_at timestamptz,
  trigger_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_automation_rules ENABLE ROW LEVEL SECURITY;

-- Marketing lead full CRUD on automation rules
CREATE POLICY "Marketing lead full access automation rules"
ON public.sms_automation_rules FOR ALL
TO authenticated
USING (is_marketing_lead())
WITH CHECK (is_marketing_lead());

-- Admin full access
CREATE POLICY "Admin full access automation rules"
ON public.sms_automation_rules FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Executives view
CREATE POLICY "Executives view automation rules"
ON public.sms_automation_rules FOR SELECT
TO authenticated
USING (is_executive());

-- Update trigger for updated_at
CREATE TRIGGER update_sms_automation_rules_updated_at
  BEFORE UPDATE ON public.sms_automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
