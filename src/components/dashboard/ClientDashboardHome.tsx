import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  User, DollarSign, CalendarClock, TrendingUp, CheckCircle,
  AlertTriangle, Send, CreditCard, Percent, Clock, ShieldCheck, Edit3, Save, X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Profile {
  full_name: string | null; phone: string | null; location: string | null;
  business_type: string | null; business_description: string | null; email: string | null;
}

interface LoanApp {
  id: string; full_name: string; business_type: string; financing_amount: string;
  status: string; risk_score: number | null; created_at: string;
  amount_approved: number | null; loan_officer_id: string | null;
}

interface Repayment {
  id: string; loan_id: string; amount_due: number; amount_paid: number | null;
  due_date: string; week_number: number; status: string;
}

interface Props {
  userId: string;
  profile: Profile | null;
  loans: LoanApp[];
  repayments: Repayment[];
  onProfileUpdate: () => void;
}

const ClientDashboardHome = ({ userId, profile, loans, repayments, onProfileUpdate }: Props) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    location: profile?.location || "",
    business_type: profile?.business_type || "",
    business_description: profile?.business_description || "",
  });
  const [supportSubject, setSupportSubject] = useState("");
  const [supportBody, setSupportBody] = useState("");
  const [sendingSupport, setSendingSupport] = useState(false);

  // Quick stats
  const stats = useMemo(() => {
    const totalBorrowed = loans
      .filter(l => ["approved", "disbursed", "completed"].includes(l.status))
      .reduce((s, l) => s + Number(l.amount_approved || 0), 0);
    const totalRepaid = repayments.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
    const outstanding = repayments
      .filter(r => r.status !== "paid")
      .reduce((s, r) => s + r.amount_due - Number(r.amount_paid || 0), 0);
    const totalDue = repayments.length;
    const paidOnTime = repayments.filter(r => r.status === "paid").length;
    const onTimeRate = totalDue > 0 ? Math.round((paidOnTime / totalDue) * 100) : 100;
    return { totalBorrowed, totalRepaid, outstanding, onTimeRate, activeLoans: loans.filter(l => l.status === "disbursed").length };
  }, [loans, repayments]);

  // Next payment
  const nextPayment = useMemo(() => {
    const now = new Date().toISOString().split("T")[0];
    const upcoming = repayments
      .filter(r => r.status !== "paid" && r.due_date >= now)
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
    return upcoming[0] || null;
  }, [repayments]);

  const daysUntilPayment = nextPayment
    ? Math.ceil((new Date(nextPayment.due_date).getTime() - Date.now()) / 86400000)
    : null;

  // Eligibility indicator
  const eligibility = useMemo(() => {
    const hasOverdue = repayments.some(r => r.status === "overdue");
    const hasPending = loans.some(l => l.status === "pending");
    const avgScore = loans.filter(l => l.risk_score).reduce((s, l) => s + (l.risk_score || 0), 0) / (loans.filter(l => l.risk_score).length || 1);
    if (hasPending) return { eligible: false, reason: "You have a pending application", color: "text-amber-500" };
    if (hasOverdue) return { eligible: false, reason: "Clear overdue payments first", color: "text-destructive" };
    if (avgScore < 50 && loans.length > 0) return { eligible: false, reason: "Improve your credit score to reapply", color: "text-destructive" };
    return { eligible: true, reason: "You're eligible to apply for new financing!", color: "text-kc-green" };
  }, [loans, repayments]);

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name, phone: form.phone, location: form.location,
      business_type: form.business_type, business_description: form.business_description,
    }).eq("user_id", userId);
    if (error) toast.error("Failed to update profile");
    else { toast.success("Profile updated"); setEditing(false); onProfileUpdate(); }
    setSaving(false);
  };

  const handleSendSupport = async () => {
    if (!supportSubject.trim() || !supportBody.trim()) { toast.error("Fill in subject and message"); return; }
    setSendingSupport(true);
    // Find the loan officer of the most recent loan
    const recentLoan = loans.find(l => l.loan_officer_id);
    const { error } = await supabase.from("internal_messages").insert({
      sender_id: userId,
      recipient_id: recentLoan?.loan_officer_id || null,
      recipient_role: recentLoan?.loan_officer_id ? null : "loan_officer",
      subject: supportSubject,
      body: supportBody,
      priority: "normal",
    });
    if (error) toast.error("Failed to send message");
    else { toast.success("Support request sent!"); setSupportSubject(""); setSupportBody(""); }
    setSendingSupport(false);
  };

  const fmt = (n: number) => `KES ${n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toLocaleString()}`;

  return (
    <div className="space-y-6">
      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { icon: DollarSign, label: "Total Borrowed", value: fmt(stats.totalBorrowed), color: "text-primary" },
          { icon: CheckCircle, label: "Total Repaid", value: fmt(stats.totalRepaid), color: "text-kc-green" },
          { icon: AlertTriangle, label: "Outstanding", value: fmt(stats.outstanding), color: stats.outstanding > 0 ? "text-destructive" : "text-kc-green" },
          { icon: Percent, label: "On-Time Rate", value: `${stats.onTimeRate}%`, color: stats.onTimeRate >= 80 ? "text-kc-green" : "text-amber-500" },
          { icon: CreditCard, label: "Active Loans", value: stats.activeLoans.toString(), color: "text-primary" },
        ].map((s, i) => (
          <div key={i} className="bg-background rounded-xl p-4 shadow-card">
            <s.icon className={cn("w-5 h-5 mb-1", s.color)} />
            <p className="text-lg font-bold font-display text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Next Payment Widget */}
        <div className={cn(
          "rounded-2xl p-6 shadow-card border-2",
          nextPayment
            ? daysUntilPayment !== null && daysUntilPayment <= 3
              ? "border-destructive/30 bg-destructive/5"
              : "border-primary/20 bg-primary/5"
            : "border-kc-green/20 bg-kc-green/5"
        )}>
          <div className="flex items-center gap-3 mb-4">
            <CalendarClock className={cn("w-8 h-8", nextPayment ? daysUntilPayment !== null && daysUntilPayment <= 3 ? "text-destructive" : "text-primary" : "text-kc-green")} />
            <h3 className="font-display font-bold text-foreground text-lg">Next Payment</h3>
          </div>
          {nextPayment ? (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold font-display text-foreground">
                  KES {Number(nextPayment.amount_due - Number(nextPayment.amount_paid || 0)).toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground">Week {nextPayment.week_number}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Due: {new Date(nextPayment.due_date).toLocaleDateString()}</span>
                {daysUntilPayment !== null && (
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold",
                    daysUntilPayment <= 0 ? "bg-destructive text-destructive-foreground" :
                    daysUntilPayment <= 3 ? "bg-amber-100 text-amber-800" :
                    "bg-primary/10 text-primary"
                  )}>
                    {daysUntilPayment <= 0 ? "OVERDUE" : `${daysUntilPayment} days left`}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-kc-green font-semibold">🎉 All payments up to date!</p>
          )}
        </div>

        {/* Eligibility Indicator */}
        <div className="bg-background rounded-2xl p-6 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className={cn("w-8 h-8", eligibility.color)} />
            <h3 className="font-display font-bold text-foreground text-lg">Loan Eligibility</h3>
          </div>
          <p className={cn("text-sm font-semibold mb-2", eligibility.color)}>{eligibility.reason}</p>
          <div className="flex items-center gap-2 mt-3">
            <div className={cn("w-3 h-3 rounded-full", eligibility.eligible ? "bg-kc-green" : "bg-destructive")} />
            <span className="text-xs text-muted-foreground">{eligibility.eligible ? "Ready to apply" : "Not eligible at this time"}</span>
          </div>
          {loans.filter(l => l.risk_score).length > 0 && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <span className="text-xs text-muted-foreground">Average Credit Score: </span>
              <span className="font-bold text-foreground">
                {Math.round(loans.filter(l => l.risk_score).reduce((s, l) => s + (l.risk_score || 0), 0) / loans.filter(l => l.risk_score).length)}
                /100
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Management */}
        <div className="bg-background rounded-2xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <User className="w-6 h-6 text-primary" />
              <h3 className="font-display font-bold text-foreground text-lg">My Profile</h3>
            </div>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Edit3 className="w-3 h-3 mr-1" /> Edit</Button>
            ) : (
              <div className="flex gap-1">
                <Button size="sm" onClick={handleSaveProfile} disabled={saving}><Save className="w-3 h-3 mr-1" /> Save</Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}><X className="w-3 h-3" /></Button>
              </div>
            )}
          </div>
          {editing ? (
            <div className="space-y-3">
              <div><Label className="text-xs">Full Name</Label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label className="text-xs">Location</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
              <div><Label className="text-xs">Business Type</Label><Input value={form.business_type} onChange={e => setForm({ ...form, business_type: e.target.value })} /></div>
              <div><Label className="text-xs">Business Description</Label><Textarea value={form.business_description} onChange={e => setForm({ ...form, business_description: e.target.value })} rows={2} /></div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              {[
                { label: "Name", value: profile?.full_name },
                { label: "Phone", value: profile?.phone },
                { label: "Email", value: profile?.email },
                { label: "Location", value: profile?.location },
                { label: "Business", value: profile?.business_type },
                { label: "Description", value: profile?.business_description },
              ].map((f, i) => (
                <div key={i} className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className="font-medium text-foreground text-right max-w-[60%] truncate">{f.value || "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Support Request */}
        <div className="bg-background rounded-2xl p-6 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <Send className="w-6 h-6 text-primary" />
            <h3 className="font-display font-bold text-foreground text-lg">Contact Support</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Send a message to your loan officer or our support team.
          </p>
          <div className="space-y-3">
            <Input placeholder="Subject" value={supportSubject} onChange={e => setSupportSubject(e.target.value)} maxLength={100} />
            <Textarea placeholder="Describe your issue or question..." value={supportBody} onChange={e => setSupportBody(e.target.value)} rows={3} maxLength={500} />
            <Button className="w-full" onClick={handleSendSupport} disabled={sendingSupport}>
              <Send className="w-4 h-4 mr-2" /> {sendingSupport ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboardHome;
