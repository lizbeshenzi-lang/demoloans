import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { Search, Trash2, Edit2, Save, X, Loader2, Shield, Plus, UserCog } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import TablePagination from "./TablePagination";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRole { id: string; user_id: string; role: AppRole; created_at: string; }
interface Profile { user_id: string; full_name: string | null; email: string | null; phone: string | null; national_id?: string | null; }

const ROLES: AppRole[] = ["admin", "user", "ceo", "gm", "regional_manager", "branch_manager", "loan_officer"];
const PAGE_SIZE = 20;

const AdminUsers = () => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<AppRole>("user");
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [editProfileData, setEditProfileData] = useState<{ full_name: string; email: string; phone: string }>({ full_name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [adding, setAdding] = useState(false);
  const [newRoleData, setNewRoleData] = useState({ user_id: "", role: "user" as AppRole });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, roleFilter]);

  const fetchCounts = useCallback(async () => {
    const counts: Record<string, number> = {};
    const { count: total } = await supabase.from("user_roles").select("*", { count: "exact", head: true });
    counts.all = total || 0;
    await Promise.all(ROLES.map(async (r) => {
      const { count } = await supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", r);
      counts[r] = count || 0;
    }));
    setRoleCounts(counts);
  }, []);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("user_roles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (roleFilter !== "all") query = query.eq("role", roleFilter as AppRole);

    const { data, count, error } = await query;
    if (error) { toast.error(error.message); setLoading(false); return; }

    const roleData = (data || []) as UserRole[];
    setRoles(roleData);
    setTotalCount(count || 0);

    const userIds = roleData.map(r => r.user_id);
    if (userIds.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email, phone, national_id").in("user_id", userIds);
      const map = new Map<string, Profile>();
      (profs || []).forEach(p => map.set(p.user_id, p));
      setProfiles(map);
    }

    setLoading(false);
  }, [page, roleFilter]);

  const fetchSearchPage = useCallback(async () => {
    if (!debouncedSearch) { fetchPage(); return; }
    setLoading(true);

    const { data: matchedProfiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, phone")
      .or(`full_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,national_id.ilike.%${debouncedSearch}%`);

    const matchedIds = (matchedProfiles || []).map(p => p.user_id);
    if (matchedIds.length === 0) {
      setRoles([]); setTotalCount(0); setProfiles(new Map()); setLoading(false); return;
    }

    let query = supabase
      .from("user_roles")
      .select("*", { count: "exact" })
      .in("user_id", matchedIds)
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (roleFilter !== "all") query = query.eq("role", roleFilter as AppRole);

    const { data, count } = await query;
    setRoles((data || []) as UserRole[]);
    setTotalCount(count || 0);

    const map = new Map<string, Profile>();
    (matchedProfiles || []).forEach(p => map.set(p.user_id, p));
    setProfiles(map);
    setLoading(false);
  }, [page, roleFilter, debouncedSearch]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);
  useEffect(() => { fetchSearchPage(); }, [fetchSearchPage]);

  // Lazy-load all profiles when adding
  useEffect(() => {
    if (adding && allProfiles.length === 0) {
      supabase.from("profiles").select("user_id, full_name, email, phone").order("full_name").then(({ data }) => {
        if (data) setAllProfiles(data);
      });
    }
  }, [adding]);

  const getProfile = (userId: string) => profiles.get(userId);

  const handleSaveRole = async (id: string) => {
    setSaving(true);
    const oldRole = roles.find(r => r.id === id);
    const { error } = await supabase.from("user_roles").update({ role: editRole }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      await logAudit({ entityType: "user_role", entityId: oldRole?.user_id || id, action: "role_changed", oldValues: { role: oldRole?.role }, newValues: { role: editRole }, notes: `Role changed from ${oldRole?.role} to ${editRole}` });
      toast.success("Role updated"); setEditing(null); fetchSearchPage(); fetchCounts();
    }
    setSaving(false);
  };

  const handleAddRole = async () => {
    if (!newRoleData.user_id) { toast.error("Select a user"); return; }
    setSaving(true);
    const { error } = await supabase.from("user_roles").insert({ user_id: newRoleData.user_id, role: newRoleData.role });
    if (error) {
      if (error.message.includes("duplicate") || error.message.includes("unique")) {
        toast.error("This user already has this role");
      } else {
        toast.error(error.message);
      }
    } else {
      await logAudit({ entityType: "user_role", entityId: newRoleData.user_id, action: "role_assigned", newValues: { role: newRoleData.role }, notes: `Assigned role: ${newRoleData.role}` });
      toast.success("Role assigned"); setAdding(false); setNewRoleData({ user_id: "", role: "user" }); fetchSearchPage(); fetchCounts();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this user's role? They will lose all access.")) return;
    const oldRole = roles.find(r => r.id === id);
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      await logAudit({ entityType: "user_role", entityId: oldRole?.user_id || id, action: "role_removed", oldValues: { role: oldRole?.role }, notes: `Removed role: ${oldRole?.role}` });
      toast.success("Role removed"); fetchSearchPage(); fetchCounts();
    }
  };

  const handleSaveProfile = async (userId: string) => {
    setSaving(true);
    const oldProfile = getProfile(userId);
    const { error } = await supabase.from("profiles").update({
      full_name: editProfileData.full_name || null,
      email: editProfileData.email || null,
      phone: editProfileData.phone || null,
    }).eq("user_id", userId);
    if (error) toast.error(error.message);
    else {
      await logAudit({ entityType: "profile", entityId: userId, action: "profile_updated", oldValues: { full_name: oldProfile?.full_name, email: oldProfile?.email, phone: oldProfile?.phone }, newValues: { ...editProfileData }, notes: "Admin edited user profile" });
      toast.success("Profile updated");
      setEditingProfile(null);
      setProfiles(prev => {
        const next = new Map(prev);
        next.set(userId, { user_id: userId, ...editProfileData });
        return next;
      });
    }
    setSaving(false);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getRoleBadge = (role: string) => {
    const m: Record<string, string> = {
      admin: "bg-destructive/10 text-destructive", ceo: "bg-primary/10 text-primary", gm: "bg-primary/10 text-primary",
      regional_manager: "bg-amber-100 text-amber-800", branch_manager: "bg-blue-100 text-blue-800",
      loan_officer: "bg-green-100 text-green-800", user: "bg-muted text-muted-foreground",
    };
    return m[role] || m.user;
  };

  const inputClass = "px-2 py-1.5 text-sm border border-border rounded bg-background w-full";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="text-sm border border-border rounded-lg px-3 py-2 bg-background">
            <option value="all">All Roles ({roleCounts.all || 0})</option>
            {ROLES.map(r => <option key={r} value={r}>{r.replace("_", " ")} ({roleCounts[r] || 0})</option>)}
          </select>
        </div>
        <Button size="sm" onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="w-4 h-4 mr-1" /> Assign Role
        </Button>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {ROLES.map(r => (
          <div key={r} className={`bg-background rounded-lg p-2 shadow-card text-center cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all ${roleFilter === r ? "ring-2 ring-primary" : ""}`} onClick={() => setRoleFilter(roleFilter === r ? "all" : r)}>
            <p className="text-lg font-bold font-display text-foreground">{roleCounts[r] || 0}</p>
            <p className="text-[9px] text-muted-foreground uppercase truncate">{r.replace("_", " ")}</p>
          </div>
        ))}
      </div>

      <div className="bg-background rounded-xl shadow-card overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <table className="w-full text-sm">
             <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3 font-semibold text-foreground">User</th>
              <th className="text-left p-3 font-semibold text-foreground hidden sm:table-cell">Email</th>
              <th className="text-left p-3 font-semibold text-foreground hidden md:table-cell">Phone</th>
              <th className="text-left p-3 font-semibold text-foreground hidden lg:table-cell">ID Number</th>
              <th className="text-left p-3 font-semibold text-foreground">Role</th>
              <th className="text-right p-3 font-semibold text-foreground">Actions</th>
            </tr></thead>
            <tbody>
              {adding && (
                <tr className="border-b border-border bg-secondary/5">
                  <td className="p-2" colSpan={2}>
                    <select value={newRoleData.user_id} onChange={e => setNewRoleData(p => ({ ...p, user_id: e.target.value }))} className={inputClass}>
                      <option value="">Select user...</option>
                      {allProfiles.map(p => (
                        <option key={p.user_id} value={p.user_id}>{p.full_name || p.email || p.user_id.slice(0, 8)}</option>
                      ))}
                    </select>
                  </td>
                   <td className="p-2 hidden md:table-cell"></td>
                  <td className="p-2 hidden lg:table-cell"></td>
                  <td className="p-2">
                    <select value={newRoleData.role} onChange={e => setNewRoleData(p => ({ ...p, role: e.target.value as AppRole }))} className={inputClass}>
                      {ROLES.map(role => <option key={role} value={role}>{role.replace("_", " ")}</option>)}
                    </select>
                  </td>
                  <td className="p-2 text-right">
                    <Button size="sm" variant="outline" onClick={handleAddRole} disabled={saving}><Save className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="ml-1"><X className="w-3 h-3" /></Button>
                  </td>
                </tr>
              )}
              {roles.map(r => {
                const prof = getProfile(r.user_id);
                const isEditingProfile = editingProfile === r.user_id;
                return (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3">
                      {isEditingProfile ? (
                        <Input value={editProfileData.full_name} onChange={e => setEditProfileData(p => ({ ...p, full_name: e.target.value }))} placeholder="Full name" className="h-8 text-sm" />
                      ) : (
                        <>
                          <p className="font-medium text-foreground">{prof?.full_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">{prof?.email || r.user_id.slice(0, 8)}</p>
                        </>
                      )}
                    </td>
                    <td className="p-3 hidden sm:table-cell">
                      {isEditingProfile ? (
                        <Input value={editProfileData.email} onChange={e => setEditProfileData(p => ({ ...p, email: e.target.value }))} placeholder="Email" className="h-8 text-sm" />
                      ) : (
                        <span className="text-muted-foreground">{prof?.email || "—"}</span>
                      )}
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      {isEditingProfile ? (
                        <Input value={editProfileData.phone} onChange={e => setEditProfileData(p => ({ ...p, phone: e.target.value }))} placeholder="Phone" className="h-8 text-sm" />
                      ) : (
                        <span className="text-muted-foreground">{prof?.phone || "—"}</span>
                      )}
                     </td>
                    <td className="p-3 hidden lg:table-cell">
                      <span className="text-xs font-mono text-muted-foreground">{prof?.national_id || "—"}</span>
                    </td>
                    <td className="p-3">
                      {editing === r.id ? (
                        <select value={editRole} onChange={e => setEditRole(e.target.value as AppRole)} className="px-2 py-1 text-sm border border-border rounded bg-background">
                          {ROLES.map(role => <option key={role} value={role}>{role.replace("_", " ")}</option>)}
                        </select>
                      ) : (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${getRoleBadge(r.role)}`}>
                          {r.role.replace("_", " ")}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {editing === r.id ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleSaveRole(r.id)} disabled={saving}><Save className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="ml-1"><X className="w-3 h-3" /></Button>
                        </>
                      ) : isEditingProfile ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleSaveProfile(r.user_id)} disabled={saving}><Save className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingProfile(null)} className="ml-1"><X className="w-3 h-3" /></Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="ghost" title="Edit role" onClick={() => { setEditing(r.id); setEditRole(r.role); }}>
                            <Shield className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Edit profile" onClick={() => { setEditingProfile(r.user_id); setEditProfileData({ full_name: prof?.full_name || "", email: prof?.email || "", phone: prof?.phone || "" }); }}>
                            <UserCog className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" title="Remove role" onClick={() => handleDelete(r.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {roles.length === 0 && !adding && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No users found</td></tr>}
            </tbody>
          </table>
        )}
        <TablePagination page={page} totalPages={totalPages} totalItems={totalCount} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>
    </div>
  );
};

export default AdminUsers;
