import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const firstNames = ["Wanjiru","Kamau","Akinyi","Kiprop","Nyambura","Omondi","Wambui","Kiprono","Adhiambo","Muthoni","Barasa","Njeri","Onyango","Chelimo","Waithera","Auma","Mwende","Korir","Nafula","Gathoni","Zawadi","Furaha","Tumaini","Imani","Neema","Bahati","Jabali","Makena","Zuri","Nuru","Pendo","Rashidi","Sanaa","Taji","Upendo"];
const lastNames = ["Mwangi","Njoroge","Oloo","Cheruiyot","Karanja","Otieno","Githinji","Langat","Okoth","Njenga","Wafula","Kabiru","Miguna","Kiptoo","Mugo","Odongo","Musyoka","Kiplagat","Masinde","Kibe","Bett","Kamande","Kinyua","Macharia","Mburu","Ndegwa","Sang","Juma","Yego","Mutinda"];
const businessTypes = ["Mama mboga (Vegetable vendor)","M-Pesa agent","Boda boda operator","Salon owner","Poultry farmer","Food kiosk / Kibanda owner","Tailor / Dressmaker","Hardware shop","Fish trader","Cereals dealer","Wholesale distributor","Butchery owner","Milk vendor","Welding workshop","Chapati maker","Grocery shop (Duka)","Agro-vet dealer","Posho mill operator","Catering services","Electrician"];
const recommendations = ["Low risk. Stable income verified.","Moderate risk. Business seasonal but viable.","Good profile. Repeat client.","New borrower. Start with reduced amount.","Strong referrals. Community leader.","Growing business. Revenue up 30% YoY.","Micro-enterprise with stable cash flow.","Agricultural borrower. Climate risk mitigated."];

const regionLocations: Record<string, string[]> = {
  WK: ["Kakamega","Mumias","Bungoma","Vihiga","Busia","Malava","Butere"],
  RV: ["Narok","Kericho","Bomet","Kajiado","Litein","Sotik","Londiani"],
  EK: ["Machakos","Kitui","Embu","Meru","Kangundo","Mwingi","Chuka"],
  NE: ["Garissa","Wajir","Isiolo","Habaswein","Moyale","Marsabit","Merti"],
};

const regionBranches: Record<string, string[]> = {
  WK: ["b1000000-0000-0000-0000-000000000013","b1000000-0000-0000-0000-000000000014","b1000000-0000-0000-0000-000000000015"],
  RV: ["b1000000-0000-0000-0000-000000000016","b1000000-0000-0000-0000-000000000017","b1000000-0000-0000-0000-000000000018","b1000000-0000-0000-0000-000000000019"],
  EK: ["b1000000-0000-0000-0000-000000000020","b1000000-0000-0000-0000-000000000021","b1000000-0000-0000-0000-000000000022","b1000000-0000-0000-0000-000000000023"],
  NE: ["b1000000-0000-0000-0000-000000000024","b1000000-0000-0000-0000-000000000025","b1000000-0000-0000-0000-000000000026"],
};

