import { TrendingUp, TrendingDown, Shield, Lightbulb, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Repayment {
  week_number: number;
  amount_due: number;
  amount_paid: number;
  status: string;
  due_date: string;
}

interface CreditScoreDashboardProps {
  riskScore: number | null;
  repayments: Repayment[];
  totalLoans: number;
}

const CreditScoreDashboard = ({ riskScore, repayments, totalLoans }: CreditScoreDashboardProps) => {
  const score = riskScore ?? 50;
  const paidOnTime = repayments.filter(r => r.status === "paid").length;
  const totalScheduled = repayments.length;
  const repaymentRate = totalScheduled > 0 ? Math.round((paidOnTime / totalScheduled) * 100) : 0;
  const overdue = repayments.filter(r => r.status === "overdue").length;

  // Score color
  const getScoreColor = (s: number) => {
    if (s >= 70) return "text-kc-green";
    if (s >= 40) return "text-amber-500";
    return "text-destructive";
  };

  const getScoreLabel = (s: number) => {
    if (s >= 80) return "Excellent";
    if (s >= 70) return "Good";
    if (s >= 50) return "Fair";
    if (s >= 30) return "Needs Improvement";
    return "Poor";
  };

  // Gauge SVG
  const gaugeAngle = (score / 100) * 180;
  const gaugeColor = score >= 70 ? "hsl(var(--kc-green))" : score >= 40 ? "hsl(40, 90%, 50%)" : "hsl(var(--destructive))";

  // Chart data
  const chartData = repayments.slice(0, 12).map(r => ({
    name: `W${r.week_number}`,
    due: Number(r.amount_due),
    paid: Number(r.amount_paid || 0),
    status: r.status,
  }));

  // Tips
  const tips = [];
  if (overdue > 0) tips.push({ icon: TrendingDown, text: "You have overdue payments. Pay them to boost your score.", priority: "high" });
  if (repaymentRate < 80 && totalScheduled > 0) tips.push({ icon: Target, text: "Aim for 80%+ on-time payments to unlock higher loan amounts.", priority: "medium" });
  if (totalLoans <= 1) tips.push({ icon: TrendingUp, text: "Complete your first loan successfully to build credit history.", priority: "low" });
  if (repaymentRate >= 80) tips.push({ icon: Shield, text: "Great track record! You may qualify for larger loans and lower rates.", priority: "low" });
  if (tips.length === 0) tips.push({ icon: Lightbulb, text: "Keep making timely payments to maintain your excellent score.", priority: "low" });

  return (
    <div className="space-y-4">
      {/* Score Gauge */}
      <div className="bg-background rounded-xl p-6 shadow-card">
        <h3 className="font-bold font-display text-foreground text-lg mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> Your Credit Score
        </h3>

        <div className="flex flex-col items-center">
          {/* SVG Gauge */}
          <svg width="200" height="120" viewBox="0 0 200 120" className="mb-2">
            {/* Background arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="12"
              strokeLinecap="round"
            />
            {/* Score arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={gaugeColor}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${(gaugeAngle / 180) * 251.2} 251.2`}
            />
            {/* Needle */}
            <line
              x1="100"
              y1="100"
              x2={100 + 60 * Math.cos(Math.PI - (gaugeAngle * Math.PI) / 180)}
              y2={100 - 60 * Math.sin(Math.PI - (gaugeAngle * Math.PI) / 180)}
              stroke="hsl(var(--foreground))"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="100" cy="100" r="4" fill="hsl(var(--foreground))" />
          </svg>

          <p className={`text-4xl font-bold font-display ${getScoreColor(score)}`}>{score}</p>
          <p className="text-sm text-muted-foreground font-body">{getScoreLabel(score)}</p>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 w-full mt-4 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-lg font-bold font-display text-foreground">{repaymentRate}%</p>
              <p className="text-[10px] text-muted-foreground">On-time Rate</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold font-display text-foreground">{paidOnTime}/{totalScheduled}</p>
              <p className="text-[10px] text-muted-foreground">Payments Made</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold font-display text-foreground">{totalLoans}</p>
              <p className="text-[10px] text-muted-foreground">Total Loans</p>
            </div>
          </div>
        </div>
      </div>

      {/* Repayment History Chart */}
      {chartData.length > 0 && (
        <div className="bg-background rounded-xl p-6 shadow-card">
          <h3 className="font-bold font-display text-foreground text-sm mb-4">Repayment History</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barGap={2}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                formatter={(value: number) => [`KES ${value.toLocaleString()}`, ""]}
              />
              <Bar dataKey="paid" radius={[4, 4, 0, 0]} name="Paid">
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.status === "paid" ? "hsl(var(--kc-green))" : entry.status === "overdue" ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground justify-center">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-kc-green" /> Paid</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Pending</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Overdue</span>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-background rounded-xl p-5 shadow-card">
        <h3 className="font-bold font-display text-foreground text-sm mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" /> How to Improve Your Score
        </h3>
        <div className="space-y-2">
          {tips.map((tip, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-lg text-sm font-body ${
                tip.priority === "high" ? "bg-destructive/5 border border-destructive/10" :
                tip.priority === "medium" ? "bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/10" :
                "bg-primary/5 border border-primary/10"
              }`}
            >
              <tip.icon className={`w-4 h-4 mt-0.5 shrink-0 ${
                tip.priority === "high" ? "text-destructive" : tip.priority === "medium" ? "text-amber-500" : "text-primary"
              }`} />
              <span className="text-foreground">{tip.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CreditScoreDashboard;
