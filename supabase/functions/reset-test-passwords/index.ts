import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const password = "Mular2026!";

  // Only reset key test accounts (not all 900+)
  const targetEmails = [
    "admin@test.com",
    "ceo@mularcredit.test",
    "gm@mularcredit.test",
    "rm.nairobi@mularcredit.test",
    "rm.coast@mularcredit.test",
    "rm.central@mularcredit.test",
    "bm.westlands@mularcredit.test",
    "bm.cbd@mularcredit.test",
    "bm.mombasa@mularcredit.test",
    "lo.westlands1@mularcredit.test",
    "lo.westlands2@mularcredit.test",
    "lo.cbd1@mularcredit.test",
    "client01@mularcredit.test",
  ];

  const results: any[] = [];
  for (const email of targetEmails) {
    // Find user by email
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1 });
    // Use a different approach - get user by email
    const { data, error: listErr } = await supabaseAdmin.from("profiles").select("user_id").eq("email", email).single();
    if (!data) {
      results.push({ email, success: false, error: "not found" });
      continue;
    }
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password });
    results.push({ email, success: !updateErr, error: updateErr?.message });
  }

  return new Response(JSON.stringify({ updated: results.filter(r => r.success).length, results }), { 
    headers: { ...corsHeaders, "Content-Type": "application/json" } 
  });
});
