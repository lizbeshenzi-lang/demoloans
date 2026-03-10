import { useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell
} from "recharts";
import { TrendingUp, AlertTriangle, Users, Building2 } from "lucide-react";

interface LoanApp {
  id: string; status: string; financing_amount: string; amount_approved: number | null;
  branch_id: string | null; loan_officer_id: string | null; created_at: string;
  disbursement_date: string | null;
}

interface Repayment {
  id: string; loan_id: string; amount_due: number; amount_paid: number | null;
  status: string; due_date: string;
}

interface Branch { id: string; name: string; code: string; region_id: string; }
interface Profile { user_id: string; full_name: string | null; }

interface Props {
  loans: LoanApp[];
  repayments: Repayment[];
  branches: Branch[];
  profiles: Profile[];
}

const COLORS = {
  primary: "hsl(204, 80%, 48%)",
  green: "hsl(84, 55%, 45%)",
  amber: "hsl(38, 92%, 50%)",
  red: "hsl(0, 84%, 60%)",
};

const PerformanceAnalytics = ({ loans, repayments, branches, profiles }: Props) => {
  // PAR (Portfolio at Risk)
  const parData = useMemo(() => {
    const activeLoans = loans.filter(l => l.status === "disbursed");
    const totalOutstanding = activeLoans.reduce((s, l) => s + Number(l.amount_approved || 0), 0);

    const parBuckets = { "PAR 1-7d": 0, "PAR 8-30d": 0, "PAR 31-60d": 0, "PAR 60+d": 0 };
    const today = new Date();

    activeLoans.forEach(loan => {
      const loanRepayments = repayments.filter(r => r.loan_id === loan.id && r.status === "overdue");
      if (loanRepayments.length === 0) return;
      const oldestOverdue = loanRepayments.reduce((oldest, r) => {
        const d = new Date(r.due_date);
        return d < oldest ? d : oldest;
      }, today);
      const daysOverdue = Math.floor((today.getTime() - oldestOverdue.getTime()) / (1000 * 60 * 60 * 24));
      const amt = Number(loan.amount_approved || 0);
      if (daysOverdue <= 7) parBuckets["PAR 1-7d"] += amt;
      else if (daysOverdue <= 30) parBuckets["PAR 8-30d"] += amt;
      else if (daysOverdue <= 60) parBuckets["PAR 31-60d"] += amt;
      else parBuckets["PAR 60+d"] += amt;
    });

    return Object.entries(parBuckets).map(([name, value]) => ({
      name,
      amount: Math.round(value / 1000),
      rate: totalOutstanding > 0 ? Math.round((value / totalOutstanding) * 1000) / 10 : 0,
    }));
  }, [loans, repayments]);

  // Branch comparison
  const branchComparison = useMemo(() => {
    return branches.map(b => {
      const bLoans = loans.filter(l => l.branch_id === b.id);
      const bReps = repayments.filter(r => bLoans.some(l => l.id === r.loan_id));
      const due = bReps.reduce((s, r) => s + r.amount_due, 0);
      const paid = bReps.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
      const overdue = bReps.filter(r => r.status === "overdue").length;
      return {
        branch: b.code,
        loans: bLoans.length,
        collection: due > 0 ? Math.round((paid / due) * 100) : 0,
        overdue,
        disbursed: Math.round(bLoans.reduce((s, l) => s + Number(l.amount_approved || 0), 0) / 1000),
      };
    }).filter(b => b.loans > 0).sort((a, b) => b.collection - a.collection);
  }, [loans, repayments, branches]);

  // Officer productivity
  const officerProductivity = useMemo(() => {
    const officerMap = new Map<string, { loans: number; approved: number; disbursed: number; amount: number }>();
    loans.forEach(l => {
      if (!l.loan_officer_id) return;
      if (!officerMap.has(l.loan_officer_id)) officerMap.set(l.loan_officer_id, { loans: 0, approved: 0, disbursed: 0, amount: 0 });
      const entry = officerMap.get(l.loan_officer_id)!;
      entry.loans++;
      if (l.status === "approved" || l.status === "disbursed" || l.status === "completed") entry.approved++;
      if (l.status === "disbursed" || l.status === "completed") {
        entry.disbursed++;
        entry.amount += Number(l.amount_approved || 0);
      }
    });

    return Array.from(officerMap.entries()).map(([id, data]) => {
      const profile = profiles.find(p => p.user_id === id);
      return {
        officer: profile?.full_name?.split(" ")[0] || id.slice(0, 6),
        ...data,
        approvalRate: data.loans > 0 ? Math.round((data.approved / data.loans) * 100) : 0,
        amount: Math.round(data.amount / 1000),
      };
    }).sort((a, b) => b.disbursed - a.disbursed).slice(0, 10);
  }, [loans, profiles]);

  // Disbursement trend by week
  const disbursementTrend = useMemo(() => {
    const weekMap = new Map<string, number>();
    loans.filter(l => l.disbursement_date).forEach(l => {
      const d = new Date(l.disbursement_date!);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split("T")[0];
      weekMap.set(key, (weekMap.get(key) || 0) + Number(l.amount_approved || 0));
    });
    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([week, amount]) => ({
        week: new Date(week).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        amount: Math.round(amount / 1000),
      }));
  }, [loans]);

  const totalPAR = parData.reduce((s, d) => s + d.rate, 0);

  return (
    <div className="space-y-6">
      {/* PAR Summary Cards */}
      <div>
        <h2 className="text-lg font-bold font-display text-foreground mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" /> Portfolio at Risk (PAR)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {parData.map(d => (
            <div key={d.name} className="bg-background rounded-xl p-4 shadow-card text-center">
              <p className="text-xs text-muted-foreground font-medium">{d.name}</p>
              <p className="text-xl font-bold text-foreground mt-1">{d.rate}%</p>
              <p className="text-xs text-muted-foreground">KES {d.amount}K</p>
            </div>
          ))}
          <div className="bg-background rounded-xl p-4 shadow-card text-center border-2 border-primary/20">
            <p className="text-xs text-primary font-bold">Total PAR</p>
            <p className={`text-xl font-bold mt-1 ${totalPAR > 10 ? "text-destructive" : totalPAR > 5 ? "text-amber-500" : "text-kc-green"}`}>
              {totalPAR.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Overall</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Branch Comparison */}
        <div className="bg-background rounded-xl p-5 shadow-card">
          <h3 className="text-sm font-bold font-display text-foreground mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" /> Branch Collection Rate
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchComparison} layout="vertical" margin={{ top: 5, right: 10, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 20%, 90%)" />
                <XAxis type="number" tick={{ fontSize: 10 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="branch" tick={{ fontSize: 10 }} width={50} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v: number) => [`${v}%`, "Collection"]} />
                <Bar dataKey="collection" radius={[0, 4, 4, 0]}>
                  {branchComparison.map((entry, i) => (
                    <Cell key={i} fill={entry.collection >= 80 ? COLORS.green : entry.collection >= 60 ? COLORS.amber : COLORS.red} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Officer Productivity */}
        <div className="bg-background rounded-xl p-5 shadow-card">
          <h3 className="text-sm font-bold font-display text-foreground mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Loan Officer Productivity
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={officerProductivity} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 20%, 90%)" />
                <XAxis dataKey="officer" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="loans" fill={COLORS.primary} name="Total" radius={[4, 4, 0, 0]} />
                <Bar dataKey="disbursed" fill={COLORS.green} name="Disbursed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Disbursement Trend */}
      {disbursementTrend.length > 0 && (
        <div className="bg-background rounded-xl p-5 shadow-card">
          <h3 className="text-sm font-bold font-display text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Weekly Disbursement Trend
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={disbursementTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 20%, 90%)" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}K`} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v: number) => [`KES ${v}K`, "Disbursed"]} />
                <Line type="monotone" dataKey="amount" stroke={COLORS.primary} strokeWidth={2} dot={{ fill: COLORS.primary, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceAnalytics;
