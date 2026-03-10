import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, FileText, BarChart3, TrendingUp } from "lucide-react";
import { exportToCSV } from "@/lib/csv-utils";

interface Props {
  loans: any[];
  repayments: any[];
  branches: { id: string; name: string; code: string; region_id: string }[];
  regions: { id: string; name: string; code: string }[];
  campaigns: { id: string; name: string; campaign_type: string; total_sent: number; total_delivered: number; total_failed: number; status: string; created_at: string }[];
}

const MarketingReports = ({ loans, repayments, branches, regions, campaigns }: Props) => {
  const [generating, setGenerating] = useState<string | null>(null);

  const branchData = useMemo(() => branches.map(b => {
    const bLoans = loans.filter(l => l.branch_id === b.id);
    const bRep = repayments.filter((r: any) => bLoans.some(l => l.id === r.loan_id));
    const due = bRep.reduce((s: number, r: any) => s + Number(r.amount_due || 0), 0);
    const paid = bRep.reduce((s: number, r: any) => s + Number(r.amount_paid || 0), 0);
    const overdue = bRep.filter((r: any) => r.status === "overdue").length;
    const region = regions.find(r => r.id === b.region_id);
    return {
      Branch: b.name, Code: b.code, Region: region?.name || "",
      "Total Loans": bLoans.length,
      Active: bLoans.filter(l => l.status === "disbursed").length,
      Pending: bLoans.filter(l => l.status === "pending").length,
      Overdue: overdue,
      "Total Due": due, "Total Paid": paid,
      "Collection %": due > 0 ? Math.round((paid / due) * 100) : 0,
    };
  }).filter(b => b["Total Loans"] > 0), [loans, repayments, branches, regions]);

  const campaignData = useMemo(() => campaigns.map(c => ({
    Campaign: c.name,
    Type: c.campaign_type,
    Status: c.status,
    Sent: c.total_sent,
    Delivered: c.total_delivered,
    Failed: c.total_failed,
    "Delivery %": c.total_sent > 0 ? Math.round((c.total_delivered / c.total_sent) * 100) : 0,
    Date: new Date(c.created_at).toLocaleDateString(),
  })), [campaigns]);

  const overdueData = useMemo(() => {
    const overdueLoans = loans.filter(l => l.status === "disbursed");
    return overdueLoans.map(l => {
      const lRep = repayments.filter((r: any) => r.loan_id === l.id);
      const overdueRep = lRep.filter((r: any) => r.status === "overdue");
      const overdueAmt = overdueRep.reduce((s: number, r: any) => s + Number(r.amount_due || 0) - Number(r.amount_paid || 0), 0);
      return {
        Client: l.full_name, Phone: l.phone, Business: l.business_type,
        "Loan Amount": l.financing_amount, "Overdue Payments": overdueRep.length,
        "Overdue Amount": overdueAmt,
        Branch: branches.find(b => b.id === l.branch_id)?.name || "",
      };
    }).filter(d => d["Overdue Payments"] > 0);
  }, [loans, repayments, branches]);

  const handleExport = async (type: string) => {
    setGenerating(type);
    try {
      switch (type) {
        case "branch":
          exportToCSV(branchData, "branch-performance-report");
          break;
        case "campaign":
          exportToCSV(campaignData, "campaign-performance-report");
          break;
        case "overdue":
          exportToCSV(overdueData, "recovery-target-list");
          break;
        case "full": {
          // Generate a comprehensive text report
          const lines = [
            "═══════════════════════════════════════════════════════",
            "   KECHITA CAPITAL — MARKETING INTELLIGENCE REPORT",
            `   Generated: ${new Date().toLocaleString()}`,
            "═══════════════════════════════════════════════════════",
            "",
            "📊 PORTFOLIO SUMMARY",
            `   Total Loans: ${loans.length}`,
            `   Active: ${loans.filter(l => l.status === "disbursed").length}`,
            `   Pending: ${loans.filter(l => l.status === "pending").length}`,
            `   Overdue Payments: ${repayments.filter((r: any) => r.status === "overdue").length}`,
            "",
            "📱 CAMPAIGN SUMMARY",
            `   Total Campaigns: ${campaigns.length}`,
            `   Total Sent: ${campaigns.reduce((s, c) => s + c.total_sent, 0)}`,
            `   Total Delivered: ${campaigns.reduce((s, c) => s + c.total_delivered, 0)}`,
            `   Overall Delivery Rate: ${campaigns.reduce((s, c) => s + c.total_sent, 0) > 0 ? Math.round((campaigns.reduce((s, c) => s + c.total_delivered, 0) / campaigns.reduce((s, c) => s + c.total_sent, 0)) * 100) : 0}%`,
            "",
            "🏢 BRANCH COLLECTION RATES",
            ...branchData.map(b => `   ${b.Branch}: ${b["Collection %"]}% (${b.Overdue} overdue)`),
            "",
            "⚠️ RECOVERY TARGETS",
            `   ${overdueData.length} clients with overdue payments`,
            `   Total overdue amount: KES ${overdueData.reduce((s, d) => s + d["Overdue Amount"], 0).toLocaleString()}`,
            "",
            "═══════════════════════════════════════════════════════",
          ];
          const blob = new Blob([lines.join("\n")], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = "marketing-intelligence-report.txt"; a.click();
          URL.revokeObjectURL(url);
          break;
        }
      }
      toast.success("Report exported successfully");
    } catch {
      toast.error("Export failed");
    }
    setGenerating(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" /> Marketing Reports & Exports
        </h2>
        <p className="text-sm text-muted-foreground">Export campaign analytics, branch performance, and recovery target lists</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ReportCard
          icon={<BarChart3 className="w-6 h-6 text-primary" />}
          title="Branch Performance Report"
          desc={`${branchData.length} branches with collection rates, overdue counts, and portfolio data`}
          onExport={() => handleExport("branch")}
          loading={generating === "branch"}
        />
        <ReportCard
          icon={<TrendingUp className="w-6 h-6 text-kc-green" />}
          title="Campaign Performance Report"
          desc={`${campaignData.length} campaigns with delivery rates, sent/failed breakdowns`}
          onExport={() => handleExport("campaign")}
          loading={generating === "campaign"}
        />
        <ReportCard
          icon={<Download className="w-6 h-6 text-destructive" />}
          title="Recovery Target List"
          desc={`${overdueData.length} clients with overdue payments — ready for recovery campaigns`}
          onExport={() => handleExport("overdue")}
          loading={generating === "overdue"}
        />
        <ReportCard
          icon={<FileText className="w-6 h-6 text-amber-500" />}
          title="Full Intelligence Report"
          desc="Comprehensive text report combining portfolio, campaigns, and recovery data"
          onExport={() => handleExport("full")}
          loading={generating === "full"}
        />
      </div>

      {/* Quick Stats */}
      <div className="bg-background rounded-xl border border-border p-5">
        <h3 className="font-semibold font-display text-foreground text-sm mb-3">Report Data Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div><p className="text-xl font-bold text-foreground">{branches.length}</p><p className="text-xs text-muted-foreground">Branches</p></div>
          <div><p className="text-xl font-bold text-primary">{campaigns.length}</p><p className="text-xs text-muted-foreground">Campaigns</p></div>
          <div><p className="text-xl font-bold text-destructive">{overdueData.length}</p><p className="text-xs text-muted-foreground">Recovery Targets</p></div>
          <div><p className="text-xl font-bold text-kc-green">KES {(overdueData.reduce((s, d) => s + d["Overdue Amount"], 0) / 1000).toFixed(0)}K</p><p className="text-xs text-muted-foreground">Overdue Amount</p></div>
        </div>
      </div>
    </div>
  );
};

const ReportCard = ({ icon, title, desc, onExport, loading }: {
  icon: React.ReactNode; title: string; desc: string; onExport: () => void; loading: boolean;
}) => (
  <div className="bg-background rounded-xl border border-border p-5 flex flex-col justify-between">
    <div>
      <div className="mb-3">{icon}</div>
      <h3 className="font-semibold font-display text-foreground text-sm">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
    </div>
    <Button size="sm" variant="outline" className="mt-4 w-full" onClick={onExport} disabled={loading}>
      <Download className="w-3.5 h-3.5 mr-1" /> {loading ? "Generating..." : "Export CSV"}
    </Button>
  </div>
);

export default MarketingReports;
