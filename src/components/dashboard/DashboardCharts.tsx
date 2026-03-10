import { useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { BarChart3, TrendingUp, PieChart as PieIcon } from "lucide-react";

interface LoanApp {
  id: string;
  full_name: string;
  business_type: string;
  financing_amount: string;
  status: string;
  risk_score: number | null;
  created_at: string;
  branch_id: string | null;
  product_id: string | null;
}

interface Repayment {
  id: string;
  loan_id: string;
  amount_due: number;
  amount_paid: number | null;
  due_date: string;
  status: string;
  week_number: number;
}

interface DashboardChartsProps {
  loans: LoanApp[];
  repayments: Repayment[];
  role: string | null;
}

const CHART_COLORS = {
  primary: "hsl(204, 80%, 48%)",
  green: "hsl(84, 55%, 45%)",
  amber: "hsl(38, 92%, 50%)",
  red: "hsl(0, 84%, 60%)",
  blue: "hsl(204, 80%, 58%)",
  navy: "hsl(210, 40%, 25%)",
};

const STATUS_COLORS: Record<string, string> = {
  pending: CHART_COLORS.amber,
  approved: CHART_COLORS.blue,
  disbursed: CHART_COLORS.green,
  completed: CHART_COLORS.navy,
  rejected: CHART_COLORS.red,
};

const DashboardCharts = ({ loans, repayments, role }: DashboardChartsProps) => {
  // Monthly disbursement trends
  const disbursementTrend = useMemo(() => {
    const monthMap = new Map<string, { disbursed: number; count: number; cumulative: number }>();
    const sorted = [...loans]
      .filter(l => l.status !== "rejected")
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    let cumulative = 0;
    sorted.forEach(loan => {
      const d = new Date(loan.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const amt = parseFloat((loan.financing_amount || "0").replace(/[^0-9.]/g, "")) || 0;
      if (!monthMap.has(key)) monthMap.set(key, { disbursed: 0, count: 0, cumulative: 0 });
      const entry = monthMap.get(key)!;
      entry.disbursed += amt;
      entry.count += 1;
      cumulative += amt;
      entry.cumulative = cumulative;
    });

    return Array.from(monthMap.entries()).map(([month, data]) => ({
      month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      disbursed: Math.round(data.disbursed / 1000),
      loans: data.count,
      portfolio: Math.round(data.cumulative / 1000),
    }));
  }, [loans]);

  // Repayment rate by week
  const repaymentRate = useMemo(() => {
    if (repayments.length === 0) return [];
    const weekMap = new Map<number, { due: number; paid: number }>();
    repayments.forEach(r => {
      if (!weekMap.has(r.week_number)) weekMap.set(r.week_number, { due: 0, paid: 0 });
      const entry = weekMap.get(r.week_number)!;
      entry.due += r.amount_due;
      entry.paid += (r.amount_paid || 0);
    });
    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a - b)
      .slice(0, 12)
      .map(([week, data]) => ({
        week: `W${week}`,
        rate: data.due > 0 ? Math.round((data.paid / data.due) * 100) : 0,
        collected: Math.round(data.paid / 1000),
        due: Math.round(data.due / 1000),
      }));
  }, [repayments]);

  // Status distribution pie
  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    loans.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: STATUS_COLORS[status] || CHART_COLORS.primary,
    }));
  }, [loans]);

  // Risk distribution for managers+
  const riskDistribution = useMemo(() => {
    const buckets = { "High (80+)": 0, "Medium (65-79)": 0, "Low (<65)": 0, "Unscored": 0 };
    loans.forEach(l => {
      if (!l.risk_score) buckets["Unscored"]++;
      else if (l.risk_score >= 80) buckets["High (80+)"]++;
      else if (l.risk_score >= 65) buckets["Medium (65-79)"]++;
      else buckets["Low (<65)"]++;
    });
    return Object.entries(buckets)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name,
        value,
        color: name.startsWith("High") ? CHART_COLORS.green
          : name.startsWith("Medium") ? CHART_COLORS.amber
          : name.startsWith("Low") ? CHART_COLORS.red : CHART_COLORS.blue,
      }));
  }, [loans]);

  const isExecutive = role === "ceo" || role === "gm" || role === "regional_manager";

  return (
    <div className="space-y-6">
      {/* Row 1: Disbursement Trend + Portfolio Growth */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Disbursement Trend */}
        <div className="bg-background rounded-xl p-5 shadow-card">
          <h3 className="text-sm font-bold font-display text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Loan Disbursement Trend
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={disbursementTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 20%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(210, 15%, 46%)" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(210, 15%, 46%)" }} tickFormatter={v => `${v}K`} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid hsl(210, 20%, 90%)", fontSize: 12 }}
                  formatter={(value: number, name: string) => [
                    `KES ${value}K`,
                    name === "disbursed" ? "Disbursed" : "Loans"
                  ]}
                />
                <Bar dataKey="disbursed" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} name="disbursed" />
                <Bar dataKey="loans" fill={CHART_COLORS.green} radius={[4, 4, 0, 0]} name="loans" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Portfolio Growth */}
        <div className="bg-background rounded-xl p-5 shadow-card">
          <h3 className="text-sm font-bold font-display text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Portfolio Growth (Cumulative)
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={disbursementTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 20%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(210, 15%, 46%)" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(210, 15%, 46%)" }} tickFormatter={v => `${v}K`} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid hsl(210, 20%, 90%)", fontSize: 12 }}
                  formatter={(value: number) => [`KES ${value}K`, "Portfolio"]}
                />
                <Area type="monotone" dataKey="portfolio" stroke={CHART_COLORS.primary} fill="url(#portfolioGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Repayment Rate + Status/Risk Pies */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Repayment Rate */}
        {repaymentRate.length > 0 && (
          <div className="bg-background rounded-xl p-5 shadow-card lg:col-span-1">
            <h3 className="text-sm font-bold font-display text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Repayment Rate by Week
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={repaymentRate} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 20%, 90%)" />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: "hsl(210, 15%, 46%)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(210, 15%, 46%)" }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: "1px solid hsl(210, 20%, 90%)", fontSize: 12 }}
                    formatter={(value: number, name: string) => [
                      name === "rate" ? `${value}%` : `KES ${value}K`,
                      name === "rate" ? "Collection Rate" : name === "collected" ? "Collected" : "Due"
                    ]}
                  />
                  <Bar dataKey="rate" fill={CHART_COLORS.green} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Status Distribution */}
        <div className="bg-background rounded-xl p-5 shadow-card">
          <h3 className="text-sm font-bold font-display text-foreground mb-4 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-primary" /> Loan Status Distribution
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                  {statusDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(value: number) => [value, "Loans"]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution (managers+) */}
        {isExecutive && (
          <div className="bg-background rounded-xl p-5 shadow-card">
            <h3 className="text-sm font-bold font-display text-foreground mb-4 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-primary" /> Risk Score Distribution
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                    {riskDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(value: number) => [value, "Loans"]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardCharts;
