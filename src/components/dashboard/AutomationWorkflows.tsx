import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Zap, Plus, Loader2, Play, Pause, Trash2, Clock,
  AlertTriangle, Bell, Users, DollarSign, FileCheck
} from "lucide-react";

const TRIGGER_CONDITIONS = [
  { value: "overdue_days_gt_3", label: "Overdue > 3 days", icon: AlertTriangle, desc: "Client is 3+ days overdue on payment" },
  { value: "overdue_days_gt_7", label: "Overdue > 7 days", icon: AlertTriangle, desc: "Client is 7+ days overdue — escalation" },
  { value: "overdue_days_gt_14", label: "Overdue > 14 days", icon: AlertTriangle, desc: "Client is 14+ days overdue — final notice" },
  { value: "payment_due_2_days", label: "Payment due in 2 days", icon: Clock, desc: "Reminder before upcoming payment" },
  { value: "payment_due_today", label: "Payment due today", icon: Bell, desc: "Same-day payment reminder" },
  { value: "new_disbursement", label: "New disbursement", icon: DollarSign, desc: "Loan just disbursed — welcome message" },
  { value: "kyc_pending_3_days", label: "KYC pending 3+ days", icon: FileCheck, desc: "Documents pending review for 3+ days" },
  { value: "loan_approved", label: "Loan approved", icon: Users, desc: "Loan application approved" },
];

interface Rule {
  id: string;
  name: string;
  description: string | null;
  trigger_condition: string;
  trigger_params: any;
  action_template: string;
  action_campaign_type: string;
  target_hierarchy: string;
  is_active: boolean;
  created_by: string;
  last_triggered_at: string | null;
  trigger_count: number;
  created_at: string;
}

const AutomationWorkflows = () => {
  const { user } = useAuth();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("overdue_days_gt_7");
  const [template, setTemplate] = useState("");
  const [campaignType, setCampaignType] = useState("recovery");
  const [targetHierarchy, setTargetHierarchy] = useState("all");

  const fetchRules = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sms_automation_rules")
      .select("*")
      .order("created_at", { ascending: false });
    setRules((data || []) as Rule[]);
    setLoading(false);
  };

  useEffect(() => { fetchRules(); }, []);

  const handleCreate = async () => {
    if (!name || !template) { toast.error("Name and template required"); return; }
    setSaving(true);
    const { error } = await supabase.from("sms_automation_rules").insert({
      name,
      description: description || null,
      trigger_condition: trigger,
      action_template: template,
      action_campaign_type: campaignType,
      target_hierarchy: targetHierarchy,
      created_by: user!.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Automation rule created");
      setShowForm(false);
      setName(""); setDescription(""); setTemplate("");
      fetchRules();
    }
    setSaving(false);
  };

  const toggleRule = async (rule: Rule) => {
    const { error } = await supabase
      .from("sms_automation_rules")
      .update({ is_active: !rule.is_active })
      .eq("id", rule.id);
    if (error) toast.error(error.message);
    else {
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
      toast.success(rule.is_active ? "Rule paused" : "Rule activated");
    }
  };

  const deleteRule = async (id: string) => {
    const { error } = await supabase.from("sms_automation_rules").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      setRules(prev => prev.filter(r => r.id !== id));
      toast.success("Rule deleted");
    }
  };

  const triggerDef = (condition: string) => TRIGGER_CONDITIONS.find(t => t.value === condition);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" /> Automation Workflows
          </h2>
          <p className="text-sm text-muted-foreground">Set up rules that auto-trigger SMS based on conditions</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1" /> New Rule
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-background rounded-xl border border-border p-5 space-y-4">
          <h3 className="font-semibold font-display text-foreground text-sm">Create Automation Rule</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Rule Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 7-day overdue reminder" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Trigger Condition</label>
              <select value={trigger} onChange={e => setTrigger(e.target.value)} className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background">
                {TRIGGER_CONDITIONS.map(t => <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Description</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this rule do?" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">SMS Template</label>
            <Textarea value={template} onChange={e => setTemplate(e.target.value)} placeholder="Dear {client_name}, your payment of KES {amount} is overdue by {days} days..." rows={3} />
            <p className="text-xs text-muted-foreground mt-1">Use placeholders: {"{client_name}"}, {"{amount}"}, {"{due_date}"}, {"{days}"}, {"{branch_name}"}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Campaign Type</label>
              <select value={campaignType} onChange={e => setCampaignType(e.target.value)} className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background">
                <option value="recovery">Recovery</option>
                <option value="reminder">Reminder</option>
                <option value="onboarding">Onboarding</option>
                <option value="updates">Updates</option>
                <option value="marketing">Marketing</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Target</label>
              <select value={targetHierarchy} onChange={e => setTargetHierarchy(e.target.value)} className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background">
                <option value="all">All matching clients</option>
                <option value="overdue">Overdue only</option>
                <option value="active">Active loans only</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />} Create Rule
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Rules List */}
      {rules.length === 0 ? (
        <div className="bg-background rounded-xl border border-border p-8 text-center">
          <Zap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No automation rules yet. Create one to auto-send SMS based on conditions.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {rules.map(rule => {
            const def = triggerDef(rule.trigger_condition);
            const Icon = def?.icon || Zap;
            return (
              <div key={rule.id} className={`bg-background rounded-xl border p-4 ${rule.is_active ? "border-primary/20" : "border-border opacity-60"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${rule.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground text-sm">{rule.name}</h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${rule.is_active ? "bg-kc-green/10 text-kc-green" : "bg-muted text-muted-foreground"}`}>
                          {rule.is_active ? "Active" : "Paused"}
                        </span>
                      </div>
                      {rule.description && <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>Trigger: <strong>{def?.label || rule.trigger_condition}</strong></span>
                        <span>Type: <strong className="capitalize">{rule.action_campaign_type}</strong></span>
                        <span>Fired: <strong>{rule.trigger_count}x</strong></span>
                        {rule.last_triggered_at && (
                          <span>Last: {new Date(rule.last_triggered_at).toLocaleDateString()}</span>
                        )}
                      </div>
                      <div className="mt-2 bg-muted/50 rounded-lg p-2">
                        <p className="text-xs text-muted-foreground font-mono">{rule.action_template.slice(0, 160)}...</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={rule.is_active} onCheckedChange={() => toggleRule(rule)} />
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => deleteRule(rule.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
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

export default AutomationWorkflows;
