import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-idempotency-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WebhookEvent {
  event_type: string;
  payload: Record<string, unknown>;
  idempotency_key?: string;
  source?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify webhook secret
    const webhookSecret = req.headers.get("x-webhook-secret");
    const expectedSecret = Deno.env.get("WEBHOOK_SECRET");
    if (expectedSecret && webhookSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Invalid webhook secret" }), { status: 401, headers: corsHeaders });
    }

    const body: WebhookEvent = await req.json();
    const { event_type, payload, idempotency_key, source } = body;

    if (!event_type || !payload) {
      return new Response(JSON.stringify({ error: "event_type and payload required" }), { status: 400, headers: corsHeaders });
    }

    // Idempotency check via audit_log
    if (idempotency_key) {
      const { data: existing } = await serviceClient
        .from("audit_log")
        .select("id")
        .eq("entity_type", "webhook")
        .eq("notes", idempotency_key)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ status: "duplicate", message: "Event already processed" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let result: Record<string, unknown> = { processed: false };

    switch (event_type) {
      case "payment_received": {
        // Expected payload: { loan_external_id OR loan_id, amount, payment_date, reference }
        const loanId = payload.loan_id as string;
        const loanExternalId = payload.loan_external_id as string;
        const amount = Number(payload.amount);
        const paymentDate = (payload.payment_date as string) || new Date().toISOString().split("T")[0];

        let resolvedLoanId = loanId;
        if (!resolvedLoanId && loanExternalId) {
          const { data: loan } = await serviceClient
            .from("loan_applications")
            .select("id")
            .eq("external_id", loanExternalId)
            .single();
          resolvedLoanId = loan?.id;
        }

        if (!resolvedLoanId) {
          result = { processed: false, error: "Loan not found" };
          break;
        }

        // Find next pending repayment
        const { data: repayment } = await serviceClient
          .from("loan_repayments")
          .select("*")
          .eq("loan_id", resolvedLoanId)
          .eq("status", "pending")
          .order("week_number", { ascending: true })
          .limit(1)
          .single();

        if (repayment) {
          const newPaid = (repayment.amount_paid || 0) + amount;
          const status = newPaid >= repayment.amount_due ? "paid" : "partial";
          await serviceClient.from("loan_repayments").update({
            amount_paid: newPaid,
            status,
            paid_date: paymentDate,
          }).eq("id", repayment.id);
          result = { processed: true, repayment_id: repayment.id, status, amount_applied: amount };
        } else {
          result = { processed: false, error: "No pending repayment found" };
        }
        break;
      }

      case "loan_status_update": {
        // Expected payload: { loan_external_id OR loan_id, status, notes }
        const id = payload.loan_id as string;
        const extId = payload.loan_external_id as string;
        const newStatus = payload.status as string;

        let targetId = id;
        if (!targetId && extId) {
          const { data: loan } = await serviceClient
            .from("loan_applications")
            .select("id")
            .eq("external_id", extId)
            .single();
          targetId = loan?.id;
        }

        if (targetId && newStatus) {
          await serviceClient.from("loan_applications").update({
            status: newStatus,
            approval_notes: (payload.notes as string) || `Updated via webhook from ${source || "external"}`,
          }).eq("id", targetId);
          result = { processed: true, loan_id: targetId };
        } else {
          result = { processed: false, error: "Loan not found or missing status" };
        }
        break;
      }

      case "client_update": {
        // Expected payload: { external_id, full_name?, phone?, email?, ... }
        const extId = payload.external_id as string;
        if (!extId) {
          result = { processed: false, error: "external_id required" };
          break;
        }
        const { external_id: _, ...updateFields } = payload;
        const { error } = await serviceClient
          .from("profiles")
          .update(updateFields)
          .eq("external_id", extId);
        result = { processed: !error, error: error?.message };
        break;
      }

      default:
        result = { processed: false, error: `Unknown event_type: ${event_type}` };
    }

    // Log to audit
    await serviceClient.from("audit_log").insert({
      entity_type: "webhook",
      entity_id: "00000000-0000-0000-0000-000000000000",
      action: `webhook_${event_type}`,
      new_values: { event_type, payload, result, source },
      notes: idempotency_key || null,
    });

    return new Response(JSON.stringify({ event_type, ...result }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("webhook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
