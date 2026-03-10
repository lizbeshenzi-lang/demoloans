import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { History, Search, Filter, ChevronLeft, ChevronRight, FileText, DollarSign, User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  performed_by: string | null;
  notes: string | null;
  created_at: string;
}

interface Profile {
  user_id: string;
  full_name: string | null;
}

interface Props {
  profiles: Profile[];
}

const ACTION_STYLES: Record<string, { color: string; icon: typeof FileText }> = {
  approved: { color: "bg-blue-100 text-blue-800", icon: Shield },
  rejected: { color: "bg-red-100 text-red-800", icon: Shield },
  disbursed: { color: "bg-green-100 text-green-800", icon: DollarSign },
  completed: { color: "bg-kc-green/20 text-kc-green", icon: FileText },
  status_change: { color: "bg-amber-100 text-amber-800", icon: FileText },
  payment_paid: { color: "bg-green-100 text-green-800", icon: DollarSign },
  payment_partial: { color: "bg-amber-100 text-amber-800", icon: DollarSign },
  payment_overdue: { color: "bg-red-100 text-red-800", icon: DollarSign },
};

const AuditTrail = ({ profiles }: Props) => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    const fetchAudit = async () => {
      setLoading(true);
      let query = supabase.from("audit_log").select("*")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (typeFilter !== "all") query = query.eq("entity_type", typeFilter);

      const { data } = await query;
      if (data) setEntries(data as AuditEntry[]);
      setLoading(false);
    };
    fetchAudit();
  }, [page, typeFilter]);

  const getPerformerName = (id: string | null) => {
    if (!id) return "System";
    const p = profiles.find(p => p.user_id === id);
    return p?.full_name || id.slice(0, 8) + "...";
  };

  const filteredEntries = entries.filter(e => {
    if (!search) return true;
    const term = search.toLowerCase();
    return e.action.includes(term) || e.entity_type.includes(term) ||
      (e.notes && e.notes.toLowerCase().includes(term)) ||
      getPerformerName(e.performed_by).toLowerCase().includes(term);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold font-display text-foreground">Audit Trail</h2>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search actions, users, notes..."
            className="pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background w-full" />
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(0); }}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-background">
          <option value="all">All Types</option>
          <option value="loan_application">Loan Changes</option>
          <option value="loan_repayment">Repayments</option>
        </select>
      </div>

      <div className="bg-background rounded-xl shadow-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading audit trail...</div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No audit entries found</div>
        ) : (
          <>
            <div className="divide-y divide-border/50">
              {filteredEntries.map(entry => {
                const style = ACTION_STYLES[entry.action] || ACTION_STYLES.status_change;
                const Icon = style.icon;
                return (
                  <div key={entry.id} className="p-4 flex items-start gap-3 hover:bg-muted/20 transition-colors">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", style.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", style.color)}>
                          {entry.action.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {entry.entity_type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span className="font-medium text-foreground">{getPerformerName(entry.performed_by)}</span>
                        <span>·</span>
                        <span>{new Date(entry.created_at).toLocaleString()}</span>
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">"{entry.notes}"</p>
                      )}
                      {entry.old_values && entry.new_values && (
                        <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                          <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded">{entry.old_values.status || "—"}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded">{entry.new_values.status || "—"}</span>
                          {entry.new_values.amount_approved && (
                            <span className="text-muted-foreground ml-1">· KES {Number(entry.new_values.amount_approved).toLocaleString()}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-1">
                      {entry.entity_id.slice(0, 8)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between p-3 border-t border-border bg-muted/30">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40">
                <ChevronLeft className="w-3 h-3" /> Previous
              </button>
              <span className="text-xs text-muted-foreground">Page {page + 1}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={entries.length < PAGE_SIZE}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40">
                Next <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuditTrail;