const products = [
  { id: "c1000000-0000-0000-0000-000000000001", term: 6, rate: 0.15, min: 5000, max: 15000 },
  { id: "c1000000-0000-0000-0000-000000000002", term: 4, rate: 0.12, min: 3000, max: 10000 },
  { id: "c1000000-0000-0000-0000-000000000003", term: 12, rate: 0.18, min: 10000, max: 40000 },
  { id: "c1000000-0000-0000-0000-000000000004", term: 8, rate: 0.10, min: 5000, max: 25000 },
  { id: "c1000000-0000-0000-0000-000000000005", term: 10, rate: 0.14, min: 8000, max: 50000 },
  { id: "c1000000-0000-0000-0000-000000000006", term: 6, rate: 0.13, min: 3000, max: 12000 },
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomPhone(): string { return `+2547${Math.floor(10000000 + Math.random() * 89999999)}`; }
function daysAgo(d: number): string { return new Date(Date.now() - d * 86400000).toISOString(); }
function dateStr(d: number): string { return new Date(Date.now() - d * 86400000).toISOString().split("T")[0]; }

function weightedStatus(): string {
  const r = Math.random() * 100;
  if (r < 15) return "pending";
  if (r < 25) return "approved";
  if (r < 60) return "disbursed";
  if (r < 90) return "completed";
  return "rejected";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const url = new URL(req.url);
    const targetRegion = url.searchParams.get("region") || "RV";
    const branches = regionBranches[targetRegion];
    const locs = regionLocations[targetRegion];
    if (!branches) return new Response(JSON.stringify({ error: "Invalid region" }), { headers: corsHeaders });

    // Get loan officers per branch
    const { data: allStaff } = await supabase.from("staff_assignments").select("user_id, branch_id");
    const { data: allRoles } = await supabase.from("user_roles").select("user_id, role");
    const roleMap = new Map<string, string>();
    (allRoles || []).forEach(r => roleMap.set(r.user_id, r.role));

    const loByBranch = new Map<string, string[]>();
    const bmByBranch = new Map<string, string>();
    (allStaff || []).forEach(s => {
      if (!s.branch_id) return;
      const role = roleMap.get(s.user_id);
      if (role === "loan_officer") {
        const arr = loByBranch.get(s.branch_id) || [];
        arr.push(s.user_id);
        loByBranch.set(s.branch_id, arr);
      }
      if (role === "branch_manager") bmByBranch.set(s.branch_id, s.user_id);
    });

    // Insert loans in bulk WITHOUT creating auth users (use null user_id — like walk-in applications)
    const LOANS_PER_BRANCH = 35;
    const loanBatch: any[] = [];
    let counter = 0;

    for (const branchId of branches) {
      const officers = loByBranch.get(branchId) || [];
      const bm = bmByBranch.get(branchId);

      for (let i = 0; i < LOANS_PER_BRANCH; i++) {
        counter++;
        const fullName = `${pick(firstNames)} ${pick(lastNames)}`;
        const phone = randomPhone();
        const email = `${targetRegion.toLowerCase()}.app${counter.toString().padStart(3, "0")}@mularcredit.test`;
        const product = pick(products);
        const status = weightedStatus();
        const loc = pick(locs);
        const officerId = officers.length > 0 ? pick(officers) : null;
        const riskScore = Math.floor(Math.random() * 45) + 50;
        const daysBack = Math.floor(Math.random() * 180);
        let amount = product.min + Math.random() * (product.max - product.min);
        amount = Math.round(amount / 500) * 500;
        const disbDate = (status === "disbursed" || status === "completed") ? dateStr(daysBack - 3) : null;
        const approvedBy = (status !== "pending" && status !== "rejected") ? (bm || null) : null;

        loanBatch.push({
          full_name: fullName, phone, email,
          business_type: pick(businessTypes),
          business_description: `${pick(businessTypes)} operating in ${loc}.`,
          financing_amount: `KES ${amount.toLocaleString()}`,
          location: loc, status,
          approval_level: status === "pending" ? "pending" : status === "rejected" ? "pending" : "approved",
          approved_by: approvedBy,
          approval_notes: status === "rejected" ? "Insufficient documentation" : status !== "pending" ? "Approved per policy" : null,
          product_id: product.id, branch_id: branchId, loan_officer_id: officerId,
          amount_approved: (status !== "pending" && status !== "rejected") ? amount : null,
          disbursement_date: disbDate,
          expected_completion_date: disbDate ? dateStr(Math.max(0, daysBack - 3 - product.term * 7)) : null,
          risk_score: riskScore, ai_recommendation: pick(recommendations),
          created_at: daysAgo(daysBack),
        });
      }
    }

    // Batch insert all loans
    const { data: insertedLoans, error: loanErr } = await supabase
      .from("loan_applications").insert(loanBatch).select("id, status, product_id, financing_amount");
    
    if (loanErr) {
      return new Response(JSON.stringify({ error: loanErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create repayments for disbursed/completed loans
    let repCount = 0;
    const repBatches: any[] = [];
    for (const loan of (insertedLoans || [])) {
      if (loan.status !== "disbursed" && loan.status !== "completed") continue;
      const product = products.find(p => p.id === loan.product_id) || products[0];
      const amountStr = (loan.financing_amount || "0").replace(/[^0-9]/g, "");
      const principal = parseInt(amountStr) || 5000;
      const totalRepay = Math.round(principal * (1 + product.rate));
      const weeklyRepay = Math.round(totalRepay / product.term);
      const daysBack = Math.floor(Math.random() * 150);

      for (let w = 1; w <= product.term; w++) {
        const dueDate = dateStr(Math.max(0, daysBack - w * 7));
        const isPast = new Date(dueDate) < new Date();
        let repStatus = "pending";
        let amountPaid: number | null = null;
        let paidDate: string | null = null;

        if (loan.status === "completed") {
          repStatus = "paid"; amountPaid = weeklyRepay; paidDate = dueDate;
        } else if (isPast) {
          const r = Math.random();
          if (r < 0.75) { repStatus = "paid"; amountPaid = weeklyRepay; paidDate = dueDate; }
          else if (r < 0.85) { repStatus = "partial"; amountPaid = Math.round(weeklyRepay * 0.5); paidDate = dueDate; }
          else { repStatus = "overdue"; }
        }

        repBatches.push({
          loan_id: loan.id, week_number: w, amount_due: weeklyRepay,
          amount_paid: amountPaid, due_date: dueDate, paid_date: paidDate, status: repStatus,
        });
      }
    }

    // Insert repayments in batches of 500
    for (let i = 0; i < repBatches.length; i += 500) {
      const batch = repBatches.slice(i, i + 500);
      const { error: repErr } = await supabase.from("loan_repayments").insert(batch);
      if (!repErr) repCount += batch.length;
    }

    return new Response(JSON.stringify({
      success: true,
      region: targetRegion,
      loans: insertedLoans?.length || 0,
      repayments: repCount,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
