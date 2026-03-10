import { useMemo, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, DollarSign, Target, AlertTriangle, CheckCircle,
  TrendingUp, Clock, Building2, Percent, Radio, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface LoanApp {
  id: string; full_name: string; business_type: string; financing_amount: string;
  status: string; risk_score: number | null; created_at: string; phone: string;
  branch_id: string | null; amount_approved: number | null; loan_officer_id: string | null;
}

interface Repayment {
  id: string; loan_id: string; amount_due: number; amount_paid: number | null;
  due_date: string; week_number: number; status: string;
}

interface Profile { user_id: string; full_name: string | null; email: string | null; }
interface StaffAssignment { user_id: string; branch_id: string | null; region_id: string | null; }
interface UserRole { user_id: string; role: string; }

interface Props {
  branchId: string;
  branchName: string;
  loans: LoanApp[];
  repayments: Repayment[];
  profiles: Profile[];
  staffAssignments: StaffAssignment[];
  userRoles: UserRole[];
}

const BranchOperationsHub = ({ branchId, branchName, loans, repayments, profiles, staffAssignments, userRoles }: Props) => {
  const [liveFeed, setLiveFeed] = useState<Array<{ id: string; loan_id: string; amount_paid: number; week_number: number; status: string; timestamp: string }>>([]);
  const fmt = (n: number) => n >= 1000000 ? `KES ${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `KES ${(n / 1000).toFixed(0)}K` : `KES ${n.toLocaleString()}`;

  // Realtime subscription for repayment updates on this branch's loans
  useEffect(() => {
    const branchLoanIds = loans.filter(l => l.branch_id === branchId).map(l => l.id);
    if (branchLoanIds.length === 0) return;

    const channel = supabase
      .channel(`branch-repayments-${branchId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'loan_repayments' },
        (payload) => {
          const updated = payload.new as any;
          const old = payload.old as any;
          // Only process if it's a branch loan and status changed to paid/partial
          if (branchLoanIds.includes(updated.loan_id) && old.status !== updated.status && ['paid', 'partial'].includes(updated.status)) {
            const loan = loans.find(l => l.id === updated.loan_id);
            setLiveFeed(prev => [{
              id: updated.id,
              loan_id: updated.loan_id,
              amount_paid: Number(updated.amount_paid || 0),
              week_number: updated.week_number,
              status: updated.status,
              timestamp: new Date().toISOString(),
            }, ...prev].slice(0, 10));
            toast.success(`💰 ${loan?.full_name || 'Client'} paid KES ${Number(updated.amount_paid || 0).toLocaleString()} (Week ${updated.week_number})`);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [branchId, loans]);

  // Staff roster with performance
  const staffRoster = useMemo(() => {
    const branchStaff = staffAssignments.filter(sa => sa.branch_id === branchId);
    return branchStaff.map(sa => {
      const profile = profiles.find(p => p.user_id === sa.user_id);
      const role = userRoles.find(r => r.user_id === sa.user_id);
      const officerLoans = loans.filter(l => l.loan_officer_id === sa.user_id);
      const officerReps = repayments.filter(r => officerLoans.some(l => l.id === r.loan_id));
      const due = officerReps.reduce((s, r) => s + r.amount_due, 0);
      const paid = officerReps.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
      const collectionRate = due > 0 ? Math.round((paid / due) * 100) : 0;
      const activeLoans = officerLoans.filter(l => l.status === "disbursed").length;
      const overdue = officerReps.filter(r => r.status === "overdue").length;
      return {
        userId: sa.user_id,
        name: profile?.full_name || "Unknown Staff",
        role: role?.role || "staff",
        totalLoans: officerLoans.length,
        activeLoans,
        collectionRate,
        overdue,
        portfolio: officerLoans.filter(l => ["approved", "disbursed", "completed"].includes(l.status))
          .reduce((s, l) => s + Number(l.amount_approved || 0), 0),
      };
    }).sort((a, b) => b.portfolio - a.portfolio);
  }, [branchId, loans, repayments, profiles, staffAssignments, userRoles]);

  // Daily collections
  const dailyCollections = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const branchLoans = loans.filter(l => l.branch_id === branchId);
    const branchReps = repayments.filter(r => branchLoans.some(l => l.id === r.loan_id));
    const todayDue = branchReps.filter(r => r.due_date === today);
    const expectedToday = todayDue.reduce((s, r) => s + r.amount_due, 0);
    const collectedToday = todayDue.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
    
    // This week
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
    const ws = weekStart.toISOString().split("T")[0];
    const we = weekEnd.toISOString().split("T")[0];
    const weekDue = branchReps.filter(r => r.due_date >= ws && r.due_date <= we);
    const weekExpected = weekDue.reduce((s, r) => s + r.amount_due, 0);
    const weekCollected = weekDue.reduce((s, r) => s + Number(r.amount_paid || 0), 0);

    // Monthly
    const monthStart = new Date(); monthStart.setDate(1);
    const ms = monthStart.toISOString().split("T")[0];
    const monthDue = branchReps.filter(r => r.due_date >= ms);
    const monthExpected = monthDue.reduce((s, r) => s + r.amount_due, 0);
    const monthCollected = monthDue.reduce((s, r) => s + Number(r.amount_paid || 0), 0);

    return { expectedToday, collectedToday, weekExpected, weekCollected, monthExpected, monthCollected };
  }, [loans, repayments, branchId]);

  // Escalation queue - loans overdue 7+ days
  const escalations = useMemo(() => {
    const branchLoans = loans.filter(l => l.branch_id === branchId);
    const branchReps = repayments.filter(r => branchLoans.some(l => l.id === r.loan_id));
    return branchReps
      .filter(r => r.status === "overdue")
      .map(r => {
        const loan = branchLoans.find(l => l.id === r.loan_id);
        const daysOverdue = Math.ceil((Date.now() - new Date(r.due_date).getTime()) / 86400000);
        return { ...r, loan, daysOverdue };
      })
      .filter(e => e.daysOverdue >= 7)
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [loans, repayments, branchId]);

  // Branch-level stats
  const branchStats = useMemo(() => {
    const branchLoans = loans.filter(l => l.branch_id === branchId);
    const branchReps = repayments.filter(r => branchLoans.some(l => l.id === r.loan_id));
    const totalDue = branchReps.reduce((s, r) => s + r.amount_due, 0);
    const totalPaid = branchReps.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
    const portfolio = branchLoans.filter(l => ["approved", "disbursed", "completed"].includes(l.status))
      .reduce((s, l) => s + Number(l.amount_approved || 0), 0);
    const overdue = branchReps.filter(r => r.status === "overdue").reduce((s, r) => s + r.amount_due - Number(r.amount_paid || 0), 0);
    return {
      totalLoans: branchLoans.length,
      pending: branchLoans.filter(l => l.status === "pending").length,
      active: branchLoans.filter(l => l.status === "disbursed").length,
      portfolio,
      collectionRate: totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0,
      par: portfolio > 0 ? ((overdue / portfolio) * 100).toFixed(1) : "0",
      staffCount: staffRoster.length,
    };
  }, [loans, repayments, branchId, staffRoster]);

  return (
    <div className="space-y-6">
      {/* Branch Header */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="w-7 h-7 text-primary" />
          <div>
            <h2 className="text-xl font-bold font-display text-foreground">{branchName} Operations Hub</h2>
            <p className="text-sm text-muted-foreground">{branchStats.staffCount} staff · {branchStats.totalLoans} loans · {branchStats.active} active</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-background rounded-xl p-3 shadow-card text-center">
            <p className="text-xl font-bold font-display text-foreground">{fmt(branchStats.portfolio)}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Portfolio</p>
          </div>
          <div className="bg-background rounded-xl p-3 shadow-card text-center">
            <p className={cn("text-xl font-bold font-display", branchStats.collectionRate >= 80 ? "text-kc-green" : "text-amber-500")}>{branchStats.collectionRate}%</p>
            <p className="text-[10px] text-muted-foreground uppercase">Collection Rate</p>
          </div>
          <div className="bg-background rounded-xl p-3 shadow-card text-center">
            <p className={cn("text-xl font-bold font-display", Number(branchStats.par) <= 5 ? "text-kc-green" : "text-destructive")}>{branchStats.par}%</p>
            <p className="text-[10px] text-muted-foreground uppercase">PAR</p>
          </div>
          <div className="bg-background rounded-xl p-3 shadow-card text-center">
            <p className="text-xl font-bold font-display text-amber-500">{branchStats.pending}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Pending</p>
          </div>
        </div>
      </div>

      {/* Live Collection Feed */}
      {liveFeed.length > 0 && (
        <div className="bg-background rounded-xl p-5 shadow-card border-2 border-kc-green/20">
          <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
            <Radio className="w-5 h-5 text-kc-green animate-pulse" /> Live Collections
            <span className="ml-auto bg-kc-green/10 text-kc-green px-2 py-0.5 rounded-full text-xs font-bold">{liveFeed.length} recent</span>
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {liveFeed.map((item, i) => {
              const loan = loans.find(l => l.id === item.loan_id);
              const ago = Math.floor((Date.now() - new Date(item.timestamp).getTime()) / 60000);
              return (
                <div key={item.id + '-' + i} className="flex items-center justify-between p-2 bg-kc-green/5 rounded-lg border border-kc-green/10">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-kc-green" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{loan?.full_name || 'Client'}</p>
                      <p className="text-xs text-muted-foreground">Week {item.week_number} · {item.status === 'paid' ? 'Fully paid' : 'Partial payment'}</p>
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


      <div className="bg-background rounded-xl p-5 shadow-card">
        <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-kc-green" /> Collection Targets
        </h3>
        <div className="space-y-4">
          {[
            { label: "Today", expected: dailyCollections.expectedToday, collected: dailyCollections.collectedToday },
            { label: "This Week", expected: dailyCollections.weekExpected, collected: dailyCollections.weekCollected },
            { label: "This Month", expected: dailyCollections.monthExpected, collected: dailyCollections.monthCollected },
          ].map(t => {
            const pct = t.expected > 0 ? Math.min(100, Math.round((t.collected / t.expected) * 100)) : 0;
            return (
              <div key={t.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">{t.label}</span>
                  <span className="text-xs text-muted-foreground">{fmt(t.collected)} / {fmt(t.expected)} ({pct}%)</span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Staff Roster */}
        <div className="bg-background rounded-xl shadow-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-display font-bold text-foreground">Staff Performance</h3>
          </div>
          <div className="divide-y divide-border/50">
            {staffRoster.map((s, i) => (
              <div key={s.userId} className="p-3 flex items-center gap-3">
                <span className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground",
                  i === 0 ? "bg-amber-400" : i === 1 ? "bg-gray-400" : "bg-primary/60"
                )}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{s.role.replace(/_/g, " ")} · {s.activeLoans} active · {s.overdue} overdue</p>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-bold", s.collectionRate >= 80 ? "text-kc-green" : "text-amber-500")}>{s.collectionRate}%</p>
                  <p className="text-[10px] text-muted-foreground">{fmt(s.portfolio)}</p>
                </div>
              </div>
            ))}
            {staffRoster.length === 0 && (
              <p className="p-6 text-center text-muted-foreground text-sm">No staff assigned to this branch</p>
            )}
          </div>
        </div>

        {/* Escalation Queue */}
        <div className="bg-background rounded-xl shadow-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h3 className="font-display font-bold text-foreground">Escalation Queue</h3>
            <span className="ml-auto bg-destructive/10 text-destructive px-2 py-0.5 rounded-full text-xs font-bold">{escalations.length}</span>
          </div>
          <div className="divide-y divide-border/50 max-h-80 overflow-y-auto">
            {escalations.map(e => (
              <div key={e.id} className="p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{e.loan?.full_name}</p>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-bold",
                    e.daysOverdue >= 30 ? "bg-destructive text-destructive-foreground" :
                    e.daysOverdue >= 14 ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                  )}>{e.daysOverdue}d overdue</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">
                    KES {Number(e.amount_due - Number(e.amount_paid || 0)).toLocaleString()} owed · Wk {e.week_number}
                  </span>
                  <span className="text-xs text-muted-foreground">{e.loan?.phone}</span>
                </div>
              </div>
            ))}
            {escalations.length === 0 && (
              <p className="p-6 text-center text-kc-green text-sm">No escalations needed 🎉</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchOperationsHub;
