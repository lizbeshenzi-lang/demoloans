
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS external_id text UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS external_id text UNIQUE;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS external_id text UNIQUE;
ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS external_id text UNIQUE;

CREATE TABLE system_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  system_type text NOT NULL,
  base_url text,
  auth_type text DEFAULT 'api_key',
  is_active boolean DEFAULT false,
  sync_direction text DEFAULT 'inbound',
  last_sync_at timestamptz,
  sync_status text DEFAULT 'never',
  config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE system_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage integrations" ON system_integrations FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES system_integrations(id) ON DELETE CASCADE,
  direction text NOT NULL,
  entity_type text NOT NULL,
  records_processed int DEFAULT 0,
  records_failed int DEFAULT 0,
  error_details jsonb,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status text DEFAULT 'running'
);
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage sync logs" ON sync_logs FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
