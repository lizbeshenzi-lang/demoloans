import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/dashboard/NotificationBell";
import ClientDashboardHome from "@/components/dashboard/ClientDashboardHome";
import logo from "@/assets/demo-logo.jpg";
import { toast } from "sonner";
import { User, FileText, LogOut, Plus, Clock, CheckCircle, AlertCircle, DollarSign, Upload, FileCheck, Loader2, Download, Shield, Home, Rocket } from "lucide-react";
import CreditScoreDashboard from "@/components/dashboard/CreditScoreDashboard";
import LoanActivityTimeline from "@/components/dashboard/LoanActivityTimeline";
import RoleWelcomeTutorial, { resetTutorial } from "@/components/dashboard/RoleWelcomeTutorial";
import { exportToCSV } from "@/lib/csv-utils";

interface LoanApplication {
  id: string; full_name: string; business_type: string; financing_amount: string;
  status: string; created_at: string; risk_score: number | null; ai_recommendation: string | null;
  amount_approved: number | null; disbursement_date: string | null; expected_completion_date: string | null;
}

interface Repayment {
  id: string; loan_id: string; amount_due: number; amount_paid: number;
  due_date: string; week_number: number; status: string; paid_date: string | null;
}

interface KYCDoc {
  id: string; loan_id: string | null; document_type: string; file_name: string;
  status: string; review_notes: string | null; created_at: string;
}

const DOC_TYPES = [
  { value: "national_id", label: "National ID" },
  { value: "passport", label: "Passport" },
  { value: "business_license", label: "Business License" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "utility_bill", label: "Utility Bill" },
  { value: "tax_certificate", label: "Tax Certificate" },
  { value: "other", label: "Other Document" },
];

interface Profile {
  full_name: string | null; phone: string | null; location: string | null;
  business_type: string | null; business_description: string | null; email: string | null;
}

