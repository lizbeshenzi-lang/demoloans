import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  MapPin, Building2, Users, TrendingUp, AlertTriangle,
  ChevronDown, ChevronUp, Target, DollarSign, Percent, Radio, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface LoanApp {
  id: string; full_name: string; business_type: string; financing_amount: string;
  status: string; risk_score: number | null; created_at: string;
  branch_id: string | null; amount_approved: number | null; loan_officer_id: string | null;
}

interface Repayment {
  id: string; loan_id: string; amount_due: number; amount_paid: number | null;
  due_date: string; week_number: number; status: string;
}

interface Branch { id: string; name: string; code: string; location: string | null; region_id: string; }
interface Profile { user_id: string; full_name: string | null; email: string | null; }
interface StaffAssignment { user_id: string; branch_id: string | null; region_id: string | null; }

interface Props {
  regionId: string;
  regionName: string;
  loans: LoanApp[];
  repayments: Repayment[];
  branches: Branch[];
  profiles: Profile[];
  staffAssignments: StaffAssignment[];
}

const RegionalCommandView = ({ regionId, regionName, loans, repayments, branches, profiles, staffAssignments }: Props) => {
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);
  const [liveFeed, setLiveFeed] = useState<Array<{ id: string; loan_id: string; amount_paid: number; week_number: number; status: string; timestamp: string }>>([]);
  const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toLocaleString();

  const regionBranches = useMemo(() => branches.filter(b => b.region_id === regionId), [branches, regionId]);

  // Realtime subscription for repayment updates across all region branches
  useEffect(() => {
    const regionLoanIds = loans.filter(l => regionBranches.some(b => b.id === l.branch_id)).map(l => l.id);
    if (regionLoanIds.length === 0) return;

    const channel = supabase
      .channel(`region-repayments-${regionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'loan_repayments' },
        (payload) => {
          const updated = payload.new as any;
          const old = payload.old as any;
          if (regionLoanIds.includes(updated.loan_id) && old.status !== updated.status && ['paid', 'partial'].includes(updated.status)) {
            const loan = loans.find(l => l.id === updated.loan_id);
            const branch = branches.find(b => b.id === loan?.branch_id);
            setLiveFeed(prev => [{
              id: updated.id,
              loan_id: updated.loan_id,
              amount_paid: Number(updated.amount_paid || 0),
              week_number: updated.week_number,
              status: updated.status,
              timestamp: new Date().toISOString(),
            }, ...prev].slice(0, 15));
            toast.success(`💰 ${loan?.full_name || 'Client'} @ ${branch?.name || 'Branch'} — KES ${Number(updated.amount_paid || 0).toLocaleString()}`);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [regionId, loans, regionBranches, branches]);

  // Branch comparison matrix
  const branchMatrix = useMemo(() => {
    return regionBranches.map(branch => {
      const bLoans = loans.filter(l => l.branch_id === branch.id);
      const bReps = repayments.filter(r => bLoans.some(l => l.id === r.loan_id));
      const totalDue = bReps.reduce((s, r) => s + r.amount_due, 0);
      const totalPaid = bReps.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
      const portfolio = bLoans.filter(l => ["approved", "disbursed", "completed"].includes(l.status))
        .reduce((s, l) => s + Number(l.amount_approved || 0), 0);
      const overdue = bReps.filter(r => r.status === "overdue");
      const overdueAmt = overdue.reduce((s, r) => s + r.amount_due - Number(r.amount_paid || 0), 0);
      const staffCount = staffAssignments.filter(sa => sa.branch_id === branch.id).length;
      const officerIds = new Set(bLoans.filter(l => l.loan_officer_id).map(l => l.loan_officer_id));

      return {
        ...branch,
        totalLoans: bLoans.length,
        activeLoans: bLoans.filter(l => l.status === "disbursed").length,
        pending: bLoans.filter(l => l.status === "pending").length,
        portfolio,
        collectionRate: totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0,
        par: portfolio > 0 ? Math.round((overdueAmt / portfolio) * 100 * 10) / 10 : 0,
        overdueCount: overdue.length,
        staffCount,
        officerCount: officerIds.size,
      };
    }).sort((a, b) => b.portfolio - a.portfolio);
  }, [regionBranches, loans, repayments, staffAssignments]);

  // Regional aggregates
  const regionStats = useMemo(() => {
    const allReps = repayments.filter(r => loans.filter(l => regionBranches.some(b => b.id === l.branch_id)).some(l => l.id === r.loan_id));
    const regionLoans = loans.filter(l => regionBranches.some(b => b.id === l.branch_id));
    const totalDue = allReps.reduce((s, r) => s + r.amount_due, 0);
    const totalPaid = allReps.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
    const portfolio = regionLoans.filter(l => ["approved", "disbursed", "completed"].includes(l.status))
      .reduce((s, l) => s + Number(l.amount_approved || 0), 0);
    const overdueAmt = allReps.filter(r => r.status === "overdue").reduce((s, r) => s + r.amount_due - Number(r.amount_paid || 0), 0);
    const staffCount = staffAssignments.filter(sa => regionBranches.some(b => b.id === sa.branch_id) || sa.region_id === regionId).length;

    return {
      branches: regionBranches.length,
      totalLoans: regionLoans.length,
      activeLoans: regionLoans.filter(l => l.status === "disbursed").length,
      pending: regionLoans.filter(l => l.status === "pending").length,
      portfolio,
      collectionRate: totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0,
      par: portfolio > 0 ? ((overdueAmt / portfolio) * 100).toFixed(1) : "0",
      staffCount,
      overdueCount: allReps.filter(r => r.status === "overdue").length,
    };
  }, [loans, repayments, regionBranches, staffAssignments, regionId]);

  // Escalation summary
  const criticalBranches = branchMatrix.filter(b => b.par > 10 || b.collectionRate < 60);

  // Staff across branches
  const staffOverview = useMemo(() => {
    return regionBranches.map(branch => {
      const staff = staffAssignments.filter(sa => sa.branch_id === branch.id);
      return {
        branchName: branch.name,
        staff: staff.map(sa => ({
          name: profiles.find(p => p.user_id === sa.user_id)?.full_name || "Unknown",
          userId: sa.user_id,
        })),
      };
    });
  }, [regionBranches, staffAssignments, profiles]);

  return (
    <div className="space-y-6">
      {/* Regional Header */}
      <div className="bg-gradient-to-r from-primary/10 via-secondary/5 to-primary/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <MapPin className="w-7 h-7 text-primary" />
          <div>
            <h2 className="text-xl font-bold font-display text-foreground">{regionName} Region Command</h2>
            <p className="text-sm text-muted-foreground">{regionStats.branches} branches · {regionStats.staffCount} staff · {regionStats.totalLoans} loans</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Portfolio", value: `KES ${fmt(regionStats.portfolio)}`, color: "text-foreground" },
            { label: "Collection", value: `${regionStats.collectionRate}%`, color: regionStats.collectionRate >= 80 ? "text-kc-green" : "text-amber-500" },
            { label: "PAR", value: `${regionStats.par}%`, color: Number(regionStats.par) <= 5 ? "text-kc-green" : "text-destructive" },
            { label: "Active", value: regionStats.activeLoans.toString(), color: "text-primary" },
            { label: "Pending", value: regionStats.pending.toString(), color: "text-amber-500" },
          ].map((s, i) => (
            <div key={i} className="bg-background rounded-xl p-3 shadow-card text-center">
              <p className={cn("text-xl font-bold font-display", s.color)}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Live Collection Feed */}
      {liveFeed.length > 0 && (
        <div className="bg-background rounded-xl p-5 shadow-card border-2 border-kc-green/20">
          <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
            <Radio className="w-5 h-5 text-kc-green animate-pulse" /> Live Collections Across Region
            <span className="ml-auto bg-kc-green/10 text-kc-green px-2 py-0.5 rounded-full text-xs font-bold">{liveFeed.length} recent</span>
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {liveFeed.map((item, i) => {
              const loan = loans.find(l => l.id === item.loan_id);
              const branch = branches.find(b => b.id === loan?.branch_id);
              const ago = Math.floor((Date.now() - new Date(item.timestamp).getTime()) / 60000);
              return (
                <div key={item.id + '-' + i} className="flex items-center justify-between p-2 bg-kc-green/5 rounded-lg border border-kc-green/10">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-kc-green" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{loan?.full_name || 'Client'}</p>
                      <p className="text-xs text-muted-foreground">{branch?.name || 'Branch'} · Week {item.week_number} · {item.status === 'paid' ? 'Fully paid' : 'Partial'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-kc-green">KES {item.amount_paid.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{ago < 1 ? 'Just now' : `${ago}m ago`}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Branch Comparison Matrix */}
      <div className="bg-background rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-foreground">Branch Comparison Matrix</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left p-3 font-semibold text-foreground">Branch</th>
                <th className="text-center p-3 font-semibold text-foreground">Staff</th>
                <th className="text-center p-3 font-semibold text-foreground">Loans</th>
                <th className="text-right p-3 font-semibold text-foreground">Portfolio</th>
                <th className="text-center p-3 font-semibold text-foreground">Collection</th>
                <th className="text-center p-3 font-semibold text-foreground">PAR</th>
                <th className="text-center p-3 font-semibold text-foreground">Pending</th>
                <th className="text-center p-3 font-semibold text-foreground">Overdue</th>
                <th className="text-center p-3 font-semibold text-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {branchMatrix.map(b => (
                <>
                  <tr key={b.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => setExpandedBranch(expandedBranch === b.id ? null : b.id)}>
                    <td className="p-3">
                      <p className="font-medium text-foreground">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.location || b.code}</p>
                    </td>
                    <td className="p-3 text-center">{b.staffCount}</td>
                    <td className="p-3 text-center font-medium">{b.totalLoans}</td>
                    <td className="p-3 text-right font-medium">KES {fmt(b.portfolio)}</td>
                    <td className="p-3 text-center">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold",
                        b.collectionRate >= 90 ? "bg-green-100 text-green-700" :
                        b.collectionRate >= 70 ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      )}>{b.collectionRate}%</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={cn("text-xs font-bold", b.par <= 5 ? "text-kc-green" : b.par <= 10 ? "text-amber-500" : "text-destructive")}>{b.par}%</span>
                    </td>
                    <td className="p-3 text-center">
                      {b.pending > 0 ? <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs font-bold">{b.pending}</span> : "0"}
                    </td>
                    <td className="p-3 text-center">
                      {b.overdueCount > 0 ? <span className="text-destructive font-bold text-xs">{b.overdueCount}</span> : <span className="text-kc-green text-xs">0</span>}
                    </td>
                    <td className="p-3 text-center">
                      {expandedBranch === b.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </td>
                  </tr>
                  {expandedBranch === b.id && (
                    <tr key={`${b.id}-detail`}>
                      <td colSpan={9} className="p-4 bg-muted/20">
                        <div className="grid sm:grid-cols-3 gap-3">
                          <div className="bg-background rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1">Active / Total Loans</p>
                            <p className="text-lg font-bold text-foreground">{b.activeLoans} / {b.totalLoans}</p>
                          </div>
                          <div className="bg-background rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1">Officers / Staff</p>
                            <p className="text-lg font-bold text-foreground">{b.officerCount} / {b.staffCount}</p>
                          </div>
                          <div className="bg-background rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1">Avg Loan Size</p>
                            <p className="text-lg font-bold text-foreground">
                              {b.totalLoans > 0 ? `KES ${fmt(Math.round(b.portfolio / Math.max(1, b.activeLoans)))}` : "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {branchMatrix.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No branches in this region</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Escalation Summary */}
        <div className="bg-background rounded-xl p-5 shadow-card">
          <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" /> Critical Branches
          </h3>
          {criticalBranches.length > 0 ? (
            <div className="space-y-3">
              {criticalBranches.map(b => (
                <div key={b.id} className="p-3 bg-destructive/5 rounded-lg border border-destructive/10">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{b.name}</p>
                    <div className="flex gap-2">
                      {b.par > 10 && <span className="text-xs font-bold text-destructive">PAR {b.par}%</span>}
                      {b.collectionRate < 60 && <span className="text-xs font-bold text-amber-600">Col. {b.collectionRate}%</span>}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{b.overdueCount} overdue · {b.pending} pending review</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-kc-green">All branches within acceptable thresholds ✓</p>
          )}
        </div>

        {/* Staff Across Branches */}
        <div className="bg-background rounded-xl p-5 shadow-card">
          <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Staff Distribution
          </h3>
          <div className="space-y-3">
            {staffOverview.map(so => (
              <div key={so.branchName} className="p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">{so.branchName}</span>
                  <span className="text-xs text-muted-foreground">{so.staff.length} staff</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {so.staff.map(s => (
                    <span key={s.userId} className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">{s.name}</span>
                  ))}
                  {so.staff.length === 0 && <span className="text-xs text-muted-foreground">No staff assigned</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegionalCommandView;
