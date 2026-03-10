import { supabase } from "@/integrations/supabase/client";

export async function logAudit(params: {
  entityType: string;
  entityId: string;
  action: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  notes?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Fetch actual role instead of hardcoding
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  await supabase.from("audit_log").insert([{
    entity_type: params.entityType,
    entity_id: params.entityId,
    action: params.action,
    old_values: (params.oldValues as any) ?? null,
    new_values: (params.newValues as any) ?? null,
    performed_by: user.id,
    performed_by_role: roleData?.role ?? null,
    notes: params.notes ?? null,
  }]);
}
