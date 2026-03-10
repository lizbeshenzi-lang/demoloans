import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const results: any[] = [];

    const newStaff = [
      // Regional Managers for new regions
      { email: "rm.western@mularcredit.test", name: "Victor Wanyama", role: "regional_manager", region_id: "a1000000-0000-0000-0000-000000000004", branch_id: null },
      { email: "rm.riftvalley@mularcredit.test", name: "Gladys Cherono", role: "regional_manager", region_id: "a1000000-0000-0000-0000-000000000005", branch_id: null },
      { email: "rm.eastern@mularcredit.test", name: "Timothy Muturi", role: "regional_manager", region_id: "a1000000-0000-0000-0000-000000000006", branch_id: null },
      { email: "rm.northeastern@mularcredit.test", name: "Abdi Noor", role: "regional_manager", region_id: "a1000000-0000-0000-0000-000000000007", branch_id: null },

      // Branch Managers for new branches
      { email: "bm.bungoma@mularcredit.test", name: "Josephine Nafula", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000013" },
      { email: "bm.vihiga@mularcredit.test", name: "Cleophas Shimoli", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000014" },
      { email: "bm.busia@mularcredit.test", name: "Rosaline Akoth", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000015" },
      { email: "bm.narok@mularcredit.test", name: "Lemayian Saitoti", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000016" },
      { email: "bm.kericho@mularcredit.test", name: "Hellen Chepkemoi", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000017" },
      { email: "bm.bomet@mularcredit.test", name: "Kipkirui Bett", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000018" },
      { email: "bm.kajiado@mularcredit.test", name: "Nashipai Olenguruone", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000019" },
      { email: "bm.machakos@mularcredit.test", name: "Benedicta Mwikali", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000020" },
      { email: "bm.kitui@mularcredit.test", name: "Musyoka Ndunda", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000021" },
      { email: "bm.embu@mularcredit.test", name: "Njiru Karimi", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000022" },
      { email: "bm.meru@mularcredit.test", name: "Mugambi Kiome", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000023" },
      { email: "bm.garissa@mularcredit.test", name: "Ahmed Hassan", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000024" },
      { email: "bm.wajir@mularcredit.test", name: "Halima Abdirahman", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000025" },
      { email: "bm.isiolo@mularcredit.test", name: "Dida Roba", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000026" },

      // 2 Loan Officers per new branch (28 total)
      { email: "lo.bungoma1@mularcredit.test", name: "Edwin Simiyu", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000013" },
      { email: "lo.bungoma2@mularcredit.test", name: "Rose Nekesa", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000013" },
      { email: "lo.vihiga1@mularcredit.test", name: "Maxwell Ingonga", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000014" },
      { email: "lo.vihiga2@mularcredit.test", name: "Scolastica Amuhaya", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000014" },
      { email: "lo.busia1@mularcredit.test", name: "Pascal Ouma", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000015" },
      { email: "lo.busia2@mularcredit.test", name: "Millicent Adhiambo", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000015" },
      { email: "lo.narok1@mularcredit.test", name: "Sankale Parsitau", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000016" },
      { email: "lo.narok2@mularcredit.test", name: "Naisiae Tome", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000016" },
      { email: "lo.kericho1@mularcredit.test", name: "Gilbert Koech", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000017" },
      { email: "lo.kericho2@mularcredit.test", name: "Mercy Chepkorir", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000017" },
      { email: "lo.bomet1@mularcredit.test", name: "Wesley Langat", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000018" },
      { email: "lo.bomet2@mularcredit.test", name: "Faith Chepkemoi", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000018" },
      { email: "lo.kajiado1@mularcredit.test", name: "Amos Leshan", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000019" },
      { email: "lo.kajiado2@mularcredit.test", name: "Naomi Naisiae", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000019" },
      { email: "lo.machakos1@mularcredit.test", name: "Stephen Mutiso", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000020" },
      { email: "lo.machakos2@mularcredit.test", name: "Veronica Mwende", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000020" },
      { email: "lo.kitui1@mularcredit.test", name: "Raphael Mwinzi", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000021" },
      { email: "lo.kitui2@mularcredit.test", name: "Caroline Mwikali", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000021" },
      { email: "lo.embu1@mularcredit.test", name: "Duncan Njiru", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000022" },
      { email: "lo.embu2@mularcredit.test", name: "Charity Wanjiku", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000022" },
      { email: "lo.meru1@mularcredit.test", name: "Kinyua Mwiti", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000023" },
      { email: "lo.meru2@mularcredit.test", name: "Gatwiri Nkirote", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000023" },
      { email: "lo.garissa1@mularcredit.test", name: "Omar Abdi", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000024" },
      { email: "lo.garissa2@mularcredit.test", name: "Amina Sheikh", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000024" },
      { email: "lo.wajir1@mularcredit.test", name: "Abdikadir Mohamud", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000025" },
      { email: "lo.wajir2@mularcredit.test", name: "Fatuma Adan", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000025" },
      { email: "lo.isiolo1@mularcredit.test", name: "Guyo Diba", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000026" },
      { email: "lo.isiolo2@mularcredit.test", name: "Habiba Golicha", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000026" },
    ];

    for (const staff of newStaff) {
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email: staff.email,
        password: "Mular2026!",
        email_confirm: true,
        user_metadata: { full_name: staff.name },
      });

      if (authErr) {
        if (authErr.message.includes("already been registered")) {
          results.push({ email: staff.email, status: "exists" });
          continue;
        }
        results.push({ email: staff.email, status: "error", error: authErr.message });
        continue;
      }

      const userId = authData.user!.id;

      // Assign role
      await supabase.from("user_roles").upsert(
        { user_id: userId, role: staff.role },
        { onConflict: "user_id,role" }
      );

      // Assign to branch/region
      const assignment: any = { user_id: userId };
      if (staff.branch_id) assignment.branch_id = staff.branch_id;
      if (staff.region_id) assignment.region_id = staff.region_id;
      if (staff.branch_id || staff.region_id) {
        await supabase.from("staff_assignments").insert(assignment);
      }

      results.push({ email: staff.email, status: "created", role: staff.role });
    }

    return new Response(JSON.stringify({ success: true, created: results.filter(r => r.status === "created").length, total: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
