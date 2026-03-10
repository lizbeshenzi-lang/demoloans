import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import TablePagination from "./TablePagination";
import {
  MessageSquare, Send, Loader2, CheckCircle, XCircle,
  Megaphone, Bell, ShieldAlert, Users, TrendingUp, Eye, Trash2,
  Search, Filter, Clock, Zap, BarChart3, Phone, RefreshCw
} from "lucide-react";

const TYPE_ICONS: Record<string, React.ElementType> = {
  marketing: Megaphone, onboarding: Users, reminder: Bell,
  recovery: ShieldAlert, updates: TrendingUp, approval: Zap,
};

type ViewMode = "campaigns" | "all-messages" | "campaign-messages";

const AdminSMSCampaigns = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [campaignMessages, setCampaignMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("campaigns");
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [msgPage, setMsgPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0, queued: 0 });
  const pageSize = 20;

  useEffect(() => { fetchCampaigns(); }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data } = await supabase.from("sms_campaigns").select("*").order("created_at", { ascending: false }).limit(100);
    setCampaigns(data || []);
    setLoading(false);
  };

  const fetchAllMessages = async () => {
    setMessagesLoading(true);
    const { data, count } = await supabase
      .from("sms_messages")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(500);
    
    const msgs = data || [];
    setAllMessages(msgs);
    setStats({
      total: count || msgs.length,
      sent: msgs.filter(m => m.status === "sent" || m.status === "delivered").length,
      failed: msgs.filter(m => m.status === "failed").length,
      queued: msgs.filter(m => m.status === "queued").length,
    });
    setMessagesLoading(false);
  };

  const viewCampaignMessages = async (campaign: any) => {
    setSelectedCampaign(campaign);
    setViewMode("campaign-messages");
    setMsgPage(1);
    setMessagesLoading(true);
    const { data } = await supabase.from("sms_messages").select("*").eq("campaign_id", campaign.id).order("created_at", { ascending: false }).limit(200);
    setCampaignMessages(data || []);
    setMessagesLoading(false);
  };

  const openAllMessages = () => {
    setViewMode("all-messages");
    setMsgPage(1);
    fetchAllMessages();
  };

  const deleteCampaign = async (id: string) => {
    const { error } = await supabase.from("sms_campaigns").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Campaign deleted"); fetchCampaigns(); }
  };

  const getFilteredMessages = (msgs: any[]) => {
    return msgs.filter(m => {
      const matchStatus = statusFilter === "all" || m.status === statusFilter;
      const term = search.toLowerCase();
      const matchSearch = !term || 
        (m.recipient_name || "").toLowerCase().includes(term) ||
        m.recipient_phone.includes(term) ||
        m.message_body.toLowerCase().includes(term);
      return matchStatus && matchSearch;
    });
  };

  const pagedCampaigns = campaigns.slice((page - 1) * pageSize, page * pageSize);

  // ── Message Table (shared between views) ────────────────────────
  const renderMessageTable = (msgs: any[], currentPage: number, setCurrentPage: (p: number) => void) => {
    const filtered = getFilteredMessages(msgs);
    const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const totalPages = Math.ceil(filtered.length / pageSize);

    return (
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="Search by name, phone, or message..." className="pl-9 h-9" />
          </div>
          <select
            className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm h-9"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="queued">Queued</option>
          </select>
        </div>

        <p className="text-xs text-muted-foreground">{filtered.length} messages {statusFilter !== "all" ? `(${statusFilter})` : ""}</p>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b border-border text-left">
                <th className="p-3 text-muted-foreground font-medium">Recipient</th>
                <th className="p-3 text-muted-foreground font-medium">Phone</th>
                <th className="p-3 text-muted-foreground font-medium">Status</th>
                <th className="p-3 text-muted-foreground font-medium">Message</th>
                <th className="p-3 text-muted-foreground font-medium">Error</th>
                <th className="p-3 text-muted-foreground font-medium">Sent At</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(m => (
                <tr key={m.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-foreground font-medium">{m.recipient_name || "—"}</td>
                  <td className="p-3 text-foreground">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-muted-foreground" />{m.recipient_phone}</span>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                      m.status === "sent" || m.status === "delivered" ? "bg-green-100 text-green-700" :
                      m.status === "failed" ? "bg-destructive/10 text-destructive" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {m.status === "sent" || m.status === "delivered" ? <CheckCircle className="w-3 h-3" /> :
                       m.status === "failed" ? <XCircle className="w-3 h-3" /> :
                       <Clock className="w-3 h-3" />}
                      {m.status}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground max-w-[250px]">
                    <p className="truncate text-xs" title={m.message_body}>{m.message_body}</p>
                  </td>
                  <td className="p-3 text-xs text-destructive max-w-[150px] truncate">{m.error_message || "—"}</td>
                  <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                    {m.sent_at ? new Date(m.sent_at).toLocaleString() : m.created_at ? new Date(m.created_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No messages found
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination page={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={pageSize} onPageChange={setCurrentPage} />
      </div>
    );
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  // ── Campaign Messages View ────────────────────────────────────
  if (viewMode === "campaign-messages" && selectedCampaign) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold font-display text-foreground">Campaign: {selectedCampaign.name}</h3>
            <p className="text-xs text-muted-foreground">{selectedCampaign.campaign_type} · {selectedCampaign.sms_provider}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setViewMode("campaigns"); setSearch(""); setStatusFilter("all"); }}>← Back to Campaigns</Button>
        </div>
        {messagesLoading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : renderMessageTable(campaignMessages, msgPage, setMsgPage)}
      </div>
    );
  }

  // ── All Messages Log View ─────────────────────────────────────
  if (viewMode === "all-messages") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold font-display text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> SMS Delivery Log
            </h3>
            <p className="text-xs text-muted-foreground">All automated and campaign messages</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAllMessages}><RefreshCw className="w-3 h-3 mr-1" /> Refresh</Button>
            <Button variant="outline" size="sm" onClick={() => { setViewMode("campaigns"); setSearch(""); setStatusFilter("all"); }}>← Back</Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-background rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold font-display text-foreground">{stats.total}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Delivered</span>
            </div>
            <p className="text-2xl font-bold font-display text-green-600">{stats.sent}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Failed</span>
            </div>
            <p className="text-2xl font-bold font-display text-destructive">{stats.failed}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Queued</span>
            </div>
            <p className="text-2xl font-bold font-display text-amber-500">{stats.queued}</p>
          </div>
        </div>

        {messagesLoading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : renderMessageTable(allMessages, msgPage, setMsgPage)}
      </div>
    );
  }

  // ── Campaigns List (default) ──────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">{campaigns.length} campaigns</p>
        <Button size="sm" onClick={openAllMessages}>
          <BarChart3 className="w-4 h-4 mr-1" /> View All SMS Logs
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b border-border text-left">
              <th className="p-3 text-muted-foreground font-medium">Campaign</th>
              <th className="p-3 text-muted-foreground font-medium">Type</th>
              <th className="p-3 text-muted-foreground font-medium">Provider</th>
              <th className="p-3 text-muted-foreground font-medium">Status</th>
              <th className="p-3 text-muted-foreground font-medium">Sent / Failed</th>
              <th className="p-3 text-muted-foreground font-medium">Created</th>
              <th className="p-3 text-muted-foreground font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedCampaigns.map(c => {
              const Icon = TYPE_ICONS[c.campaign_type] || Megaphone;
              return (
                <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-foreground font-medium">{c.name}</td>
                  <td className="p-3"><span className="flex items-center gap-1 text-xs"><Icon className="w-3 h-3" /> {c.campaign_type}</span></td>
                  <td className="p-3 text-xs text-muted-foreground">{c.sms_provider}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === "sent" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>{c.status}</span>
                  </td>
                  <td className="p-3 text-xs">
                    <span className="text-green-600 font-medium">{c.total_delivered}</span>
                    <span className="text-muted-foreground"> / </span>
                    <span className="text-destructive font-medium">{c.total_failed}</span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => viewCampaignMessages(c)} title="View messages"><Eye className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteCampaign(c.id)} title="Delete"><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {campaigns.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No campaigns yet
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <TablePagination page={page} totalPages={Math.ceil(campaigns.length / pageSize)} totalItems={campaigns.length} pageSize={pageSize} onPageChange={setPage} />
    </div>
  );
};

export default AdminSMSCampaigns;
