import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Test user definitions with predictable credentials
    // Pattern: role@mularcredit.test / Mular2026!
    const testUsers = [
      // CEO
      { email: "ceo@mularcredit.test", password: "Mular2026!", full_name: "James Mwangi", role: "ceo", region_id: null, branch_id: null },
      // GM
      { email: "gm@mularcredit.test", password: "Mular2026!", full_name: "Faith Wanjiku", role: "gm", region_id: null, branch_id: null },
      // Regional Managers (3)
      { email: "rm.nairobi@mularcredit.test", password: "Mular2026!", full_name: "Peter Ochieng", role: "regional_manager", region_id: "a1000000-0000-0000-0000-000000000001", branch_id: null },
      { email: "rm.central@mularcredit.test", password: "Mular2026!", full_name: "Grace Muthoni", role: "regional_manager", region_id: "a1000000-0000-0000-0000-000000000002", branch_id: null },
      { email: "rm.coast@mularcredit.test", password: "Mular2026!", full_name: "Hassan Omar", role: "regional_manager", region_id: "a1000000-0000-0000-0000-000000000003", branch_id: null },
      // Branch Managers (12)
      { email: "bm.westlands@mularcredit.test", password: "Mular2026!", full_name: "Alice Kamau", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000001" },
      { email: "bm.cbd@mularcredit.test", password: "Mular2026!", full_name: "David Njoroge", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000002" },
      { email: "bm.eastlands@mularcredit.test", password: "Mular2026!", full_name: "Esther Wambui", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000003" },
      { email: "bm.karen@mularcredit.test", password: "Mular2026!", full_name: "Samuel Kipchoge", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000004" },
      { email: "bm.nakuru@mularcredit.test", password: "Mular2026!", full_name: "Lydia Chebet", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000005" },
      { email: "bm.nyeri@mularcredit.test", password: "Mular2026!", full_name: "John Kariuki", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000006" },
      { email: "bm.eldoret@mularcredit.test", password: "Mular2026!", full_name: "Margaret Jeptoo", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000007" },
      { email: "bm.thika@mularcredit.test", password: "Mular2026!", full_name: "Francis Muturi", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000008" },
      { email: "bm.mombasa@mularcredit.test", password: "Mular2026!", full_name: "Amina Said", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000009" },
      { email: "bm.kisumu@mularcredit.test", password: "Mular2026!", full_name: "Otieno Ouma", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000010" },
      { email: "bm.malindi@mularcredit.test", password: "Mular2026!", full_name: "Fatuma Ali", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000011" },
      { email: "bm.kakamega@mularcredit.test", password: "Mular2026!", full_name: "Wycliffe Barasa", role: "branch_manager", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000012" },
      // Loan Officers (24 - 2 per branch)
      { email: "lo.westlands1@mularcredit.test", password: "Mular2026!", full_name: "Catherine Njeri", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000001" },
      { email: "lo.westlands2@mularcredit.test", password: "Mular2026!", full_name: "Brian Mutua", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000001" },
      { email: "lo.cbd1@mularcredit.test", password: "Mular2026!", full_name: "Diana Achieng", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000002" },
      { email: "lo.cbd2@mularcredit.test", password: "Mular2026!", full_name: "Kevin Onyango", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000002" },
      { email: "lo.eastlands1@mularcredit.test", password: "Mular2026!", full_name: "Mercy Wairimu", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000003" },
      { email: "lo.eastlands2@mularcredit.test", password: "Mular2026!", full_name: "Joseph Kibet", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000003" },
      { email: "lo.karen1@mularcredit.test", password: "Mular2026!", full_name: "Susan Wangari", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000004" },
      { email: "lo.karen2@mularcredit.test", password: "Mular2026!", full_name: "Moses Kirui", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000004" },
      { email: "lo.nakuru1@mularcredit.test", password: "Mular2026!", full_name: "Purity Nyambura", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000005" },
      { email: "lo.nakuru2@mularcredit.test", password: "Mular2026!", full_name: "Elijah Maina", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000005" },
      { email: "lo.nyeri1@mularcredit.test", password: "Mular2026!", full_name: "Anne Gathoni", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000006" },
      { email: "lo.nyeri2@mularcredit.test", password: "Mular2026!", full_name: "Patrick Ndirangu", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000006" },
      { email: "lo.eldoret1@mularcredit.test", password: "Mular2026!", full_name: "Lilian Chepkoech", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000007" },
      { email: "lo.eldoret2@mularcredit.test", password: "Mular2026!", full_name: "Isaac Ruto", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000007" },
      { email: "lo.thika1@mularcredit.test", password: "Mular2026!", full_name: "Joan Wachira", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000008" },
      { email: "lo.thika2@mularcredit.test", password: "Mular2026!", full_name: "Andrew Gitau", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000008" },
      { email: "lo.mombasa1@mularcredit.test", password: "Mular2026!", full_name: "Zainab Mohamed", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000009" },
      { email: "lo.mombasa2@mularcredit.test", password: "Mular2026!", full_name: "Ali Bakari", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000009" },
      { email: "lo.kisumu1@mularcredit.test", password: "Mular2026!", full_name: "Linet Atieno", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000010" },
      { email: "lo.kisumu2@mularcredit.test", password: "Mular2026!", full_name: "George Odhiambo", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000010" },
      { email: "lo.malindi1@mularcredit.test", password: "Mular2026!", full_name: "Rehema Juma", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000011" },
      { email: "lo.malindi2@mularcredit.test", password: "Mular2026!", full_name: "Hamisi Salim", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000011" },
      { email: "lo.kakamega1@mularcredit.test", password: "Mular2026!", full_name: "Dorothy Nafula", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000012" },
      { email: "lo.kakamega2@mularcredit.test", password: "Mular2026!", full_name: "Silas Wekesa", role: "loan_officer", region_id: null, branch_id: "b1000000-0000-0000-0000-000000000012" },
    ];

    // Kenyan names for clients - 60 clients across branches
    const clientNames = [
      "Wanjiru Mwangi", "Kamau Njoroge", "Akinyi Oloo", "Kiprop Cheruiyot", "Nyambura Karanja",
      "Omondi Otieno", "Wambui Githinji", "Kiprono Langat", "Adhiambo Okoth", "Muthoni Njenga",
      "Barasa Wafula", "Njeri Kabiru", "Onyango Miguna", "Chelimo Kiptoo", "Waithera Mugo",
      "Auma Odongo", "Mwende Musyoka", "Korir Kiplagat", "Nafula Masinde", "Gathoni Kibe",
      "Ocholla Anyango", "Chepkemoi Bett", "Wangeci Kamande", "Opiyo Achola", "Nyokabi Kinyua",
      "Baraka Mwendwa", "Njoki Macharia", "Odhiambo Awiti", "Chepngetich Soi", "Waiganjo Mburu",
      "Atieno Owino", "Mukami Ndegwa", "Kipchirchir Sang", "Wangechi Ndirangu", "Omolo Juma",
      "Cheptoo Yego", "Muthomi Kirimi", "Nyawira Gachuhi", "Oluoch Ombija", "Cherono Bii",
      "Nduta Waweru", "Kioko Mutinda", "Wahu Kagwi", "Orwa Migosi", "Chepkorir Tanui",
      "Mugure Njogu", "Jemutai Kosgei", "Kavuu Mutua", "Awino Odero", "Ngendo Waithaka",
      "Mwikali Kyalo", "Rono Kimeli", "Mbithe Kilonzo", "Adhiambo Nyamweya", "Kibiwott Maiyo",
      "Wangui Thiongo", "Otachi Mokaya", "Chelagat Metto", "Nyakerario Bosire", "Mutembei Ringia"
    ];

    const businessTypes = [
      "Mama mboga (Vegetable vendor)", "Mitumba clothes dealer", "M-Pesa agent", "Boda boda operator",
      "Salon owner", "Carpenter / Furniture maker", "Poultry farmer", "Mama fua (Laundry services)",
      "Food kiosk / Kibanda owner", "Tailor / Dressmaker", "Hardware shop", "Shoe repair / Cobbler",
      "Matatu sacco member", "Fish trader", "Cereals dealer", "Mobile phone repair",
      "Wholesale distributor", "Beauty products seller", "Farming inputs supplier", "Butchery owner"
    ];

    const results: any[] = [];
    const userMap: Record<string, string> = {}; // email -> user_id
    const loanOfficerIds: { id: string; branch_id: string }[] = [];

    // Create all staff users
    for (const user of testUsers) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { full_name: user.full_name },
      });

      if (authError) {
        // If user exists, try to get them
        if (authError.message.includes("already been registered")) {
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const existing = existingUsers?.users?.find((u: any) => u.email === user.email);
          if (existing) {
            userMap[user.email] = existing.id;
            if (user.role === "loan_officer" && user.branch_id) {
              loanOfficerIds.push({ id: existing.id, branch_id: user.branch_id });
            }
            results.push({ email: user.email, status: "exists", id: existing.id });
            continue;
          }
        }
        results.push({ email: user.email, status: "error", error: authError.message });
        continue;
      }

      const userId = authData.user!.id;
      userMap[user.email] = userId;

      // Assign role
      await supabase.from("user_roles").upsert({ user_id: userId, role: user.role }, { onConflict: "user_id,role" });

      // Assign to branch/region
      const assignment: any = { user_id: userId };
      if (user.branch_id) assignment.branch_id = user.branch_id;
      if (user.region_id) assignment.region_id = user.region_id;
      if (user.branch_id || user.region_id) {
        await supabase.from("staff_assignments").upsert(assignment, { onConflict: "user_id" });
      }

      if (user.role === "loan_officer" && user.branch_id) {
        loanOfficerIds.push({ id: userId, branch_id: user.branch_id });
      }

      results.push({ email: user.email, status: "created", id: userId, role: user.role });
    }

    // Also update the existing admin@test.com to have admin role properly
    const { data: adminList } = await supabase.auth.admin.listUsers();
    const adminUser = adminList?.users?.find((u: any) => u.email === "admin@test.com");
    if (adminUser) {
      await supabase.from("user_roles").upsert({ user_id: adminUser.id, role: "admin" }, { onConflict: "user_id,role" });
    }

    // Create 60 client users with loans
    const branches = [
      "b1000000-0000-0000-0000-000000000001", "b1000000-0000-0000-0000-000000000002",
      "b1000000-0000-0000-0000-000000000003", "b1000000-0000-0000-0000-000000000004",
      "b1000000-0000-0000-0000-000000000005", "b1000000-0000-0000-0000-000000000006",
      "b1000000-0000-0000-0000-000000000007", "b1000000-0000-0000-0000-000000000008",
      "b1000000-0000-0000-0000-000000000009", "b1000000-0000-0000-0000-000000000010",
      "b1000000-0000-0000-0000-000000000011", "b1000000-0000-0000-0000-000000000012",
    ];
    const products = [
      { id: "c1000000-0000-0000-0000-000000000001", term: 6, rate: 0.15, min: 5000, max: 15000 },
      { id: "c1000000-0000-0000-0000-000000000002", term: 4, rate: 0.12, min: 3000, max: 10000 },
      { id: "c1000000-0000-0000-0000-000000000003", term: 12, rate: 0.18, min: 10000, max: 40000 },
      { id: "c1000000-0000-0000-0000-000000000004", term: 8, rate: 0.10, min: 5000, max: 25000 },
      { id: "c1000000-0000-0000-0000-000000000005", term: 10, rate: 0.14, min: 8000, max: 50000 },
      { id: "c1000000-0000-0000-0000-000000000006", term: 6, rate: 0.13, min: 3000, max: 12000 },
    ];
    const statuses = ["pending", "approved", "approved", "approved", "disbursed", "disbursed", "disbursed", "completed", "completed", "rejected"];
    const locations = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Nyeri", "Malindi", "Kakamega", "Karen"];

    for (let i = 0; i < 60; i++) {
      const clientEmail = `client${(i + 1).toString().padStart(2, "0")}@mularcredit.test`;
      const clientName = clientNames[i];
      const phone = `+2547${(10000000 + i * 1111).toString().slice(0, 8)}`;

      const { data: clientAuth, error: clientError } = await supabase.auth.admin.createUser({
        email: clientEmail,
        password: "Mular2026!",
        email_confirm: true,
        user_metadata: { full_name: clientName },
      });

      if (clientError) {
        if (clientError.message.includes("already been registered")) {
          results.push({ email: clientEmail, status: "exists" });
          continue;
        }
        results.push({ email: clientEmail, status: "error", error: clientError.message });
        continue;
      }

      const clientId = clientAuth.user!.id;
      await supabase.from("user_roles").upsert({ user_id: clientId, role: "user" }, { onConflict: "user_id,role" });

      // Create 1-3 loans per client, skewed to smaller amounts
      const numLoans = i < 30 ? 2 : i < 50 ? 1 : 3;
      for (let j = 0; j < numLoans; j++) {
        const branchIdx = i % 12;
        const branchId = branches[branchIdx];
        const product = products[Math.floor(Math.random() * products.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const businessType = businessTypes[Math.floor(Math.random() * businessTypes.length)];

        // Skew toward smaller amounts: 60% under 10k, 25% 10k-25k, 15% 25k+
        let amount: number;
        const r = Math.random();
        if (r < 0.6) amount = Math.round((product.min + Math.random() * (Math.min(10000, product.max) - product.min)) / 500) * 500;
        else if (r < 0.85) amount = Math.round((10000 + Math.random() * 15000) / 1000) * 1000;
        else amount = Math.round((25000 + Math.random() * (product.max - 25000)) / 1000) * 1000;
        amount = Math.max(product.min, Math.min(product.max, amount));

        // Find a loan officer for this branch
        const branchOfficers = loanOfficerIds.filter(lo => lo.branch_id === branchId);
        const officerId = branchOfficers.length > 0 ? branchOfficers[j % branchOfficers.length].id : null;

        const riskScore = Math.floor(Math.random() * 40) + 55; // 55-95
        const recommendations = [
          "Low risk borrower. Recommend approval with standard terms.",
          "Moderate risk. Previous repayment history positive. Approve with monitoring.",
          "Good credit profile. Recommend approval for requested amount.",
          "New borrower. Recommend starting with reduced amount for first loan.",
          "Repeat client with perfect track record. Fast-track approval recommended.",
          "High risk indicators. Require additional collateral or guarantor.",
          "Seasonal business. Align repayment schedule with income patterns.",
        ];

        const daysAgo = Math.floor(Math.random() * 90);
        const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString();
        const disbDate = status === "disbursed" || status === "completed" 
          ? new Date(Date.now() - (daysAgo - 3) * 86400000).toISOString().split("T")[0] 
          : null;

        const totalRepay = Math.round(amount * (1 + product.rate));
        const weeklyRepay = Math.round(totalRepay / product.term);

        const { data: loanData } = await supabase.from("loan_applications").insert({
          user_id: clientId,
          full_name: clientName,
          phone,
          email: clientEmail,
          business_type: businessType,
          business_description: `${businessType} in ${locations[i % locations.length]}`,
          financing_amount: `KES ${amount.toLocaleString()}`,
          location: locations[i % locations.length],
          status,
          product_id: product.id,
          branch_id: branchId,
          loan_officer_id: officerId,
          amount_approved: status !== "pending" && status !== "rejected" ? amount : null,
          disbursement_date: disbDate,
          expected_completion_date: disbDate ? new Date(new Date(disbDate).getTime() + product.term * 7 * 86400000).toISOString().split("T")[0] : null,
          risk_score: riskScore,
          ai_recommendation: recommendations[Math.floor(Math.random() * recommendations.length)],
          created_at: createdAt,
        }).select("id").single();

        // Create repayment schedule for disbursed/completed loans
        if (loanData && (status === "disbursed" || status === "completed")) {
          const repayments = [];
          for (let w = 1; w <= product.term; w++) {
            const dueDate = new Date(new Date(disbDate!).getTime() + w * 7 * 86400000).toISOString().split("T")[0];
            const isPaid = status === "completed" || (status === "disbursed" && w <= Math.floor(product.term * 0.5));
            const isOverdue = !isPaid && new Date(dueDate) < new Date();
            repayments.push({
              loan_id: loanData.id,
              amount_due: weeklyRepay,
              amount_paid: isPaid ? weeklyRepay : (isOverdue && Math.random() > 0.7 ? Math.round(weeklyRepay * 0.5) : 0),
              due_date: dueDate,
              paid_date: isPaid ? dueDate : null,
              week_number: w,
              status: isPaid ? "paid" : (isOverdue ? (Math.random() > 0.7 ? "partial" : "overdue") : "pending"),
            });
          }
          await supabase.from("loan_repayments").insert(repayments);
        }
      }
      results.push({ email: clientEmail, status: "created", loans: numLoans });
    }

    // Seed AI insights for different roles
    const insights = [
      // CEO-level insights
      { entity_type: "portfolio", insight_type: "executive_summary", title: "Q1 2026 Portfolio Health", content: "Total active portfolio: KES 4.2M across 85 active loans. Overall PAR>30 at 3.2% (below 5% target). Nairobi region leading with 45% of disbursements. Recommend expanding Coast & Western operations.", severity: "success", target_roles: ["ceo", "gm"] },
      { entity_type: "portfolio", insight_type: "risk_alert", title: "Rising Default Risk in Eldoret", content: "Eldoret branch showing 8.5% PAR>30, up from 4.1% last month. 3 loans flagged as high-risk. Root cause: drought affecting agricultural borrowers. Recommend restructuring affected loans.", severity: "warning", target_roles: ["ceo", "gm", "regional_manager"] },
      { entity_type: "portfolio", insight_type: "growth_opportunity", title: "MamaBiz Product Outperforming", content: "MamaBiz loans have 98.5% repayment rate vs 94% portfolio average. Women entrepreneurs showing strongest performance. Recommend increasing MamaBiz allocation by 20%.", severity: "success", target_roles: ["ceo", "gm"] },
      // Regional Manager insights
      { entity_type: "region", insight_type: "performance", title: "Nairobi Region Weekly Report", content: "15 new applications this week (KES 185K total). 12 disbursements processed. Collections at 96.2%. Westlands branch top performer with 100% collection rate.", severity: "info", target_roles: ["regional_manager", "ceo", "gm"] },
      { entity_type: "region", insight_type: "anomaly", title: "Unusual Application Spike - CBD Branch", content: "CBD branch received 8 applications in 2 days (avg: 3/week). All from mobile phone repair businesses. Pattern suggests coordinated applications - verify independence.", severity: "warning", target_roles: ["regional_manager", "branch_manager"] },
      // Branch Manager insights
      { entity_type: "branch", insight_type: "collection_alert", title: "3 Overdue Payments This Week", content: "Clients Wanjiru Mwangi (KES 1,250), Kamau Njoroge (KES 2,500), and Akinyi Oloo (KES 1,000) missed payments. Total overdue: KES 4,750. Contact within 48 hours recommended.", severity: "critical", target_roles: ["branch_manager", "loan_officer"] },
      { entity_type: "branch", insight_type: "target_tracking", title: "Monthly Disbursement Target: 72% Achieved", content: "Current: KES 320K of KES 450K target. 12 days remaining. Need KES 130K more. 5 approved applications pending disbursement worth KES 95K. Gap: KES 35K.", severity: "warning", target_roles: ["branch_manager"] },
      // Loan Officer insights
      { entity_type: "officer", insight_type: "client_risk", title: "Client Risk Score Update", content: "3 of your clients have improved risk scores this month: Nyambura Karanja (72→81), Omondi Otieno (65→74), Wambui Githinji (68→77). Consider for higher loan amounts on renewal.", severity: "success", target_roles: ["loan_officer"] },
      { entity_type: "officer", insight_type: "follow_up", title: "5 Clients Due for Follow-up", content: "Approaching end of loan cycle: 5 clients completing repayment within 2 weeks. High renewal probability (85%). Schedule renewal discussions to maintain portfolio.", severity: "info", target_roles: ["loan_officer"] },
      // General
      { entity_type: "portfolio", insight_type: "prediction", title: "Next Month Projection", content: "AI model predicts 18% increase in applications driven by market season. BiashaBoost and TradeUp products likely to see highest demand. Ensure adequate liquidity.", severity: "info", target_roles: ["ceo", "gm", "regional_manager", "branch_manager"] },
    ];

    for (const insight of insights) {
      await supabase.from("ai_insights").insert(insight);
    }

    return new Response(JSON.stringify({ success: true, users_processed: results.length, results: results.slice(0, 20) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
