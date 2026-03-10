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

    // Enhanced client profiles with realistic borrowing patterns
    const clientProfiles = [
      // Loyal repeat customers (6-10 loans over 18 months)
      { name: "Grace Wanjiku", phone: "+254712345001", business: "Mama mboga (Vegetable vendor)", location: "Nairobi", pattern: "loyal", loans: 8 },
      { name: "Samuel Kipchoge", phone: "+254712345002", business: "M-Pesa agent", location: "Nakuru", pattern: "loyal", loans: 7 },
      { name: "Mary Akinyi", phone: "+254712345003", business: "Salon owner", location: "Kisumu", pattern: "loyal", loans: 9 },
      { name: "Peter Ochieng", phone: "+254712345004", business: "Boda boda operator", location: "Mombasa", pattern: "loyal", loans: 6 },
      
      // Growing businesses (3-5 loans with increasing amounts)
      { name: "Faith Muthoni", phone: "+254712345005", business: "Poultry farmer", location: "Nyeri", pattern: "growing", loans: 4 },
      { name: "John Kamau", phone: "+254712345006", business: "Hardware shop", location: "Thika", pattern: "growing", loans: 5 },
      { name: "Esther Chebet", phone: "+254712345007", business: "Food kiosk owner", location: "Eldoret", pattern: "growing", loans: 4 },
      { name: "David Otieno", phone: "+254712345008", business: "Matatu sacco member", location: "Nairobi", pattern: "growing", loans: 3 },
      
      // Seasonal borrowers (2-3 loans per year, seasonal patterns)
      { name: "Margaret Njeri", phone: "+254712345009", business: "Cereals dealer", location: "Nakuru", pattern: "seasonal", loans: 5 },
      { name: "Joseph Kiprono", phone: "+254712345010", business: "Farming inputs supplier", location: "Eldoret", pattern: "seasonal", loans: 4 },
      { name: "Alice Wambui", phone: "+254712345011", business: "School supplies vendor", location: "Nyeri", pattern: "seasonal", loans: 3 },
      
      // Occasional borrowers (1-2 loans per year)
      { name: "Robert Mwenda", phone: "+254712345012", business: "Carpenter", location: "Thika", pattern: "occasional", loans: 3 },
      { name: "Susan Atieno", phone: "+254712345013", business: "Tailor", location: "Kisumu", pattern: "occasional", loans: 2 },
      { name: "Francis Korir", phone: "+254712345014", business: "Mobile phone repair", location: "Nairobi", pattern: "occasional", loans: 2 },
      
      // Problem customers (defaults/late payments)
      { name: "Jane Nyokabi", phone: "+254712345015", business: "Beauty products seller", location: "Mombasa", pattern: "problematic", loans: 4 },
      { name: "Daniel Barasa", phone: "+254712345016", business: "Fish trader", location: "Kisumu", pattern: "problematic", loans: 3 },
      
      // New customers (first-time borrowers in last 3 months)
      { name: "Ruth Chepkemoi", phone: "+254712345017", business: "Mitumba dealer", location: "Nakuru", pattern: "new", loans: 2 },
      { name: "James Omondi", phone: "+254712345018", business: "Butchery owner", location: "Mombasa", pattern: "new", loans: 1 },
      { name: "Christine Wangui", phone: "+254712345019", business: "Mama fua services", location: "Nairobi", pattern: "new", loans: 1 },
      { name: "Michael Kiplagat", phone: "+254712345020", business: "Shoe repair", location: "Eldoret", pattern: "new", loans: 1 },
      
      // High-value customers (larger loans, established businesses)
      { name: "Catherine Njoki", phone: "+254712345021", business: "Wholesale distributor", location: "Nairobi", pattern: "premium", loans: 5 },
      { name: "Anthony Mutua", phone: "+254712345022", business: "Mini supermarket", location: "Thika", pattern: "premium", loans: 4 },
      { name: "Lilian Cherotich", phone: "+254712345023", business: "Restaurant owner", location: "Nakuru", pattern: "premium", loans: 3 },
    ];

    const branches = [
      { id: "b1000000-0000-0000-0000-000000000001", name: "Westlands", location: "Nairobi" },
      { id: "b1000000-0000-0000-0000-000000000002", name: "CBD", location: "Nairobi" },
      { id: "b1000000-0000-0000-0000-000000000003", name: "Eastlands", location: "Nairobi" },
      { id: "b1000000-0000-0000-0000-000000000004", name: "Karen", location: "Nairobi" },
      { id: "b1000000-0000-0000-0000-000000000005", name: "Nakuru", location: "Nakuru" },
      { id: "b1000000-0000-0000-0000-000000000006", name: "Nyeri", location: "Nyeri" },
      { id: "b1000000-0000-0000-0000-000000000007", name: "Eldoret", location: "Eldoret" },
      { id: "b1000000-0000-0000-0000-000000000008", name: "Thika", location: "Thika" },
      { id: "b1000000-0000-0000-0000-000000000009", name: "Mombasa", location: "Mombasa" },
      { id: "b1000000-0000-0000-0000-000000000010", name: "Kisumu", location: "Kisumu" },
    ];

    const products = [
      { id: "c1000000-0000-0000-0000-000000000001", name: "MamaBiz", term: 6, rate: 0.15, min: 5000, max: 15000 },
      { id: "c1000000-0000-0000-0000-000000000002", name: "QuickCash", term: 4, rate: 0.12, min: 3000, max: 10000 },
      { id: "c1000000-0000-0000-0000-000000000003", name: "BiashaBoost", term: 12, rate: 0.18, min: 10000, max: 40000 },
      { id: "c1000000-0000-0000-0000-000000000004", name: "TradeUp", term: 8, rate: 0.10, min: 5000, max: 25000 },
      { id: "c1000000-0000-0000-0000-000000000005", name: "GrowthPlus", term: 10, rate: 0.14, min: 8000, max: 50000 },
      { id: "c1000000-0000-0000-0000-000000000006", name: "StartUp", term: 6, rate: 0.13, min: 3000, max: 12000 },
    ];

    // Get existing loan officers
    const { data: loanOfficers } = await supabase
      .from("staff_assignments")
      .select(`
        user_id,
        branch_id,
        user_roles!inner(role)
      `)
      .eq("user_roles.role", "loan_officer");

    const results = [];
    const now = new Date();
    
    for (const profile of clientProfiles) {
      // Find appropriate branch
      const branch = branches.find(b => b.location === profile.location) || branches[0];
      const branchOfficers = loanOfficers?.filter(lo => lo.branch_id === branch.id) || [];
      const assignedOfficer = branchOfficers[Math.floor(Math.random() * branchOfficers.length)]?.user_id;

      // Create client user
      const clientEmail = `${profile.name.toLowerCase().replace(/\s+/g, '.')}@mularcredit.test`;
      
      const { data: clientAuth, error: clientError } = await supabase.auth.admin.createUser({
        email: clientEmail,
        password: "Mular2026!",
        email_confirm: true,
        user_metadata: { full_name: profile.name },
      });

      if (clientError && !clientError.message.includes("already been registered")) {
        results.push({ email: clientEmail, status: "error", error: clientError.message });
        continue;
      }

      let clientId = clientAuth?.user?.id;
      
      // If user exists, get their ID
      if (clientError?.message.includes("already been registered")) {
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existing = existingUsers?.users?.find((u: any) => u.email === clientEmail);
        if (existing) {
          clientId = existing.id;
        } else {
          continue;
        }
      }

      if (!clientId) continue;

      // Ensure user role
      await supabase.from("user_roles").upsert(
        { user_id: clientId, role: "user" },
        { onConflict: "user_id,role" }
      );

      // Generate loans based on pattern
      const loans = generateLoansForPattern(profile, branch.id, assignedOfficer, products, now);
      
      for (const loanData of loans) {
        const { data: loan } = await supabase
          .from("loan_applications")
          .insert({
            ...loanData,
            user_id: clientId,
            full_name: profile.name,
            phone: profile.phone,
            email: clientEmail,
            business_type: profile.business,
            location: profile.location,
          })
          .select("id")
          .single();

        // Generate repayment schedule for disbursed/completed loans
        if (loan && (loanData.status === "disbursed" || loanData.status === "completed")) {
          const product = products.find(p => p.id === loanData.product_id)!;
          const amount = loanData.amount_approved!;
          const totalRepay = Math.round(amount * (1 + product.rate));
          const weeklyRepay = Math.round(totalRepay / product.term);
          
          const repayments = [];
          const disbursementDate = new Date(loanData.disbursement_date!);
          
          for (let w = 1; w <= product.term; w++) {
            const dueDate = new Date(disbursementDate.getTime() + w * 7 * 86400000);
            const dueDateStr = dueDate.toISOString().split("T")[0];
            
            let status = "pending";
            let amountPaid = 0;
            let paidDate = null;
            
            if (loanData.status === "completed") {
              // All payments made
              status = "paid";
              amountPaid = weeklyRepay;
              paidDate = dueDateStr;
            } else if (dueDate < now) {
              // Past due date for disbursed loans
              if (profile.pattern === "problematic") {
                // 40% chance of late/partial payment
                if (Math.random() < 0.4) {
                  status = Math.random() < 0.7 ? "overdue" : "partial";
                  amountPaid = status === "partial" ? Math.round(weeklyRepay * (0.3 + Math.random() * 0.4)) : 0;
                } else {
                  status = "paid";
                  amountPaid = weeklyRepay;
                  paidDate = new Date(dueDate.getTime() + Math.random() * 7 * 86400000).toISOString().split("T")[0];
                }
              } else {
                // Good customers pay on time (95% rate)
                if (Math.random() < 0.95) {
                  status = "paid";
                  amountPaid = weeklyRepay;
                  paidDate = dueDateStr;
                } else {
                  status = Math.random() < 0.8 ? "partial" : "overdue";
                  amountPaid = status === "partial" ? Math.round(weeklyRepay * 0.8) : 0;
                }
              }
            }

            repayments.push({
              loan_id: loan.id,
              amount_due: weeklyRepay,
              amount_paid: amountPaid,
              due_date: dueDateStr,
              paid_date: paidDate,
              week_number: w,
              status,
            });
          }
          
          await supabase.from("loan_repayments").insert(repayments);
        }
      }

      results.push({ 
        name: profile.name, 
        email: clientEmail, 
        status: "created", 
        loans: loans.length,
        pattern: profile.pattern 
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        clients_processed: results.length, 
        total_loans: results.reduce((sum, r) => sum + r.loans, 0),
        results: results.slice(0, 10) 
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function generateLoansForPattern(
  profile: any,
  branchId: string,
  officerId: string | undefined,
  products: any[],
  now: Date
) {
  const loans = [];
  const statusOptions = ["pending", "approved", "disbursed", "completed", "rejected"];
  
  // Base risk score varies by customer type
  let baseRiskScore = 75;
  switch (profile.pattern) {
    case "loyal": baseRiskScore = 85; break;
    case "growing": baseRiskScore = 80; break;
    case "premium": baseRiskScore = 88; break;
    case "seasonal": baseRiskScore = 77; break;
    case "new": baseRiskScore = 65; break;
    case "problematic": baseRiskScore = 58; break;
    default: baseRiskScore = 72;
  }

  const startDate = new Date(now.getTime() - (18 * 30 * 24 * 60 * 60 * 1000)); // 18 months ago
  
  for (let i = 0; i < profile.loans; i++) {
    let loanDate: Date;
    let amount: number;
    let product: any;
    let status: string;
    
    // Determine loan timing based on pattern
    switch (profile.pattern) {
      case "loyal":
        // Regular loans every 2-3 months
        loanDate = new Date(startDate.getTime() + i * (2.5 * 30 * 24 * 60 * 60 * 1000));
        product = products[Math.floor(Math.random() * 4)]; // Prefer smaller products
        amount = Math.round((product.min + Math.random() * (product.max - product.min) * 0.7) / 500) * 500;
        status = i < profile.loans - 2 ? "completed" : (i === profile.loans - 1 ? "disbursed" : "pending");
        break;
        
      case "growing":
        // Increasing loan amounts over time
        loanDate = new Date(startDate.getTime() + i * (4 * 30 * 24 * 60 * 60 * 1000));
        product = i < 2 ? products.find(p => p.name === "StartUp") || products[0] : products.find(p => p.name === "GrowthPlus") || products[2];
        amount = Math.round((product.min + (i / profile.loans) * (product.max - product.min)) / 1000) * 1000;
        status = i < profile.loans - 1 ? "completed" : "disbursed";
        break;
        
      case "seasonal":
        // Loans aligned with seasons (farming/school cycles)
        const seasonalMonths = i % 2 === 0 ? [2, 8] : [5, 11]; // Feb/Aug or May/Nov
        loanDate = new Date(startDate.getTime() + Math.floor(i/2) * 12 * 30 * 24 * 60 * 60 * 1000);
        loanDate.setMonth(seasonalMonths[i % 2]);
        product = products.find(p => p.name === "BiashaBoost") || products[2];
        amount = Math.round((product.min + Math.random() * (product.max - product.min) * 0.8) / 1000) * 1000;
        status = loanDate < new Date(now.getTime() - 3 * 30 * 24 * 60 * 60 * 1000) ? "completed" : "disbursed";
        break;
        
      case "premium":
        // Larger, less frequent loans
        loanDate = new Date(startDate.getTime() + i * (5 * 30 * 24 * 60 * 60 * 1000));
        product = products.find(p => p.name === "GrowthPlus") || products[4];
        amount = Math.round((product.max * 0.6 + Math.random() * product.max * 0.4) / 1000) * 1000;
        status = i < profile.loans - 1 ? "completed" : "disbursed";
        break;
        
      case "new":
        // Recent loans only
        loanDate = new Date(now.getTime() - (3 - i) * 30 * 24 * 60 * 60 * 1000);
        product = products.find(p => p.name === "StartUp") || products[0];
        amount = Math.round((product.min + Math.random() * product.min) / 500) * 500;
        status = i === 0 ? "completed" : (i === 1 ? "disbursed" : "approved");
        break;
        
      case "problematic":
        // Mix of completed and problematic loans
        loanDate = new Date(startDate.getTime() + i * (6 * 30 * 24 * 60 * 60 * 1000));
        product = products[Math.floor(Math.random() * products.length)];
        amount = Math.round((product.min + Math.random() * (product.max - product.min) * 0.6) / 500) * 500;
        status = Math.random() < 0.3 ? "completed" : (Math.random() < 0.8 ? "disbursed" : "rejected");
        break;
        
      default:
        loanDate = new Date(startDate.getTime() + i * (3 * 30 * 24 * 60 * 60 * 1000));
        product = products[Math.floor(Math.random() * products.length)];
        amount = Math.round((product.min + Math.random() * (product.max - product.min)) / 500) * 500;
        status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
    }

    // Ensure loan date doesn't exceed current date
    if (loanDate > now) {
      loanDate = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    }

    const riskScore = Math.max(50, Math.min(95, baseRiskScore + (Math.random() - 0.5) * 20));
    
    const recommendations = [
      "Regular customer with excellent payment history. Recommend approval.",
      "Loyal client, always pays on time. Fast-track approval recommended.",
      "Seasonal borrower, payments align with harvest cycles. Approve with seasonal terms.",
      "Growing business showing consistent improvement. Recommend increased limit.",
      "First-time borrower, start with conservative amount and monitor closely.",
      "Previous late payments noted. Require additional documentation or guarantor.",
      "High-risk profile. Consider smaller amount or additional collateral.",
    ];

    const businessDescriptions = [
      `Well-established ${profile.business} serving the local community`,
      `${profile.business} with 3+ years of consistent operations`,
      `Growing ${profile.business} looking to expand inventory`,
      `Seasonal ${profile.business} with strong demand patterns`,
      `Family-run ${profile.business} with loyal customer base`,
    ];

    loans.push({
      business_description: businessDescriptions[Math.floor(Math.random() * businessDescriptions.length)],
      financing_amount: `KES ${amount.toLocaleString()}`,
      status,
      product_id: product.id,
      branch_id: branchId,
      loan_officer_id: officerId,
      amount_approved: status !== "pending" && status !== "rejected" ? amount : null,
      approved_by: status !== "pending" && status !== "rejected" ? officerId : null,
      disbursement_date: status === "disbursed" || status === "completed" 
        ? new Date(loanDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] 
        : null,
      disbursed_by: status === "disbursed" || status === "completed" ? officerId : null,
      expected_completion_date: status === "disbursed" || status === "completed"
        ? new Date(loanDate.getTime() + (product.term + 2) * 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
        : null,
      risk_score: Math.round(riskScore),
      ai_recommendation: recommendations[Math.floor(Math.random() * recommendations.length)],
      created_at: loanDate.toISOString(),
      approval_notes: status !== "pending" ? "Automated approval based on customer history and risk assessment." : null,
    });
  }

  return loans.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}
