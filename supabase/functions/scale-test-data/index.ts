import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Realistic Kenyan data pools
const firstNames = [
  "Wanjiru","Kamau","Akinyi","Kiprop","Nyambura","Omondi","Wambui","Kiprono","Adhiambo","Muthoni",
  "Barasa","Njeri","Onyango","Chelimo","Waithera","Auma","Mwende","Korir","Nafula","Gathoni",
  "Ocholla","Chepkemoi","Wangeci","Opiyo","Nyokabi","Baraka","Njoki","Odhiambo","Chepngetich","Waiganjo",
  "Atieno","Mukami","Kipchirchir","Wangechi","Omolo","Cheptoo","Muthomi","Nyawira","Oluoch","Cherono",
  "Nduta","Kioko","Wahu","Orwa","Chepkorir","Mugure","Jemutai","Kavuu","Awino","Ngendo",
  "Mwikali","Rono","Mbithe","Kibiwott","Wangui","Otachi","Chelagat","Nyakerario","Mutembei","Amani",
  "Zawadi","Furaha","Tumaini","Imani","Neema","Bahati","Jabali","Hodari","Jasiri","Kito",
  "Makena","Tamika","Zuri","Dalili","Faraji","Habari","Jelani","Kendi","Lulu","Malaika",
  "Nuru","Pendo","Rashidi","Sanaa","Taji","Upendo","Wema","Yusra","Zara","Amara",
  "Asha","Bakari","Chiku","Damu","Enzi","Femi","Gakere","Halima","Issa","Jumaa",
];
const lastNames = [
  "Mwangi","Njoroge","Oloo","Cheruiyot","Karanja","Otieno","Githinji","Langat","Okoth","Njenga",
  "Wafula","Kabiru","Miguna","Kiptoo","Mugo","Odongo","Musyoka","Kiplagat","Masinde","Kibe",
  "Anyango","Bett","Kamande","Achola","Kinyua","Mwendwa","Macharia","Awiti","Soi","Mburu",
  "Owino","Ndegwa","Sang","Ndirangu","Juma","Yego","Kirimi","Gachuhi","Ombija","Bii",
  "Waweru","Mutinda","Kagwi","Migosi","Tanui","Njogu","Kosgei","Mutua","Odero","Waithaka",
  "Kyalo","Kimeli","Kilonzo","Nyamweya","Maiyo","Thiongo","Mokaya","Metto","Bosire","Ringia",
  "Ogutu","Wahome","Muriithi","Kuria","Gitonga","Wekesa","Simiyu","Nekesa","Chepkwony","Rotich",
  "Koech","Mungai","Kibaki","Ngari","Mbugua","Irungu","Gichuki","Muiruri","Ngugi","Kimotho",
  "Wainaina","Kihara","Gathogo","Njiru","Gitau","Mwaniki","Mugambi","Mwiti","Ntai","Lekakeny",
  "Kipkemboi","Kipchumba","Kimutai","Kemboi","Chebet","Jepkosgei","Kitur","Maina","Karimi","Ndungu",
];

const businessTypes = [
  "Mama mboga (Vegetable vendor)","Mitumba clothes dealer","M-Pesa agent","Boda boda operator",
  "Salon owner","Carpenter / Furniture maker","Poultry farmer","Mama fua (Laundry services)",
  "Food kiosk / Kibanda owner","Tailor / Dressmaker","Hardware shop","Shoe repair / Cobbler",
  "Matatu sacco member","Fish trader","Cereals dealer","Mobile phone repair",
  "Wholesale distributor","Beauty products seller","Farming inputs supplier","Butchery owner",
  "Charcoal dealer","Water vendor","Juice bar operator","Event tent & chair hire",
  "Milk vendor","Egg distributor","Second-hand electronics","Cyber cafe owner",
  "Welding workshop","Auto spare parts dealer","Photography studio","Printing & photocopying",
  "Chapati maker","Mandazi vendor","Grocery shop (Duka)","Fruits exporter",
  "Herbal medicine seller","Curio shop owner","Car wash operator","Barber shop",
  "Daycare / Nursery school","Agro-vet dealer","Bead jewelry maker","Posho mill operator",
  "Brick maker","Sand harvester","Timber dealer","Catering services",
  "Electrician","Plumber","Tour guide","Taxi driver (Uber/Bolt)",
];

