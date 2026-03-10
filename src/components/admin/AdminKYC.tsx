import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, Loader2, CheckCircle, XCircle, Eye, Download, ChevronLeft, ChevronRight, FileCheck } from "lucide-react";
import { exportToCSV } from "@/lib/csv-utils";

interface KYCDoc {
  id: string;
  user_id: string;
  loan_id: string | null;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  status: string;
  reviewed_by: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface Profile {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

const AdminKYC = () => {
  const [docs, setDocs] = useState<KYCDoc[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const fetchData = useCallback(async () => {
    const [d, p] = await Promise.all([
      supabase.from("kyc_documents").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name, email"),
    ]);
    if (d.data) setDocs(d.data as KYCDoc[]);
    if (p.data) setProfiles(p.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getName = (userId: string) => {
    const p = profiles.find(p => p.user_id === userId);
    return p?.full_name || p?.email || userId.slice(0, 8);
  };

  const handleReview = async (id: string, status: "approved" | "rejected") => {
    setUpdating(id);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("kyc_documents").update({
      status,
      reviewed_by: user?.id,
      review_notes: reviewNotes || null,
      reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(`KYC ${status}`); setReviewingId(null); setReviewNotes(""); fetchData(); }
    setUpdating(null);
  };

  const handleViewFile = async (filePath: string) => {
    const { data } = await supabase.storage.from("kyc-documents").createSignedUrl(filePath, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error("Could not generate file URL");
  };

  const handleExport = () => {
    exportToCSV(
      docs.map(d => ({
        Client: getName(d.user_id),
        "Document Type": d.document_type,
        "File Name": d.file_name,
        Status: d.status,
        "Review Notes": d.review_notes || "",
        "Submitted": new Date(d.created_at).toLocaleDateString(),
        "Reviewed": d.reviewed_at ? new Date(d.reviewed_at).toLocaleDateString() : "",
      })),
      "kyc-documents"
    );
  };

  const filtered = docs.filter(d => {
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    const term = search.toLowerCase();
    const matchSearch = !term || getName(d.user_id).toLowerCase().includes(term) || d.document_type.toLowerCase().includes(term) || d.file_name.toLowerCase().includes(term);
    return matchStatus && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const badge = (s: string) => {
    const m: Record<string, string> = { pending: "bg-amber-100 text-amber-800", approved: "bg-green-100 text-green-800", rejected: "bg-destructive/10 text-destructive" };
    return m[s] || m.pending;
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search KYC docs..." className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="text-sm border border-border rounded-lg px-3 py-2 bg-background">
            <option value="all">All Status</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <Button size="sm" variant="outline" onClick={handleExport}><Download className="w-4 h-4 mr-1" /> CSV</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pending", val: docs.filter(d => d.status === "pending").length, color: "text-amber-600" },
          { label: "Approved", val: docs.filter(d => d.status === "approved").length, color: "text-green-600" },
          { label: "Rejected", val: docs.filter(d => d.status === "rejected").length, color: "text-destructive" },
        ].map(s => (
          <div key={s.label} className="bg-background rounded-lg p-3 shadow-card text-center">
            <p className={`text-xl font-bold font-display ${s.color}`}>{s.val}</p>
            <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-background rounded-xl shadow-card overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/50">
            <th className="text-left p-3 font-semibold text-foreground">Client</th>
            <th className="text-left p-3 font-semibold text-foreground">Document Type</th>
            <th className="text-left p-3 font-semibold text-foreground hidden md:table-cell">File</th>
            <th className="text-left p-3 font-semibold text-foreground">Status</th>
            <th className="text-left p-3 font-semibold text-foreground hidden sm:table-cell">Submitted</th>
            <th className="text-right p-3 font-semibold text-foreground">Actions</th>
          </tr></thead>
          <tbody>
            {paginated.map(d => (
              <tr key={d.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="p-3 font-medium text-foreground">{getName(d.user_id)}</td>
                <td className="p-3 text-muted-foreground capitalize">{d.document_type.replace(/_/g, " ")}</td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">
                  <span className="truncate max-w-[150px] inline-block">{d.file_name}</span>
                </td>
                <td className="p-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${badge(d.status)}`}>{d.status}</span>
                </td>
                <td className="p-3 text-muted-foreground hidden sm:table-cell">{new Date(d.created_at).toLocaleDateString()}</td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleViewFile(d.file_path)} title="View file"><Eye className="w-3 h-3" /></Button>
                    {d.status === "pending" && (
                      <>
                        {reviewingId === d.id ? (
                          <div className="flex items-center gap-1">
                            <input value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Notes..." className="px-2 py-1 text-xs border border-border rounded w-24 bg-background" />
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-green-600" disabled={updating === d.id} onClick={() => handleReview(d.id, "approved")}>
                              {updating === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-destructive" disabled={updating === d.id} onClick={() => handleReview(d.id, "rejected")}>
                              <XCircle className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-1 text-xs" onClick={() => setReviewingId(null)}>×</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setReviewingId(d.id)}>
                            <FileCheck className="w-3 h-3 mr-1" /> Review
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No KYC documents found</td></tr>}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-3 h-3" /></Button>
              <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-3 h-3" /></Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminKYC;
