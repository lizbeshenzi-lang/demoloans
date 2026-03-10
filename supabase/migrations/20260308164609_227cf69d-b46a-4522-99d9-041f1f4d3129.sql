
-- Audit trail table
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  performed_by uuid,
  performed_by_role text,
  ip_address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_user ON public.audit_log(performed_by);

-- RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access audit" ON public.audit_log FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Executives view audit" ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_executive());

CREATE POLICY "Managers view audit" ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_manager());

CREATE POLICY "System insert audit" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (true);

-- Disbursement fields on loan_applications
ALTER TABLE public.loan_applications 
  ADD COLUMN IF NOT EXISTS disbursement_method text,
  ADD COLUMN IF NOT EXISTS disbursement_reference text,
  ADD COLUMN IF NOT EXISTS disbursed_by uuid;

-- Trigger to auto-log loan status changes
CREATE OR REPLACE FUNCTION public.log_loan_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status OR OLD.approval_level IS DISTINCT FROM NEW.approval_level THEN
    INSERT INTO public.audit_log (entity_type, entity_id, action, old_values, new_values, performed_by, notes)
    VALUES (
      'loan_application',
      NEW.id,
      CASE 
        WHEN NEW.status = 'rejected' THEN 'rejected'
        WHEN NEW.status = 'approved' THEN 'approved'
        WHEN NEW.status = 'disbursed' THEN 'disbursed'
        WHEN NEW.status = 'completed' THEN 'completed'
        ELSE 'status_change'
      END,
      jsonb_build_object('status', OLD.status, 'approval_level', OLD.approval_level),
      jsonb_build_object('status', NEW.status, 'approval_level', NEW.approval_level, 'amount_approved', NEW.amount_approved),
      COALESCE(NEW.approved_by, auth.uid()),
      NEW.approval_notes
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_loan_audit
  AFTER UPDATE ON public.loan_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.log_loan_audit();

-- Trigger to log repayment status changes
CREATE OR REPLACE FUNCTION public.log_repayment_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_log (entity_type, entity_id, action, old_values, new_values, performed_by)
    VALUES (
      'loan_repayment',
      NEW.id,
      'payment_' || NEW.status,
      jsonb_build_object('status', OLD.status, 'amount_paid', OLD.amount_paid),
      jsonb_build_object('status', NEW.status, 'amount_paid', NEW.amount_paid, 'loan_id', NEW.loan_id),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_repayment_audit
  AFTER UPDATE ON public.loan_repayments
  FOR EACH ROW
  EXECUTE FUNCTION public.log_repayment_audit();