const MyLoans = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [kycDocs, setKycDocs] = useState<KYCDoc[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingApps, setLoadingApps] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"home" | "loans">("home");
  const [activeTab, setActiveTab] = useState<"details" | "repayments" | "timeline" | "score" | "kyc">("details");

  // KYC Upload
  const [uploading, setUploading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("national_id");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tutorialRestart, setTutorialRestart] = useState(0);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  const fetchData = async () => {
    if (!user) return;
    const [appRes, kycRes, profileRes] = await Promise.all([
      supabase.from("loan_applications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("kyc_documents").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("full_name, phone, location, business_type, business_description, email").eq("user_id", user.id).single(),
    ]);
    if (appRes.data) {
      setApplications(appRes.data as LoanApplication[]);
      if (appRes.data.length > 0) setSelectedLoan(appRes.data[0].id);
      const loanIds = appRes.data.map((l: any) => l.id);
      if (loanIds.length > 0) {
        const { data: repData } = await supabase.from("loan_repayments").select("*").in("loan_id", loanIds).order("week_number", { ascending: true });
        if (repData) setRepayments(repData as Repayment[]);
      }
    }
    if (kycRes.data) setKycDocs(kycRes.data as KYCDoc[]);
    if (profileRes.data) setProfile(profileRes.data as Profile);
    setLoadingApps(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const handleKYCUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }

    setUploading(true);
    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("kyc-documents").upload(filePath, file);
    if (uploadError) { toast.error("Upload failed: " + uploadError.message); setUploading(false); return; }

    const { error: dbError } = await supabase.from("kyc_documents").insert({
      user_id: user.id,
      loan_id: selectedLoan,
      document_type: selectedDocType,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      status: "pending",
    });
    if (dbError) toast.error("Failed to save document record");
    else {
      toast.success("KYC document uploaded successfully");
      const { data } = await supabase.from("kyc_documents").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (data) setKycDocs(data as KYCDoc[]);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExportRepayments = () => {
    const loanRepayments = repayments.filter(r => r.loan_id === selectedLoan);
    exportToCSV(loanRepayments.map(r => ({
      Week: r.week_number, "Due Date": r.due_date, "Amount Due": r.amount_due,
      "Amount Paid": r.amount_paid || 0, Status: r.status,
    })), "my-repayments");
    toast.success("Repayments exported");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": case "disbursed": case "completed": return <CheckCircle className="w-5 h-5 text-kc-green" />;
      case "rejected": return <AlertCircle className="w-5 h-5 text-destructive" />;
      default: return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-100 text-amber-800", approved: "bg-blue-100 text-blue-800",
      disbursed: "bg-green-100 text-green-800", completed: "bg-kc-green/20 text-kc-green",
      rejected: "bg-red-100 text-red-800",
    };
    return styles[status] || styles.pending;
  };

  const selectedRepayments = repayments.filter(r => r.loan_id === selectedLoan);
  const selectedApp = applications.find(a => a.id === selectedLoan);
  const selectedKYC = kycDocs.filter(d => d.loan_id === selectedLoan || !d.loan_id);

  if (loading) {
    return <div className="min-h-screen bg-warm flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-warm">
      <header className="bg-background shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Demo Credit Limited" className="h-10 w-auto rounded" />
            <span className="font-display font-bold text-xl text-foreground hidden sm:block">Demo Credit Limited</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            {user && <NotificationBell userId={user.id} />}
            <Button variant="ghost" size="sm" title="Replay tutorial" onClick={() => { if (user) { resetTutorial("user", user.id); setTutorialRestart(t => t + 1); } }}>
              <Rocket className="w-4 h-4" />
            </Button>
            <Link to="/reports"><Button variant="outline" size="sm"><FileText className="w-4 h-4 mr-1" /> Reports</Button></Link>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="hidden sm:block">{user?.user_metadata?.full_name || user?.email}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}><LogOut className="w-4 h-4 mr-2" /> Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">My Dashboard</h1>
            <p className="text-muted-foreground font-body mt-1">Track applications, repayments & KYC documents</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button onClick={() => setActiveView("home")} className={`px-4 py-2 text-sm font-semibold flex items-center gap-1.5 ${activeView === "home" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                <Home className="w-4 h-4" /> Overview
              </button>
              <button onClick={() => setActiveView("loans")} className={`px-4 py-2 text-sm font-semibold flex items-center gap-1.5 ${activeView === "loans" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                <FileText className="w-4 h-4" /> My Loans
              </button>
            </div>
            <Link to="/apply">
              <Button className="bg-gradient-primary"><Plus className="w-4 h-4 mr-2" /> Apply</Button>
            </Link>
          </div>
        </div>

        {/* Client Dashboard Home */}
        {activeView === "home" && !loadingApps && (
          <ClientDashboardHome
            userId={user?.id || ""}
            profile={profile}
            loans={applications as any}
            repayments={repayments as any}
            onProfileUpdate={fetchData}
          />
        )}

        {activeView === "loans" && loadingApps ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : activeView === "loans" && applications.length === 0 ? (
          <div className="bg-background rounded-2xl shadow-card p-8 text-center">
            <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold font-display text-foreground mb-2">No Applications Yet</h2>
            <p className="text-muted-foreground font-body mb-6">Get started by applying for financing today!</p>
            <Link to="/apply"><Button className="bg-gradient-primary">Apply for Financing</Button></Link>
          </div>
        ) : activeView === "loans" ? (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Loan list */}
            <div className="lg:col-span-1 space-y-3">
              {applications.map((app) => (
                <button key={app.id} onClick={() => { setSelectedLoan(app.id); setActiveTab("details"); }}
                  className={`w-full text-left bg-background rounded-xl p-4 shadow-card transition-all ${selectedLoan === app.id ? "ring-2 ring-primary" : "hover:shadow-elevated"}`}>
                  <div className="flex items-start gap-3">
                    {getStatusIcon(app.status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold font-display text-foreground text-sm truncate">{app.business_type}</p>
                      <p className="text-xs text-muted-foreground">{new Date(app.created_at).toLocaleDateString()}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-semibold text-foreground text-sm">{app.financing_amount || "—"}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${getStatusBadge(app.status)}`}>{app.status}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Detail pane */}
            <div className="lg:col-span-2 space-y-4">
              {selectedApp && (
                <>
                  {/* Sub-tabs */}
                  <div className="flex rounded-lg border border-border overflow-hidden flex-wrap">
                    {(["details", "repayments", "timeline", "score", "kyc"] as const).map(t => (
                      <button key={t} onClick={() => setActiveTab(t)}
                        className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold font-body transition-colors capitalize ${activeTab === t ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                        {t === "kyc" ? "KYC" : t === "score" ? "Score" : t === "timeline" ? "Timeline" : t}
                      </button>
                    ))}
                  </div>

                  {activeTab === "details" && (
                    <div className="bg-background rounded-xl p-6 shadow-card space-y-5">
                      <h2 className="font-bold font-display text-foreground text-lg">{selectedApp.business_type}</h2>
                      
                      {/* Progress Tracker */}
                      <div className="flex items-center gap-1">
                        {["pending", "approved", "disbursed", "completed"].map((step, i) => {
                          const steps = ["pending", "approved", "disbursed", "completed"];
                          const currentIdx = steps.indexOf(selectedApp.status === "rejected" ? "pending" : selectedApp.status);
                          const isComplete = i <= currentIdx;
                          return (
                            <div key={step} className="flex-1 flex flex-col items-center gap-1">
                              <div className={`h-2 w-full rounded-full ${isComplete ? "bg-kc-green" : "bg-muted"}`} />
                              <span className="text-[10px] text-muted-foreground capitalize">{step}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4 text-sm">
                        <div><span className="text-muted-foreground">Amount Requested:</span> <span className="font-semibold text-foreground ml-2">{selectedApp.financing_amount}</span></div>
                        <div><span className="text-muted-foreground">Status:</span> <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${getStatusBadge(selectedApp.status)}`}>{selectedApp.status}</span></div>
                        {selectedApp.amount_approved && <div><span className="text-muted-foreground">Approved Amount:</span> <span className="font-semibold text-kc-green ml-2">KES {Number(selectedApp.amount_approved).toLocaleString()}</span></div>}
                        {selectedApp.disbursement_date && <div><span className="text-muted-foreground">Disbursed On:</span> <span className="font-semibold text-foreground ml-2">{new Date(selectedApp.disbursement_date).toLocaleDateString()}</span></div>}
                        {selectedApp.expected_completion_date && <div><span className="text-muted-foreground">Completion Date:</span> <span className="font-semibold text-foreground ml-2">{new Date(selectedApp.expected_completion_date).toLocaleDateString()}</span></div>}
                        {selectedApp.risk_score && <div><span className="text-muted-foreground">Risk Score:</span> <span className="font-semibold text-foreground ml-2">{selectedApp.risk_score}/100</span></div>}
                        <div><span className="text-muted-foreground">Applied:</span> <span className="font-semibold text-foreground ml-2">{new Date(selectedApp.created_at).toLocaleDateString()}</span></div>
                      </div>

                      {/* Payment Progress */}
                      {selectedRepayments.length > 0 && (
                        <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-primary">Payment Progress</span>
                            <span className="text-xs text-muted-foreground">{selectedRepayments.filter(r => r.status === "paid").length}/{selectedRepayments.length} weeks</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-3">
                            <div className="bg-kc-green h-3 rounded-full transition-all" style={{
                              width: `${(selectedRepayments.filter(r => r.status === "paid").length / selectedRepayments.length) * 100}%`
                            }} />
                          </div>
                          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                            <span>Paid: KES {selectedRepayments.reduce((s, r) => s + Number(r.amount_paid || 0), 0).toLocaleString()}</span>
                            <span>Remaining: KES {(selectedRepayments.reduce((s, r) => s + r.amount_due, 0) - selectedRepayments.reduce((s, r) => s + Number(r.amount_paid || 0), 0)).toLocaleString()}</span>
                          </div>
                        </div>
                      )}

                      {selectedApp.ai_recommendation && (
                        <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                          <p className="text-xs font-semibold text-primary mb-1">AI Assessment</p>
                          <p className="text-sm text-muted-foreground">{selectedApp.ai_recommendation}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "repayments" && (
                    <div className="bg-background rounded-xl shadow-card overflow-hidden">
                      <div className="p-4 border-b border-border flex items-center justify-between">
                        <h3 className="font-bold font-display text-foreground flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-primary" /> Repayment Schedule
                        </h3>
                        {selectedRepayments.length > 0 && (
                          <Button size="sm" variant="outline" onClick={handleExportRepayments}><Download className="w-3 h-3 mr-1" /> CSV</Button>
                        )}
                      </div>
                      {selectedRepayments.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead><tr className="bg-muted/50 border-b border-border">
                              <th className="p-3 text-left font-semibold text-foreground">Week</th>
                              <th className="p-3 text-left font-semibold text-foreground">Due Date</th>
                              <th className="p-3 text-right font-semibold text-foreground">Due</th>
                              <th className="p-3 text-right font-semibold text-foreground">Paid</th>
                              <th className="p-3 text-left font-semibold text-foreground">Status</th>
                            </tr></thead>
                            <tbody>
                              {selectedRepayments.map((r) => (
                                <tr key={r.id} className="border-b border-border/50">
                                  <td className="p-3 text-muted-foreground">Week {r.week_number}</td>
                                  <td className="p-3 text-foreground">{new Date(r.due_date).toLocaleDateString()}</td>
                                  <td className="p-3 text-right font-medium text-foreground">KES {Number(r.amount_due).toLocaleString()}</td>
                                  <td className="p-3 text-right font-medium text-kc-green">KES {Number(r.amount_paid).toLocaleString()}</td>
                                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                                    r.status === "paid" ? "bg-green-100 text-green-800" : r.status === "overdue" ? "bg-red-100 text-red-800" : r.status === "partial" ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground"
                                  }`}>{r.status}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {/* Summary */}
                          <div className="p-4 border-t border-border bg-muted/30 grid grid-cols-3 gap-4 text-center">
                            <div><p className="text-lg font-bold text-foreground">KES {selectedRepayments.reduce((s, r) => s + Number(r.amount_due), 0).toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Due</p></div>
                            <div><p className="text-lg font-bold text-kc-green">KES {selectedRepayments.reduce((s, r) => s + Number(r.amount_paid || 0), 0).toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Paid</p></div>
                            <div><p className="text-lg font-bold text-primary">{selectedRepayments.filter(r => r.status === "paid").length}/{selectedRepayments.length}</p><p className="text-xs text-muted-foreground">Completed</p></div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-muted-foreground">No repayment schedule yet</div>
                      )}
                    </div>
                  )}

                  {activeTab === "timeline" && (
                    <LoanActivityTimeline
                      loanId={selectedApp.id}
                      repayments={selectedRepayments}
                      createdAt={selectedApp.created_at}
                    />
                  )}

                  {activeTab === "score" && (
                    <CreditScoreDashboard
                      riskScore={selectedApp?.risk_score ?? null}
                      repayments={selectedRepayments}
                      totalLoans={applications.length}
                    />
                  )}

                  {activeTab === "kyc" && (
                    <div className="space-y-4">
                      {/* Upload section */}
                      <div className="bg-background rounded-xl p-5 shadow-card">
                        <h3 className="font-bold font-display text-foreground mb-3 flex items-center gap-2">
                          <Upload className="w-5 h-5 text-primary" /> Upload KYC Document
                        </h3>
                        <p className="text-xs text-muted-foreground mb-3">Upload ID, business license, bank statements etc. Max 10MB per file.</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <select value={selectedDocType} onChange={e => setSelectedDocType(e.target.value)} className="px-3 py-2 text-sm border border-border rounded-lg bg-background">
                            {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                          </select>
                          <div className="flex-1">
                            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleKYCUpload} disabled={uploading} className="text-sm" />
                          </div>
                          {uploading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                        </div>
                      </div>

                      {/* Existing docs */}
                      <div className="bg-background rounded-xl shadow-card overflow-hidden">
                        <div className="p-4 border-b border-border">
                          <h3 className="font-bold font-display text-foreground flex items-center gap-2">
                            <FileCheck className="w-5 h-5 text-primary" /> Your Documents ({selectedKYC.length})
                          </h3>
                        </div>
                        {selectedKYC.length > 0 ? (
                          <div className="divide-y divide-border/50">
                            {selectedKYC.map(d => (
                              <div key={d.id} className="p-4 flex items-center gap-3">
                                <FileText className="w-8 h-8 text-muted-foreground/50 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-foreground text-sm capitalize">{d.document_type.replace(/_/g, " ")}</p>
                                  <p className="text-xs text-muted-foreground truncate">{d.file_name} · {new Date(d.created_at).toLocaleDateString()}</p>
                                  {d.review_notes && <p className="text-xs text-amber-600 mt-1">Review: {d.review_notes}</p>}
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                                  d.status === "approved" ? "bg-green-100 text-green-800" : d.status === "rejected" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                                }`}>{d.status}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center text-muted-foreground">No documents uploaded yet</div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : null}
      </main>
      <RoleWelcomeTutorial role="user" restartTrigger={tutorialRestart} />
    </div>
  );
};

export default MyLoans;
