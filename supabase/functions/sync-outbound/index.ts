import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SyncOutboundRequest {
  integration_id: string;
  entity_types?: string[]; // defaults to ["loan_applications", "loan_repayments"]
  since?: string; // ISO date — only sync records updated after this
  dry_run?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth — admin only
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

    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: corsHeaders });
    }

    const body: SyncOutboundRequest = await req.json();
    const { integration_id, entity_types = ["loan_applications", "loan_repayments"], since, dry_run = false } = body;

    if (!integration_id) {
      return new Response(JSON.stringify({ error: "integration_id required" }), { status: 400, headers: corsHeaders });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // "auto" mode: sync all active integrations (used by cron)
    if (integration_id === "auto") {
      const { data: activeIntegrations } = await serviceClient
        .from("system_integrations")
        .select("id, name")
        .eq("is_active", true)
        .in("sync_direction", ["outbound", "bidirectional"]);

      if (!activeIntegrations || activeIntegrations.length === 0) {
        return new Response(JSON.stringify({ message: "No active outbound integrations found", synced: 0 }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results = [];
      for (const int of activeIntegrations) {
        // Recursively call ourselves per integration
        const res = await processIntegration(serviceClient, int.id, entity_types, since, dry_run);
        results.push({ integration: int.name, ...res });
      }
      return new Response(JSON.stringify({ mode: "auto", integrations_synced: results.length, results }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Single integration mode
    const result = await processIntegration(serviceClient, integration_id, entity_types, since, dry_run);

    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("sync-outbound error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processIntegration(
  serviceClient: any,
  integration_id: string,
  entity_types: string[],
  since: string | undefined,
  dry_run: boolean
) {
    // Fetch integration config
    const { data: integration, error: intErr } = await serviceClient
      .from("system_integrations")
      .select("*")
      .eq("id", integration_id)
      .single();

    if (intErr || !integration) {
      return { error: "Integration not found" };
    }

    if (!integration.is_active && !dry_run) {
      return { error: "Integration is inactive" };
    }

    // Create sync log
    const { data: syncLog } = await serviceClient.from("sync_logs").insert({
      integration_id,
      direction: "outbound",
      entity_type: entity_types.join(","),
      status: "running",
    } as any).select("id").single();
    const syncLogId = syncLog?.id;

    const results: Record<string, { count: number; sample?: unknown; errors: string[] }> = {};
    let totalProcessed = 0;
    let totalFailed = 0;

    // --- Gather data per entity type ---
    for (const entityType of entity_types) {
      const entityResult: { count: number; sample?: unknown; errors: string[] } = { count: 0, errors: [] };

      try {
        if (entityType === "loan_applications") {
          let query = serviceClient
            .from("loan_applications")
            .select("*, branches(name, code), loan_products(name, code)")
            .in("status", ["approved", "disbursed", "completed"]);

          if (since) query = query.gte("updated_at", since);

          const { data: loans, error } = await query.limit(1000);
          if (error) throw error;

          const payload = (loans || []).map((loan: any) => ({
            external_id: loan.external_id,
            demo_id: loan.id,
            full_name: loan.full_name,
            phone: loan.phone,
            email: loan.email,
            national_id: loan.national_id,
            business_type: loan.business_type,
            location: loan.location,
            financing_amount: loan.financing_amount,
            amount_approved: loan.amount_approved,
            status: loan.status,
            approval_level: loan.approval_level,
            risk_score: loan.risk_score,
            disbursement_date: loan.disbursement_date,
            disbursement_method: loan.disbursement_method,
            disbursement_reference: loan.disbursement_reference,
            expected_completion_date: loan.expected_completion_date,
            branch_name: loan.branches?.name || null,
            branch_code: loan.branches?.code || null,
            product_name: loan.loan_products?.name || null,
            product_code: loan.loan_products?.code || null,
            created_at: loan.created_at,
            updated_at: loan.updated_at,
          }));

          entityResult.count = payload.length;
          if (payload.length > 0) entityResult.sample = payload[0];

          if (!dry_run && integration.base_url && payload.length > 0) {
            const pushResult = await pushToExternal(
              integration.base_url,
              "/loans",
              payload,
              integration.auth_type,
              integration.config
            );
            if (!pushResult.success) {
              entityResult.errors.push(pushResult.error || "Push failed");
              totalFailed += payload.length;
            } else {
              totalProcessed += payload.length;
            }
          } else {
            totalProcessed += payload.length;
          }

        } else if (entityType === "loan_repayments") {
          let query = serviceClient
            .from("loan_repayments")
            .select("*, loan_applications(full_name, phone, external_id, national_id)");

          if (since) query = query.gte("created_at", since);

          const { data: repayments, error } = await query.limit(1000);
          if (error) throw error;

          const payload = (repayments || []).map((r: any) => ({
            demo_id: r.id,
            loan_demo_id: r.loan_id,
            loan_external_id: r.loan_applications?.external_id || null,
            client_name: r.loan_applications?.full_name || null,
            client_phone: r.loan_applications?.phone || null,
            client_national_id: r.loan_applications?.national_id || null,
            week_number: r.week_number,
            due_date: r.due_date,
            amount_due: r.amount_due,
            amount_paid: r.amount_paid,
            paid_date: r.paid_date,
            status: r.status,
            created_at: r.created_at,
          }));

          entityResult.count = payload.length;
          if (payload.length > 0) entityResult.sample = payload[0];

          if (!dry_run && integration.base_url && payload.length > 0) {
            const pushResult = await pushToExternal(
              integration.base_url,
              "/repayments",
              payload,
              integration.auth_type,
              integration.config
            );
            if (!pushResult.success) {
              entityResult.errors.push(pushResult.error || "Push failed");
              totalFailed += payload.length;
            } else {
              totalProcessed += payload.length;
            }
          } else {
            totalProcessed += payload.length;
          }
        } else {
          entityResult.errors.push(`Unsupported entity type: ${entityType}`);
        }
      } catch (e) {
        entityResult.errors.push(e instanceof Error ? e.message : String(e));
        totalFailed += entityResult.count;
      }

      results[entityType] = entityResult;
    }

    // Update sync log
    if (syncLogId) {
      await serviceClient.from("sync_logs").update({
        records_processed: totalProcessed,
        records_failed: totalFailed,
        status: totalFailed > 0 && totalProcessed === 0 ? "failed" : totalFailed > 0 ? "partial" : "completed",
        completed_at: new Date().toISOString(),
        error_details: totalFailed > 0 ? results : null,
      } as any).eq("id", syncLogId);
    }

    // Update integration last_sync_at
    await serviceClient.from("system_integrations").update({
      last_sync_at: new Date().toISOString(),
      sync_status: totalFailed > 0 ? "error" : "synced",
    } as any).eq("id", integration_id);

    return {
      integration: integration.name,
      dry_run,
      since: since || "all time",
      total_processed: totalProcessed,
      total_failed: totalFailed,
      entities: results,
    };
}

async function pushToExternal(
  baseUrl: string,
  path: string,
  payload: unknown[],
  authType: string,
  config: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    if (authType === "api_key" && config.api_key) {
      headers["X-API-Key"] = config.api_key as string;
    } else if (authType === "bearer" && config.token) {
      headers["Authorization"] = `Bearer ${config.token as string}`;
    } else if (authType === "basic" && config.username && config.password) {
      headers["Authorization"] = `Basic ${btoa(`${config.username}:${config.password}`)}`;
    }

    const url = `${baseUrl.replace(/\/$/, "")}${path}`;
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ records: payload, count: payload.length, synced_at: new Date().toISOString() }),
    });

    if (!response.ok) {
      const body = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${body.slice(0, 500)}` };
    }
    await response.text();
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
