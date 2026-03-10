import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const AI_API_URL = Deno.env.get("AI_API_URL") || "https://ai.gateway.lovable.dev/v1/chat/completions";
    const AI_API_KEY = Deno.env.get("AI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    const AI_MODEL = Deno.env.get("AI_MODEL") || "google/gemini-3-flash-preview";

    if (!AI_API_KEY) throw new Error("AI_API_KEY or LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get auth token from request
    const authHeader = req.headers.get("authorization");
    const { messages } = await req.json();

    // Create service role client for data queries
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user is CEO or GM
    if (authHeader) {
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!roleData || !["ceo", "gm", "admin"].includes(roleData.role)) {
        return new Response(JSON.stringify({ error: "Access restricted to executives" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Gather portfolio context from DB
    const [loansRes, repaymentsRes, branchesRes, regionsRes, productsRes] = await Promise.all([
      supabase.from("loan_applications").select("id, full_name, business_type, financing_amount, status, risk_score, branch_id, product_id, loan_officer_id, created_at, amount_approved, disbursement_date"),
      supabase.from("loan_repayments").select("loan_id, amount_due, amount_paid, status, week_number, due_date"),
      supabase.from("branches").select("id, name, code, location, region_id"),
      supabase.from("regions").select("id, name, code"),
      supabase.from("loan_products").select("id, name, code, interest_rate, term_weeks, min_amount, max_amount"),
    ]);

    const loans = loansRes.data || [];
    const repayments = repaymentsRes.data || [];
    const branches = branchesRes.data || [];
    const regions = regionsRes.data || [];
    const products = productsRes.data || [];

    // Build summary stats
    const totalLoans = loans.length;
    const statusCounts: Record<string, number> = {};
    loans.forEach((l: any) => { statusCounts[l.status] = (statusCounts[l.status] || 0) + 1; });

    const totalDisbursed = loans
      .filter((l: any) => l.amount_approved && l.status !== "rejected" && l.status !== "pending")
      .reduce((s: number, l: any) => s + Number(l.amount_approved), 0);

    // Branch-level stats
    const branchStats = branches.map((b: any) => {
      const bLoans = loans.filter((l: any) => l.branch_id === b.id);
      const bRepayments = repayments.filter((r: any) => bLoans.some((l: any) => l.id === r.loan_id));
      const totalDue = bRepayments.reduce((s: number, r: any) => s + Number(r.amount_due), 0);
      const totalPaid = bRepayments.reduce((s: number, r: any) => s + Number(r.amount_paid || 0), 0);
      const overdue = bRepayments.filter((r: any) => r.status === "overdue").length;
      const region = regions.find((reg: any) => reg.id === b.region_id);
      return {
        branch: b.name, code: b.code, location: b.location, region: region?.name || "Unknown",
        totalLoans: bLoans.length,
        pending: bLoans.filter((l: any) => l.status === "pending").length,
        approved: bLoans.filter((l: any) => l.status === "approved").length,
        disbursed: bLoans.filter((l: any) => l.status === "disbursed").length,
        completed: bLoans.filter((l: any) => l.status === "completed").length,
        rejected: bLoans.filter((l: any) => l.status === "rejected").length,
        collectionRate: totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0,
        overduePayments: overdue,
        avgRiskScore: bLoans.filter((l: any) => l.risk_score).length > 0
          ? Math.round(bLoans.filter((l: any) => l.risk_score).reduce((s: number, l: any) => s + l.risk_score, 0) / bLoans.filter((l: any) => l.risk_score).length)
          : null,
      };
    });

    // Product stats
    const productStats = products.map((p: any) => {
      const pLoans = loans.filter((l: any) => l.product_id === p.id);
      return {
        product: p.name, code: p.code, interestRate: p.interest_rate, termWeeks: p.term_weeks,
        totalLoans: pLoans.length,
        disbursed: pLoans.filter((l: any) => l.status === "disbursed" || l.status === "completed").length,
      };
    });

    // Overall repayment stats
    const totalDue = repayments.reduce((s: number, r: any) => s + Number(r.amount_due), 0);
    const totalPaid = repayments.reduce((s: number, r: any) => s + Number(r.amount_paid || 0), 0);
    const overdueCount = repayments.filter((r: any) => r.status === "overdue").length;

    const systemPrompt = `You are Kechita Capital's AI Executive Assistant. You help the CEO and GM analyze the loan portfolio.
Answer questions using the data provided. Be concise, use numbers and percentages. Format with markdown tables when comparing branches/products.
If asked about something not in the data, say so clearly.

TODAY: ${new Date().toISOString().split("T")[0]}

PORTFOLIO SUMMARY:
- Total loans: ${totalLoans}
- Status breakdown: ${JSON.stringify(statusCounts)}
- Total amount disbursed: KES ${totalDisbursed.toLocaleString()}
- Overall collection rate: ${totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0}%
- Overdue payments: ${overdueCount}

BRANCH PERFORMANCE:
${JSON.stringify(branchStats, null, 1)}

PRODUCT PERFORMANCE:
${JSON.stringify(productStats, null, 1)}

REGIONS: ${JSON.stringify(regions.map((r: any) => r.name))}

KEY METRICS TO REFERENCE:
- Default rate = (overdue payments / total payments) for each branch
- Collection rate = (amount paid / amount due) as percentage
- Risk score: 80+ is low risk, 65-79 medium, <65 high risk`;

    const response = await fetch(AI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("executive-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
