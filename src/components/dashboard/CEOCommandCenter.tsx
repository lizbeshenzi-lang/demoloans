import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Crown, TrendingUp, TrendingDown, DollarSign, Users, Building2,
  MapPin, AlertTriangle, CheckCircle, Clock, BarChart3, Target,
  Briefcase, ShieldAlert, Activity, Percent, ArrowUpRight, ArrowDownRight,
  FileText, UserCheck, Radio, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { toast } from "sonner";

interface LoanApp {
  id: string; full_name: string; business_type: string; financing_amount: string;
  status: string; risk_score: number | null; created_at: string; branch_id: string | null;
  amount_approved: number | null; loan_officer_id: string | null;
}

interface Repayment {
  loan_id: string; amount_due: number; amount_paid: number | null;
  status: string; due_date: string; week_number: number;
}

interface Branch { id: string; name: string; code: string; location: string | null; region_id: string; }
interface Region { id: string; name: string; code: string; }

interface Props {
  loans: LoanApp[];
  repayments: Repayment[];
  branches: Branch[];
  regions: Region[];
  profiles: { user_id: string; full_name: string | null }[];
  staffAssignments?: { user_id: string; branch_id: string | null; region_id: string | null }[];
  userRoles?: { user_id: string; role: string }[];
}

const CEOCommandCenter = ({ loans, repayments, branches, regions, profiles, staffAssignments = [], userRoles = [] }: Props) => {
  const [liveFeed, setLiveFeed] = useState<Array<{ id: string; loan_id: string; amount_paid: number; week_number: number; status: string; timestamp: string }>>([]);

  // Realtime subscription for all repayment updates org-wide
  useEffect(() => {
    const loanIds = new Set(loans.map(l => l.id));
    const channel = supabase
      .channel('ceo-repayments')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'loan_repayments' },
        (payload) => {
          const updated = payload.new as any;
          const old = payload.old as any;
          if (loanIds.has(updated.loan_id) && old.status !== updated.status && ['paid', 'partial'].includes(updated.status)) {
            const loan = loans.find(l => l.id === updated.loan_id);
            const branch = branches.find(b => b.id === loan?.branch_id);
            const region = regions.find(r => r.id === branch?.region_id);
            setLiveFeed(prev => [{
              id: updated.id, loan_id: updated.loan_id,
              amount_paid: Number(updated.amount_paid || 0),
              week_number: updated.week_number, status: updated.status,
              timestamp: new Date().toISOString(),
            }, ...prev].slice(0, 20));
            toast.success(`💰 ${loan?.full_name || 'Client'} @ ${branch?.name || 'Branch'}, ${region?.name || 'Region'} — KES ${Number(updated.amount_paid || 0).toLocaleString()}`);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loans, branches, regions]);

  const metrics = useMemo(() => {
    const totalPortfolio = loans.filter(l => ["approved", "disbursed", "completed"].includes(l.status))
      .reduce((s, l) => s + Number(l.amount_approved || 0), 0);
    const totalDisbursed = loans.filter(l => l.status === "disbursed")
      .reduce((s, l) => s + Number(l.amount_approved || 0), 0);
    const totalDue = repayments.reduce((s, r) => s + r.amount_due, 0);
    const totalPaid = repayments.reduce((s, r) => s + (r.amount_paid || 0), 0);
    const collectionRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;
    const overdueAmount = repayments.filter(r => r.status === "overdue")
      .reduce((s, r) => s + r.amount_due - (r.amount_paid || 0), 0);
    const parRatio = totalPortfolio > 0 ? (overdueAmount / totalPortfolio) * 100 : 0;
    const avgLoanSize = loans.length > 0
      ? loans.filter(l => l.amount_approved).reduce((s, l) => s + Number(l.amount_approved || 0), 0) / loans.filter(l => l.amount_approved).length
      : 0;
    const approvalRate = loans.filter(l => l.status !== "pending").length > 0
      ? (loans.filter(l => ["approved", "disbursed", "completed"].includes(l.status)).length / loans.filter(l => l.status !== "pending").length) * 100
      : 0;
    const uniqueClients = new Set(loans.map(l => l.full_name.toLowerCase())).size;
    const activeOfficers = new Set(loans.filter(l => l.loan_officer_id).map(l => l.loan_officer_id)).size;

    const now = Date.now();
    const d30 = 30 * 86400000;
    const recent = loans.filter(l => now - new Date(l.created_at).getTime() < d30);
    const prior = loans.filter(l => { const age = now - new Date(l.created_at).getTime(); return age >= d30 && age < d30 * 2; });
    const growthRate = prior.length > 0 ? ((recent.length - prior.length) / prior.length) * 100 : 0;

    // New clients this month
    const monthStart = new Date(); monthStart.setDate(1);
    const newClientsMonth = new Set(loans.filter(l => new Date(l.created_at) >= monthStart).map(l => l.full_name.toLowerCase())).size;

    // Portfolio growth
    const portfolioRecent = recent.filter(l => ["approved", "disbursed", "completed"].includes(l.status))
      .reduce((s, l) => s + Number(l.amount_approved || 0), 0);
    const portfolioPrior = prior.filter(l => ["approved", "disbursed", "completed"].includes(l.status))
      .reduce((s, l) => s + Number(l.amount_approved || 0), 0);
    const portfolioGrowth = portfolioPrior > 0 ? ((portfolioRecent - portfolioPrior) / portfolioPrior) * 100 : 0;

    return {
      totalPortfolio, totalDisbursed, collectionRate, overdueAmount,
      parRatio, avgLoanSize, approvalRate, uniqueClients, activeOfficers,
      growthRate, totalLoans: loans.length, pendingLoans: loans.filter(l => l.status === "pending").length,
      rejectedLoans: loans.filter(l => l.status === "rejected").length,
      recentApps: recent.length, newClientsMonth, portfolioGrowth,
    };
  }, [loans, repayments]);

  // 12-week trend data
  const trendData = useMemo(() => {
    const weeks: { week: string; collection: number; par: number; disbursed: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const weekEnd = new Date(Date.now() - i * 7 * 86400000);
      const weekStart = new Date(weekEnd.getTime() - 7 * 86400000);
      const ws = weekStart.toISOString().split("T")[0];
      const we = weekEnd.toISOString().split("T")[0];
      const weekReps = repayments.filter(r => r.due_date >= ws && r.due_date < we);
      const due = weekReps.reduce((s, r) => s + r.amount_due, 0);
      const paid = weekReps.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
      const overdue = weekReps.filter(r => r.status === "overdue").reduce((s, r) => s + r.amount_due - Number(r.amount_paid || 0), 0);
      const weekLoans = loans.filter(l => l.created_at >= ws && l.created_at < we && l.status === "disbursed");
      const disbursedAmt = weekLoans.reduce((s, l) => s + Number(l.amount_approved || 0), 0);
      weeks.push({
        week: `W${12 - i}`,
        collection: due > 0 ? Math.round((paid / due) * 100) : 0,
        par: due > 0 ? Math.round((overdue / Math.max(due, 1)) * 100 * 10) / 10 : 0,
        disbursed: Math.round(disbursedAmt / 1000),
      });
    }
    return weeks;
  }, [loans, repayments]);

  // Headcount overview
  const headcount = useMemo(() => {
    const roleCounts: Record<string, number> = {};
    userRoles.forEach(r => { roleCounts[r.role] = (roleCounts[r.role] || 0) + 1; });
    const regionStaff: Record<string, number> = {};
    regions.forEach(r => { regionStaff[r.name] = 0; });
    staffAssignments.forEach(sa => {
      if (sa.region_id) {
        const reg = regions.find(r => r.id === sa.region_id);
        if (reg) regionStaff[reg.name] = (regionStaff[reg.name] || 0) + 1;
      } else if (sa.branch_id) {
        const branch = branches.find(b => b.id === sa.branch_id);
        if (branch) {
          const reg = regions.find(r => r.id === branch.region_id);
          if (reg) regionStaff[reg.name] = (regionStaff[reg.name] || 0) + 1;
        }
      }
    });
    return { roleCounts, regionStaff, total: userRoles.length };
  }, [userRoles, staffAssignments, regions, branches]);

  // Region performance
  const regionPerf = useMemo(() => {
    return regions.map(region => {
      const regionBranches = branches.filter(b => b.region_id === region.id);
      const branchIds = new Set(regionBranches.map(b => b.id));
      const regionLoans = loans.filter(l => l.branch_id && branchIds.has(l.branch_id));
      const regionReps = repayments.filter(r => regionLoans.some(l => l.id === r.loan_id));
      const due = regionReps.reduce((s, r) => s + r.amount_due, 0);
      const paid = regionReps.reduce((s, r) => s + (r.amount_paid || 0), 0);
      const portfolio = regionLoans.filter(l => ["approved", "disbursed", "completed"].includes(l.status))
        .reduce((s, l) => s + Number(l.amount_approved || 0), 0);
      const overdue = regionReps.filter(r => r.status === "overdue").reduce((s, r) => s + r.amount_due - (r.amount_paid || 0), 0);
      return {
        ...region, branchCount: regionBranches.length, loanCount: regionLoans.length, portfolio,
        collectionRate: due > 0 ? Math.round((paid / due) * 100) : 0,
        parRatio: portfolio > 0 ? Math.round((overdue / portfolio) * 100 * 10) / 10 : 0,
        pending: regionLoans.filter(l => l.status === "pending").length,
      };
    }).sort((a, b) => b.portfolio - a.portfolio);
  }, [loans, repayments, branches, regions]);

  // Top performers
  const topOfficers = useMemo(() => {
    const officerMap = new Map<string, { loans: number; approved: number; portfolio: number }>();
    loans.forEach(l => {
      if (!l.loan_officer_id) return;
      if (!officerMap.has(l.loan_officer_id)) officerMap.set(l.loan_officer_id, { loans: 0, approved: 0, portfolio: 0 });
      const o = officerMap.get(l.loan_officer_id)!;
      o.loans++;
      if (["approved", "disbursed", "completed"].includes(l.status)) {
        o.approved++; o.portfolio += Number(l.amount_approved || 0);
      }
    });
    return Array.from(officerMap.entries())
      .map(([id, stats]) => ({ id, name: profiles.find(p => p.user_id === id)?.full_name || `Officer ${id.slice(0, 6)}`, ...stats }))
      .sort((a, b) => b.portfolio - a.portfolio).slice(0, 5);
  }, [loans, profiles]);

  // Top/bottom branches
  const branchPerf = useMemo(() => {
    return branches.map(branch => {
      const bLoans = loans.filter(l => l.branch_id === branch.id);
      const bReps = repayments.filter(r => bLoans.some(l => l.id === r.loan_id));
      const due = bReps.reduce((s, r) => s + r.amount_due, 0);
      const paid = bReps.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
      const portfolio = bLoans.filter(l => ["approved", "disbursed", "completed"].includes(l.status))
        .reduce((s, l) => s + Number(l.amount_approved || 0), 0);
      return { ...branch, portfolio, collectionRate: due > 0 ? Math.round((paid / due) * 100) : 0, loanCount: bLoans.length };
    }).sort((a, b) => b.portfolio - a.portfolio);
  }, [loans, repayments, branches]);

  const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toString();

  return (
    <div className="space-y-6">
      {/* CEO Header */}
      <div className="bg-gradient-to-r from-primary via-kc-blue-dark to-primary rounded-2xl p-6 text-primary-foreground">
        <div className="flex items-center gap-3 mb-4">
          <Crown className="w-8 h-8 text-amber-300" />
          <div>
            <h2 className="text-xl font-bold font-display">CEO Command Center</h2>
            <p className="text-primary-foreground/70 text-sm">Real-time organizational health at a glance</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-primary-foreground/10 rounded-xl p-3">
            <p className="text-2xl font-bold font-display">KES {fmt(metrics.totalPortfolio)}</p>
            <p className="text-xs text-primary-foreground/70">Total Portfolio</p>
          </div>
          <div className="bg-primary-foreground/10 rounded-xl p-3">
            <p className="text-2xl font-bold font-display">{metrics.collectionRate.toFixed(1)}%</p>
            <p className="text-xs text-primary-foreground/70">Collection Rate</p>
          </div>
          <div className="bg-primary-foreground/10 rounded-xl p-3">
            <p className="text-2xl font-bold font-display">{metrics.parRatio.toFixed(1)}%</p>
            <p className="text-xs text-primary-foreground/70">PAR (Portfolio at Risk)</p>
          </div>
          <div className="bg-primary-foreground/10 rounded-xl p-3 flex items-center gap-2">
            <div>
              <p className="text-2xl font-bold font-display">{metrics.recentApps}</p>
              <p className="text-xs text-primary-foreground/70">30-Day Apps</p>
            </div>
            {metrics.growthRate !== 0 && (
              <span className={cn("flex items-center text-xs font-bold", metrics.growthRate > 0 ? "text-green-300" : "text-red-300")}>
                {metrics.growthRate > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(metrics.growthRate).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Board Summary Card */}
      <div className="bg-background rounded-2xl p-6 shadow-card border-2 border-primary/10">
        <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" /> Board Summary
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: "Portfolio", value: `KES ${fmt(metrics.totalPortfolio)}` },
            { label: "Collection Rate", value: `${metrics.collectionRate.toFixed(1)}%` },
            { label: "PAR Ratio", value: `${metrics.parRatio.toFixed(1)}%` },
            { label: "New Clients (Month)", value: metrics.newClientsMonth.toString() },
            { label: "Portfolio Growth", value: `${metrics.portfolioGrowth >= 0 ? "+" : ""}${metrics.portfolioGrowth.toFixed(0)}%` },
          ].map((s, i) => (
            <div key={i} className="text-center p-3 bg-muted/30 rounded-xl">
              <p className="text-lg font-bold font-display text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Live Collection Feed - Org Wide */}
      {liveFeed.length > 0 && (
        <div className="bg-background rounded-xl p-5 shadow-card border-2 border-kc-green/20">
          <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
            <Radio className="w-5 h-5 text-kc-green animate-pulse" /> Live Collections — Organization Wide
            <span className="ml-auto bg-kc-green/10 text-kc-green px-2 py-0.5 rounded-full text-xs font-bold">{liveFeed.length} recent</span>
          </h3>
          <div className="grid gap-2 max-h-52 overflow-y-auto">
            {liveFeed.map((item, i) => {
              const loan = loans.find(l => l.id === item.loan_id);
              const branch = branches.find(b => b.id === loan?.branch_id);
              const region = regions.find(r => r.id === branch?.region_id);
              const ago = Math.floor((Date.now() - new Date(item.timestamp).getTime()) / 60000);
              return (
                <div key={item.id + '-' + i} className="flex items-center justify-between p-2 bg-kc-green/5 rounded-lg border border-kc-green/10">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-kc-green shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{loan?.full_name || 'Client'}</p>
                      <p className="text-xs text-muted-foreground">{branch?.name || 'Branch'} · {region?.name || 'Region'} · Wk {item.week_number}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-kc-green">KES {item.amount_paid.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{ago < 1 ? 'Just now' : `${ago}m ago`}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 12-Week Trend Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-background rounded-xl p-5 shadow-card">
          <h3 className="font-display font-bold text-foreground mb-3 text-sm">Collection Rate Trend (12 weeks)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData}>
              <defs><linearGradient id="collGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--kc-green))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--kc-green))" stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area type="monotone" dataKey="collection" stroke="hsl(var(--kc-green))" fill="url(#collGrad)" strokeWidth={2} name="Collection %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-background rounded-xl p-5 shadow-card">
          <h3 className="font-display font-bold text-foreground mb-3 text-sm">Weekly Disbursements (KES '000)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData}>
              <defs><linearGradient id="disbGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area type="monotone" dataKey="disbursed" stroke="hsl(var(--primary))" fill="url(#disbGrad)" strokeWidth={2} name="Disbursed (K)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { icon: Briefcase, label: "Total Loans", value: metrics.totalLoans, color: "text-primary" },
          { icon: DollarSign, label: "Avg Loan Size", value: `KES ${fmt(metrics.avgLoanSize)}`, color: "text-secondary" },
          { icon: Percent, label: "Approval Rate", value: `${metrics.approvalRate.toFixed(0)}%`, color: "text-kc-green" },
          { icon: Users, label: "Unique Clients", value: metrics.uniqueClients, color: "text-primary" },
          { icon: Activity, label: "Active Officers", value: metrics.activeOfficers, color: "text-amber-500" },
          { icon: Clock, label: "Pending Review", value: metrics.pendingLoans, color: "text-amber-500" },
          { icon: CheckCircle, label: "Active Portfolio", value: `KES ${fmt(metrics.totalDisbursed)}`, color: "text-kc-green" },
          { icon: AlertTriangle, label: "Overdue Amount", value: `KES ${fmt(metrics.overdueAmount)}`, color: "text-destructive" },
          { icon: Building2, label: "Total Branches", value: branches.length, color: "text-blue-500" },
          { icon: MapPin, label: "Total Regions", value: regions.length, color: "text-green-600" },
        ].map((kpi, i) => (
          <div key={i} className="bg-background rounded-xl p-4 shadow-card">
            <kpi.icon className={cn("w-5 h-5 mb-2", kpi.color)} />
            <p className="text-lg font-bold font-display text-foreground">{kpi.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Headcount Overview */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-background rounded-xl p-5 shadow-card">
          <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" /> Headcount by Role
          </h3>
          {Object.keys(headcount.roleCounts).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(headcount.roleCounts).sort((a, b) => b[1] - a[1]).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                  <span className="text-sm text-foreground capitalize">{role.replace(/_/g, " ")}</span>
                  <span className="font-bold text-foreground">{count}</span>
                </div>
              ))}
              <div className="flex items-center justify-between p-2 border-t border-border mt-2 pt-3">
                <span className="text-sm font-semibold text-foreground">Total</span>
                <span className="font-bold text-primary">{headcount.total}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No role data available</p>
          )}
        </div>

        <div className="bg-background rounded-xl p-5 shadow-card">
          <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-kc-green" /> Staff by Region
          </h3>
          {Object.keys(headcount.regionStaff).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(headcount.regionStaff).sort((a, b) => b[1] - a[1]).map(([region, count]) => (
                <div key={region} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                  <span className="text-sm text-foreground">{region}</span>
                  <span className="font-bold text-foreground">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No staff assignment data</p>
          )}
        </div>
      </div>

      {/* Regional Performance Matrix */}
      <div className="bg-background rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-foreground">Regional Performance Matrix</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left p-3 font-semibold text-foreground">Region</th>
                <th className="text-center p-3 font-semibold text-foreground">Branches</th>
                <th className="text-center p-3 font-semibold text-foreground">Loans</th>
                <th className="text-right p-3 font-semibold text-foreground">Portfolio</th>
                <th className="text-center p-3 font-semibold text-foreground">Collection</th>
                <th className="text-center p-3 font-semibold text-foreground">PAR</th>
                <th className="text-center p-3 font-semibold text-foreground">Pending</th>
              </tr>
            </thead>
            <tbody>
              {regionPerf.map(r => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-3 font-medium text-foreground">{r.name} <span className="text-xs text-muted-foreground">({r.code})</span></td>
                  <td className="p-3 text-center">{r.branchCount}</td>
                  <td className="p-3 text-center font-medium">{r.loanCount}</td>
                  <td className="p-3 text-right font-medium">KES {fmt(r.portfolio)}</td>
                  <td className="p-3 text-center">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", r.collectionRate >= 90 ? "bg-green-100 text-green-700" : r.collectionRate >= 70 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>{r.collectionRate}%</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={cn("text-xs font-bold", r.parRatio <= 5 ? "text-kc-green" : r.parRatio <= 10 ? "text-amber-500" : "text-destructive")}>{r.parRatio}%</span>
                  </td>
                  <td className="p-3 text-center">
                    {r.pending > 0 ? <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs font-bold">{r.pending}</span> : <span className="text-muted-foreground text-xs">0</span>}
                  </td>
                </tr>
              ))}
              {regionPerf.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No regional data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top/Bottom Branches + Top Officers */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="bg-background rounded-xl shadow-card p-5">
          <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-kc-green" /> Top Branches
          </h3>
          <div className="space-y-2">
            {branchPerf.slice(0, 5).map((b, i) => (
              <div key={b.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground",
                  i === 0 ? "bg-amber-400" : i === 1 ? "bg-gray-400" : "bg-primary/60"
                )}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{b.name}</p>
                  <p className="text-[10px] text-muted-foreground">{b.loanCount} loans · {b.collectionRate}% col.</p>
                </div>
                <span className="text-xs font-bold text-primary">KES {fmt(b.portfolio)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-background rounded-xl shadow-card p-5">
          <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-500" /> Top Loan Officers
          </h3>
          {topOfficers.length > 0 ? (
            <div className="space-y-2">
              {topOfficers.map((o, i) => (
                <div key={o.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                  <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground",
                    i === 0 ? "bg-amber-400" : i === 1 ? "bg-gray-400" : "bg-primary/60"
                  )}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{o.name}</p>
                    <p className="text-[10px] text-muted-foreground">{o.loans} loans · {o.approved} approved</p>
                  </div>
                  <span className="text-xs font-bold text-primary">KES {fmt(o.portfolio)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">No officer data</p>}
        </div>

        {/* Risk Summary */}
        <div className="bg-background rounded-xl shadow-card p-5">
          <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-destructive" /> Risk Summary
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg">
              <span className="text-sm text-foreground">High-risk (&lt;50)</span>
              <span className="font-bold text-destructive">{loans.filter(l => l.risk_score !== null && l.risk_score < 50).length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
              <span className="text-sm text-foreground">Medium (50-69)</span>
              <span className="font-bold text-amber-600">{loans.filter(l => l.risk_score !== null && l.risk_score >= 50 && l.risk_score < 70).length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
              <span className="text-sm text-foreground">Low-risk (70+)</span>
              <span className="font-bold text-kc-green">{loans.filter(l => l.risk_score !== null && l.risk_score >= 70).length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm text-foreground">Rejected</span>
              <span className="font-bold text-muted-foreground">{metrics.rejectedLoans}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CEOCommandCenter;
