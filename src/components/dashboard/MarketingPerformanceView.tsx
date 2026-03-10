import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import {
  Building2, Users, TrendingUp, MapPin, FileCheck, UserCheck, AlertTriangle
} from "lucide-react";

interface Props {
  loans: any[];
  repayments: any[];
  branches: { id: string; name: string; code: string; region_id: string }[];
  regions: { id: string; name: string; code: string }[];
  kycDocs: any[];
  profiles: { user_id: string; full_name: string | null }[];
  staffAssignments: { user_id: string; branch_id: string | null; region_id: string | null }[];
  userRoles: { user_id: string; role: string }[];
}

const MarketingPerformanceView = ({ loans, repayments, branches, regions, kycDocs, profiles, staffAssignments, userRoles }: Props) => {
  // Branch performance for campaign targeting
  const branchPerformance = useMemo(() => {
    return branches.map(b => {
      const bLoans = loans.filter(l => l.branch_id === b.id);
      const bRepayments = repayments.filter((r: any) => bLoans.some(l => l.id === r.loan_id));
      const totalDue = bRepayments.reduce((s: number, r: any) => s + Number(r.amount_due || 0), 0);
      const totalPaid = bRepayments.reduce((s: number, r: any) => s + Number(r.amount_paid || 0), 0);
      const overdue = bRepayments.filter((r: any) => r.status === "overdue").length;
      const officers = staffAssignments.filter(sa => sa.branch_id === b.id).length;
      return {
        name: b.code || b.name,
        fullName: b.name,
        loans: bLoans.length,
        active: bLoans.filter(l => l.status === "disbursed").length,
        overdue,
        collection: totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0,
        officers,
      };
    }).filter(b => b.loans > 0).sort((a, b) => a.collection - b.collection);
  }, [loans, repayments, branches, staffAssignments]);

  // Regional summary
  const regionPerformance = useMemo(() => {
    return regions.map(r => {
      const rBranches = branches.filter(b => b.region_id === r.id);
      const rLoans = loans.filter(l => rBranches.some(b => b.id === l.branch_id));
      const rRepayments = repayments.filter((rep: any) => rLoans.some(l => l.id === rep.loan_id));
      const totalDue = rRepayments.reduce((s: number, rep: any) => s + Number(rep.amount_due || 0), 0);
      const totalPaid = rRepayments.reduce((s: number, rep: any) => s + Number(rep.amount_paid || 0), 0);
      const overdue = rRepayments.filter((rep: any) => rep.status === "overdue").length;
      return {
        name: r.name,
        code: r.code,
        branches: rBranches.length,
        loans: rLoans.length,
        overdue,
        collection: totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0,
      };
    }).filter(r => r.loans > 0);
  }, [loans, repayments, branches, regions]);

  // KYC pipeline
  const kycStats = useMemo(() => ({
    pending: kycDocs.filter(d => d.status === "pending").length,
    approved: kycDocs.filter(d => d.status === "approved").length,
    rejected: kycDocs.filter(d => d.status === "rejected").length,
    total: kycDocs.length,
  }), [kycDocs]);

  // Staff metrics
  const loanOfficerStats = useMemo(() => {
    const officers = userRoles.filter(ur => ur.role === "loan_officer");
    return officers.map(o => {
      const oLoans = loans.filter(l => l.loan_officer_id === o.user_id);
      const oRepayments = repayments.filter((r: any) => oLoans.some(l => l.id === r.loan_id));
      const due = oRepayments.reduce((s: number, r: any) => s + Number(r.amount_due || 0), 0);
      const paid = oRepayments.reduce((s: number, r: any) => s + Number(r.amount_paid || 0), 0);
      const profile = profiles.find(p => p.user_id === o.user_id);
      return {
        name: profile?.full_name || "Unknown",
        loans: oLoans.length,
        active: oLoans.filter(l => l.status === "disbursed").length,
        overdue: oRepayments.filter((r: any) => r.status === "overdue").length,
        collection: due > 0 ? Math.round((paid / due) * 100) : 0,
      };
    }).filter(o => o.loans > 0).sort((a, b) => a.collection - b.collection);
  }, [loans, repayments, userRoles, profiles]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Performance & Pipeline Intelligence
        </h2>
        <p className="text-sm text-muted-foreground">Branch performance, staff metrics, and KYC pipeline for campaign targeting</p>
      </div>

      {/* KYC Pipeline */}
      <div className="bg-background rounded-xl border border-border p-5">
        <h3 className="font-semibold font-display text-foreground text-sm mb-3 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-amber-500" /> KYC & Onboarding Pipeline
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div><p className="text-2xl font-bold text-foreground">{kycStats.total}</p><p className="text-xs text-muted-foreground">Total Docs</p></div>
          <div><p className="text-2xl font-bold text-amber-500">{kycStats.pending}</p><p className="text-xs text-muted-foreground">Pending Review</p></div>
          <div><p className="text-2xl font-bold text-kc-green">{kycStats.approved}</p><p className="text-xs text-muted-foreground">Approved</p></div>
          <div><p className="text-2xl font-bold text-destructive">{kycStats.rejected}</p><p className="text-xs text-muted-foreground">Rejected</p></div>
        </div>
        {kycStats.pending > 0 && (
          <p className="text-xs text-amber-600 mt-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-2">
            💡 <strong>{kycStats.pending} pending KYC docs</strong> — consider an SMS campaign to remind clients to complete their verification.
          </p>
        )}
      </div>

      {/* Branch Performance Chart */}
      <div className="bg-background rounded-xl border border-border p-5">
        <h3 className="font-semibold font-display text-foreground text-sm mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" /> Branch Collection Rates (Campaign Targeting)
        </h3>
        {branchPerformance.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={branchPerformance} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={55} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Bar dataKey="collection" fill="hsl(var(--primary))" name="Collection %" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No branch data yet</p>
        )}
        {branchPerformance.filter(b => b.collection < 50).length > 0 && (
          <p className="text-xs text-destructive mt-3 bg-destructive/5 rounded-lg p-2">
            ⚠️ <strong>{branchPerformance.filter(b => b.collection < 50).length} branches</strong> below 50% collection — priority targets for recovery campaigns.
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Regional Summary */}
        <div className="bg-background rounded-xl border border-border p-5">
          <h3 className="font-semibold font-display text-foreground text-sm mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Regional Summary
          </h3>
          <div className="space-y-2">
            {regionPerformance.map(r => (
              <div key={r.code} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.branches} branches · {r.loans} loans</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${r.collection >= 70 ? "text-kc-green" : r.collection >= 50 ? "text-amber-500" : "text-destructive"}`}>{r.collection}%</p>
                  <p className="text-xs text-muted-foreground">{r.overdue} overdue</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Loan Officer Performance */}
        <div className="bg-background rounded-xl border border-border p-5">
          <h3 className="font-semibold font-display text-foreground text-sm mb-3 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-primary" /> Loan Officer Performance
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {loanOfficerStats.map((o, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{o.name}</p>
                  <p className="text-xs text-muted-foreground">{o.loans} loans · {o.active} active</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${o.collection >= 70 ? "text-kc-green" : o.collection >= 50 ? "text-amber-500" : "text-destructive"}`}>{o.collection}%</p>
                  {o.overdue > 0 && <p className="text-xs text-destructive">{o.overdue} overdue</p>}
                </div>
              </div>
            ))}
            {loanOfficerStats.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No officer data</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketingPerformanceView;
