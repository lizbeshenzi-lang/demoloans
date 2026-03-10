import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, Plus, Trash2, Edit2, Save, X, Loader2 } from "lucide-react";
import AdminCSVImport from "./AdminCSVImport";
import AdminCSVExport from "./AdminCSVExport";
import TablePagination from "./TablePagination";

interface Region { id: string; name: string; code: string; created_at: string; }

const PAGE_SIZE = 15;

const AdminRegions = () => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: "", code: "" });
  const [adding, setAdding] = useState(false);
  const [newData, setNewData] = useState({ name: "", code: "" });
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);

  const fetch = useCallback(async () => {
    const { data } = await supabase.from("regions").select("*").order("name");
    if (data) setRegions(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAdd = async () => {
    if (!newData.name || !newData.code) return;
    setSaving(true);
    const { error } = await supabase.from("regions").insert(newData);
    if (error) toast.error(error.message);
    else { toast.success("Region added"); setAdding(false); setNewData({ name: "", code: "" }); fetch(); }
    setSaving(false);
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    const { error } = await supabase.from("regions").update(editData).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Region updated"); setEditing(null); fetch(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this region? This may affect branches.")) return;
    const { error } = await supabase.from("regions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Region deleted"); fetch(); }
  };

  const filtered = regions.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search regions..." className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div className="flex items-center gap-2">
          <AdminCSVExport target="regions" />
          <AdminCSVImport target="regions" onComplete={fetch} />
          <Button size="sm" onClick={() => setAdding(true)} disabled={adding}><Plus className="w-4 h-4 mr-1" /> Add Region</Button>
        </div>
      </div>

      <div className="bg-background rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/50">
            <th className="text-left p-3 font-semibold text-foreground">Name</th>
            <th className="text-left p-3 font-semibold text-foreground">Code</th>
            <th className="text-right p-3 font-semibold text-foreground">Actions</th>
          </tr></thead>
          <tbody>
            {adding && (
              <tr className="border-b border-border bg-secondary/5">
                <td className="p-2"><input value={newData.name} onChange={e => setNewData(p => ({ ...p, name: e.target.value }))} placeholder="Region name" className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background" /></td>
                <td className="p-2"><input value={newData.code} onChange={e => setNewData(p => ({ ...p, code: e.target.value }))} placeholder="Code" className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background" /></td>
                <td className="p-2 text-right">
                  <Button size="sm" variant="outline" onClick={handleAdd} disabled={saving}><Save className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="ml-1"><X className="w-3 h-3" /></Button>
                </td>
              </tr>
            )}
            {paginated.map(r => (
              <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="p-3">{editing === r.id ? <input value={editData.name} onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} className="w-full px-2 py-1 text-sm border border-border rounded bg-background" /> : r.name}</td>
                <td className="p-3">{editing === r.id ? <input value={editData.code} onChange={e => setEditData(p => ({ ...p, code: e.target.value }))} className="w-full px-2 py-1 text-sm border border-border rounded bg-background" /> : <span className="text-muted-foreground">{r.code}</span>}</td>
                <td className="p-3 text-right">
                  {editing === r.id ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleSave(r.id)} disabled={saving}><Save className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="ml-1"><X className="w-3 h-3" /></Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(r.id); setEditData({ name: r.name, code: r.code }); }}><Edit2 className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="w-3 h-3" /></Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {paginated.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No regions found</td></tr>}
          </tbody>
        </table>
        <TablePagination page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>
    </div>
  );
};

export default AdminRegions;
