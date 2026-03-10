import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logo from "@/assets/kechita-logo.jpg";
import {
  LogOut, XCircle, ArrowLeft, FileText, Users, Building2, MapPin,
  Package, UserCog, LayoutDashboard, Shield, Loader2, Menu, X,
  Banknote, FileCheck, Download, Upload, TrendingUp, MessageSquare, Briefcase, Link2, KeyRound
} from "lucide-react";
import AdminLoans from "@/components/admin/AdminLoans";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminBranches from "@/components/admin/AdminBranches";
import AdminRegions from "@/components/admin/AdminRegions";
import AdminProducts from "@/components/admin/AdminProducts";
import AdminStaff from "@/components/admin/AdminStaff";
import AdminRepayments from "@/components/admin/AdminRepayments";
import AdminKYC from "@/components/admin/AdminKYC";
import AdminSMSCampaigns from "@/components/admin/AdminSMSCampaigns";
import { cn } from "@/lib/utils";
import AdminRecruitment from "@/components/admin/AdminRecruitment";
import AdminIntegrations from "@/components/admin/AdminIntegrations";
import { exportToCSV, generateLoanReport, downloadReport } from "@/lib/csv-utils";
import NotificationBell from "@/components/dashboard/NotificationBell";

type Tab = "overview" | "loans" | "repayments" | "users" | "branches" | "regions" | "products" | "staff" | "kyc" | "reports" | "sms" | "recruitment" | "integrations";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "loans", label: "Loan Applications", icon: FileText },
  { key: "repayments", label: "Repayments", icon: Banknote },
  { key: "kyc", label: "KYC Documents", icon: FileCheck },
  { key: "users", label: "Users & Roles", icon: Users },
  { key: "products", label: "Loan Products", icon: Package },
  { key: "branches", label: "Branches", icon: Building2 },
  { key: "regions", label: "Regions", icon: MapPin },
  { key: "staff", label: "Staff Assignments", icon: UserCog },
  { key: "sms", label: "SMS Campaigns", icon: MessageSquare },
  { key: "recruitment", label: "Recruitment", icon: Briefcase },
  { key: "reports", label: "Reports & Export", icon: TrendingUp },
  { key: "integrations", label: "Integrations", icon: Link2 },
];

const AdminDashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({ loans: 0, users: 0, branches: 0, regions: 0, products: 0, staff: 0, repayments: 0, kyc: 0 });
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!data) { setIsAdmin(false); setLoading(false); return; }
      setIsAdmin(true);

      const [loans, roles, branches, regions, products, staff, repayments, kyc] = await Promise.all([
        supabase.from("loan_applications").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("id", { count: "exact", head: true }),
        supabase.from("branches").select("id", { count: "exact", head: true }),
        supabase.from("regions").select("id", { count: "exact", head: true }),
        supabase.from("loan_products").select("id", { count: "exact", head: true }),
        supabase.from("staff_assignments").select("id", { count: "exact", head: true }),
        supabase.from("loan_repayments").select("id", { count: "exact", head: true }),
        supabase.from("kyc_documents").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        loans: loans.count || 0, users: roles.count || 0, branches: branches.count || 0,
        regions: regions.count || 0, products: products.count || 0, staff: staff.count || 0,
        repayments: repayments.count || 0, kyc: kyc.count || 0,
      });
      setLoading(false);
    };
    init();
  }, [user]);

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const handleGenerateReport = async (type: "portfolio" | "repayments" | "branches" | "users") => {
    setReportLoading(true);
    try {
      if (type === "portfolio") {
        const [lRes, rRes] = await Promise.all([
          supabase.from("loan_applications").select("*"),
          supabase.from("loan_repayments").select("*"),
        ]);
        const report = generateLoanReport(lRes.data || [], rRes.data || [], "MULAR CREDIT — FULL PORTFOLIO REPORT");
        downloadReport(report, "portfolio-report.txt");
      } else if (type === "repayments") {
        const { data } = await supabase.from("loan_repayments").select("*, loan_applications(full_name)");
        exportToCSV((data || []).map((r: any) => ({
          Client: r.loan_applications?.full_name || "",
          Week: r.week_number, "Due Date": r.due_date,
          "Amount Due": r.amount_due, "Amount Paid": r.amount_paid || 0,
          Status: r.status, "Paid Date": r.paid_date || "",
        })), "repayments-report");
      } else if (type === "branches") {
        const { data } = await supabase.from("branches").select("*, regions(name)");
        exportToCSV((data || []).map((b: any) => ({
          Name: b.name, Code: b.code, Location: b.location || "", Region: b.regions?.name || "",
        })), "branches-report");
      } else if (type === "users") {
        const [rRes, pRes] = await Promise.all([
          supabase.from("user_roles").select("*"),
          supabase.from("profiles").select("*"),
        ]);
        const profiles = pRes.data || [];
        exportToCSV((rRes.data || []).map((r: any) => {
          const p = profiles.find((p: any) => p.user_id === r.user_id);
          return { Name: p?.full_name || "", Email: p?.email || "", Phone: p?.phone || "", Role: r.role, "Joined": new Date(r.created_at).toLocaleDateString() };
        }), "users-report");
      }
      toast.success("Report downloaded");
    } catch { toast.error("Failed to generate report"); }
    setReportLoading(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center px-4">
        <div className="bg-background rounded-2xl shadow-elevated p-8 text-center max-w-md">
          <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold font-display text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground font-body mb-6">You don't have admin privileges.</p>
          <Link to="/dashboard"><Button><ArrowLeft className="w-4 h-4 mr-2" /> Go to Dashboard</Button></Link>
        </div>
      </div>
    );
  }

  const overviewCards = [
    { label: "Loan Applications", count: stats.loans, icon: FileText, tab: "loans" as Tab, color: "text-primary" },
    { label: "Repayments", count: stats.repayments, icon: Banknote, tab: "repayments" as Tab, color: "text-emerald-600" },
    { label: "KYC Documents", count: stats.kyc, icon: FileCheck, tab: "kyc" as Tab, color: "text-orange-500" },
    { label: "Users & Roles", count: stats.users, icon: Users, tab: "users" as Tab, color: "text-secondary" },
    { label: "Loan Products", count: stats.products, icon: Package, tab: "products" as Tab, color: "text-amber-500" },
    { label: "Branches", count: stats.branches, icon: Building2, tab: "branches" as Tab, color: "text-blue-500" },
    { label: "Regions", count: stats.regions, icon: MapPin, tab: "regions" as Tab, color: "text-green-600" },
    { label: "Staff Assignments", count: stats.staff, icon: UserCog, tab: "staff" as Tab, color: "text-purple-500" },
  ];

  return (
    <div className="min-h-screen bg-muted flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-background border-r border-border flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Mular Credit" className="h-8 w-auto rounded" />
            <div>
              <span className="font-display font-bold text-sm text-foreground block">Mular Credit</span>
              <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-semibold">ADMIN</span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSidebarOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <t.icon className="w-4 h-4 shrink-0" />
              {t.label}
            </button>
          ))}
          <div className="mt-3 pt-3 border-t border-border">
            <Link
              to="/credentials"
              onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <KeyRound className="w-4 h-4 shrink-0" />
              Staff Credentials
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{user?.email}</p>
              <p className="text-[10px] text-muted-foreground">System Administrator</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleSignOut}>
            <LogOut className="w-3 h-3 mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-foreground/20 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-background border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-muted">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold font-display text-foreground flex-1">
            {TABS.find(t => t.key === tab)?.label || "Admin"}
          </h1>
          {user && <NotificationBell userId={user.id} />}
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {overviewCards.map(c => (
                  <button key={c.tab} onClick={() => setTab(c.tab)} className="bg-background rounded-xl shadow-card p-5 text-left hover:shadow-lg transition-shadow group">
                    <div className="flex items-center justify-between mb-3">
                      <c.icon className={`w-6 h-6 ${c.color} opacity-60 group-hover:opacity-100 transition-opacity`} />
                      <span className="text-3xl font-bold font-display text-foreground">{c.count}</span>
                    </div>
                    <p className="text-sm text-muted-foreground font-body">{c.label}</p>
                    <p className="text-xs text-primary mt-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Click to manage →</p>
                  </button>
                ))}
              </div>
              <div className="bg-background rounded-xl shadow-card p-6">
                <h2 className="font-display font-bold text-foreground mb-2">Quick Actions</h2>
                <p className="text-sm text-muted-foreground mb-4">Select a section from the sidebar or click a card above.</p>
                <div className="flex flex-wrap gap-2">
                  {TABS.filter(t => t.key !== "overview").map(t => (
                    <Button key={t.key} variant="outline" size="sm" onClick={() => setTab(t.key)}>
                      <t.icon className="w-3 h-3 mr-1.5" /> {t.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {tab === "loans" && <AdminLoans />}
          {tab === "repayments" && <AdminRepayments />}
          {tab === "kyc" && <AdminKYC />}
          {tab === "users" && <AdminUsers />}
          {tab === "branches" && <AdminBranches />}
          {tab === "regions" && <AdminRegions />}
          {tab === "products" && <AdminProducts />}
          {tab === "staff" && <AdminStaff />}
          {tab === "sms" && <AdminSMSCampaigns />}
          {tab === "recruitment" && <AdminRecruitment />}
          {tab === "integrations" && <AdminIntegrations />}
          {tab === "reports" && (
            <div className="space-y-6">
              <div className="bg-background rounded-xl shadow-card p-6">
                <h2 className="font-display font-bold text-foreground mb-1">Generate & Download Reports</h2>
                <p className="text-sm text-muted-foreground mb-6">Export system data as CSV or text reports for analysis.</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { label: "Full Portfolio Report", desc: "Complete loan portfolio with summary stats and repayment data", type: "portfolio" as const, icon: TrendingUp },
                    { label: "Repayments Export", desc: "All repayment records with client names and payment status", type: "repayments" as const, icon: Banknote },
                    { label: "Branches Export", desc: "All branches with region mapping and location info", type: "branches" as const, icon: Building2 },
                    { label: "Users & Roles Export", desc: "All users with roles, contact info and join dates", type: "users" as const, icon: Users },
                  ].map(r => (
                    <div key={r.type} className="border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
                      <div className="flex items-start gap-3 mb-3">
                        <r.icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-sm text-foreground">{r.label}</h3>
                          <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => handleGenerateReport(r.type)} disabled={reportLoading}>
                        {reportLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
