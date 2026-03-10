import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, Loader2, CheckCircle, XCircle, Download } from "lucide-react";
import AdminCSVImport from "./AdminCSVImport";
import TablePagination from "./TablePagination";

interface LoanApp {
  id: string; full_name: string; phone: string; email: string | null;
  national_id: string | null;
  business_type: string; location: string | null; financing_amount: string | null;
  status: string; risk_score: number | null; created_at: string;
  branch_id: string | null; product_id: string | null; loan_officer_id: string | null;
  amount_approved: number | null;
}

interface Stats { total: number; pending: number; approved: number; disbursed: number; rejected: number; completed: number; }

const PAGE_SIZE = 20;

const AdminLoans = () => {
  const [loans, setLoans] = useState<LoanApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, disbursed: 0, rejected: 0, completed: 0 });

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  // Fetch stats once (lightweight)
  const fetchStats = useCallback(async () => {
    const { count: total } = await supabase.from("loan_applications").select("*", { count: "exact", head: true });
    const { count: pending } = await supabase.from("loan_applications").select("*", { count: "exact", head: true }).eq("status", "pending");
    const { count: approved } = await supabase.from("loan_applications").select("*", { count: "exact", head: true }).eq("status", "approved");
    const { count: disbursed } = await supabase.from("loan_applications").select("*", { count: "exact", head: true }).eq("status", "disbursed");
    const { count: rejected } = await supabase.from("loan_applications").select("*", { count: "exact", head: true }).eq("status", "rejected");
    const { count: completed } = await supabase.from("loan_applications").select("*", { count: "exact", head: true }).eq("status", "completed");
    setStats({ total: total || 0, pending: pending || 0, approved: approved || 0, disbursed: disbursed || 0, rejected: rejected || 0, completed: completed || 0 });
  }, []);

  // Fetch page data (server-side)
  const fetchPage = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("loan_applications")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (debouncedSearch) {
      query = query.or(`full_name.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,national_id.ilike.%${debouncedSearch}%`);
    }

    const { data, count, error } = await query;
    if (error) { toast.error(error.message); setLoading(false); return; }
    setLoans(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [page, statusFilter, debouncedSearch]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchPage(); }, [fetchPage]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    const update: Record<string, any> = { status };
    if (status === "approved") {
      const loan = loans.find(l => l.id === id);
      if (loan?.financing_amount) update.amount_approved = parseFloat(loan.financing_amount.replace(/[^0-9.]/g, "")) || 0;
    }
    const { error } = await supabase.from("loan_applications").update(update).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(`Loan ${status}`); fetchPage(); fetchStats(); }
    setUpdating(null);
  };

  const exportCSV = async () => {
    toast.info("Exporting all matching loans...");
    let query = supabase.from("loan_applications").select("full_name,phone,email,national_id,business_type,financing_amount,status,risk_score,created_at").order("created_at", { ascending: false });
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (debouncedSearch) query = query.or(`full_name.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,national_id.ilike.%${debouncedSearch}%`);

    const { data } = await query;
    if (!data || data.length === 0) { toast.error("No data to export"); return; }

    const headers = ["Name", "Phone", "Email", "ID Number", "Business", "Amount", "Status", "Risk Score", "Date"];
    const csv = [headers.join(","), ...data.map((l: any) => [
      `"${l.full_name}"`, `"${l.phone}"`, `"${l.email || ""}"`, `"${l.national_id || ""}"`, `"${l.business_type}"`,
      `"${l.financing_amount || ""}"`, `"${l.status}"`, l.risk_score || "", new Date(l.created_at).toLocaleDateString()
    ].join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `loans-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success(`Exported ${data.length} records`);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const badge = (s: string) => {
    const m: Record<string, string> = { pending: "bg-amber-100 text-amber-800", approved: "bg-blue-100 text-blue-800", disbursed: "bg-green-100 text-green-800", completed: "bg-secondary/20 text-secondary", rejected: "bg-destructive/10 text-destructive" };
    return m[s] || m.pending;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search loans..." className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border border-border rounded-lg px-3 py-2 bg-background">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="disbursed">Disbursed</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
          <AdminCSVImport target="loan_applications" onComplete={() => { fetchPage(); fetchStats(); }} />
          <Button size="sm" variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-1" /> CSV</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {[
          { label: "Total", val: stats.total, color: "text-foreground", filter: "all" },
          { label: "Pending", val: stats.pending, color: "text-amber-600", filter: "pending" },
          { label: "Approved", val: stats.approved, color: "text-blue-600", filter: "approved" },
          { label: "Disbursed", val: stats.disbursed, color: "text-green-600", filter: "disbursed" },
          { label: "Completed", val: stats.completed, color: "text-secondary", filter: "completed" },
          { label: "Rejected", val: stats.rejected, color: "text-destructive", filter: "rejected" },
        ].map(s => (
          <div key={s.label} className={`bg-background rounded-lg p-3 shadow-card text-center cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all ${statusFilter === s.filter ? "ring-2 ring-primary" : ""}`} onClick={() => setStatusFilter(s.filter)}>
            <p className={`text-xl font-bold font-display ${s.color}`}>{s.val}</p>
            <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-background rounded-xl shadow-card overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <table className="w-full text-sm">
             <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3 font-semibold text-foreground">Applicant</th>
              <th className="text-left p-3 font-semibold text-foreground hidden lg:table-cell">ID Number</th>
              <th className="text-left p-3 font-semibold text-foreground hidden md:table-cell">Business</th>
              <th className="text-left p-3 font-semibold text-foreground">Amount</th>
              <th className="text-left p-3 font-semibold text-foreground hidden sm:table-cell">Risk</th>
              <th className="text-left p-3 font-semibold text-foreground">Status</th>
              <th className="text-right p-3 font-semibold text-foreground">Actions</th>
            </tr></thead>
            <tbody>
              {loans.map(l => (
                <tr key={l.id} className="border-b border-border/50 hover:bg-muted/30">
                   <td className="p-3">
                    <p className="font-medium text-foreground">{l.full_name}</p>
                    <p className="text-xs text-muted-foreground">{l.phone}</p>
                  </td>
                  <td className="p-3 hidden lg:table-cell">
                    <span className="text-xs font-mono text-muted-foreground">{l.national_id || "—"}</span>
                  </td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{l.business_type}</td>
                  <td className="p-3 font-medium">{l.financing_amount || "—"}</td>
                  <td className="p-3 hidden sm:table-cell">
                    {l.risk_score ? (
                      <span className={`inline-flex w-7 h-7 rounded-full text-xs font-bold text-primary-foreground items-center justify-center ${l.risk_score >= 80 ? "bg-secondary" : l.risk_score >= 65 ? "bg-amber-500" : "bg-destructive"}`}>{l.risk_score}</span>
                    ) : "—"}
                  </td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${badge(l.status)}`}>{l.status}</span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {l.status === "pending" && (
                        <>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-secondary/50 text-secondary hover:bg-secondary hover:text-secondary-foreground" disabled={updating === l.id} onClick={() => updateStatus(l.id, "approved")}>
                            {updating === l.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground" disabled={updating === l.id} onClick={() => updateStatus(l.id, "rejected")}>
                            {updating === l.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                          </Button>
                        </>
                      )}
                      {l.status === "approved" && (
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={updating === l.id} onClick={() => updateStatus(l.id, "disbursed")}>Disburse</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {loans.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No loans found</td></tr>}
            </tbody>
          </table>
        )}
        <TablePagination page={page} totalPages={totalPages} totalItems={totalCount} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>
    </div>
  );
};

export default AdminLoans;
