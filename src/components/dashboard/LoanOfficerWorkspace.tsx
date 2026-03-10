import { useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardList, DollarSign, AlertTriangle, CheckCircle, Users,
  TrendingUp, Eye, X, StickyNote, Loader2, CalendarDays, Percent
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LoanApp {
  id: string; full_name: string; business_type: string; financing_amount: string;
  status: string; risk_score: number | null; created_at: string; phone: string;
  branch_id: string | null; amount_approved: number | null; loan_officer_id: string | null;
  email: string | null;
}

interface Repayment {
  id: string; loan_id: string; amount_due: number; amount_paid: number | null;
  due_date: string; week_number: number; status: string; paid_date: string | null;
}

interface Props {
  userId: string;
  loans: LoanApp[];
  repayments: Repayment[];
  onUpdate: () => void;
}

const LoanOfficerWorkspace = ({ userId, loans, repayments, onUpdate }: Props) => {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payRef, setPayRef] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [fieldNote, setFieldNote] = useState("");
  const [noteLoanId, setNoteLoanId] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  // My portfolio health
  const health = useMemo(() => {
    const myLoans = loans.filter(l => l.loan_officer_id === userId);
    const activeLoans = myLoans.filter(l => l.status === "disbursed");
    const myReps = repayments.filter(r => myLoans.some(l => l.id === r.loan_id));
    const totalDue = myReps.reduce((s, r) => s + r.amount_due, 0);
    const totalPaid = myReps.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
    const collectionRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;
    const overdueReps = myReps.filter(r => r.status === "overdue");
    const overdueAmount = overdueReps.reduce((s, r) => s + r.amount_due - Number(r.amount_paid || 0), 0);
    const portfolio = myLoans.filter(l => ["approved", "disbursed", "completed"].includes(l.status))
      .reduce((s, l) => s + Number(l.amount_approved || 0), 0);
    const par = portfolio > 0 ? (overdueAmount / portfolio) * 100 : 0;
    const uniqueClients = new Set(myLoans.map(l => l.full_name.toLowerCase())).size;
    return { activeCount: activeLoans.length, collectionRate, par, uniqueClients, portfolio, overdueCount: overdueReps.length };
  }, [loans, repayments, userId]);

  // Today's tasks
  const tasks = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    const myLoans = loans.filter(l => l.loan_officer_id === userId);
    const myReps = repayments.filter(r => myLoans.some(l => l.id === r.loan_id));

    const pendingApprovals = myLoans.filter(l => l.status === "pending");
    const dueThisWeek = myReps.filter(r => r.status !== "paid" && r.due_date >= today && r.due_date <= weekAhead);
    const overdueFollowups = myReps.filter(r => r.status === "overdue");

    return { pendingApprovals, dueThisWeek, overdueFollowups };
  }, [loans, repayments, userId]);

  const handleRecordPayment = useCallback(async (repaymentId: string, loanId: string) => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    setSavingPayment(true);
    const rep = repayments.find(r => r.id === repaymentId);
    const newPaid = Number(rep?.amount_paid || 0) + amt;
    const newStatus = newPaid >= (rep?.amount_due || 0) ? "paid" : "partial";
    const { error } = await supabase.from("loan_repayments").update({
      amount_paid: newPaid, status: newStatus, paid_date: new Date().toISOString().split("T")[0],
    }).eq("id", repaymentId);
    if (error) toast.error("Failed: " + error.message);
    else { toast.success("Payment recorded"); setRecordingId(null); setPayAmount(""); setPayRef(""); onUpdate(); }
    setSavingPayment(false);
  }, [payAmount, repayments, onUpdate]);

  const handleAddNote = useCallback(async (loanId: string) => {
    if (!fieldNote.trim()) return;
    setSavingNote(true);
    const { error } = await supabase.from("audit_log").insert({
      entity_type: "loan_application", entity_id: loanId, action: "field_note",
      performed_by: userId, performed_by_role: "loan_officer",
      notes: fieldNote,
    });
    if (error) toast.error("Failed to save note");
    else { toast.success("Note saved"); setFieldNote(""); setNoteLoanId(null); }
    setSavingNote(false);
  }, [fieldNote, userId]);

  const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toLocaleString();

  // Client detail for slide-out
  const clientLoans = selectedClient ? loans.filter(l => l.full_name.toLowerCase() === selectedClient) : [];
  const clientReps = repayments.filter(r => clientLoans.some(l => l.id === r.loan_id));

  return (
    <div className="space-y-6">
      {/* Portfolio Health */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-5">
        <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> My Portfolio Health
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label: "Active Loans", value: health.activeCount, color: "text-primary" },
            { label: "Clients", value: health.uniqueClients, color: "text-foreground" },
            { label: "Portfolio", value: `KES ${fmt(health.portfolio)}`, color: "text-primary" },
            { label: "Collection", value: `${health.collectionRate.toFixed(0)}%`, color: health.collectionRate >= 80 ? "text-kc-green" : "text-amber-500" },
            { label: "PAR", value: `${health.par.toFixed(1)}%`, color: health.par <= 5 ? "text-kc-green" : "text-destructive" },
            { label: "Overdue", value: health.overdueCount, color: health.overdueCount > 0 ? "text-destructive" : "text-kc-green" },
          ].map((m, i) => (
            <div key={i} className="bg-background rounded-xl p-3 shadow-card text-center">
              <p className={cn("text-lg font-bold font-display", m.color)}>{m.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Today's Tasks */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Pending Approvals */}
        <div className="bg-background rounded-xl p-5 shadow-card">
          <h4 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-amber-500" /> Pending Approvals
            <span className="ml-auto bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs font-bold">{tasks.pendingApprovals.length}</span>
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {tasks.pendingApprovals.map(l => (
              <div key={l.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{l.full_name}</p>
                  <p className="text-xs text-muted-foreground">{l.financing_amount} · {l.business_type}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedClient(l.full_name.toLowerCase())}>
                  <Eye className="w-3 h-3" />
                </Button>
              </div>
            ))}
            {tasks.pendingApprovals.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No pending approvals ✓</p>}
          </div>
        </div>

        {/* Collections Due This Week */}
        <div className="bg-background rounded-xl p-5 shadow-card">
          <h4 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" /> Due This Week
            <span className="ml-auto bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-bold">{tasks.dueThisWeek.length}</span>
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {tasks.dueThisWeek.map(r => {
              const loan = loans.find(l => l.id === r.loan_id);
              return (
                <div key={r.id} className="p-2 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground truncate">{loan?.full_name || "Client"}</p>
                    <span className="text-xs text-muted-foreground">{new Date(r.due_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">KES {Number(r.amount_due).toLocaleString()} · Wk {r.week_number}</span>
                    {recordingId === r.id ? (
                      <div className="flex items-center gap-1">
                        <Input className="w-20 h-6 text-xs" placeholder="Amount" value={payAmount} onChange={e => setPayAmount(e.target.value)} type="number" />
                        <Button size="sm" className="h-6 px-2 text-xs" disabled={savingPayment} onClick={() => handleRecordPayment(r.id, r.loan_id)}>
                          {savingPayment ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => setRecordingId(null)}><X className="w-3 h-3" /></Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => setRecordingId(r.id)}>
                        <DollarSign className="w-3 h-3 mr-1" /> Record
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {tasks.dueThisWeek.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No collections due this week</p>}
          </div>
        </div>

        {/* Overdue Follow-ups */}
        <div className="bg-background rounded-xl p-5 shadow-card">
          <h4 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" /> Overdue Follow-ups
            <span className="ml-auto bg-destructive/10 text-destructive px-2 py-0.5 rounded-full text-xs font-bold">{tasks.overdueFollowups.length}</span>
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {tasks.overdueFollowups.map(r => {
              const loan = loans.find(l => l.id === r.loan_id);
              const daysOverdue = Math.ceil((Date.now() - new Date(r.due_date).getTime()) / 86400000);
              return (
                <div key={r.id} className="p-2 bg-destructive/5 rounded-lg border border-destructive/10">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground truncate">{loan?.full_name}</p>
                    <span className="text-xs font-bold text-destructive">{daysOverdue}d overdue</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">KES {Number(r.amount_due - Number(r.amount_paid || 0)).toLocaleString()} owed</span>
                    <div className="flex gap-1">
                      {recordingId === r.id ? (
                        <div className="flex items-center gap-1">
                          <Input className="w-20 h-6 text-xs" placeholder="Amt" value={payAmount} onChange={e => setPayAmount(e.target.value)} type="number" />
                          <Button size="sm" className="h-6 px-2 text-xs" disabled={savingPayment} onClick={() => handleRecordPayment(r.id, r.loan_id)}>
                            {savingPayment ? <Loader2 className="w-3 h-3 animate-spin" /> : "Pay"}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => setRecordingId(null)}><X className="w-3 h-3" /></Button>
                        </div>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => setRecordingId(r.id)}>
                            <DollarSign className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setNoteLoanId(r.loan_id)}>
                            <StickyNote className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {tasks.overdueFollowups.length === 0 && <p className="text-xs text-kc-green text-center py-4">No overdue items 🎉</p>}
          </div>
        </div>
      </div>

      {/* Field Note Modal */}
      {noteLoanId && (
        <div className="bg-background rounded-xl p-5 shadow-card border-2 border-primary/20">
          <h4 className="font-display font-bold text-foreground mb-2 flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-primary" /> Add Field Note
            <span className="text-xs text-muted-foreground ml-2">({loans.find(l => l.id === noteLoanId)?.full_name})</span>
          </h4>
          <Textarea placeholder="Visit notes, observations, follow-up actions..." value={fieldNote} onChange={e => setFieldNote(e.target.value)} rows={3} maxLength={500} />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => handleAddNote(noteLoanId)} disabled={savingNote}>
              {savingNote ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />} Save Note
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setNoteLoanId(null); setFieldNote(""); }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Client Quick View Slide-out */}
      {selectedClient && (
        <div className="bg-background rounded-2xl p-6 shadow-elevated border-2 border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Client: {clientLoans[0]?.full_name}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)}><X className="w-4 h-4" /></Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mb-4 text-sm">
            <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium text-foreground ml-1">{clientLoans[0]?.phone}</span></div>
            <div><span className="text-muted-foreground">Email:</span> <span className="font-medium text-foreground ml-1">{clientLoans[0]?.email || "—"}</span></div>
            <div><span className="text-muted-foreground">Business:</span> <span className="font-medium text-foreground ml-1">{clientLoans[0]?.business_type}</span></div>
            <div><span className="text-muted-foreground">Loans:</span> <span className="font-medium text-foreground ml-1">{clientLoans.length}</span></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="p-2 text-left font-semibold text-foreground">Amount</th>
                <th className="p-2 text-left font-semibold text-foreground">Status</th>
                <th className="p-2 text-left font-semibold text-foreground">Risk</th>
                <th className="p-2 text-left font-semibold text-foreground">Applied</th>
              </tr></thead>
              <tbody>
                {clientLoans.map(l => (
                  <tr key={l.id} className="border-b border-border/50">
                    <td className="p-2 font-medium text-foreground">{l.financing_amount}</td>
                    <td className="p-2"><span className={cn("px-2 py-0.5 rounded-full text-xs font-bold capitalize",
                      l.status === "disbursed" ? "bg-green-100 text-green-800" :
                      l.status === "pending" ? "bg-amber-100 text-amber-800" :
                      l.status === "rejected" ? "bg-red-100 text-red-800" :
                      "bg-blue-100 text-blue-800"
                    )}>{l.status}</span></td>
                    <td className="p-2">{l.risk_score ?? "—"}</td>
                    <td className="p-2 text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {clientReps.length > 0 && (
            <div className="mt-3 p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">
                Repayments: {clientReps.filter(r => r.status === "paid").length}/{clientReps.length} paid · 
                KES {clientReps.reduce((s, r) => s + Number(r.amount_paid || 0), 0).toLocaleString()} collected
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LoanOfficerWorkspace;
