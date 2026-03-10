import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Users, Filter, MapPin, Briefcase, AlertTriangle, CheckCircle, Clock,
  DollarSign, Tag, Download, Search
} from "lucide-react";
import { exportToCSV } from "@/lib/csv-utils";

interface LoanApp {
  id: string; full_name: string; business_type: string; financing_amount: string;
  status: string; phone: string; email: string | null; location?: string | null;
  created_at: string; branch_id: string | null;
}

interface Branch { id: string; name: string; code: string; region_id: string; }
interface Region { id: string; name: string; code: string; }

interface Props {
  loans: LoanApp[];
  repayments: any[];
  branches: Branch[];
  regions: Region[];
  profiles: { user_id: string; full_name: string | null; email: string | null; phone?: string | null; business_type?: string | null; location?: string | null; }[];
}

type SegmentTag = "overdue" | "active" | "completed" | "new_client" | "repeat" | "high_risk" | "low_risk";

const SEGMENT_DEFS: { key: SegmentTag; label: string; icon: any; color: string; desc: string }[] = [
  { key: "overdue", label: "Overdue", icon: AlertTriangle, color: "text-destructive bg-destructive/10 border-destructive/20", desc: "Clients with overdue payments" },
  { key: "active", label: "Active Loans", icon: CheckCircle, color: "text-kc-green bg-green-50 border-kc-green/20", desc: "Currently servicing a loan" },
  { key: "completed", label: "Completed", icon: DollarSign, color: "text-primary bg-primary/10 border-primary/20", desc: "Successfully completed loans" },
  { key: "new_client", label: "New (30d)", icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200", desc: "Applied in the last 30 days" },
  { key: "repeat", label: "Repeat", icon: Users, color: "text-blue-600 bg-blue-50 border-blue-200", desc: "Multiple loan applications" },
  { key: "high_risk", label: "High Risk", icon: AlertTriangle, color: "text-destructive bg-destructive/5 border-destructive/20", desc: "Risk score below 65" },
  { key: "low_risk", label: "Low Risk", icon: CheckCircle, color: "text-kc-green bg-green-50/50 border-kc-green/20", desc: "Risk score 80+" },
];

const ClientSegmentation = ({ loans, repayments, branches, regions, profiles }: Props) => {
  const [activeTags, setActiveTags] = useState<Set<SegmentTag>>(new Set());
  const [locationFilter, setLocationFilter] = useState("");
  const [businessFilter, setBusinessFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const thirtyDaysAgo = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d;
  }, []);

  // Build client data with tags
  const clientData = useMemo(() => {
    const clientMap = new Map<string, {
      name: string; phone: string; email: string; business: string; location: string;
      branch: string; statuses: string[]; tags: Set<SegmentTag>; loanCount: number;
      riskScore: number | null; overdueAmount: number;
    }>();

    loans.forEach(l => {
      const key = l.phone;
      const existing = clientMap.get(key);
      const branchName = branches.find(b => b.id === l.branch_id)?.name || "";
      const loanRepayments = repayments.filter((r: any) => r.loan_id === l.id);
      const overdueAmt = loanRepayments.filter((r: any) => r.status === "overdue").reduce((s: number, r: any) => s + Number(r.amount_due || 0) - Number(r.amount_paid || 0), 0);

      if (existing) {
        existing.statuses.push(l.status);
        existing.loanCount++;
        existing.overdueAmount += overdueAmt;
        if ((l as any).risk_score) existing.riskScore = (l as any).risk_score;
      } else {
        clientMap.set(key, {
          name: l.full_name, phone: l.phone, email: l.email || "",
          business: l.business_type, location: l.location || "",
          branch: branchName, statuses: [l.status], tags: new Set(),
          loanCount: 1, riskScore: (l as any).risk_score || null,
          overdueAmount: overdueAmt,
        });
      }
    });

    // Apply tags
    clientMap.forEach(c => {
      if (c.overdueAmount > 0) c.tags.add("overdue");
      if (c.statuses.includes("disbursed") || c.statuses.includes("approved")) c.tags.add("active");
      if (c.statuses.includes("completed")) c.tags.add("completed");
      if (c.loanCount > 1) c.tags.add("repeat");
      if (c.riskScore !== null && c.riskScore < 65) c.tags.add("high_risk");
      if (c.riskScore !== null && c.riskScore >= 80) c.tags.add("low_risk");
      // Check if any loan is recent
      const recentLoan = loans.find(l => l.phone === c.phone && new Date(l.created_at) >= thirtyDaysAgo);
      if (recentLoan) c.tags.add("new_client");
    });

    return Array.from(clientMap.values());
  }, [loans, repayments, branches, thirtyDaysAgo]);

  // Filter
  const filtered = useMemo(() => {
    return clientData.filter(c => {
      if (activeTags.size > 0 && ![...activeTags].some(t => c.tags.has(t))) return false;
      if (locationFilter && !c.location.toLowerCase().includes(locationFilter.toLowerCase())) return false;
      if (businessFilter && c.business !== businessFilter) return false;
      if (branchFilter && c.branch !== branchFilter) return false;
      if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase()) && !c.phone.includes(searchTerm)) return false;
      return true;
    });
  }, [clientData, activeTags, locationFilter, businessFilter, branchFilter, searchTerm]);

  const toggleTag = (tag: SegmentTag) => {
    setActiveTags(prev => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

  const businessTypes = useMemo(() => [...new Set(clientData.map(c => c.business).filter(Boolean))], [clientData]);
  const branchNames = useMemo(() => [...new Set(clientData.map(c => c.branch).filter(Boolean))], [clientData]);

  const handleExport = () => {
    exportToCSV(filtered.map(c => ({
      Name: c.name, Phone: c.phone, Email: c.email, Business: c.business,
      Location: c.location, Branch: c.branch, "Loan Count": c.loanCount,
      "Overdue Amount": c.overdueAmount, Tags: [...c.tags].join(", "),
    })), "client-segment-export");
    toast.success(`Exported ${filtered.length} clients`);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" /> Client Segmentation
          </h2>
          <p className="text-sm text-muted-foreground">Filter and tag clients for targeted campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-primary">{filtered.length}</span>
          <span className="text-sm text-muted-foreground">clients matched</span>
          <Button size="sm" variant="outline" onClick={handleExport} className="ml-2">
            <Download className="w-3.5 h-3.5 mr-1" /> Export
          </Button>
        </div>
      </div>

      {/* Segment Tags */}
      <div className="flex flex-wrap gap-2">
        {SEGMENT_DEFS.map(seg => {
          const count = clientData.filter(c => c.tags.has(seg.key)).length;
          const isActive = activeTags.has(seg.key);
          return (
            <button key={seg.key} onClick={() => toggleTag(seg.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                isActive ? seg.color + " ring-2 ring-offset-1 ring-current/20" : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}>
              <seg.icon className="w-3 h-3" />
              {seg.label} <span className="opacity-60">({count})</span>
            </button>
          );
        })}
        {activeTags.size > 0 && (
          <button onClick={() => setActiveTags(new Set())} className="text-xs text-muted-foreground hover:text-foreground underline px-2">
            Clear all
          </button>
        )}
      </div>

      {/* Filters Row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search name or phone..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background" />
        </div>
        <select value={businessFilter} onChange={e => setBusinessFilter(e.target.value)} className="text-sm border border-border rounded-lg px-3 py-2 bg-background">
          <option value="">All Business Types</option>
          {businessTypes.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="text-sm border border-border rounded-lg px-3 py-2 bg-background">
          <option value="">All Branches</option>
          {branchNames.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <input value={locationFilter} onChange={e => setLocationFilter(e.target.value)} placeholder="Filter by location..."
          className="text-sm border border-border rounded-lg px-3 py-2 bg-background" />
      </div>

      {/* Results Table */}
      <div className="bg-background rounded-xl shadow-card overflow-hidden border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-semibold text-foreground">Client</th>
                <th className="text-left p-3 font-semibold text-foreground hidden md:table-cell">Business</th>
                <th className="text-left p-3 font-semibold text-foreground hidden sm:table-cell">Branch</th>
                <th className="text-left p-3 font-semibold text-foreground">Loans</th>
                <th className="text-left p-3 font-semibold text-foreground hidden lg:table-cell">Overdue</th>
                <th className="text-left p-3 font-semibold text-foreground">Tags</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((c, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-3">
                    <p className="font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{c.business}</td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground">{c.branch}</td>
                  <td className="p-3 font-medium text-foreground">{c.loanCount}</td>
                  <td className="p-3 hidden lg:table-cell">
                    {c.overdueAmount > 0 ? (
                      <span className="text-destructive font-semibold">KES {c.overdueAmount.toLocaleString()}</span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {[...c.tags].map(tag => {
                        const def = SEGMENT_DEFS.find(s => s.key === tag);
                        return def ? (
                          <span key={tag} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${def.color}`}>
                            {def.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 50 && (
          <div className="p-3 text-center border-t border-border text-sm text-muted-foreground">
            Showing 50 of {filtered.length} clients
          </div>
        )}
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">No clients match the selected filters</div>
        )}
      </div>
    </div>
  );
};

export default ClientSegmentation;
