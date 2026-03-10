import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2, Plus, RefreshCw, Trash2, Link2, Link2Off, Clock, CheckCircle2, XCircle, AlertCircle, Send
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

interface Integration {
  id: string;
  name: string;
  system_type: string;
  base_url: string | null;
  auth_type: string;
  is_active: boolean;
  sync_direction: string;
  last_sync_at: string | null;
  sync_status: string;
  config: Record<string, unknown>;
  created_at: string;
}

interface SyncLog {
  id: string;
  integration_id: string;
  direction: string;
  entity_type: string;
  records_processed: number;
  records_failed: number;
  error_details: unknown;
  started_at: string;
  completed_at: string | null;
  status: string;
}

const SYSTEM_TYPES = [
  { value: "core_banking", label: "Core Banking System" },
  { value: "mpesa", label: "M-Pesa / Mobile Money" },
  { value: "erp", label: "ERP System" },
  { value: "crm", label: "CRM" },
  { value: "other", label: "Other" },
];

const statusIcon = (status: string) => {
  switch (status) {
    case "completed": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case "failed": return <XCircle className="w-4 h-4 text-destructive" />;
    case "running": return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
    case "partial": return <AlertCircle className="w-4 h-4 text-amber-500" />;
    default: return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
};

const AdminIntegrations = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showLogs, setShowLogs] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", system_type: "core_banking", base_url: "", auth_type: "api_key", sync_direction: "inbound" });
  const [syncing, setSyncing] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [intRes, logRes] = await Promise.all([
      supabase.from("system_integrations").select("*").order("created_at", { ascending: false }),
      supabase.from("sync_logs").select("*").order("started_at", { ascending: false }).limit(50),
    ]);
    setIntegrations((intRes.data as unknown as Integration[]) || []);
    setSyncLogs((logRes.data as unknown as SyncLog[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!form.name || !form.system_type) { toast.error("Name and type required"); return; }
    const { error } = await supabase.from("system_integrations").insert({
      name: form.name,
      system_type: form.system_type,
      base_url: form.base_url || null,
      auth_type: form.auth_type,
      sync_direction: form.sync_direction,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Integration added");
    setShowAdd(false);
    setForm({ name: "", system_type: "core_banking", base_url: "", auth_type: "api_key", sync_direction: "inbound" });
    fetchData();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("system_integrations").update({ is_active: !current } as any).eq("id", id);
    fetchData();
  };

  const deleteIntegration = async (id: string) => {
    if (!confirm("Delete this integration and all its sync logs?")) return;
    await supabase.from("system_integrations").delete().eq("id", id);
    toast.success("Integration deleted");
    fetchData();
  };


  const handleSyncNow = async (integrationId: string, name: string) => {
    setSyncing(integrationId);
    try {
      const { data, error } = await supabase.functions.invoke("sync-outbound", {
        body: { integration_id: integrationId, dry_run: true },
      });
      if (error) throw error;
      toast.success(`Sync complete for ${name}: ${data.total_processed} records processed`);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Sync failed");
    }
    setSyncing(null);
  };

  const getWebhookUrl = () => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    return projectId ? `https://${projectId}.supabase.co/functions/v1/webhooks` : "Loading...";
  };

  const getDataSyncUrl = () => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    return projectId ? `https://${projectId}.supabase.co/functions/v1/data-sync` : "Loading...";
  };

  const logsForIntegration = showLogs ? syncLogs.filter(l => l.integration_id === showLogs) : [];

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* API Endpoints */}
      <div className="bg-background rounded-xl shadow-card p-6">
        <h2 className="font-display font-bold text-foreground mb-1">API Endpoints</h2>
        <p className="text-sm text-muted-foreground mb-4">Use these endpoints to connect external systems programmatically.</p>
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 items-start">
            <Badge variant="outline" className="shrink-0 font-mono text-xs">POST</Badge>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Data Sync (Bulk Import)</p>
              <code className="text-xs text-muted-foreground break-all">{getDataSyncUrl()}</code>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-start">
            <Badge variant="outline" className="shrink-0 font-mono text-xs">POST</Badge>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Webhooks (Inbound Events)</p>
              <code className="text-xs text-muted-foreground break-all">{getWebhookUrl()}</code>
            </div>
          </div>
        </div>
      </div>

      {/* Integrations List */}
      <div className="bg-background rounded-xl shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-foreground">Configured Integrations</h2>
            <p className="text-sm text-muted-foreground">Manage connections to external systems.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="w-3 h-3 mr-1" /> Refresh</Button>
            <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-3 h-3 mr-1" /> Add</Button>
          </div>
        </div>

        {integrations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Link2Off className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No integrations configured yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {integrations.map(int => (
                  <TableRow key={int.id}>
                    <TableCell className="font-medium">{int.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {SYSTEM_TYPES.find(t => t.value === int.system_type)?.label || int.system_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm capitalize">{int.sync_direction}</TableCell>
                    <TableCell>
                      <Badge variant={int.is_active ? "default" : "outline"} className="text-xs">
                        {int.is_active ? <Link2 className="w-3 h-3 mr-1" /> : <Link2Off className="w-3 h-3 mr-1" />}
                        {int.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {int.last_sync_at ? format(new Date(int.last_sync_at), "MMM d, HH:mm") : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleSyncNow(int.id, int.name)} disabled={syncing === int.id}>
                          {syncing === int.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                          Sync
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setShowLogs(int.id)}>Logs</Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleActive(int.id, int.is_active)}>
                          {int.is_active ? "Disable" : "Enable"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteIntegration(int.id)}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Recent Sync Logs */}
      <div className="bg-background rounded-xl shadow-card p-6">
        <h2 className="font-display font-bold text-foreground mb-1">Recent Sync Activity</h2>
        <p className="text-sm text-muted-foreground mb-4">Latest 50 sync operations across all integrations.</p>
        {syncLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No sync activity yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncLogs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell><div className="flex items-center gap-1.5">{statusIcon(log.status)} <span className="text-sm capitalize">{log.status}</span></div></TableCell>
                    <TableCell className="text-sm font-mono">{log.entity_type}</TableCell>
                    <TableCell className="text-sm capitalize">{log.direction}</TableCell>
                    <TableCell className="text-sm">{log.records_processed}</TableCell>
                    <TableCell className="text-sm">{log.records_failed > 0 ? <span className="text-destructive">{log.records_failed}</span> : "0"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(log.started_at), "MMM d, HH:mm")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add Integration Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Integration</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Name</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Core Banking - Finacle" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">System Type</label>
              <Select value={form.system_type} onValueChange={v => setForm(f => ({ ...f, system_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SYSTEM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Base URL (optional)</label>
              <Input value={form.base_url} onChange={e => setForm(f => ({ ...f, base_url: e.target.value }))} placeholder="https://api.example.com" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Sync Direction</label>
              <Select value={form.sync_direction} onValueChange={v => setForm(f => ({ ...f, sync_direction: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">Inbound (External → Kechita)</SelectItem>
                  <SelectItem value="outbound">Outbound (Kechita → External)</SelectItem>
                  <SelectItem value="bidirectional">Bidirectional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Integration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog open={!!showLogs} onOpenChange={() => setShowLogs(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Sync Logs — {integrations.find(i => i.id === showLogs)?.name}</DialogTitle></DialogHeader>
          {logsForIntegration.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No sync logs for this integration.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {logsForIntegration.map(log => (
                <div key={log.id} className="border border-border rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    {statusIcon(log.status)}
                    <span className="font-medium capitalize">{log.status}</span>
                    <span className="text-muted-foreground">• {log.entity_type} • {log.direction}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{format(new Date(log.started_at), "MMM d, HH:mm:ss")}</span>
                  </div>
                  <p className="text-muted-foreground">
                    {log.records_processed} processed, {log.records_failed} failed
                  </p>
                  {log.error_details && (
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto max-h-32">
                      {JSON.stringify(log.error_details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminIntegrations;