const locations = [
  "Westlands, Nairobi","CBD, Nairobi","Eastleigh, Nairobi","Karen, Nairobi","Kibera, Nairobi",
  "Kawangware, Nairobi","Umoja, Nairobi","Langata, Nairobi","Kasarani, Nairobi","Ruaka, Nairobi",
  "Nakuru Town","Naivasha","Gilgil","Molo","Subukia",
  "Nyeri Town","Karatina","Othaya","Nanyuki","Mweiga",
  "Eldoret Town","Kapsabet","Iten","Kitale","Nandi Hills",
  "Thika Town","Ruiru","Juja","Gatundu","Kenol",
  "Mombasa Old Town","Nyali","Likoni","Changamwe","Bamburi",
  "Kisumu City","Ahero","Maseno","Bondo","Homa Bay",
  "Malindi Town","Watamu","Kilifi","Lamu","Mariakani",
  "Kakamega Town","Mumias","Webuye","Bungoma","Vihiga",
];

const recommendations = [
  "Low risk. Stable income verified. Approve with standard terms.",
  "Moderate risk. Business seasonal but viable. Approve with monitoring.",
  "Good profile. Repeat client with perfect history. Fast-track recommended.",
  "New borrower. Start with reduced amount. Build credit history.",
  "High risk indicators. Require guarantor before disbursement.",
  "Strong referrals. Community leader. Recommend full amount approval.",
  "Seasonal business. Align repayment with harvest cycles.",
  "Growing business. Revenue up 30% YoY. Good expansion candidate.",
  "Micro-enterprise with stable cash flow. Low default probability.",
  "Multiple income sources verified. Excellent repayment capacity.",
  "Young entrepreneur with innovative business model. Support recommended.",
  "Market trader with 5+ years experience. Proven track record.",
  "Group lending candidate. Strong social collateral from chama membership.",
  "Agricultural borrower in irrigated area. Climate risk mitigated.",
  "Digital business (online sales). Growing sector. Approve with digital monitoring.",
];

