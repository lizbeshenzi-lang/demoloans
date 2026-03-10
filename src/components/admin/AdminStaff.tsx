import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { Search, Plus, Trash2, Save, X, Loader2, Edit2 } from "lucide-react";
import AdminCSVImport from "./AdminCSVImport";
import AdminCSVExport from "./AdminCSVExport";
import TablePagination from "./TablePagination";

interface Assignment { id: string; user_id: string; branch_id: string | null; region_id: string | null; assigned_at: string; }
interface Branch { id: string; name: string; }
interface Region { id: string; name: string; }
interface Profile { user_id: string; full_name: string | null; email: string | null; }

const PAGE_SIZE = 20;

const AdminStaff = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState({ branch_id: "", region_id: "" });
  const [newData, setNewData] = useState({ user_id: "", branch_id: "", region_id: "" });
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, branchFilter]);

  const fetchRefs = useCallback(async () => {
    const [b, r] = await Promise.all([
      supabase.from("branches").select("id, name").order("name"),
      supabase.from("regions").select("id, name").order("name"),
    ]);
    if (b.data) setBranches(b.data);
    if (r.data) setRegions(r.data);
  }, []);

  const fetchPage = useCallback(async () => {
    setLoading(true);

    if (debouncedSearch) {
      const { data: matchedProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .or(`full_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);

      const matchedIds = (matchedProfiles || []).map(p => p.user_id);
      if (matchedIds.length === 0) {
        setAssignments([]); setTotalCount(0); setProfiles(new Map()); setLoading(false); return;
      }

      let query = supabase
        .from("staff_assignments")
        .select("*", { count: "exact" })
        .in("user_id", matchedIds)
        .order("assigned_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (branchFilter !== "all") query = query.eq("branch_id", branchFilter);

      const { data, count } = await query;
      setAssignments((data || []) as Assignment[]);
      setTotalCount(count || 0);

      const map = new Map<string, Profile>();
      (matchedProfiles || []).forEach(p => map.set(p.user_id, p));
      setProfiles(map);
    } else {
      let query = supabase
        .from("staff_assignments")
        .select("*", { count: "exact" })
        .order("assigned_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (branchFilter !== "all") query = query.eq("branch_id", branchFilter);

      const { data, count, error } = await query;
      if (error) { toast.error(error.message); setLoading(false); return; }

      const rows = (data || []) as Assignment[];
      setAssignments(rows);
      setTotalCount(count || 0);

      const userIds = rows.map(r => r.user_id);
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds);
        const map = new Map<string, Profile>();
        (profs || []).forEach(p => map.set(p.user_id, p));
        setProfiles(map);
      }
    }

    setLoading(false);
  }, [page, branchFilter, debouncedSearch]);

  useEffect(() => { fetchRefs(); }, [fetchRefs]);
  useEffect(() => { fetchPage(); }, [fetchPage]);

  useEffect(() => {
    if (adding && allProfiles.length === 0) {
      supabase.from("profiles").select("user_id, full_name, email").order("full_name").then(({ data }) => {
        if (data) setAllProfiles(data);
      });
    }
  }, [adding]);

  const getName = (userId: string) => {
    const p = profiles.get(userId);
    return p?.full_name || p?.email || userId.slice(0, 8);
  };
  const branchName = (id: string | null) => (id && branches.find(b => b.id === id)?.name) || "—";
  const regionName = (id: string | null) => (id && regions.find(r => r.id === id)?.name) || "—";

  const handleAdd = async () => {
    if (!newData.user_id) { toast.error("User ID required"); return; }
    setSaving(true);
    const { data, error } = await supabase.from("staff_assignments").insert({
      user_id: newData.user_id, branch_id: newData.branch_id || null, region_id: newData.region_id || null,
    }).select("id").single();
    if (error) toast.error(error.message);
    else {
      await logAudit({ entityType: "staff_assignment", entityId: data.id, action: "assignment_created", newValues: { user_id: newData.user_id, branch_id: newData.branch_id || null, region_id: newData.region_id || null }, notes: "Staff assignment created" });
      toast.success("Assignment added"); setAdding(false); setNewData({ user_id: "", branch_id: "", region_id: "" }); fetchPage();
    }
    setSaving(false);
  };

  const handleEdit = async (id: string) => {
    setSaving(true);
    const old = assignments.find(a => a.id === id);
    const { error } = await supabase.from("staff_assignments").update({
      branch_id: editData.branch_id || null,
      region_id: editData.region_id || null,
    }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      await logAudit({ entityType: "staff_assignment", entityId: id, action: "assignment_updated", oldValues: { branch_id: old?.branch_id, region_id: old?.region_id }, newValues: { branch_id: editData.branch_id || null, region_id: editData.region_id || null }, notes: "Staff assignment updated" });
      toast.success("Assignment updated"); setEditing(null); fetchPage();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this staff assignment?")) return;
    const old = assignments.find(a => a.id === id);
    const { error } = await supabase.from("staff_assignments").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      await logAudit({ entityType: "staff_assignment", entityId: id, action: "assignment_removed", oldValues: { user_id: old?.user_id, branch_id: old?.branch_id, region_id: old?.region_id }, notes: "Staff assignment removed" });
      toast.success("Assignment removed"); fetchPage();
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const inputClass = "px-2 py-1.5 text-sm border border-border rounded bg-background w-full";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff..." className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="text-sm border border-border rounded-lg px-3 py-2 bg-background">
            <option value="all">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <AdminCSVExport target="staff_assignments" />
          <AdminCSVImport target="staff_assignments" onComplete={fetchPage} />
          <Button size="sm" onClick={() => setAdding(true)} disabled={adding}><Plus className="w-4 h-4 mr-1" /> Assign Staff</Button>
        </div>
      </div>

      <div className="bg-background rounded-xl shadow-card overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3 font-semibold text-foreground">Staff Member</th>
              <th className="text-left p-3 font-semibold text-foreground">Branch</th>
              <th className="text-left p-3 font-semibold text-foreground hidden sm:table-cell">Region</th>
              <th className="text-right p-3 font-semibold text-foreground">Actions</th>
            </tr></thead>
            <tbody>
              {adding && (
                <tr className="border-b border-border bg-secondary/5">
                  <td className="p-2">
                    <select value={newData.user_id} onChange={e => setNewData(p => ({ ...p, user_id: e.target.value }))} className={inputClass}>
                      <option value="">Select user</option>
                      {allProfiles.map(p => <option key={p.user_id} value={p.user_id}>{p.full_name || p.email || p.user_id.slice(0, 8)}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <select value={newData.branch_id} onChange={e => setNewData(p => ({ ...p, branch_id: e.target.value }))} className={inputClass}>
                      <option value="">None</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </td>
                  <td className="p-2 hidden sm:table-cell">
                    <select value={newData.region_id} onChange={e => setNewData(p => ({ ...p, region_id: e.target.value }))} className={inputClass}>
                      <option value="">None</option>
                      {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </td>
                  <td className="p-2 text-right">
                    <Button size="sm" variant="outline" onClick={handleAdd} disabled={saving}><Save className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="ml-1"><X className="w-3 h-3" /></Button>
                  </td>
                </tr>
              )}
              {assignments.map(a => (
                <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-3 font-medium text-foreground">{getName(a.user_id)}</td>
                  <td className="p-3">
                    {editing === a.id ? (
                      <select value={editData.branch_id} onChange={e => setEditData(p => ({ ...p, branch_id: e.target.value }))} className={inputClass}>
                        <option value="">None</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    ) : (
                      <span className="text-muted-foreground">{branchName(a.branch_id)}</span>
                    )}
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    {editing === a.id ? (
                      <select value={editData.region_id} onChange={e => setEditData(p => ({ ...p, region_id: e.target.value }))} className={inputClass}>
                        <option value="">None</option>
                        {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    ) : (
                      <span className="text-muted-foreground">{regionName(a.region_id)}</span>
                    )}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {editing === a.id ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(a.id)} disabled={saving}><Save className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="ml-1"><X className="w-3 h-3" /></Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="ghost" title="Edit assignment" onClick={() => { setEditing(a.id); setEditData({ branch_id: a.branch_id || "", region_id: a.region_id || "" }); }}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" title="Remove assignment" onClick={() => handleDelete(a.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {assignments.length === 0 && !adding && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No assignments found</td></tr>}
            </tbody>
          </table>
        )}
        <TablePagination page={page} totalPages={totalPages} totalItems={totalCount} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>
    </div>
  );
};

export default AdminStaff;
