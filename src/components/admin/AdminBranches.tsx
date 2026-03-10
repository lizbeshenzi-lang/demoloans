import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, Plus, Trash2, Edit2, Save, X, Loader2 } from "lucide-react";
import AdminCSVImport from "./AdminCSVImport";
import AdminCSVExport from "./AdminCSVExport";
import TablePagination from "./TablePagination";

interface Branch { id: string; name: string; code: string; location: string | null; region_id: string; }
interface Region { id: string; name: string; }

const PAGE_SIZE = 15;

const AdminBranches = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: "", code: "", location: "", region_id: "" });
  const [adding, setAdding] = useState(false);
  const [newData, setNewData] = useState({ name: "", code: "", location: "", region_id: "" });
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [regionFilter, setRegionFilter] = useState("all");

  const fetch = useCallback(async () => {
    const [b, r] = await Promise.all([
      supabase.from("branches").select("*").order("name"),
      supabase.from("regions").select("id, name").order("name"),
    ]);
    if (b.data) setBranches(b.data);
    if (r.data) setRegions(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const regionName = (id: string) => regions.find(r => r.id === id)?.name || "—";

  const handleAdd = async () => {
    if (!newData.name || !newData.code || !newData.region_id) return;
    setSaving(true);
    const { error } = await supabase.from("branches").insert({ name: newData.name, code: newData.code, location: newData.location || null, region_id: newData.region_id });
    if (error) toast.error(error.message);
    else { toast.success("Branch added"); setAdding(false); setNewData({ name: "", code: "", location: "", region_id: "" }); fetch(); }
    setSaving(false);
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    const { error } = await supabase.from("branches").update({ name: editData.name, code: editData.code, location: editData.location || null, region_id: editData.region_id }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Branch updated"); setEditing(null); fetch(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this branch?")) return;
    const { error } = await supabase.from("branches").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Branch deleted"); fetch(); }
  };

  const filtered = branches.filter(b => {
    const matchRegion = regionFilter === "all" || b.region_id === regionFilter;
    const term = search.toLowerCase();
    const matchSearch = !term || b.name.toLowerCase().includes(term) || b.code.toLowerCase().includes(term) || (b.location || "").toLowerCase().includes(term);
    return matchRegion && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectClass = "px-2 py-1.5 text-sm border border-border rounded bg-background w-full";

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search branches..." className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <select value={regionFilter} onChange={e => { setRegionFilter(e.target.value); setPage(1); }} className="text-sm border border-border rounded-lg px-3 py-2 bg-background">
            <option value="all">All Regions ({branches.length})</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name} ({branches.filter(b => b.region_id === r.id).length})</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <AdminCSVExport target="branches" />
          <AdminCSVImport target="branches" onComplete={fetch} />
          <Button size="sm" onClick={() => setAdding(true)} disabled={adding}><Plus className="w-4 h-4 mr-1" /> Add Branch</Button>
        </div>
      </div>

      <div className="bg-background rounded-xl shadow-card overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/50">
            <th className="text-left p-3 font-semibold text-foreground">Name</th>
            <th className="text-left p-3 font-semibold text-foreground">Code</th>
            <th className="text-left p-3 font-semibold text-foreground hidden md:table-cell">Location</th>
            <th className="text-left p-3 font-semibold text-foreground">Region</th>
            <th className="text-right p-3 font-semibold text-foreground">Actions</th>
          </tr></thead>
          <tbody>
            {adding && (
              <tr className="border-b border-border bg-secondary/5">
                <td className="p-2"><input value={newData.name} onChange={e => setNewData(p => ({ ...p, name: e.target.value }))} placeholder="Branch name" className={selectClass} /></td>
                <td className="p-2"><input value={newData.code} onChange={e => setNewData(p => ({ ...p, code: e.target.value }))} placeholder="Code" className={selectClass} /></td>
                <td className="p-2 hidden md:table-cell"><input value={newData.location} onChange={e => setNewData(p => ({ ...p, location: e.target.value }))} placeholder="Location" className={selectClass} /></td>
                <td className="p-2">
                  <select value={newData.region_id} onChange={e => setNewData(p => ({ ...p, region_id: e.target.value }))} className={selectClass}>
                    <option value="">Select region</option>
                    {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </td>
                <td className="p-2 text-right">
                  <Button size="sm" variant="outline" onClick={handleAdd} disabled={saving}><Save className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="ml-1"><X className="w-3 h-3" /></Button>
                </td>
              </tr>
            )}
            {paginated.map(b => (
              <tr key={b.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="p-3">{editing === b.id ? <input value={editData.name} onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} className={selectClass} /> : b.name}</td>
                <td className="p-3">{editing === b.id ? <input value={editData.code} onChange={e => setEditData(p => ({ ...p, code: e.target.value }))} className={selectClass} /> : <span className="text-muted-foreground">{b.code}</span>}</td>
                <td className="p-3 hidden md:table-cell">{editing === b.id ? <input value={editData.location} onChange={e => setEditData(p => ({ ...p, location: e.target.value }))} className={selectClass} /> : <span className="text-muted-foreground">{b.location || "—"}</span>}</td>
                <td className="p-3">{editing === b.id ? (
                  <select value={editData.region_id} onChange={e => setEditData(p => ({ ...p, region_id: e.target.value }))} className={selectClass}>
                    {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                ) : regionName(b.region_id)}</td>
                <td className="p-3 text-right">
                  {editing === b.id ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleSave(b.id)} disabled={saving}><Save className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="ml-1"><X className="w-3 h-3" /></Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(b.id); setEditData({ name: b.name, code: b.code, location: b.location || "", region_id: b.region_id }); }}><Edit2 className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(b.id)}><Trash2 className="w-3 h-3" /></Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {paginated.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No branches found</td></tr>}
          </tbody>
        </table>
        <TablePagination page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>
    </div>
  );
};

export default AdminBranches;
