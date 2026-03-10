import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, CheckCircle, XCircle, DollarSign, Clock, Send, Shield, ArrowRight, Loader2 } from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  created_at: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  notes: string | null;
  entity_type: string;
}

interface Repayment {
  id: string;
  week_number: number;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  status: string;
  paid_date: string | null;
}

interface TimelineEvent {
  id: string;
  timestamp: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

interface LoanActivityTimelineProps {
  loanId: string;
  repayments: Repayment[];
  createdAt: string;
}

const getActionIcon = (action: string) => {
  switch (action) {
    case "approved": return <CheckCircle className="w-4 h-4" />;
    case "rejected": return <XCircle className="w-4 h-4" />;
    case "disbursed": return <Send className="w-4 h-4" />;
    case "completed": return <Shield className="w-4 h-4" />;
    case "status_change": return <ArrowRight className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case "approved": return "bg-blue-500";
    case "rejected": return "bg-destructive";
    case "disbursed": return "bg-kc-green";
    case "completed": return "bg-kc-green";
    case "payment_paid": return "bg-kc-green";
    case "payment_overdue": return "bg-destructive";
    default: return "bg-primary";
  }
};

const formatDate = (date: string) => {
  const d = new Date(date);
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
};

const formatTime = (date: string) => {
  const d = new Date(date);
  return d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
};

const LoanActivityTimeline = ({ loanId, repayments, createdAt }: LoanActivityTimelineProps) => {
  const [auditEvents, setAuditEvents] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAudit = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("audit_log")
        .select("id, action, created_at, old_values, new_values, notes, entity_type")
        .or(`and(entity_type.eq.loan_application,entity_id.eq.${loanId}),and(entity_type.eq.loan_repayment,entity_id.in.(${repayments.map(r => r.id).join(",")}))`)
        .order("created_at", { ascending: true });
      if (data) setAuditEvents(data as AuditEntry[]);
      setLoading(false);
    };
    fetchAudit();
  }, [loanId, repayments]);

  // Build timeline events
  const events: TimelineEvent[] = [];

  // 1. Application submitted
  events.push({
    id: "created",
    timestamp: createdAt,
    icon: <FileText className="w-4 h-4" />,
    title: "Application Submitted",
    description: "Loan application was submitted for review.",
    color: "bg-primary",
  });

  // 2. Audit log events (status changes, approvals, etc.)
  auditEvents
    .filter(e => e.entity_type === "loan_application")
    .forEach((e) => {
      const newStatus = (e.new_values as any)?.status;
      const oldStatus = (e.old_values as any)?.status;
      const amount = (e.new_values as any)?.amount_approved;
      let title = e.action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      let desc = "";

      if (e.action === "approved") {
        title = "Loan Approved";
        desc = amount ? `Approved for KES ${Number(amount).toLocaleString()}.` : "Application approved.";
        if (e.notes) desc += ` Note: ${e.notes}`;
      } else if (e.action === "rejected") {
        title = "Loan Rejected";
        desc = e.notes || "Application was rejected.";
      } else if (e.action === "disbursed") {
        title = "Funds Disbursed";
        desc = amount ? `KES ${Number(amount).toLocaleString()} sent to borrower.` : "Funds disbursed.";
      } else if (e.action === "completed") {
        title = "Loan Completed";
        desc = "All repayments fulfilled. Loan closed.";
      } else {
        desc = `Status changed from "${oldStatus || "—"}" to "${newStatus || "—"}".`;
        if (e.notes) desc += ` ${e.notes}`;
      }

      events.push({
        id: e.id,
        timestamp: e.created_at,
        icon: getActionIcon(e.action),
        title,
        description: desc,
        color: getActionColor(e.action),
      });
    });

  // 3. Repayment events (paid ones)
  repayments
    .filter(r => r.status === "paid" && r.paid_date)
    .forEach((r) => {
      events.push({
        id: `rep-${r.id}`,
        timestamp: r.paid_date!,
        icon: <DollarSign className="w-4 h-4" />,
        title: `Week ${r.week_number} Payment`,
        description: `KES ${Number(r.amount_paid).toLocaleString()} paid (of KES ${Number(r.amount_due).toLocaleString()} due).`,
        color: "bg-kc-green",
      });
    });

  // 4. Overdue repayments
  repayments
    .filter(r => r.status === "overdue")
    .forEach((r) => {
      events.push({
        id: `overdue-${r.id}`,
        timestamp: r.due_date,
        icon: <Clock className="w-4 h-4" />,
        title: `Week ${r.week_number} Overdue`,
        description: `KES ${Number(r.amount_due).toLocaleString()} was due on ${formatDate(r.due_date)}.`,
        color: "bg-destructive",
      });
    });

  // Sort by timestamp
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (loading) {
    return (
      <div className="bg-background rounded-xl p-8 shadow-card flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-background rounded-xl p-6 shadow-card">
      <h3 className="font-bold font-display text-foreground text-lg mb-6 flex items-center gap-2">
        <Clock className="w-5 h-5 text-primary" /> Activity Timeline
      </h3>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No activity recorded yet.</p>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-border" />

          <div className="space-y-0">
            {events.map((event, i) => (
              <div key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
                {/* Dot */}
                <div className={`relative z-10 w-8 h-8 rounded-full ${event.color} text-white flex items-center justify-center shrink-0 shadow-sm`}>
                  {event.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold font-display text-foreground text-sm">{event.title}</p>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-muted-foreground">{formatDate(event.timestamp)}</p>
                      <p className="text-[10px] text-muted-foreground">{formatTime(event.timestamp)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground font-body mt-0.5 leading-relaxed">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanActivityTimeline;
