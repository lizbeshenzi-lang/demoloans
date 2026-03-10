import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, AlertTriangle, Eye, TrendingDown, Users } from "lucide-react";

interface LoanApp {
  id: string;
  full_name: string;
  financing_amount: string;
  status: string;
  risk_score: number | null;
  created_at: string;
  branch_id: string | null;
  loan_officer_id: string | null;
  phone: string;
  email: string | null;
  national_id?: string | null;
  business_type: string;
}

interface Repayment {
  loan_id: string;
  amount_due: number;
  amount_paid: number | null;
  status: string;
  due_date: string;
}

interface Branch {
  id: string;
  name: string;
}

interface FraudAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  entity: string;
  metric: string;
}

interface FraudDetectionPanelProps {
  loans: LoanApp[];
  repayments: Repayment[];
  branches: Branch[];
}

const FraudDetectionPanel = ({ loans, repayments, branches }: FraudDetectionPanelProps) => {
  const alerts = useMemo(() => {
    const results: FraudAlert[] = [];
    let alertId = 0;

    // 1. Duplicate National ID numbers (strongest identity fraud signal)
    const idMap = new Map<string, Set<string>>();
    loans.forEach(l => {
      if (l.national_id) {
        if (!idMap.has(l.national_id)) idMap.set(l.national_id, new Set());
        idMap.get(l.national_id)!.add(l.full_name);
      }
    });
    idMap.forEach((names, nid) => {
      if (names.size > 1) {
        results.push({
          id: `dup-id-${alertId++}`,
          severity: "critical",
          title: "Duplicate National ID — Multiple Identities",
          description: `National ID ${nid.slice(0, 3)}****${nid.slice(-2)} used by ${names.size} different names: ${Array.from(names).join(", ")}. This is a strong indicator of identity fraud.`,
          entity: "National ID",
          metric: `${names.size} names`,
        });
      }
    });

    // 2. Duplicate phone numbers with different names (identity fraud)
    const phoneMap = new Map<string, Set<string>>();
    loans.forEach(l => {
      if (!phoneMap.has(l.phone)) phoneMap.set(l.phone, new Set());
      phoneMap.get(l.phone)!.add(l.full_name);
    });
    phoneMap.forEach((names, phone) => {
      if (names.size > 1) {
        results.push({
          id: `dup-phone-${alertId++}`,
          severity: "critical",
          title: "Duplicate Phone — Multiple Identities",
          description: `Phone ${phone.slice(0, 4)}****${phone.slice(-3)} used by ${names.size} different names: ${Array.from(names).join(", ")}`,
          entity: "Identity",
          metric: `${names.size} names`,
        });
      }
    });

    // 2b. Same name but different National IDs (possible impersonation)
    const nameIdMap = new Map<string, Set<string>>();
    loans.forEach(l => {
      if (l.national_id) {
        const key = l.full_name.toLowerCase();
        if (!nameIdMap.has(key)) nameIdMap.set(key, new Set());
        nameIdMap.get(key)!.add(l.national_id);
      }
    });
    nameIdMap.forEach((ids, name) => {
      if (ids.size > 1) {
        results.push({
          id: `multi-id-${alertId++}`,
          severity: "critical",
          title: "Same Name — Multiple National IDs",
          description: `"${loans.find(l => l.full_name.toLowerCase() === name)?.full_name}" has applications with ${ids.size} different National ID numbers. Verify identity immediately.`,
          entity: "Identity",
          metric: `${ids.size} IDs`,
        });
      }
    });

    // 2. Rapid successive applications (same person, multiple pending)
    const userApps = new Map<string, LoanApp[]>();
    loans.forEach(l => {
      const key = l.full_name.toLowerCase();
      if (!userApps.has(key)) userApps.set(key, []);
      userApps.get(key)!.push(l);
    });
    userApps.forEach((apps, name) => {
      const pending = apps.filter(a => a.status === "pending");
      if (pending.length >= 2) {
        results.push({
          id: `rapid-${alertId++}`,
          severity: "warning",
          title: "Multiple Pending Applications",
          description: `${apps[0].full_name} has ${pending.length} pending loan applications simultaneously. Possible loan stacking attempt.`,
          entity: apps[0].full_name,
          metric: `${pending.length} pending`,
        });
      }
    });

    // 3. High-risk loans approved (score < 50 but approved/disbursed)
    const riskyApproved = loans.filter(l =>
      l.risk_score !== null && l.risk_score < 50 &&
      (l.status === "approved" || l.status === "disbursed")
    );
    riskyApproved.forEach(l => {
      results.push({
        id: `risk-${alertId++}`,
        severity: "critical",
        title: "High-Risk Loan Approved",
        description: `${l.full_name}'s loan (${l.financing_amount}) was ${l.status} with risk score of only ${l.risk_score}. Review for potential override abuse.`,
        entity: l.full_name,
        metric: `Score: ${l.risk_score}`,
      });
    });

    // 4. Branch anomaly — unusually high approval rates
    branches.forEach(b => {
      const bLoans = loans.filter(l => l.branch_id === b.id && l.status !== "pending");
      if (bLoans.length < 5) return;
      const approved = bLoans.filter(l => l.status === "approved" || l.status === "disbursed" || l.status === "completed").length;
      const rate = approved / bLoans.length;
      if (rate > 0.95) {
        results.push({
          id: `branch-${alertId++}`,
          severity: "warning",
          title: "Unusually High Approval Rate",
          description: `${b.name} branch has a ${Math.round(rate * 100)}% approval rate (${approved}/${bLoans.length} loans). Industry average is 70–85%. Investigate for rubber-stamping.`,
          entity: b.name,
          metric: `${Math.round(rate * 100)}%`,
        });
      }
    });

    // 5. Loan officer concentration — one officer handling too many loans
    const officerLoans = new Map<string, number>();
    loans.forEach(l => {
      if (l.loan_officer_id) {
        officerLoans.set(l.loan_officer_id, (officerLoans.get(l.loan_officer_id) || 0) + 1);
      }
    });
    const avgPerOfficer = loans.length / Math.max(officerLoans.size, 1);
    officerLoans.forEach((count, officerId) => {
      if (count > avgPerOfficer * 2 && count > 10) {
        results.push({
          id: `officer-${alertId++}`,
          severity: "info",
          title: "Loan Officer Concentration",
          description: `One loan officer is managing ${count} loans (avg: ${Math.round(avgPerOfficer)}). High concentration increases fraud risk and reduces oversight.`,
          entity: "Loan Officer",
          metric: `${count} loans`,
        });
      }
    });

    // 6. Overdue pattern — loans with 3+ consecutive missed payments
    const loanRepayments = new Map<string, Repayment[]>();
    repayments.forEach(r => {
      if (!loanRepayments.has(r.loan_id)) loanRepayments.set(r.loan_id, []);
      loanRepayments.get(r.loan_id)!.push(r);
    });
    loanRepayments.forEach((reps, loanId) => {
      const overdue = reps.filter(r => r.status === "overdue").length;
      if (overdue >= 3) {
        const loan = loans.find(l => l.id === loanId);
        if (loan) {
          results.push({
            id: `overdue-${alertId++}`,
            severity: "warning",
            title: "Serial Default Pattern",
            description: `${loan.full_name} has ${overdue} overdue payments on their loan (${loan.financing_amount}). Potential willful default or inability to repay.`,
            entity: loan.full_name,
            metric: `${overdue} overdue`,
          });
        }
      }
    });

    return results.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });
  }, [loans, repayments, branches]);

  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const warningCount = alerts.filter(a => a.severity === "warning").length;

  const getSeverityStyle = (s: string) => {
    switch (s) {
      case "critical": return "border-l-destructive bg-destructive/5";
      case "warning": return "border-l-amber-500 bg-amber-50";
      default: return "border-l-primary bg-primary/5";
    }
  };

  const getSeverityBadge = (s: string) => {
    switch (s) {
      case "critical": return "bg-destructive/10 text-destructive";
      case "warning": return "bg-amber-100 text-amber-700";
      default: return "bg-primary/10 text-primary";
    }
  };

  if (alerts.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-bold font-display text-foreground mb-3 flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-destructive" /> Fraud Detection & Anomalies
      </h2>

      {/* Summary Bar */}
      <div className="flex items-center gap-4 mb-4 bg-background rounded-xl p-3 shadow-card border border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground font-display">{criticalCount}</p>
            <p className="text-[10px] text-muted-foreground">Critical</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
            <Eye className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground font-display">{warningCount}</p>
            <p className="text-[10px] text-muted-foreground">Warnings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground font-display">{alerts.length}</p>
            <p className="text-[10px] text-muted-foreground">Total Flags</p>
          </div>
        </div>
      </div>

      {/* Alert Cards */}
      <div className="grid gap-3 md:grid-cols-2">
        {alerts.slice(0, 8).map((alert) => (
          <div key={alert.id} className={`bg-background rounded-xl p-4 border-l-4 shadow-card ${getSeverityStyle(alert.severity)}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold font-display text-foreground text-sm">{alert.title}</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide shrink-0 ${getSeverityBadge(alert.severity)}`}>
                {alert.severity}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-body leading-relaxed mb-2">{alert.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{alert.entity}</span>
              <span className="text-xs font-semibold text-foreground">{alert.metric}</span>
            </div>
          </div>
        ))}
      </div>
      {alerts.length > 8 && (
        <p className="text-center text-xs text-muted-foreground mt-3">+ {alerts.length - 8} more alerts</p>
      )}
    </div>
  );
};

export default FraudDetectionPanel;
