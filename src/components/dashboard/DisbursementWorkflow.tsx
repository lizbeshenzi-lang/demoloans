import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Banknote, Loader2, CheckCircle, ChevronDown, ChevronUp,
  Smartphone, Building, Calendar, Hash, AlertTriangle
} from "lucide-react";

interface LoanApp {
  id: string; full_name: string; business_type: string; financing_amount: string;
  status: string; amount_approved: number | null; phone: string;
  disbursement_date: string | null; product_id: string | null;
}

interface Product {
  id: string; name: string; term_weeks: number; interest_rate: number;
}

interface Props {
  loans: LoanApp[];
  products: Product[];
  onUpdate: () => void;
}

const DisbursementWorkflow = ({ loans, products, onUpdate }: Props) => {
  const { user } = useAuth();
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [form, setForm] = useState({ method: "mpesa", reference: "", date: new Date().toISOString().split("T")[0] });

  const approvedLoans = loans.filter(l => l.status === "approved" && l.amount_approved);

  const handleDisburse = useCallback(async (loanId: string) => {
    if (!user || !form.reference.trim()) {
      toast.error("Please enter a disbursement reference");
      return;
    }
    setProcessing(loanId);

    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    const product = products.find(p => p.id === loan.product_id);
    const termWeeks = product?.term_weeks || 12;
    const interestRate = product?.interest_rate || 15;
    const principal = loan.amount_approved || 0;
    const totalRepayable = principal * (1 + interestRate / 100);
    const weeklyAmount = Math.ceil(totalRepayable / termWeeks);

    // Update loan to disbursed
    const { error: loanError } = await supabase.from("loan_applications").update({
      status: "disbursed",
      disbursement_date: form.date,
      disbursement_method: form.method,
      disbursement_reference: form.reference,
      disbursed_by: user.id,
      expected_completion_date: new Date(
        new Date(form.date).getTime() + termWeeks * 7 * 24 * 60 * 60 * 1000
      ).toISOString().split("T")[0],
    } as any).eq("id", loanId);

    if (loanError) {
      toast.error("Disbursement failed: " + loanError.message);
      setProcessing(null);
      return;
    }

    // Generate repayment schedule
    const repayments = Array.from({ length: termWeeks }, (_, i) => {
      const dueDate = new Date(form.date);
      dueDate.setDate(dueDate.getDate() + (i + 1) * 7);
      return {
        loan_id: loanId,
        week_number: i + 1,
        amount_due: i === termWeeks - 1 ? Math.round((totalRepayable - weeklyAmount * (termWeeks - 1)) * 100) / 100 : weeklyAmount,
        due_date: dueDate.toISOString().split("T")[0],
        status: "pending",
        amount_paid: 0,
      };
    });

    const { error: repError } = await supabase.from("loan_repayments").insert(repayments);
    if (repError) {
      toast.error("Repayment schedule failed: " + repError.message);
    } else {
      toast.success(`Loan disbursed! ${termWeeks}-week repayment schedule created.`);
      setExpandedLoan(null);
      setForm({ method: "mpesa", reference: "", date: new Date().toISOString().split("T")[0] });
      onUpdate();
    }
    setProcessing(null);
  }, [user, form, loans, products, onUpdate]);

  if (approvedLoans.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Banknote className="w-5 h-5 text-kc-green" />
        <h2 className="text-lg font-bold font-display text-foreground">Disbursement Queue ({approvedLoans.length})</h2>
      </div>

      <div className="space-y-3">
        {approvedLoans.map(loan => {
          const isExpanded = expandedLoan === loan.id;
          const product = products.find(p => p.id === loan.product_id);

          return (
            <div key={loan.id} className="bg-background rounded-xl shadow-card overflow-hidden">
              <button onClick={() => setExpandedLoan(isExpanded ? null : loan.id)} className="w-full text-left p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-kc-green/10 flex items-center justify-center">
                      <Banknote className="w-5 h-5 text-kc-green" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{loan.full_name}</p>
                      <p className="text-xs text-muted-foreground">{loan.business_type} · {loan.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-foreground text-sm">KES {Number(loan.amount_approved).toLocaleString()}</p>
                      {product && <p className="text-[10px] text-muted-foreground">{product.name} · {product.term_weeks}wk</p>}
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-border pt-3">
                  {product && (
                    <div className="grid grid-cols-3 gap-3 text-xs text-center bg-muted/30 rounded-lg p-3">
                      <div>
                        <p className="font-bold text-foreground">{product.interest_rate}%</p>
                        <p className="text-muted-foreground">Interest</p>
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{product.term_weeks} weeks</p>
                        <p className="text-muted-foreground">Term</p>
                      </div>
                      <div>
                        <p className="font-bold text-foreground">
                          KES {Math.ceil((Number(loan.amount_approved) * (1 + product.interest_rate / 100)) / product.term_weeks).toLocaleString()}
                        </p>
                        <p className="text-muted-foreground">Weekly</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">Disbursement Method</label>
                      <div className="flex gap-2">
                        {[
                          { value: "mpesa", label: "M-Pesa", icon: Smartphone },
                          { value: "bank", label: "Bank Transfer", icon: Building },
                          { value: "cash", label: "Cash", icon: Banknote },
                        ].map(m => (
                          <button key={m.value} onClick={() => setForm(f => ({ ...f, method: m.value }))}
                            className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition-colors",
                              form.method === m.value ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                            )}>
                            <m.icon className="w-3.5 h-3.5" /> {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block flex items-center gap-1">
                          <Hash className="w-3 h-3" /> Reference / Transaction ID
                        </label>
                        <input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                          placeholder={form.method === "mpesa" ? "e.g. QK7D2X9F1M" : "e.g. TXN-001234"}
                          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Disbursement Date
                        </label>
                        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button onClick={() => handleDisburse(loan.id)} disabled={processing === loan.id || !form.reference.trim()}
                      className="bg-kc-green hover:bg-kc-green/90">
                      {processing === loan.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                      Confirm Disbursement & Generate Schedule
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="text-[11px] text-amber-700">This will mark the loan as disbursed and create a {product?.term_weeks || 12}-week repayment schedule.</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DisbursementWorkflow;
