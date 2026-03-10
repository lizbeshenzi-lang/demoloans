/**
 * Dynamically generates role-specific AI insights from actual loan & repayment data.
 * These are computed client-side from the user's visible data, not static DB entries.
 */

interface LoanApp {
  id: string; full_name: string; business_type: string; financing_amount: string;
  status: string; risk_score: number | null; amount_approved: number | null;
  branch_id: string | null; loan_officer_id: string | null; created_at: string;
  disbursement_date: string | null;
}

interface Repayment {
  id: string; loan_id: string; amount_due: number; amount_paid: number;
  due_date: string; status: string; week_number: number;
}

interface Branch { id: string; name: string; region_id: string; }
interface Region { id: string; name: string; }

interface GeneratedInsight {
  id: string; title: string; content: string; severity: "critical" | "warning" | "success" | "info";
  insight_type: string; created_at: string;
}

type RoleType = "ceo" | "gm" | "regional_manager" | "branch_manager" | "loan_officer" | "admin";

export function generateRoleInsights(
  role: RoleType,
  loans: LoanApp[],
  repayments: Repayment[],
  branches: Branch[],
  regions: Region[],
  staffAssignment?: { branch_id: string | null; region_id: string | null } | null,
): GeneratedInsight[] {
  const now = new Date();
  const insights: GeneratedInsight[] = [];
  let idCounter = 0;
  const makeId = () => `gen-${++idCounter}`;
  const ts = now.toISOString();

  const activeLoans = loans.filter(l => l.status === "disbursed");
  const pendingLoans = loans.filter(l => l.status === "pending");
  const approvedLoans = loans.filter(l => l.status === "approved");
  const completedLoans = loans.filter(l => l.status === "completed");
  const rejectedLoans = loans.filter(l => l.status === "rejected");

  // Overdue repayments (past due_date, not paid)
  const overdueReps = repayments.filter(r => r.status === "pending" && new Date(r.due_date) < now);
  const totalDue = repayments.reduce((s, r) => s + Number(r.amount_due || 0), 0);
  const totalPaid = repayments.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
  const collectionRate = totalDue > 0 ? Math.round((totalPaid / totalDue) * 1000) / 10 : 0;

  // PAR calculation
  const overdueByLoan = new Map<string, number>();
  overdueReps.forEach(r => {
    const days = Math.floor((now.getTime() - new Date(r.due_date).getTime()) / 86400000);
    const existing = overdueByLoan.get(r.loan_id) || 0;
    if (days > existing) overdueByLoan.set(r.loan_id, days);
  });
  const par30Count = [...overdueByLoan.values()].filter(d => d > 30).length;
  const par7Count = [...overdueByLoan.values()].filter(d => d >= 7).length;

  // === LOAN OFFICER INSIGHTS ===
  if (role === "loan_officer") {
    // Pending approvals needing action
    if (pendingLoans.length > 0) {
      const oldest = pendingLoans.reduce((a, b) => new Date(a.created_at) < new Date(b.created_at) ? a : b);
      const daysOld = Math.floor((now.getTime() - new Date(oldest.created_at).getTime()) / 86400000);
      insights.push({
        id: makeId(), insight_type: "action_required",
        severity: daysOld > 3 ? "critical" : "warning",
        title: `${pendingLoans.length} Applications Awaiting Your Review`,
        content: `You have ${pendingLoans.length} pending loan applications. The oldest has been waiting ${daysOld} day${daysOld !== 1 ? "s" : ""}. ${daysOld > 3 ? "Urgent: SLA breach risk — review immediately." : "Review and process to maintain turnaround times."}`,
        created_at: ts,
      });
    }

    // Approved but not yet disbursed
    if (approvedLoans.length > 0) {
      const totalApproved = approvedLoans.reduce((s, l) => s + Number(l.amount_approved || 0), 0);
      insights.push({
        id: makeId(), insight_type: "disbursement_queue",
        severity: "info",
        title: `${approvedLoans.length} Loans Ready for Disbursement`,
        content: `KES ${totalApproved.toLocaleString()} approved and awaiting disbursement across ${approvedLoans.length} clients. Process promptly to maintain client satisfaction.`,
        created_at: ts,
      });
    }

    // Overdue collections for your clients
    if (overdueReps.length > 0) {
      const overdueAmount = overdueReps.reduce((s, r) => s + (Number(r.amount_due) - Number(r.amount_paid || 0)), 0);
      const uniqueClients = new Set(overdueReps.map(r => r.loan_id)).size;
      insights.push({
        id: makeId(), insight_type: "collection_alert",
        severity: overdueAmount > 10000 ? "critical" : "warning",
        title: `${uniqueClients} Client${uniqueClients !== 1 ? "s" : ""} with Overdue Payments`,
        content: `KES ${Math.round(overdueAmount).toLocaleString()} outstanding from ${uniqueClients} client${uniqueClients !== 1 ? "s" : ""}. Follow up on overdue installments to prevent PAR deterioration.`,
        created_at: ts,
      });
    }

    // High-risk loans in your portfolio
    const highRisk = activeLoans.filter(l => l.risk_score !== null && l.risk_score < 65);
    if (highRisk.length > 0) {
      insights.push({
        id: makeId(), insight_type: "risk_alert",
        severity: "warning",
        title: `${highRisk.length} High-Risk Active Loan${highRisk.length !== 1 ? "s" : ""}`,
        content: `${highRisk.map(l => l.full_name).slice(0, 3).join(", ")}${highRisk.length > 3 ? ` and ${highRisk.length - 3} more` : ""} have risk scores below 65. Monitor closely and maintain regular contact.`,
        created_at: ts,
      });
    }

    // Performance snapshot
    if (completedLoans.length > 0) {
      const rate = loans.length > 0 ? Math.round((completedLoans.length / (completedLoans.length + rejectedLoans.length + activeLoans.length)) * 100) : 0;
      insights.push({
        id: makeId(), insight_type: "performance",
        severity: collectionRate >= 90 ? "success" : "info",
        title: `Your Collection Rate: ${collectionRate}%`,
        content: `${completedLoans.length} loans successfully completed. ${activeLoans.length} currently active. ${collectionRate >= 90 ? "Excellent performance — keep it up!" : "Focus on timely collections to improve your rate."}`,
        created_at: ts,
      });
    }
  }

  // === BRANCH MANAGER INSIGHTS ===
  if (role === "branch_manager") {
    // Branch-level collection performance
    insights.push({
      id: makeId(), insight_type: "branch_performance",
      severity: collectionRate >= 90 ? "success" : collectionRate >= 75 ? "info" : "warning",
      title: `Branch Collection Rate: ${collectionRate}%`,
      content: `Total due: KES ${Math.round(totalDue).toLocaleString()}, collected: KES ${Math.round(totalPaid).toLocaleString()}. ${collectionRate < 80 ? "Below target — schedule team meeting to address collection gaps." : "On track — maintain momentum."}`,
      created_at: ts,
    });

    // Pending pipeline
    if (pendingLoans.length > 0) {
      insights.push({
        id: makeId(), insight_type: "pipeline",
        severity: pendingLoans.length > 10 ? "warning" : "info",
        title: `${pendingLoans.length} Applications in Branch Pipeline`,
        content: `${pendingLoans.length} applications pending review. ${approvedLoans.length} approved awaiting disbursement. Ensure officers are processing within SLA.`,
        created_at: ts,
      });
    }

    // PAR alert
    if (par7Count > 0) {
      insights.push({
        id: makeId(), insight_type: "par_alert",
        severity: par30Count > 0 ? "critical" : "warning",
        title: `PAR Alert: ${par7Count} Loan${par7Count !== 1 ? "s" : ""} Overdue 7+ Days`,
        content: `${par7Count} loans are 7+ days overdue${par30Count > 0 ? `, including ${par30Count} exceeding 30 days` : ""}. Immediate follow-up required to prevent further delinquency.`,
        created_at: ts,
      });
    }

    // Officer workload distribution
    const officerLoads = new Map<string, number>();
    activeLoans.forEach(l => { if (l.loan_officer_id) officerLoads.set(l.loan_officer_id, (officerLoads.get(l.loan_officer_id) || 0) + 1); });
    if (officerLoads.size > 1) {
      const loads = [...officerLoads.values()];
      const max = Math.max(...loads);
      const min = Math.min(...loads);
      if (max > min * 2) {
        insights.push({
          id: makeId(), insight_type: "workload",
          severity: "warning",
          title: "Uneven Officer Workload",
          content: `Loan distribution imbalance: heaviest officer has ${max} active loans vs lightest with ${min}. Consider rebalancing to improve service quality.`,
          created_at: ts,
        });
      }
    }
  }

  // === REGIONAL MANAGER INSIGHTS ===
  if (role === "regional_manager") {
    // Branch comparison
    const branchStats = branches
      .filter(b => b.region_id === staffAssignment?.region_id)
      .map(b => {
        const bLoans = loans.filter(l => l.branch_id === b.id);
        const bReps = repayments.filter(r => bLoans.some(l => l.id === r.loan_id));
        const bDue = bReps.reduce((s, r) => s + Number(r.amount_due || 0), 0);
        const bPaid = bReps.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
        return { name: b.name, loans: bLoans.length, rate: bDue > 0 ? Math.round((bPaid / bDue) * 100) : 0, pending: bLoans.filter(l => l.status === "pending").length };
      });

    const bestBranch = branchStats.reduce((a, b) => a.rate > b.rate ? a : b, branchStats[0]);
    const worstBranch = branchStats.reduce((a, b) => a.rate < b.rate ? a : b, branchStats[0]);

    if (bestBranch && worstBranch && bestBranch.name !== worstBranch.name) {
      insights.push({
        id: makeId(), insight_type: "branch_comparison",
        severity: worstBranch.rate < 70 ? "warning" : "info",
        title: "Branch Performance Spread",
        content: `${bestBranch.name} leads at ${bestBranch.rate}% collection (${bestBranch.loans} loans). ${worstBranch.name} needs attention at ${worstBranch.rate}% (${worstBranch.loans} loans). ${worstBranch.rate < 70 ? "Schedule intervention meeting." : "Monitor closely."}`,
        created_at: ts,
      });
    }

    // Regional PAR
    if (par30Count > 0) {
      insights.push({
        id: makeId(), insight_type: "regional_par",
        severity: "critical",
        title: `Regional PAR>30: ${par30Count} Loan${par30Count !== 1 ? "s" : ""}`,
        content: `${par30Count} loans in your region exceed 30 days overdue. This impacts portfolio quality and requires branch manager escalation.`,
        created_at: ts,
      });
    }

    // Growth opportunity
    const recentLoans = loans.filter(l => new Date(l.created_at) > new Date(now.getTime() - 30 * 86400000));
    if (recentLoans.length > 0) {
      const bizTypes = new Map<string, number>();
      recentLoans.forEach(l => bizTypes.set(l.business_type, (bizTypes.get(l.business_type) || 0) + 1));
      const topBiz = [...bizTypes.entries()].sort((a, b) => b[1] - a[1])[0];
      if (topBiz) {
        insights.push({
          id: makeId(), insight_type: "market_intel",
          severity: "info",
          title: `Trending Sector: ${topBiz[0]}`,
          content: `${topBiz[1]} of ${recentLoans.length} recent applications (${Math.round((topBiz[1] / recentLoans.length) * 100)}%) are from "${topBiz[0]}" businesses. Consider targeted product for this segment.`,
          created_at: ts,
        });
      }
    }
  }

  // === CEO / GM / EXECUTIVE INSIGHTS ===
  if (role === "ceo" || role === "gm" || role === "admin") {
    // Portfolio overview
    const totalExposure = activeLoans.reduce((s, l) => s + Number(l.amount_approved || 0), 0);
    insights.push({
      id: makeId(), insight_type: "executive_summary",
      severity: "info",
      title: "Portfolio Snapshot",
      content: `${activeLoans.length} active loans, KES ${Math.round(totalExposure).toLocaleString()} exposure. ${pendingLoans.length} pending, ${approvedLoans.length} awaiting disbursement. Collection rate: ${collectionRate}%.`,
      created_at: ts,
    });

    // Concentration risk
    const regionLoans = new Map<string, number>();
    loans.forEach(l => {
      const branch = branches.find(b => b.id === l.branch_id);
      if (branch) {
        const region = regions.find(r => r.id === branch.region_id);
        if (region) regionLoans.set(region.name, (regionLoans.get(region.name) || 0) + 1);
      }
    });
    const topRegion = [...regionLoans.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topRegion && loans.length > 0) {
      const pct = Math.round((topRegion[1] / loans.length) * 100);
      if (pct > 40) {
        insights.push({
          id: makeId(), insight_type: "concentration_risk",
          severity: "warning",
          title: `Concentration Risk: ${topRegion[0]} at ${pct}%`,
          content: `${topRegion[0]} holds ${pct}% of total portfolio (${topRegion[1]} loans). Diversify lending across regions to reduce exposure risk.`,
          created_at: ts,
        });
      }
    }

    // PAR summary
    if (par7Count > 0) {
      insights.push({
        id: makeId(), insight_type: "par_summary",
        severity: par30Count > 5 ? "critical" : "warning",
        title: `Portfolio at Risk: ${par7Count} Overdue Loans`,
        content: `PAR>7d: ${par7Count} loans. PAR>30d: ${par30Count} loans. ${par30Count > 5 ? "Critical threshold reached — immediate management attention required." : "Monitor aging and ensure branch follow-ups are happening."}`,
        created_at: ts,
      });
    }

    // Rejection rate analysis
    if (rejectedLoans.length > 0 && loans.length > 10) {
      const rejRate = Math.round((rejectedLoans.length / loans.length) * 100);
      insights.push({
        id: makeId(), insight_type: "rejection_analysis",
        severity: rejRate > 30 ? "warning" : "info",
        title: `Rejection Rate: ${rejRate}%`,
        content: `${rejectedLoans.length} of ${loans.length} applications rejected (${rejRate}%). ${rejRate > 30 ? "High rejection may indicate overly strict criteria or poor client targeting." : "Within acceptable range. Review periodically."}`,
        created_at: ts,
      });
    }

    // Growth trend
    const thisMonth = loans.filter(l => {
      const d = new Date(l.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonth = loans.filter(l => {
      const d = new Date(l.created_at);
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    });
    if (lastMonth.length > 0) {
      const growth = Math.round(((thisMonth.length - lastMonth.length) / lastMonth.length) * 100);
      insights.push({
        id: makeId(), insight_type: "growth_trend",
        severity: growth > 0 ? "success" : "warning",
        title: `Monthly Application Trend: ${growth > 0 ? "+" : ""}${growth}%`,
        content: `${thisMonth.length} applications this month vs ${lastMonth.length} last month. ${growth > 20 ? "Strong growth — ensure capacity can handle increased volume." : growth < -10 ? "Declining trend — review marketing and outreach." : "Steady volume."}`,
        created_at: ts,
      });
    }
  }

  // No data fallback
  if (insights.length === 0) {
    insights.push({
      id: makeId(), insight_type: "status",
      severity: "info",
      title: "All Clear",
      content: "No alerts or action items at this time. Your portfolio is performing within expected parameters.",
      created_at: ts,
    });
  }

  return insights;
}
