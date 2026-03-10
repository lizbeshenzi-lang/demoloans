import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, Plus, Pencil, Loader2, Download, ChevronLeft, ChevronRight } from "lucide-react";
import AdminCSVImport from "./AdminCSVImport";
import AdminCSVExport from "./AdminCSVExport";

type Repayment = {
  id: string;
  loan_id: string;
  week_number: number;
  amount_due: number;
  amount_paid: number | null;
  due_date: string;
  paid_date: string | null;
  status: string;
  created_at: string;
  loan_applications?: { full_name: string; phone: string; financing_amount: string | null } | null;
};

type LoanOption = { id: string; full_name: string; financing_amount: string | null };

const PAGE_SIZE = 10;

const AdminRepayments = () => {
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [loans, setLoans] = useState<LoanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Repayment | null>(null);
  const [form, setForm] = useState({ loan_id: "", week_number: 1, amount_due: "", amount_paid: "", due_date: "", paid_date: "", status: "pending" });
  const [saving, setSaving] = useState(false);

  const fetchRepayments = async () => {
    setLoading(true);
    let query = supabase
      .from("loan_repayments")
      .select("*, loan_applications(full_name, phone, financing_amount)", { count: "exact" })
      .order("due_date", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter !== "all") query = query.eq("status", statusFilter);

    const { data, count, error } = await query;
    if (error) { toast.error(error.message); setLoading(false); return; }
    setRepayments((data as Repayment[]) || []);
    setTotal(count || 0);
    setLoading(false);
  };

  const fetchLoans = async () => {
    const { data } = await supabase.from("loan_applications").select("id, full_name, financing_amount").order("created_at", { ascending: false });
    setLoans(data || []);
  };

  useEffect(() => { fetchRepayments(); }, [page, statusFilter]);
  useEffect(() => { fetchLoans(); }, []);

  const filtered = repayments.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    const name = (r.loan_applications as any)?.full_name?.toLowerCase() || "";
    return name.includes(s) || r.loan_id.includes(s) || r.status.includes(s);
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ loan_id: "", week_number: 1, amount_due: "", amount_paid: "", due_date: "", paid_date: "", status: "pending" });
    setDialogOpen(true);
  };

  const openEdit = (r: Repayment) => {
    setEditing(r);
    setForm({
      loan_id: r.loan_id,
      week_number: r.week_number,
      amount_due: String(r.amount_due),
      amount_paid: r.amount_paid != null ? String(r.amount_paid) : "",
      due_date: r.due_date,
      paid_date: r.paid_date || "",
      status: r.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.loan_id || !form.amount_due || !form.due_date) { toast.error("Loan, amount due, and due date are required"); return; }
    setSaving(true);
    const payload = {
      loan_id: form.loan_id,
      week_number: form.week_number,
      amount_due: parseFloat(form.amount_due),
      amount_paid: form.amount_paid ? parseFloat(form.amount_paid) : 0,
      due_date: form.due_date,
      paid_date: form.paid_date || null,
      status: form.status,
    };

    if (editing) {
      const { error } = await supabase.from("loan_repayments").update(payload).eq("id", editing.id);
      if (error) toast.error(error.message); else { toast.success("Repayment updated"); setDialogOpen(false); fetchRepayments(); }
    } else {
      const { error } = await supabase.from("loan_repayments").insert(payload);
      if (error) toast.error(error.message); else { toast.success("Repayment recorded"); setDialogOpen(false); fetchRepayments(); }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this repayment record?")) return;
    const { error } = await supabase.from("loan_repayments").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); fetchRepayments(); }
  };

  const exportCSV = () => {
    const rows = filtered.map(r => ({
      Client: (r.loan_applications as any)?.full_name || "",
      Week: r.week_number,
      "Amount Due": r.amount_due,
      "Amount Paid": r.amount_paid ?? 0,
      "Due Date": r.due_date,
      "Paid Date": r.paid_date || "",
      Status: r.status,
    }));
    const header = Object.keys(rows[0] || {}).join(",");
    const csv = [header, ...rows.map(r => Object.values(r).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "repayments.csv"; a.click();
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "paid": return "bg-green-100 text-green-800";
      case "overdue": return "bg-destructive/10 text-destructive";
      case "partial": return "bg-amber-100 text-amber-800";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search client..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <AdminCSVExport target="loan_repayments" />
          <AdminCSVImport target="loan_repayments" onComplete={fetchRepayments} />
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-3 h-3 mr-1.5" />CSV</Button>
          <Button size="sm" onClick={openCreate}><Plus className="w-3 h-3 mr-1.5" />Record Payment</Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No repayment records found.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Week</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Due</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Paid</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Due Date</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium text-foreground">{(r.loan_applications as any)?.full_name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{r.week_number}</td>
                  <td className="p-3 text-foreground">KES {Number(r.amount_due).toLocaleString()}</td>
                  <td className="p-3 text-foreground">KES {Number(r.amount_paid ?? 0).toLocaleString()}</td>
                  <td className="p-3 text-muted-foreground">{r.due_date}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(r.status)}`}>{r.status}</span></td>
                  <td className="p-3 text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(r.id)}>✕</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages} ({total} records)</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-3 h-3" /></Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-3 h-3" /></Button>
          </div>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Repayment" : "Record Payment"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Loan *</Label>
              <Select value={form.loan_id} onValueChange={v => setForm(f => ({ ...f, loan_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select loan" /></SelectTrigger>
                <SelectContent>
                  {loans.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.full_name} — {l.financing_amount || "N/A"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Week #</Label><Input type="number" min={1} value={form.week_number} onChange={e => setForm(f => ({ ...f, week_number: parseInt(e.target.value) || 1 }))} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount Due *</Label><Input type="number" value={form.amount_due} onChange={e => setForm(f => ({ ...f, amount_due: e.target.value }))} /></div>
              <div><Label>Amount Paid</Label><Input type="number" value={form.amount_paid} onChange={e => setForm(f => ({ ...f, amount_paid: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Due Date *</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
              <div><Label>Paid Date</Label><Input type="date" value={form.paid_date} onChange={e => setForm(f => ({ ...f, paid_date: e.target.value }))} /></div>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}{editing ? "Update" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRepayments;
