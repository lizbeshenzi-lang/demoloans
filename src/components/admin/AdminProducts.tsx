import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, Plus, Trash2, Edit2, Save, X, Loader2 } from "lucide-react";
import AdminCSVImport from "./AdminCSVImport";
import AdminCSVExport from "./AdminCSVExport";

interface Product {
  id: string; name: string; code: string; description: string | null;
  min_amount: number; max_amount: number; interest_rate: number;
  term_weeks: number; processing_fee_percent: number | null; is_active: boolean | null;
}

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Product>>({});
  const [adding, setAdding] = useState(false);
  const [newData, setNewData] = useState({ name: "", code: "", description: "", min_amount: 5000, max_amount: 60000, interest_rate: 8, term_weeks: 6, processing_fee_percent: 2 });
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    const { data } = await supabase.from("loan_products").select("*").order("name");
    if (data) setProducts(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAdd = async () => {
    if (!newData.name || !newData.code) return;
    setSaving(true);
    const { error } = await supabase.from("loan_products").insert({
      ...newData, description: newData.description || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Product added"); setAdding(false); fetch(); }
    setSaving(false);
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    const { error } = await supabase.from("loan_products").update(editData).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Product updated"); setEditing(null); fetch(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("loan_products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Product deleted"); fetch(); }
  };

  const toggleActive = async (id: string, current: boolean | null) => {
    const { error } = await supabase.from("loan_products").update({ is_active: !current }).eq("id", id);
    if (error) toast.error(error.message);
    else fetch();
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase())
  );

  const inputClass = "px-2 py-1.5 text-sm border border-border rounded bg-background w-full";

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div className="flex items-center gap-2">
          <AdminCSVExport target="loan_products" />
          <AdminCSVImport target="loan_products" onComplete={fetch} />
          <Button size="sm" onClick={() => setAdding(true)} disabled={adding}><Plus className="w-4 h-4 mr-1" /> Add Product</Button>
        </div>
      </div>

      <div className="bg-background rounded-xl shadow-card overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/50">
            <th className="text-left p-3 font-semibold text-foreground">Name</th>
            <th className="text-left p-3 font-semibold text-foreground">Code</th>
            <th className="text-left p-3 font-semibold text-foreground hidden md:table-cell">Range (KES)</th>
            <th className="text-left p-3 font-semibold text-foreground hidden sm:table-cell">Rate</th>
            <th className="text-left p-3 font-semibold text-foreground hidden sm:table-cell">Weeks</th>
            <th className="text-left p-3 font-semibold text-foreground">Active</th>
            <th className="text-right p-3 font-semibold text-foreground">Actions</th>
          </tr></thead>
          <tbody>
            {adding && (
              <tr className="border-b border-border bg-secondary/5">
                <td className="p-2"><input value={newData.name} onChange={e => setNewData(p => ({ ...p, name: e.target.value }))} placeholder="Product name" className={inputClass} /></td>
                <td className="p-2"><input value={newData.code} onChange={e => setNewData(p => ({ ...p, code: e.target.value }))} placeholder="Code" className={inputClass} /></td>
                <td className="p-2 hidden md:table-cell">
                  <div className="flex gap-1">
                    <input type="number" value={newData.min_amount} onChange={e => setNewData(p => ({ ...p, min_amount: +e.target.value }))} className={inputClass} />
                    <input type="number" value={newData.max_amount} onChange={e => setNewData(p => ({ ...p, max_amount: +e.target.value }))} className={inputClass} />
                  </div>
                </td>
                <td className="p-2 hidden sm:table-cell"><input type="number" value={newData.interest_rate} onChange={e => setNewData(p => ({ ...p, interest_rate: +e.target.value }))} className={inputClass} /></td>
                <td className="p-2 hidden sm:table-cell"><input type="number" value={newData.term_weeks} onChange={e => setNewData(p => ({ ...p, term_weeks: +e.target.value }))} className={inputClass} /></td>
                <td className="p-2">—</td>
                <td className="p-2 text-right">
                  <Button size="sm" variant="outline" onClick={handleAdd} disabled={saving}><Save className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="ml-1"><X className="w-3 h-3" /></Button>
                </td>
              </tr>
            )}
            {filtered.map(p => (
              <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="p-3 font-medium text-foreground">{p.name}</td>
                <td className="p-3 text-muted-foreground">{p.code}</td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">{p.min_amount.toLocaleString()}–{p.max_amount.toLocaleString()}</td>
                <td className="p-3 hidden sm:table-cell">{p.interest_rate}%</td>
                <td className="p-3 hidden sm:table-cell">{p.term_weeks}</td>
                <td className="p-3">
                  <button onClick={() => toggleActive(p.id, p.is_active)} className={`w-8 h-5 rounded-full transition-colors ${p.is_active ? "bg-secondary" : "bg-muted-foreground/30"}`}>
                    <div className={`w-3.5 h-3.5 rounded-full bg-primary-foreground transition-transform ${p.is_active ? "translate-x-3.5" : "translate-x-0.5"}`} />
                  </button>
                </td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(p.id); setEditData(p); }}><Edit2 className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="w-3 h-3" /></Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No products found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminProducts;
