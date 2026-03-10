import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sparkles, Loader2, Copy, Clock, Lightbulb, Zap } from "lucide-react";

const CAMPAIGN_TYPES = [
  { value: "marketing", label: "Marketing" },
  { value: "reminder", label: "Payment Reminder" },
  { value: "recovery", label: "Recovery" },
  { value: "onboarding", label: "Onboarding" },
  { value: "updates", label: "Status Update" },
];

const AUDIENCES = [
  { value: "all clients", label: "All Clients" },
  { value: "overdue clients", label: "Overdue Clients" },
  { value: "active loans", label: "Active Loans" },
  { value: "new clients (last 30 days)", label: "New Clients" },
  { value: "completed loans (potential repeat)", label: "Repeat Borrowers" },
];

interface Template {
  style: string;
  message: string;
  char_count: number;
}

interface AIResult {
  templates: Template[];
  recommended_send_time: string;
  recommended_frequency: string;
  tips: string[];
}

interface AICampaignBuilderProps {
  onUseTemplate?: (template: string) => void;
}

const AICampaignBuilder = ({ onUseTemplate }: AICampaignBuilderProps) => {
  const [campaignType, setCampaignType] = useState("marketing");
  const [audience, setAudience] = useState("all clients");
  const [customInstructions, setCustomInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-campaign-builder", {
        body: {
          campaign_type: campaignType,
          target_audience: audience,
          context_data: {},
          custom_instructions: customInstructions || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as AIResult);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate templates");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const styleColors: Record<string, string> = {
    formal: "border-primary/30 bg-primary/5",
    friendly: "border-kc-green/30 bg-green-50 dark:bg-green-950/20",
    urgent: "border-destructive/30 bg-destructive/5",
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" /> AI Campaign Builder
        </h2>
        <p className="text-sm text-muted-foreground">Generate professional SMS templates powered by AI</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Campaign Type</label>
          <select value={campaignType} onChange={e => setCampaignType(e.target.value)} className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background">
            {CAMPAIGN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Target Audience</label>
          <select value={audience} onChange={e => setAudience(e.target.value)} className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background">
            {AUDIENCES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground mb-1 block">Custom Instructions (optional)</label>
        <Textarea
          value={customInstructions}
          onChange={e => setCustomInstructions(e.target.value)}
          placeholder="E.g. 'Include a festive Jamhuri Day greeting' or 'Mention our new agricultural loan product'"
          className="text-sm"
          rows={2}
        />
      </div>

      <Button onClick={handleGenerate} disabled={loading} className="w-full sm:w-auto">
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
        {loading ? "Generating..." : "Generate Templates"}
      </Button>

      {result && (
        <div className="space-y-4">
          {/* Templates */}
          <div className="grid gap-3">
            {result.templates.map((tpl, i) => (
              <div key={i} className={`rounded-xl border p-4 ${styleColors[tpl.style] || "border-border"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">{tpl.style}</span>
                  <span className="text-xs text-muted-foreground">{tpl.char_count} chars</span>
                </div>
                <p className="text-sm text-foreground font-mono leading-relaxed mb-3">{tpl.message}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(tpl.message)} className="h-7 text-xs">
                    <Copy className="w-3 h-3 mr-1" /> Copy
                  </Button>
                  {onUseTemplate && (
                    <Button size="sm" onClick={() => onUseTemplate(tpl.message)} className="h-7 text-xs">
                      <Zap className="w-3 h-3 mr-1" /> Use Template
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="bg-background rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Best Send Time</span>
              </div>
              <p className="text-sm text-muted-foreground">{result.recommended_send_time}</p>
              <p className="text-xs text-muted-foreground mt-1">Frequency: {result.recommended_frequency}</p>
            </div>
            <div className="bg-background rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-foreground">Pro Tips</span>
              </div>
              <ul className="space-y-1">
                {result.tips.map((tip, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">•</span> {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AICampaignBuilder;
