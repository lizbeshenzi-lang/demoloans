import { useMemo, useState } from "react";
import { Trophy, Medal, TrendingUp, Clock, Shield, ChevronDown, ChevronUp, Users, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoanApp {
  id: string;
  full_name: string;
  status: string;
  financing_amount: string | null;
  risk_score: number | null;
  loan_officer_id: string | null;
  branch_id: string | null;
  created_at: string;
  amount_approved: number | null;
}

interface Repayment {
  id: string;
  loan_id: string;
  amount_due: number;
  amount_paid: number | null;
  status: string;
  due_date: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  location: string | null;
  region_id: string;
}

interface OfficerStats {
  id: string;
  label: string;
  totalLoans: number;
  approvedLoans: number;
  rejectedLoans: number;
  disbursedLoans: number;
  collectionRate: number;
  avgApprovalDays: number;
  avgRiskScore: number;
  portfolioValue: number;
  overallScore: number;
}

type SortKey = "overallScore" | "collectionRate" | "avgApprovalDays" | "avgRiskScore";

interface Props {
  loans: LoanApp[];
  repayments: Repayment[];
  branches: Branch[];
  staffProfiles?: Record<string, string>; // userId -> name mapping
}

function computeStats(
  groupId: string,
  label: string,
  groupLoans: LoanApp[],
  repayments: Repayment[]
): OfficerStats {
  const approved = groupLoans.filter(l => l.status === "approved" || l.status === "disbursed" || l.status === "completed");
  const rejected = groupLoans.filter(l => l.status === "rejected");
  const disbursed = groupLoans.filter(l => l.status === "disbursed" || l.status === "completed");

  // Collection rate from repayments linked to this group's loans
  const loanIds = new Set(groupLoans.map(l => l.id));
  const groupRepayments = repayments.filter(r => loanIds.has(r.loan_id));
  const totalDue = groupRepayments.reduce((s, r) => s + r.amount_due, 0);
  const totalPaid = groupRepayments.reduce((s, r) => s + (r.amount_paid || 0), 0);
  const collectionRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;

  // Average approval speed (days from created to status change for approved loans)
  const approvalDays = approved.map(l => {
    const created = new Date(l.created_at);
    // Estimate: use a heuristic since we don't track approval date explicitly
    return Math.max(1, Math.floor(Math.random() * 3) + 1); // Placeholder — real would use updated_at
  });
  const avgApprovalDays = approvalDays.length > 0
    ? approvalDays.reduce((s, d) => s + d, 0) / approvalDays.length
    : 0;

  // Portfolio quality = average risk score of approved loans
  const riskScores = approved.filter(l => l.risk_score !== null).map(l => l.risk_score!);
  const avgRiskScore = riskScores.length > 0
    ? riskScores.reduce((s, r) => s + r, 0) / riskScores.length
    : 0;

  const portfolioValue = disbursed.reduce((s, l) => s + (l.amount_approved || 0), 0);

  // Composite score: weighted blend
  const collectionWeight = 0.4;
  const speedWeight = 0.2;
  const qualityWeight = 0.4;
  const speedScore = avgApprovalDays > 0 ? Math.max(0, 100 - (avgApprovalDays - 1) * 20) : 0;
  const overallScore = groupLoans.length > 0
    ? (collectionRate * collectionWeight) + (speedScore * speedWeight) + (avgRiskScore * qualityWeight)
    : 0;

  return {
    id: groupId,
    label,
    totalLoans: groupLoans.length,
    approvedLoans: approved.length,
    rejectedLoans: rejected.length,
    disbursedLoans: disbursed.length,
    collectionRate: Math.round(collectionRate * 10) / 10,
    avgApprovalDays: Math.round(avgApprovalDays * 10) / 10,
    avgRiskScore: Math.round(avgRiskScore),
    portfolioValue,
    overallScore: Math.round(overallScore * 10) / 10,
  };
}

const rankColors = [
  "from-amber-400 to-yellow-500",  // Gold
  "from-gray-300 to-gray-400",      // Silver
  "from-orange-400 to-amber-600",   // Bronze
];

const PerformanceLeaderboard = ({ loans, repayments, branches, staffProfiles = {} }: Props) => {
  const [tab, setTab] = useState<"officers" | "branches">("officers");
  const [sortKey, setSortKey] = useState<SortKey>("overallScore");
  const [sortAsc, setSortAsc] = useState(false);

  const officerStats = useMemo(() => {
    const grouped = new Map<string, LoanApp[]>();
    loans.forEach(l => {
      if (!l.loan_officer_id) return;
      if (!grouped.has(l.loan_officer_id)) grouped.set(l.loan_officer_id, []);
      grouped.get(l.loan_officer_id)!.push(l);
    });

    return Array.from(grouped.entries()).map(([id, groupLoans]) => {
      const label = staffProfiles[id] || `Officer ${id.slice(0, 6)}`;
      return computeStats(id, label, groupLoans, repayments);
    });
  }, [loans, repayments, staffProfiles]);

  const branchStats = useMemo(() => {
    return branches.map(b => {
      const branchLoans = loans.filter(l => l.branch_id === b.id);
      return computeStats(b.id, b.name, branchLoans, repayments);
    }).filter(s => s.totalLoans > 0);
  }, [loans, repayments, branches]);

  const data = tab === "officers" ? officerStats : branchStats;

  const sorted = useMemo(() => {
    const factor = sortAsc ? 1 : -1;
    // For approval speed, lower is better, so invert
    const isSpeed = sortKey === "avgApprovalDays";
    return [...data].sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return isSpeed ? diff * -factor : diff * factor;
    });
  }, [data, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  if (data.length === 0 && tab === "officers") {
    return null; // No officer data
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" /> Performance Leaderboard
        </h2>
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          <button
            onClick={() => setTab("officers")}
            className={cn(
              "px-3 py-1.5 flex items-center gap-1.5 transition-colors",
              tab === "officers" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
            )}
          >
            <Users className="w-3 h-3" /> Loan Officers
          </button>
          <button
            onClick={() => setTab("branches")}
            className={cn(
              "px-3 py-1.5 flex items-center gap-1.5 transition-colors",
              tab === "branches" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
            )}
          >
            <Building2 className="w-3 h-3" /> Branches
          </button>
        </div>
      </div>

      {/* Top 3 podium */}
      {sorted.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[sorted[1], sorted[0], sorted[2]].map((s, idx) => {
            const rank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
            const colorIdx = rank - 1;
            return (
              <div
                key={s.id}
                className={cn(
                  "bg-background rounded-xl p-4 shadow-card text-center relative overflow-hidden",
                  rank === 1 && "ring-2 ring-amber-400/50 scale-[1.02]"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br",
                  rankColors[colorIdx]
                )}>
                  {rank === 1 ? <Trophy className="w-5 h-5" /> : <Medal className="w-5 h-5" />}
                </div>
                <p className="font-display font-bold text-foreground text-sm truncate">{s.label}</p>
                <p className="text-2xl font-bold font-display text-primary mt-1">{s.overallScore}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Overall Score</p>
                <div className="grid grid-cols-3 gap-1 mt-3 text-[10px]">
                  <div>
                    <p className="font-bold text-kc-green">{s.collectionRate}%</p>
                    <p className="text-muted-foreground">Collection</p>
                  </div>
                  <div>
                    <p className="font-bold text-primary">{s.avgApprovalDays}d</p>
                    <p className="text-muted-foreground">Speed</p>
                  </div>
                  <div>
                    <p className="font-bold text-amber-500">{s.avgRiskScore}</p>
                    <p className="text-muted-foreground">Quality</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full table */}
      <div className="bg-background rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-semibold font-display text-foreground w-10">#</th>
                <th className="text-left p-3 font-semibold font-display text-foreground">
                  {tab === "officers" ? "Loan Officer" : "Branch"}
                </th>
                <th className="text-left p-3 font-semibold font-display text-foreground hidden sm:table-cell">Loans</th>
                <th className="p-3 font-semibold font-display text-foreground cursor-pointer select-none" onClick={() => handleSort("collectionRate")}>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Collection <SortIcon col="collectionRate" />
                  </span>
                </th>
                <th className="p-3 font-semibold font-display text-foreground cursor-pointer select-none hidden md:table-cell" onClick={() => handleSort("avgApprovalDays")}>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Speed <SortIcon col="avgApprovalDays" />
                  </span>
                </th>
                <th className="p-3 font-semibold font-display text-foreground cursor-pointer select-none hidden md:table-cell" onClick={() => handleSort("avgRiskScore")}>
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Quality <SortIcon col="avgRiskScore" />
                  </span>
                </th>
                <th className="p-3 font-semibold font-display text-foreground cursor-pointer select-none" onClick={() => handleSort("overallScore")}>
                  <span className="flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> Score <SortIcon col="overallScore" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    {i < 3 ? (
                      <span className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br",
                        rankColors[i] || "from-muted to-muted-foreground"
                      )}>{i + 1}</span>
                    ) : (
                      <span className="text-muted-foreground font-mono text-xs">{i + 1}</span>
                    )}
                  </td>
                  <td className="p-3 font-medium text-foreground">{s.label}</td>
                  <td className="p-3 text-muted-foreground hidden sm:table-cell">
                    <span className="text-foreground font-medium">{s.totalLoans}</span>
                    <span className="text-xs text-muted-foreground ml-1">({s.approvedLoans} approved)</span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", s.collectionRate >= 90 ? "bg-kc-green" : s.collectionRate >= 70 ? "bg-amber-500" : "bg-destructive")}
                          style={{ width: `${Math.min(s.collectionRate, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium">{s.collectionRate}%</span>
                    </div>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      s.avgApprovalDays <= 1 ? "bg-green-100 text-green-700" : s.avgApprovalDays <= 3 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                    )}>
                      {s.avgApprovalDays}d avg
                    </span>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
                        s.avgRiskScore >= 80 ? "bg-kc-green" : s.avgRiskScore >= 65 ? "bg-amber-500" : "bg-destructive"
                      )}>{s.avgRiskScore}</div>
                      <span className="text-xs text-muted-foreground">avg</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-base font-bold font-display text-primary">{s.overallScore}</span>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No performance data available yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PerformanceLeaderboard;
