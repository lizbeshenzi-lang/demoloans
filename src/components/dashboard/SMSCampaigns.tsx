import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  MessageSquare, Send, Plus, Loader2, Users, AlertTriangle,
  Clock, CheckCircle, XCircle, Megaphone, Bell, ShieldAlert,
  TrendingUp, Phone, CalendarClock, Repeat, Pause, Play
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  campaign_type: string;
  target_hierarchy: string;
  template: string;
  status: string;
  sms_provider: string;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  created_at: string;
  branch_id: string | null;
  region_id: string | null;
  recurrence: string | null;
  next_run_at: string | null;
  last_run_at: string | null;
  scheduled_at: string | null;
}

const CAMPAIGN_TYPES = [
  { value: "marketing", label: "Marketing & Promotions", icon: Megaphone, desc: "Product announcements, new offers, promotions", color: "text-primary" },
  { value: "onboarding", label: "Client Onboarding", icon: Users, desc: "Welcome messages, setup instructions", color: "text-blue-600" },
  { value: "reminder", label: "Payment Reminders", icon: Bell, desc: "Due date alerts, upcoming payment notices", color: "text-amber-600" },
  { value: "recovery", label: "Recovery & Collections", icon: ShieldAlert, desc: "Overdue notices, escalation warnings", color: "text-destructive" },
  { value: "updates", label: "Status Updates", icon: TrendingUp, desc: "Loan status changes, approval notifications", color: "text-green-600" },
];

const HIERARCHY_TARGETS = [
  { value: "all", label: "All Clients" },
  { value: "branch", label: "Branch Clients" },
  { value: "region", label: "Region Clients" },
  { value: "overdue", label: "Overdue Only" },
  { value: "active", label: "Active Loans Only" },
];