const messageSubjects = [
  "Weekly Performance Report","Urgent: Overdue Collection Follow-up","New Product Launch Briefing",
  "Staff Meeting Reminder","Client Complaint Escalation","Target Achievement Update",
  "Training Session Schedule","Branch Audit Findings","Portfolio Quality Alert",
  "Holiday Schedule Notice","System Maintenance Update","New Policy Implementation",
  "Outstanding Achievement Recognition","Monthly Disbursement Report","Risk Assessment Update",
  "Client Graduation Ceremony","Community Outreach Plan","Cross-sell Opportunity Alert",
  "Compliance Reminder","Budget Allocation Update",
];
const messageBodies = [
  "Please review the attached performance metrics for this week. Key highlights: collection rate improved by 2.3%, new applications up by 15%. Areas needing attention: 3 overdue accounts require immediate follow-up.",
  "This is to inform you that the following clients have overdue payments exceeding 7 days. Please initiate contact within 24 hours and submit status reports by end of day Friday.",
  "We are launching a new agricultural micro-loan product next month. All loan officers must complete the product training module by March 15th. Details attached.",
  "Reminder: Monthly staff meeting scheduled for Friday at 2:00 PM. Agenda includes Q1 review, new targets, and recognition awards. Attendance is mandatory.",
  "A client has raised concerns about processing delays. Please investigate and provide resolution within 48 hours. Client satisfaction is our priority.",
  "Congratulations! Your branch has achieved 105% of monthly disbursement target. This is the third consecutive month of exceeding targets. Keep up the excellent work!",
  "The upcoming training on digital lending tools will be held on March 20th. Please ensure all team members register by March 15th.",
  "The recent audit highlighted some documentation gaps. Please ensure all loan files are updated with current client photos and signed agreements by month-end.",
  "Portfolio quality metrics for your region show improvement. PAR>30 decreased from 5.2% to 4.1%. Continue monitoring the flagged accounts closely.",
  "Please note the updated holiday schedule for Q2. Ensure adequate staff coverage during peak periods. Submit rotation plans by March 25th.",
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}
function randomPhone(): string {
  return `+2547${Math.floor(10000000 + Math.random() * 89999999)}`;
}
function daysAgo(d: number): string {
  return new Date(Date.now() - d * 86400000).toISOString();
}
function dateStr(d: number): string {
  return new Date(Date.now() - d * 86400000).toISOString().split("T")[0];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const stats = { clients: 0, loans: 0, repayments: 0, messages: 0, insights: 0, notifications: 0, errors: [] as string[] };

    // Get existing loan officers and their branch assignments
    const { data: allStaff } = await supabase.from("staff_assignments").select("user_id, branch_id, region_id");
    const { data: allRoles } = await supabase.from("user_roles").select("user_id, role");

    const roleMap = new Map<string, string>();
    (allRoles || []).forEach(r => roleMap.set(r.user_id, r.role));

    const loanOfficers: { user_id: string; branch_id: string }[] = [];
    const branchManagers: { user_id: string; branch_id: string }[] = [];
    const regionalManagers: { user_id: string; region_id: string }[] = [];
    const executives: string[] = [];

    (allStaff || []).forEach(s => {
      const role = roleMap.get(s.user_id);
      if (role === "loan_officer" && s.branch_id) loanOfficers.push({ user_id: s.user_id, branch_id: s.branch_id });
      if (role === "branch_manager" && s.branch_id) branchManagers.push({ user_id: s.user_id, branch_id: s.branch_id });
      if (role === "regional_manager" && s.region_id) regionalManagers.push({ user_id: s.user_id, region_id: s.region_id });
    });
    (allRoles || []).forEach(r => {
      if (r.role === "ceo" || r.role === "gm") executives.push(r.user_id);
    });

    const branches = [
      "b1000000-0000-0000-0000-000000000001","b1000000-0000-0000-0000-000000000002",
      "b1000000-0000-0000-0000-000000000003","b1000000-0000-0000-0000-000000000004",
      "b1000000-0000-0000-0000-000000000005","b1000000-0000-0000-0000-000000000006",
      "b1000000-0000-0000-0000-000000000007","b1000000-0000-0000-0000-000000000008",
      "b1000000-0000-0000-0000-000000000009","b1000000-0000-0000-0000-000000000010",
      "b1000000-0000-0000-0000-000000000011","b1000000-0000-0000-0000-000000000012",
    ];
    const products = [
      { id: "c1000000-0000-0000-0000-000000000001", term: 6, rate: 0.15, min: 5000, max: 15000 },
      { id: "c1000000-0000-0000-0000-000000000002", term: 4, rate: 0.12, min: 3000, max: 10000 },
      { id: "c1000000-0000-0000-0000-000000000003", term: 12, rate: 0.18, min: 10000, max: 40000 },
      { id: "c1000000-0000-0000-0000-000000000004", term: 8, rate: 0.10, min: 5000, max: 25000 },
      { id: "c1000000-0000-0000-0000-000000000005", term: 10, rate: 0.14, min: 8000, max: 50000 },
      { id: "c1000000-0000-0000-0000-000000000006", term: 6, rate: 0.13, min: 3000, max: 12000 },
    ];

    // Weighted status distribution matching realistic portfolio
    const statusWeights = [
      { status: "pending", weight: 15 },
      { status: "approved", weight: 10 },
      { status: "disbursed", weight: 35 },
      { status: "completed", weight: 30 },
      { status: "rejected", weight: 10 },
    ];
    function weightedStatus(): string {
      const total = statusWeights.reduce((s, w) => s + w.weight, 0);
      let r = Math.random() * total;
      for (const sw of statusWeights) {
        r -= sw.weight;
        if (r <= 0) return sw.status;
      }
      return "pending";
    }

    // Approval levels matching status
    function approvalForStatus(status: string): string {
      if (status === "pending") return pick(["pending", "officer_approved"]);
      if (status === "approved") return "approved";
      if (status === "disbursed" || status === "completed") return "approved";
      if (status === "rejected") return pick(["pending", "officer_approved", "branch_approved"]);
      return "pending";
    }

    // ============ CREATE CLIENTS WITH LOANS ============
    // Accept offset param for incremental seeding
    const url = new URL(req.url);
    const offsetParam = url.searchParams.get("offset") || "0";
    const countParam = url.searchParams.get("count") || "50";
    const OFFSET = parseInt(offsetParam);
    const TOTAL_CLIENTS = Math.min(parseInt(countParam), 80); // Max 80 per call
    const BATCH_SIZE = TOTAL_CLIENTS;

    for (let batch = 0; batch < TOTAL_CLIENTS / BATCH_SIZE; batch++) {
      const loanBatch: any[] = [];
      const clientBatch: { email: string; userId: string; name: string }[] = [];

      for (let i = 0; i < BATCH_SIZE; i++) {
        const idx = OFFSET + batch * BATCH_SIZE + i;
        const firstName = pick(firstNames);
        const lastName = pick(lastNames);
        const fullName = `${firstName} ${lastName}`;
        const email = `scale.client${(idx + 1).toString().padStart(4, "0")}@mularcredit.test`;
        const phone = randomPhone();

        // Create user
        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
          email,
          password: "Mular2026!",
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });

        if (authErr) {
          if (authErr.message.includes("already been registered")) {
            // Skip existing
            continue;
          }
          stats.errors.push(`Client ${idx}: ${authErr.message}`);
          continue;
        }

        const userId = authData.user!.id;
        await supabase.from("user_roles").upsert({ user_id: userId, role: "user" }, { onConflict: "user_id,role" });
        clientBatch.push({ email, userId, name: fullName });
        stats.clients++;

        // Each client gets 1-4 loans (weighted: 40% get 1, 30% get 2, 20% get 3, 10% get 4)
        const loanRoll = Math.random();
        const numLoans = loanRoll < 0.4 ? 1 : loanRoll < 0.7 ? 2 : loanRoll < 0.9 ? 3 : 4;

        for (let j = 0; j < numLoans; j++) {
          const branchId = pick(branches);
          const product = pick(products);
          const status = weightedStatus();
          const biz = pick(businessTypes);
          const loc = pick(locations);
          const approvalLevel = approvalForStatus(status);

          // Amount distribution: realistic bell curve around median
          let amount: number;
          const r = Math.random();
          if (r < 0.3) amount = product.min + Math.random() * (product.max * 0.3 - product.min);
          else if (r < 0.7) amount = product.max * 0.3 + Math.random() * (product.max * 0.4);
          else if (r < 0.9) amount = product.max * 0.5 + Math.random() * (product.max * 0.3);
          else amount = product.max * 0.8 + Math.random() * (product.max * 0.2);
          amount = Math.round(Math.max(product.min, Math.min(product.max, amount)) / 500) * 500;

          const branchOfficers = loanOfficers.filter(lo => lo.branch_id === branchId);
          const officerId = branchOfficers.length > 0 ? pick(branchOfficers).user_id : null;

          const riskScore = Math.floor(Math.random() * 45) + 50; // 50-95
          const daysBack = Math.floor(Math.random() * 180); // Up to 6 months back
          const createdAt = daysAgo(daysBack);
          const disbDate = (status === "disbursed" || status === "completed")
            ? dateStr(daysBack - Math.floor(Math.random() * 5) - 2)
            : null;

          const approvedBy = (status !== "pending" && status !== "rejected") 
            ? (branchManagers.find(bm => bm.branch_id === branchId)?.user_id || (executives.length > 0 ? pick(executives) : null))
            : null;

          loanBatch.push({
            user_id: userId,
            full_name: fullName,
            phone,
            email,
            business_type: biz,
            business_description: `${biz} operating in ${loc}. Established ${1 + Math.floor(Math.random() * 10)} years ago.`,
            financing_amount: `KES ${amount.toLocaleString()}`,
            location: loc,
            status,
            approval_level: approvalLevel,
            approved_by: approvedBy,
            approval_notes: status === "approved" || status === "disbursed" || status === "completed" 
              ? pick(["Verified and approved", "All documents in order", "Good standing client", "Meets all criteria", "Approved per policy"])
              : status === "rejected" ? pick(["Insufficient documentation", "High risk score", "Existing overdue loans", "Unable to verify income"]) : null,
            product_id: product.id,
            branch_id: branchId,
            loan_officer_id: officerId,
            amount_approved: (status !== "pending" && status !== "rejected") ? amount : null,
            disbursement_date: disbDate,
            expected_completion_date: disbDate ? dateStr(Math.max(0, daysBack - 2 - product.term * 7)) : null,
            risk_score: riskScore,
            ai_recommendation: pick(recommendations),
            created_at: createdAt,
          });
        }
      }

      // Batch insert loans
      if (loanBatch.length > 0) {
        // Insert in sub-batches of 100
        for (let lb = 0; lb < loanBatch.length; lb += 100) {
          const subBatch = loanBatch.slice(lb, lb + 100);
          const { data: insertedLoans, error: loanErr } = await supabase
            .from("loan_applications")
            .insert(subBatch)
            .select("id, status, disbursement_date, product_id, financing_amount");

          if (loanErr) {
            stats.errors.push(`Loan batch ${batch}-${lb}: ${loanErr.message}`);
          } else if (insertedLoans) {
            stats.loans += insertedLoans.length;

            // Create repayments for disbursed/completed loans
            const repaymentBatch: any[] = [];
            for (const loan of insertedLoans) {
              if (loan.status === "disbursed" || loan.status === "completed") {
                const product = products.find(p => p.id === loan.product_id) || products[0];
                const amountStr = (loan.financing_amount || "0").replace(/[^0-9]/g, "");
                const principal = parseInt(amountStr) || 5000;
                const totalRepay = Math.round(principal * (1 + product.rate));
                const weeklyRepay = Math.round(totalRepay / product.term);

                for (let w = 1; w <= product.term; w++) {
                  const dueDate = dateStr(Math.max(0, 
                    Math.floor((new Date().getTime() - new Date(loan.disbursement_date).getTime()) / 86400000) - w * 7
                  ));
                  const dueDateTime = new Date(dueDate).getTime();
                  const now = Date.now();
                  const isPastDue = dueDateTime < now;

                  let payStatus: string;
                  let amountPaid: number;
                  let paidDate: string | null = null;

                  if (loan.status === "completed") {
                    payStatus = "paid";
                    amountPaid = weeklyRepay;
                    paidDate = dueDate;
                  } else if (isPastDue) {
                    // Realistic payment behavior
                    const payRoll = Math.random();
                    if (payRoll < 0.75) {
                      payStatus = "paid";
                      amountPaid = weeklyRepay;
                      paidDate = dueDate;
                    } else if (payRoll < 0.88) {
                      payStatus = "partial";
                      amountPaid = Math.round(weeklyRepay * (0.3 + Math.random() * 0.5));
                      paidDate = dueDate;
                    } else {
                      payStatus = "overdue";
                      amountPaid = 0;
                    }
                  } else {
                    payStatus = "pending";
                    amountPaid = 0;
                  }

                  repaymentBatch.push({
                    loan_id: loan.id,
                    amount_due: weeklyRepay,
                    amount_paid: amountPaid,
                    due_date: dueDate,
                    paid_date: paidDate,
                    week_number: w,
                    status: payStatus,
                  });
                }
              }
            }

            // Insert repayments in sub-batches
            for (let rb = 0; rb < repaymentBatch.length; rb += 200) {
              const repSub = repaymentBatch.slice(rb, rb + 200);
              const { error: repErr } = await supabase.from("loan_repayments").insert(repSub);
              if (repErr) stats.errors.push(`Repayment batch: ${repErr.message}`);
              else stats.repayments += repSub.length;
            }
          }
        }
      }
    }

    // ============ INTERNAL MESSAGES (realistic communication flow) ============
    const allManagersAndOfficers = [...branchManagers.map(b => b.user_id), ...loanOfficers.map(l => l.user_id)];
    const allStaffIds = [...executives, ...regionalManagers.map(r => r.user_id), ...allManagersAndOfficers];

    if (allStaffIds.length >= 2) {
      const msgBatch: any[] = [];
      const priorities = ["normal", "normal", "normal", "high", "urgent"];
      const roles = ["loan_officer", "branch_manager", "regional_manager", "ceo", "gm"];

      // CEO/GM broadcasting to all staff
      for (let i = 0; i < 15; i++) {
        const sender = executives.length > 0 ? pick(executives) : allStaffIds[0];
        msgBatch.push({
          sender_id: sender,
          recipient_role: pick(["loan_officer", "branch_manager", "regional_manager"]),
          subject: pick(messageSubjects),
          body: pick(messageBodies),
          priority: pick(priorities),
          is_read: Math.random() > 0.4,
          created_at: daysAgo(Math.floor(Math.random() * 30)),
        });
      }

      // Regional managers to branch managers
      for (let i = 0; i < 20; i++) {
        if (regionalManagers.length > 0 && branchManagers.length > 0) {
          const rm = pick(regionalManagers);
          const bm = pick(branchManagers);
          msgBatch.push({
            sender_id: rm.user_id,
            recipient_id: bm.user_id,
            subject: pick(messageSubjects),
            body: pick(messageBodies),
            priority: pick(priorities),
            is_read: Math.random() > 0.3,
            created_at: daysAgo(Math.floor(Math.random() * 20)),
          });
        }
      }

      // Branch managers to loan officers
      for (let i = 0; i < 40; i++) {
        if (branchManagers.length > 0 && loanOfficers.length > 0) {
          const bm = pick(branchManagers);
          const sameBranchOfficers = loanOfficers.filter(lo => lo.branch_id === bm.branch_id);
          const lo = sameBranchOfficers.length > 0 ? pick(sameBranchOfficers) : pick(loanOfficers);
          msgBatch.push({
            sender_id: bm.user_id,
            recipient_id: lo.user_id,
            subject: pick(messageSubjects),
            body: pick(messageBodies),
            priority: pick(priorities),
            is_read: Math.random() > 0.35,
            created_at: daysAgo(Math.floor(Math.random() * 14)),
          });
        }
      }

      // Branch-wide broadcasts
      for (let i = 0; i < 15; i++) {
        if (branchManagers.length > 0) {
          const bm = pick(branchManagers);
          msgBatch.push({
            sender_id: bm.user_id,
            branch_id: bm.branch_id,
            subject: pick(messageSubjects),
            body: pick(messageBodies),
            priority: pick(priorities),
            is_read: Math.random() > 0.5,
            created_at: daysAgo(Math.floor(Math.random() * 10)),
          });
        }
      }

      // Loan officers reporting upward
      for (let i = 0; i < 30; i++) {
        if (loanOfficers.length > 0 && branchManagers.length > 0) {
          const lo = pick(loanOfficers);
          const bm = branchManagers.find(b => b.branch_id === lo.branch_id) || pick(branchManagers);
          msgBatch.push({
            sender_id: lo.user_id,
            recipient_id: bm.user_id,
            subject: pick(["Client Follow-up Report", "Weekly Collection Update", "New Application Assessment", "Overdue Account Status", "Client Visit Report", "Disbursement Request", "Documentation Update"]),
            body: pick([
              "Visited the client today. Business is thriving. Monthly revenue estimated at KES 45,000. Recommend loan renewal at higher amount.",
              "Collection update: Successfully collected all due payments this week. 2 clients requested early repayment.",
              "New applicant assessment complete. Business verified at location. Recommend approval with standard monitoring.",
              "Overdue client contacted. They experienced temporary cash flow issues. Payment promised by end of week. Will follow up.",
              "Client has expanded business to second location. Current loan performing well. Pre-approved for graduation to higher tier.",
              "Please process disbursement for approved loan #LA-2024-xxx. All documentation verified and filed.",
              "Updated client documentation. New ID, business permit, and latest bank statement all uploaded to system.",
            ]),
            priority: pick(priorities),
            is_read: Math.random() > 0.4,
            created_at: daysAgo(Math.floor(Math.random() * 7)),
          });
        }
      }

      // Insert messages in batches
      for (let mb = 0; mb < msgBatch.length; mb += 50) {
        const { error: msgErr } = await supabase.from("internal_messages").insert(msgBatch.slice(mb, mb + 50));
        if (msgErr) stats.errors.push(`Messages: ${msgErr.message}`);
        else stats.messages += Math.min(50, msgBatch.length - mb);
      }
    }

    // ============ MORE AI INSIGHTS ============
    const newInsights = [
      { entity_type: "portfolio", insight_type: "executive_summary", title: "Scaled Portfolio Overview", content: "Portfolio has grown to 600+ active clients across 12 branches. Total exposure: KES 28.5M. Average loan size: KES 12,400. Growth rate: 340% MoM. System handling load efficiently.", severity: "success", target_roles: ["ceo", "gm"] },
      { entity_type: "portfolio", insight_type: "risk_alert", title: "Concentration Risk Warning", content: "35% of portfolio concentrated in Nairobi region. Recommend geographical diversification. Coast and Western regions have capacity for 50% more loans.", severity: "warning", target_roles: ["ceo", "gm"] },
      { entity_type: "portfolio", insight_type: "growth_opportunity", title: "Digital Lending Opportunity", content: "45% of new clients operate digital/tech-adjacent businesses. Mobile phone repair, cyber cafes, and online sellers growing fastest. Consider dedicated digital SME product.", severity: "info", target_roles: ["ceo", "gm", "regional_manager"] },
      { entity_type: "portfolio", insight_type: "prediction", title: "Q2 2026 Demand Forecast", content: "AI model projects 25% increase in agricultural loan demand as long rains begin. Nakuru, Nyeri, and Eldoret branches should prepare KES 5M additional liquidity.", severity: "info", target_roles: ["ceo", "gm", "regional_manager"] },
      { entity_type: "region", insight_type: "anomaly", title: "Unusual Pattern: Coast Region", content: "Mombasa and Malindi branches showing 40% higher rejection rate than average. Investigation suggests overly conservative risk scoring for tourism-sector businesses. Recommend model recalibration.", severity: "warning", target_roles: ["ceo", "gm", "regional_manager"] },
      { entity_type: "region", insight_type: "performance", title: "Central Region Excellence", content: "Nakuru and Nyeri branches achieving 98% collection rate, highest in organization. Key factors: strong community ties, group lending model, weekly follow-ups.", severity: "success", target_roles: ["ceo", "gm", "regional_manager"] },
      { entity_type: "branch", insight_type: "fraud_alert", title: "Potential Identity Fraud Detected", content: "2 applications from CBD branch share phone number with different names. Possible identity fraud. Flagged for manual verification before any approval.", severity: "critical", target_roles: ["ceo", "gm", "branch_manager", "loan_officer"] },
      { entity_type: "branch", insight_type: "collection_alert", title: "Kakamega: Rising Delinquency", content: "Kakamega branch PAR>30 increased to 12.3% from 6.1%. 8 accounts now overdue. Sugar industry downturn affecting borrowers. Recommend proactive restructuring.", severity: "critical", target_roles: ["ceo", "gm", "regional_manager", "branch_manager"] },
      { entity_type: "officer", insight_type: "performance", title: "Top Performer: Catherine Njeri", content: "Loan officer Catherine Njeri (Westlands) has 100% collection rate across 45 clients. Zero defaults in 6 months. Recommend for promotion consideration.", severity: "success", target_roles: ["ceo", "gm", "branch_manager"] },
      { entity_type: "portfolio", insight_type: "compliance", title: "Regulatory Compliance Update", content: "CBK new guidelines require enhanced KYC for loans above KES 30,000. 15% of current portfolio affected. System updated. Officers must collect additional documentation within 30 days.", severity: "warning", target_roles: ["ceo", "gm", "regional_manager", "branch_manager", "loan_officer"] },
      { entity_type: "portfolio", insight_type: "executive_summary", title: "Client Retention Analysis", content: "72% of completed loan clients apply for renewal within 2 weeks. Average loan size increases 35% on renewal. Client lifetime value: KES 8,200 in interest income over 3 loan cycles.", severity: "success", target_roles: ["ceo", "gm"] },
      { entity_type: "region", insight_type: "growth_opportunity", title: "Western Kenya Expansion", content: "Kakamega and surrounding areas showing strong demand signals. 120 pre-qualified leads identified through community outreach. Recommend opening 2 satellite offices in Bungoma and Vihiga.", severity: "info", target_roles: ["ceo", "gm", "regional_manager"] },
    ];

    const { error: insightErr } = await supabase.from("ai_insights").insert(newInsights);
    if (insightErr) stats.errors.push(`Insights: ${insightErr.message}`);
    else stats.insights = newInsights.length;

    return new Response(JSON.stringify({
      success: true,
      stats,
      summary: `Created ${stats.clients} clients, ${stats.loans} loans, ${stats.repayments} repayments, ${stats.messages} messages, ${stats.insights} insights. ${stats.errors.length} errors.`,
      errors_sample: stats.errors.slice(0, 10),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", stack: e instanceof Error ? e.stack : undefined }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
