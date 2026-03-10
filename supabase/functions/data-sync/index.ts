import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_ENTITIES = ["loan_applications", "profiles", "branches", "loan_products", "loan_repayments"] as const;
type EntityType = typeof VALID_ENTITIES[number];

const REQUIRED_FIELDS: Record<EntityType, string[]> = {
  loan_applications: ["full_name", "phone", "business_type"],
  profiles: ["user_id"],
  branches: ["name", "code", "region_id"],
  loan_products: ["name", "code", "interest_rate", "term_weeks"],
  loan_repayments: ["loan_id", "amount_due", "due_date", "week_number"],
};

const UPSERT_KEYS: Record<EntityType, string> = {
  loan_applications: "external_id",
  profiles: "external_id",
  branches: "external_id",
  loan_products: "external_id",
  loan_repayments: "id",
};

interface SyncRequest {
  entity_type: EntityType;
  records: Record<string, unknown>[];
  integration_id?: string;
  upsert_key?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check — admin only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub as string;

    // Check admin role
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: corsHeaders });
    }

    const body: SyncRequest = await req.json();
    const { entity_type, records, integration_id, upsert_key } = body;

    if (!VALID_ENTITIES.includes(entity_type)) {
      return new Response(JSON.stringify({ error: `Invalid entity_type. Valid: ${VALID_ENTITIES.join(", ")}` }), { status: 400, headers: corsHeaders });
    }
    if (!Array.isArray(records) || records.length === 0) {
      return new Response(JSON.stringify({ error: "records must be a non-empty array" }), { status: 400, headers: corsHeaders });
    }
    if (records.length > 500) {
      return new Response(JSON.stringify({ error: "Max 500 records per batch" }), { status: 400, headers: corsHeaders });
    }

    // Use service role for actual inserts
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create sync log
    let syncLogId: string | null = null;
    if (integration_id) {
      const { data: log } = await serviceClient.from("sync_logs").insert({
        integration_id,
        direction: "inbound",
        entity_type,
        status: "running",
      }).select("id").single();
      syncLogId = log?.id || null;
    }

    const requiredFields = REQUIRED_FIELDS[entity_type];
    const onConflict = upsert_key || UPSERT_KEYS[entity_type];
    const results: { index: number; status: "success" | "error"; error?: string; id?: string }[] = [];
    let processed = 0;
    let failed = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      // Validate required fields
      const missing = requiredFields.filter(f => !record[f] && record[f] !== 0);
      if (missing.length > 0) {
        results.push({ index: i, status: "error", error: `Missing: ${missing.join(", ")}` });
        failed++;
        continue;
      }

      // Strip unknown fields — just pass through (Supabase will ignore unknown cols)
      try {
        const { data, error } = await serviceClient
          .from(entity_type)
          .upsert(record as any, { onConflict, ignoreDuplicates: false })
          .select("id")
          .single();

        if (error) {
          results.push({ index: i, status: "error", error: error.message });
          failed++;
        } else {
          results.push({ index: i, status: "success", id: data?.id });
          processed++;
        }
      } catch (e) {
        results.push({ index: i, status: "error", error: String(e) });
        failed++;
      }
    }

    // Update sync log
    if (syncLogId) {
      await serviceClient.from("sync_logs").update({
        records_processed: processed,
        records_failed: failed,
        status: failed === records.length ? "failed" : failed > 0 ? "partial" : "completed",
        completed_at: new Date().toISOString(),
        error_details: failed > 0 ? results.filter(r => r.status === "error") : null,
      }).eq("id", syncLogId);
    }

    return new Response(JSON.stringify({
      entity_type,
      total: records.length,
      processed,
      failed,
      results,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("data-sync error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
