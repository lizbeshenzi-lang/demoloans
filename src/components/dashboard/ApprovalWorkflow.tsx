import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CheckCircle, XCircle, ArrowRight, MessageSquare, Loader2,
  ThumbsUp, ThumbsDown, Clock, Shield, ChevronDown, ChevronUp,
  AlertTriangle, Send, FileText
} from "lucide-react";

interface LoanApp {
  id: string; full_name: string; business_type: string; financing_amount: string;
  status: string; risk_score: number | null; ai_recommendation: string | null;
  created_at: string; approval_level?: string; approval_notes?: string;
  approved_by?: string | null; phone: string; email: string | null;
  amount_approved: number | null;
}

interface Props {
  loans: LoanApp[];
  onUpdate: () => void;
}

const APPROVAL_CHAIN: Record<string, { next: string; label: string; canApprove: string[] }> = {
  pending: {
    next: "officer_approved",
    label: "Loan Officer Review",
    canApprove: ["loan_officer", "admin"],
  },
  officer_approved: {
    next: "branch_approved",
    label: "Branch Manager Approval",
    canApprove: ["branch_manager", "admin"],
  },
  branch_approved: {
    next: "approved",
    label: "Regional/Final Approval",
    canApprove: ["regional_manager", "gm", "ceo", "admin"],
  },
};

const LEVEL_LABELS: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Awaiting Officer Review", color: "bg-amber-100 text-amber-800", icon: Clock },
  officer_approved: { label: "Officer Approved → Branch Review", color: "bg-blue-100 text-blue-800", icon: ArrowRight },
  branch_approved: { label: "Branch Approved → Final Review", color: "bg-purple-100 text-purple-800", icon: ArrowRight },
  approved: { label: "Fully Approved", color: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: XCircle },
};

const ApprovalWorkflow = ({ loans, onUpdate }: Props) => {
  const { user, role } = useAuth();
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  const pendingLoans = loans.filter(l => {
    const level = l.approval_level || l.status;
    const chain = APPROVAL_CHAIN[level];
    if (!chain) return false;
    return chain.canApprove.includes(role || "");
  });

  const handleApproval = useCallback(async (loanId: string, action: "approve" | "reject") => {
    if (!user || !role) return;
    setProcessing(loanId);

    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    const currentLevel = loan.approval_level || loan.status;
    const chain = APPROVAL_CHAIN[currentLevel];

    const updateData: Record<string, any> = {
      approved_by: user.id,
      approval_notes: notes || null,
    };

    if (action === "reject") {
      updateData.status = "rejected";
      updateData.approval_level = "rejected";
    } else {
      updateData.approval_level = chain.next;
      if (chain.next === "approved") {
        updateData.status = "approved";
        const amt = parseFloat((loan.financing_amount || "0").replace(/[^0-9.]/g, '')) || 0;
        updateData.amount_approved = amt;
      }
    }

    const { error } = await supabase.from("loan_applications").update(updateData).eq("id", loanId);
    if (error) toast.error(error.message);
    else {
      toast.success(action === "approve" ? `Loan advanced to ${LEVEL_LABELS[chain.next]?.label || "next stage"}` : "Loan rejected");
      setNotes("");
      setExpandedLoan(null);
      onUpdate();
    }
    setProcessing(null);
  }, [user, role, loans, notes, onUpdate]);

  if (pendingLoans.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold font-display text-foreground">Approval Queue ({pendingLoans.length})</h2>
      </div>

      <div className="space-y-3">
        {pendingLoans.map(loan => {
          const level = loan.approval_level || loan.status;
          const levelInfo = LEVEL_LABELS[level] || LEVEL_LABELS.pending;
          const chain = APPROVAL_CHAIN[level];
          const isExpanded = expandedLoan === loan.id;

          return (
            <div key={loan.id} className="bg-background rounded-xl shadow-card overflow-hidden">
              <button onClick={() => setExpandedLoan(isExpanded ? null : loan.id)} className="w-full text-left p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {loan.risk_score !== null && (
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground",
                        loan.risk_score >= 80 ? "bg-kc-green" : loan.risk_score >= 65 ? "bg-amber-500" : "bg-destructive"
                      )}>{loan.risk_score}</div>
                    )}
                    <div>
                      <p className="font-semibold text-foreground text-sm">{loan.full_name}</p>
                      <p className="text-xs text-muted-foreground">{loan.business_type} · {loan.financing_amount || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold", levelInfo.color)}>{levelInfo.label}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Progress steps */}
                <div className="flex items-center gap-1 mt-3">
                  {["pending", "officer_approved", "branch_approved", "approved"].map((step, i) => {
                    const steps = ["pending", "officer_approved", "branch_approved", "approved"];
                    const currentIdx = steps.indexOf(level);
                    const isComplete = i <= currentIdx;
                    const isCurrent = step === level;
                    return (
                      <div key={step} className="flex items-center gap-1 flex-1">
                        <div className={cn(
                          "h-1.5 flex-1 rounded-full",
                          isComplete ? "bg-kc-green" : isCurrent ? "bg-amber-400" : "bg-muted"
                        )} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-muted-foreground">Officer</span>
                  <span className="text-[9px] text-muted-foreground">Branch</span>
                  <span className="text-[9px] text-muted-foreground">Regional</span>
                  <span className="text-[9px] text-muted-foreground">Final</span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                  {/* Details */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium text-foreground ml-1">{loan.phone}</span></div>
                    <div><span className="text-muted-foreground">Email:</span> <span className="font-medium text-foreground ml-1">{loan.email || "—"}</span></div>
                    <div><span className="text-muted-foreground">Applied:</span> <span className="font-medium text-foreground ml-1">{new Date(loan.created_at).toLocaleDateString()}</span></div>
                    <div><span className="text-muted-foreground">Risk:</span> <span className="font-medium text-foreground ml-1">{loan.risk_score ?? "Unscored"}</span></div>
                  </div>

                  {loan.ai_recommendation && (
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">AI Recommendation</p>
                      <p className="text-xs text-muted-foreground">{loan.ai_recommendation}</p>
                    </div>
                  )}

                  {loan.risk_score !== null && loan.risk_score < 50 && (
                    <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/10 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                      <p className="text-xs text-destructive font-medium">High risk score detected. Exercise caution with approval.</p>
                    </div>
                  )}

                  {loan.approval_notes && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Previous Notes</p>
                      <p className="text-xs text-foreground">{loan.approval_notes}</p>
                    </div>
                  )}

                  <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add approval/rejection notes (optional)..." rows={2}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none" />

                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => handleApproval(loan.id, "approve")} disabled={processing === loan.id}
                      className="bg-kc-green hover:bg-kc-green/90">
                      {processing === loan.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ThumbsUp className="w-3 h-3 mr-1" />}
                      {chain?.next === "approved" ? "Final Approve" : "Approve & Advance"}
                    </Button>
                    <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-primary-foreground"
                      onClick={() => handleApproval(loan.id, "reject")} disabled={processing === loan.id}>
                      <ThumbsDown className="w-3 h-3 mr-1" /> Reject
                    </Button>
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

export default ApprovalWorkflow;