const RECURRENCE_OPTIONS = [
  { value: "none", label: "One-time (no repeat)" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 Weeks" },
  { value: "monthly", label: "Monthly" },
];

const TEMPLATES: Record<string, string[]> = {
  marketing: [
    "Dear {name}, exciting news from Demo Capital! We have new financing products tailored for your business. Visit us or call for more info.",
    "Hi {name}, grow your business with Demo Capital's flexible financing options. Apply today for quick processing!",
  ],
  onboarding: [
    "Welcome to Demo Capital, {name}! Your account has been set up. Your Loan Officer will contact you shortly to guide you through the process.",
    "Hi {name}, thank you for choosing Demo Capital. Please ensure your KYC documents are ready for verification.",
  ],
  reminder: [
    "Dear {name}, this is a friendly reminder that your repayment is due soon. Please ensure timely payment to maintain your good standing.",
    "Hi {name}, your weekly repayment is approaching. Pay on time to qualify for higher financing in the future!",
  ],
  recovery: [
    "Dear {name}, your repayment is overdue. Please make your payment immediately to avoid penalties. Contact your Loan Officer if you need assistance.",
    "URGENT: {name}, your Demo Capital repayment is past due. Please settle your account or contact us at your earliest convenience.",
  ],
  updates: [
    "Hi {name}, your loan application status has been updated. Please log in to your account or contact your Loan Officer for details.",
    "Dear {name}, great news! Your financing has been approved. Visit your nearest branch for disbursement details.",
  ],
};

const SMSCampaigns = () => {
  const { user, role } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [form, setForm] = useState({
    name: "", description: "", campaign_type: "marketing",
    target_hierarchy: "all", template: "", sms_provider: "twilio",
    recurrence: "none", scheduled_at: "",
  });

  const isExecutive = role === "ceo" || role === "gm";

  useEffect(() => { fetchCampaigns(); }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sms_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setCampaigns((data || []) as Campaign[]);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name || !form.template) { toast.error("Name and template required"); return; }
    setCreating(true);
    const isRecurring = form.recurrence && form.recurrence !== "none";
    const scheduledAt = form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null;
    const nextRunAt = isRecurring ? (scheduledAt || new Date().toISOString()) : null;

    const { error } = await supabase.from("sms_campaigns").insert({
      name: form.name,
      description: form.description || null,
      campaign_type: form.campaign_type,
      target_hierarchy: form.target_hierarchy,
      template: form.template,
      sms_provider: form.sms_provider,
      created_by: user!.id,
      recurrence: isRecurring ? form.recurrence : null,
      scheduled_at: scheduledAt,
      next_run_at: nextRunAt,
    } as any);
    if (error) toast.error(error.message);
    else {
      toast.success(isRecurring ? "Recurring campaign created & scheduled" : "Campaign created");
      setShowCreate(false);
      setForm({ name: "", description: "", campaign_type: "marketing", target_hierarchy: "all", template: "", sms_provider: "twilio", recurrence: "none", scheduled_at: "" });
      fetchCampaigns();
    }
    setCreating(false);
  };

  const handleSend = async (campaignId: string) => {
    setSending(campaignId);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: { campaign_id: campaignId },
      });
      if (error) throw error;
      toast.success(`Campaign sent! ${data.sent} delivered, ${data.failed} failed out of ${data.total}`);
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err.message || "Failed to send campaign");
    }
    setSending(null);
  };

  const handleTogglePause = async (campaign: Campaign) => {
    const isPaused = campaign.status === "paused";
    const updates: any = { status: isPaused ? "sent" : "paused" };
    if (isPaused && campaign.recurrence && campaign.recurrence !== "none") {
      // Resume: set next_run_at to now so it picks up on next cron cycle
      updates.next_run_at = new Date().toISOString();
    }
    if (!isPaused) {
      // Pause: clear next_run_at so cron skips it
      updates.next_run_at = null;
    }
    const { error } = await supabase.from("sms_campaigns").update(updates).eq("id", campaign.id);
    if (error) toast.error(error.message);
    else { toast.success(isPaused ? "Campaign resumed" : "Campaign paused"); fetchCampaigns(); }
  };

  const getCampaignTypeInfo = (type: string) => CAMPAIGN_TYPES.find(t => t.value === type) || CAMPAIGN_TYPES[0];

  // Which campaign types this role can access
  const allowedTypes = () => {
    if (role === "admin" || isExecutive) return CAMPAIGN_TYPES;
    if (role === "regional_manager") return CAMPAIGN_TYPES.filter(t => ["marketing", "reminder", "recovery", "updates"].includes(t.value));
    if (role === "branch_manager") return CAMPAIGN_TYPES.filter(t => ["marketing", "reminder", "recovery", "onboarding"].includes(t.value));
    if (role === "loan_officer") return CAMPAIGN_TYPES.filter(t => ["onboarding", "reminder"].includes(t.value));
    return [];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" /> SMS Campaigns
          </h2>
          <p className="text-sm text-muted-foreground">Create and manage SMS campaigns for marketing, reminders, and recovery</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> New Campaign
        </Button>
      </div>

      {showCreate && (
        <div className="bg-background rounded-xl border border-border p-6 space-y-4">
          <h3 className="font-semibold font-display text-foreground">Create New Campaign</h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Campaign Name</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. March Payment Reminders" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">SMS Provider</label>
              <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.sms_provider} onChange={e => setForm({ ...form, sms_provider: e.target.value })}>
                <option value="twilio">Twilio</option>
                <option value="africastalking">Africa's Talking</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Campaign Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {allowedTypes().map(t => (
                <button key={t.value} onClick={() => setForm({ ...form, campaign_type: t.value, template: "" })}
                  className={`p-3 rounded-lg border text-left transition-all ${form.campaign_type === t.value ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/30"}`}>
                  <t.icon className={`w-5 h-5 ${t.color} mb-1`} />
                  <p className="text-xs font-semibold text-foreground">{t.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Target Audience</label>
              <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.target_hierarchy} onChange={e => setForm({ ...form, target_hierarchy: e.target.value })}>
                {HIERARCHY_TARGETS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Description (optional)</label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Internal notes about this campaign" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-primary" /> Recurrence
              </label>
              <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.recurrence} onChange={e => setForm({ ...form, recurrence: e.target.value })}>
                {RECURRENCE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {form.recurrence !== "none" && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-primary" /> First Run Date/Time
                </label>
                <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
                <p className="text-[10px] text-muted-foreground mt-1">Leave empty to start immediately</p>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Message Template</label>
            <p className="text-xs text-muted-foreground mb-2">Use {"{name}"} for client name. Max 160 chars recommended.</p>
            <Textarea value={form.template} onChange={e => setForm({ ...form, template: e.target.value })} rows={3} placeholder="Type your message or select a template below..." />
            <div className="flex flex-wrap gap-1 mt-2">
              {(TEMPLATES[form.campaign_type] || []).map((t, i) => (
                <button key={i} onClick={() => setForm({ ...form, template: t })} className="text-[10px] bg-muted text-muted-foreground px-2 py-1 rounded hover:bg-primary/10 hover:text-primary transition-colors">
                  Template {i + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              Create Campaign
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : campaigns.length === 0 ? (
        <div className="bg-background rounded-xl border border-border p-8 text-center">
          <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No campaigns yet. Create your first campaign above.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {campaigns.map(c => {
            const typeInfo = getCampaignTypeInfo(c.campaign_type);
            return (
              <div key={c.id} className="bg-background rounded-xl border border-border p-4 hover:shadow-card transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg bg-muted`}>
                      <typeInfo.icon className={`w-5 h-5 ${typeInfo.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm text-foreground">{c.name}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          c.status === "sent" ? "bg-green-100 text-green-700" :
                          c.status === "sending" ? "bg-blue-100 text-blue-700" :
                          c.status === "paused" ? "bg-amber-100 text-amber-700" :
                          "bg-muted text-muted-foreground"
                        }`}>{c.status}</span>
                        <span className="text-[10px] text-muted-foreground">{c.sms_provider}</span>
                        {c.recurrence && c.recurrence !== "none" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary flex items-center gap-0.5">
                            <Repeat className="w-2.5 h-2.5" /> {c.recurrence}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{c.template}</p>
                      {c.recurrence && c.recurrence !== "none" && c.next_run_at && c.status !== "paused" && (
                        <p className="text-[10px] text-primary mt-1 flex items-center gap-1">
                          <CalendarClock className="w-3 h-3" /> Next run: {new Date(c.next_run_at).toLocaleString()}
                        </p>
                      )}
                      {c.status === "paused" && (
                        <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                          <Pause className="w-3 h-3" /> Paused — will not run until resumed
                        </p>
                      )}
                      {c.total_sent > 0 && (
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className="flex items-center gap-1 text-foreground"><Send className="w-3 h-3" /> {c.total_sent} sent</span>
                          <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3 h-3" /> {c.total_delivered}</span>
                          {c.total_failed > 0 && <span className="flex items-center gap-1 text-destructive"><XCircle className="w-3 h-3" /> {c.total_failed}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {c.recurrence && c.recurrence !== "none" && (c.status === "sent" || c.status === "paused") && (
                      <Button size="sm" variant={c.status === "paused" ? "default" : "outline"} onClick={() => handleTogglePause(c)} className="h-7 px-2 text-xs">
                        {c.status === "paused" ? <><Play className="w-3 h-3 mr-1" /> Resume</> : <><Pause className="w-3 h-3 mr-1" /> Pause</>}
                      </Button>
                    )}
                    {c.status === "draft" && (
                      <Button size="sm" onClick={() => handleSend(c.id)} disabled={sending === c.id}>
                        {sending === c.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                        Send
                      </Button>
                    )}
                    {c.status === "sent" && (
                      <Button size="sm" variant="outline" onClick={() => handleSend(c.id)} disabled={sending === c.id}>
                        {sending === c.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                        Resend
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SMSCampaigns;
