import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import NotificationBell from "@/components/dashboard/NotificationBell";
import ExecutiveAIChat from "@/components/dashboard/ExecutiveAIChat";
import FraudDetectionPanel from "@/components/dashboard/FraudDetectionPanel";
import PerformanceLeaderboard from "@/components/dashboard/PerformanceLeaderboard";
import CEOCommandCenter from "@/components/dashboard/CEOCommandCenter";
import ApprovalWorkflow from "@/components/dashboard/ApprovalWorkflow";
import InternalMessaging from "@/components/dashboard/InternalMessaging";
import SMSCampaigns from "@/components/dashboard/SMSCampaigns";
import CampaignAnalytics from "@/components/dashboard/CampaignAnalytics";
import AICampaignBuilder from "@/components/dashboard/AICampaignBuilder";
import ClientSegmentation from "@/components/dashboard/ClientSegmentation";
import AutomationWorkflows from "@/components/dashboard/AutomationWorkflows";
import MarketingPerformanceView from "@/components/dashboard/MarketingPerformanceView";
import MarketingReports from "@/components/dashboard/MarketingReports";
import ClientOnboarding from "@/components/dashboard/ClientOnboarding";
import DisbursementWorkflow from "@/components/dashboard/DisbursementWorkflow";
import AuditTrail from "@/components/dashboard/AuditTrail";
import PerformanceAnalytics from "@/components/dashboard/PerformanceAnalytics";
import RoleWelcomeTutorial, { resetTutorial } from "@/components/dashboard/RoleWelcomeTutorial";
import LoanOfficerWorkspace from "@/components/dashboard/LoanOfficerWorkspace";
import BranchOperationsHub from "@/components/dashboard/BranchOperationsHub";
import RegionalCommandView from "@/components/dashboard/RegionalCommandView";
import AdminRecruitment from "@/components/admin/AdminRecruitment";
import CreditScoreDashboard from "@/components/dashboard/CreditScoreDashboard";
import ClientLoanHistory from "@/components/dashboard/ClientLoanHistory";
import EnhancedPortfolioAnalytics from "@/components/dashboard/EnhancedPortfolioAnalytics";
import AdvancedReporting from "@/components/dashboard/AdvancedReporting";
import { toast } from "sonner";
import logo from "@/assets/Demo-logo.jpg";
import { exportToCSV, generateLoanReport, downloadReport } from "@/lib/csv-utils";
import { generateRoleInsights } from "@/lib/generate-insights";
import {
  User, LogOut, TrendingUp, AlertTriangle, CheckCircle, Clock,
  Building2, Users, DollarSign, BarChart3, ChevronRight,
  MapPin, FileText, Activity, ThumbsUp, ThumbsDown, Loader2,
  Download, Search, Filter, FileCheck, Shield, Crown, Briefcase,
  Send as SendIcon, ArrowRight, MessageSquare, UserPlus,
  Banknote, History, PieChart, Wrench, Target, Megaphone,
  Sparkles, Tag, Zap, Eye, Rocket
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardStats {
  totalLoans: number; activeLoans: number; pendingApproval: number;
  totalDisbursed: number; overduePayments: number; collectionRate: number;
  totalPaid: number; totalDue: number;
}

interface Insight { id: string; title: string; content: string; severity: string; insight_type: string; created_at: string; }

interface LoanApp {
  id: string; full_name: string; business_type: string; financing_amount: string;
  status: string; risk_score: number | null; ai_recommendation: string | null;
  created_at: string; branch_id: string | null; product_id: string | null;
  loan_officer_id: string | null; phone: string; email: string | null; amount_approved: number | null;
  national_id?: string | null;
  approval_level?: string; approval_notes?: string; approved_by?: string | null;
  disbursement_date: string | null;
}

interface Branch { id: string; name: string; code: string; location: string; region_id: string; }
interface Region { id: string; name: string; code: string; }
interface Profile { user_id: string; full_name: string | null; email: string | null; }

const RoleDashboard = () => {
  const { user, role, staffAssignment, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({ totalLoans: 0, activeLoans: 0, pendingApproval: 0, totalDisbursed: 0, overduePayments: 0, collectionRate: 0, totalPaid: 0, totalDue: 0 });
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loans, setLoans] = useState<LoanApp[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [repayments, setRepayments] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [updatingLoanId, setUpdatingLoanId] = useState<string | null>(null);
  const [loanSearch, setLoanSearch] = useState("");
  const [loanStatusFilter, setLoanStatusFilter] = useState("all");
  const [kycDocs, setKycDocs] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [staffAssignments, setStaffAssignments] = useState<{ user_id: string; branch_id: string | null; region_id: string | null }[]>([]);
  const [userRoles, setUserRoles] = useState<{ user_id: string; role: string }[]>([]);
  const [smsCampaigns, setSmsCampaigns] = useState<any[]>([]);
  const [tutorialRestart, setTutorialRestart] = useState(0);

  const isExecutive = role === "ceo" || role === "gm";
  const isMarketingLead = role === "marketing_lead";
  const isManager = isExecutive || role === "regional_manager" || role === "branch_manager" || isMarketingLead;
  const canApproveReject = role === "loan_officer" || role === "branch_manager" || role === "regional_manager" || role === "admin" || isExecutive;
  const canExport = role !== "user";

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  // Realtime loan updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('loan-status-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'loan_applications' }, (payload) => {
        const updated = payload.new as LoanApp;
        setLoans(prev => prev.map(l => l.id === updated.id ? { ...l, ...updated } : l));
        toast.info(`Loan for ${updated.full_name} updated to ${updated.status}`);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Realtime automation rule triggers (marketing lead)
  useEffect(() => {
    if (!user || !isMarketingLead) return;
    const channel = supabase
      .channel('automation-triggers')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sms_automation_rules' }, (payload) => {
        const updated = payload.new as any;
        const old = payload.old as any;
        if (updated.last_triggered_at !== old.last_triggered_at) {
          toast.success(`⚡ Automation "${updated.name}" triggered — ${updated.trigger_count} total runs`, {
            duration: 6000,
            description: `Condition: ${updated.trigger_condition}`,
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, isMarketingLead]);

  const fetchAllRepayments = async () => {
    const allRows: any[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data } = await supabase
        .from("loan_repayments")
        .select("*")
        .order("due_date", { ascending: true })
        .range(from, from + pageSize - 1);
      if (!data || data.length === 0) break;
      allRows.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return allRows;
  };

  const fetchData = useCallback(async () => {
    if (!user || !role) return;
    setLoadingData(true);
    const [branchRes, regionRes, repaymentData, kycRes, profileRes, productRes, saRes, rolesRes, campRes] = await Promise.all([
      supabase.from("branches").select("*"),
      supabase.from("regions").select("*"),
      fetchAllRepayments(),
      supabase.from("kyc_documents").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("profiles").select("user_id, full_name, email"),
      supabase.from("loan_products").select("*"),
      isManager ? supabase.from("staff_assignments").select("user_id, branch_id, region_id") : Promise.resolve({ data: [] }),
      isManager ? supabase.from("user_roles").select("user_id, role") : Promise.resolve({ data: [] }),
      isMarketingLead ? supabase.from("sms_campaigns").select("id, name, campaign_type, total_sent, total_delivered, total_failed, status, created_at").order("created_at", { ascending: false }).limit(200) : Promise.resolve({ data: [] }),
    ]);
    const branchData = (branchRes.data || []) as Branch[];
    const regionData = (regionRes.data || []) as Region[];
    setBranches(branchData);
    setRegions(regionData);
    if (repaymentData) setRepayments(repaymentData);
    if (kycRes.data) setKycDocs(kycRes.data);
    if (campRes.data) setSmsCampaigns(campRes.data);
    if (profileRes.data) setProfiles(profileRes.data as Profile[]);
    if (productRes.data) setProducts(productRes.data);
    if (saRes.data) setStaffAssignments(saRes.data as any[]);
    if (rolesRes.data) setUserRoles(rolesRes.data as any[]);

    let loanQuery = supabase.from("loan_applications").select("*").order("created_at", { ascending: false });
    if (role === "loan_officer") loanQuery = loanQuery.eq("loan_officer_id", user.id);
    else if (role === "branch_manager" && staffAssignment?.branch_id) loanQuery = loanQuery.eq("branch_id", staffAssignment.branch_id);

    const { data: loanData } = await loanQuery.limit(1000);
    if (loanData) {
      setLoans(loanData as LoanApp[]);
      const active = loanData.filter((l: any) => l.status === "disbursed" || l.status === "approved");
      const pending = loanData.filter((l: any) => l.status === "pending");
      const totalAmt = loanData.reduce((sum: number, l: any) => (["approved", "disbursed", "completed"].includes(l.status) ? sum + Number(l.amount_approved || 0) : sum), 0);
      const overdueCount = repaymentData.filter((r: any) => r.status === "overdue").length || 0;
      const totalDue = repaymentData.reduce((s: number, r: any) => s + Number(r.amount_due || 0), 0);
      const totalPaid = repaymentData.reduce((s: number, r: any) => s + Number(r.amount_paid || 0), 0);
      setStats({
        totalLoans: loanData.length, activeLoans: active.length, pendingApproval: pending.length,
        totalDisbursed: totalAmt, overduePayments: overdueCount,
        collectionRate: totalDue > 0 ? Math.round((totalPaid / totalDue) * 1000) / 10 : 0,
        totalPaid, totalDue,
      });

      // Generate dynamic role-specific insights from real data
      const dynamicInsights = generateRoleInsights(
        role as any,
        loanData as LoanApp[],
        repaymentData,
        branchData,
        regionData,
        staffAssignment,
      );
      setInsights(dynamicInsights as Insight[]);
    }
    setLoadingData(false);
  }, [user, role, staffAssignment]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const handleStatusChange = useCallback(async (loanId: string, newStatus: "approved" | "rejected") => {
    setUpdatingLoanId(loanId);
    const updateData: Record<string, any> = { status: newStatus };
    if (newStatus === "approved") {
      const loan = loans.find(l => l.id === loanId);
      if (loan?.financing_amount) updateData.amount_approved = parseFloat(loan.financing_amount.replace(/[^0-9.]/g, '')) || 0;
    }
    const { error } = await supabase.from("loan_applications").update(updateData).eq("id", loanId);
    if (error) toast.error(`Failed: ${error.message}`);
    else toast.success(`Loan ${newStatus}`);
    setUpdatingLoanId(null);
  }, [loans]);

  const handleExportLoans = () => {
    exportToCSV(loans.map(l => ({
      Name: l.full_name, Phone: l.phone, Email: l.email || "", Business: l.business_type,
      Amount: l.financing_amount || "", Status: l.status, "Risk Score": l.risk_score || "",
      "Approval Level": l.approval_level || l.status,
      Date: new Date(l.created_at).toLocaleDateString(),
    })), "loans-export");
    toast.success("Loans exported");
  };

  const handleDownloadReport = () => {
    const report = generateLoanReport(loans, repayments, `Demo CAPITAL — ${getRoleLabel().toUpperCase()} REPORT`);
    downloadReport(report, "portfolio-report.txt");
    toast.success("Report downloaded");
  };

  const getRoleLabel = () => {
    const labels: Record<string, string> = {
      ceo: "Chief Executive Officer", gm: "General Manager",
      regional_manager: "Regional Manager", branch_manager: "Branch Manager",
      loan_officer: "Loan Officer", admin: "System Admin", user: "Client",
      marketing_lead: "Marketing Lead"
    };
    return labels[role || "user"] || "User";
  };

  const getScopeLabel = () => {
    if (isExecutive || isMarketingLead) return "All Regions · All Branches";
    if (role === "regional_manager" && staffAssignment?.region_id) {
      const r = regions.find(r => r.id === staffAssignment.region_id);
      return r ? `${r.name} Region` : "Region";
    }
    if ((role === "branch_manager" || role === "loan_officer") && staffAssignment?.branch_id) {
      const b = branches.find(b => b.id === staffAssignment.branch_id);
      return b ? `${b.name}${b.location ? ` · ${b.location}` : ""}` : "Branch";
    }
    return "";
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "critical": return "border-l-destructive bg-destructive/5";
      case "warning": return "border-l-amber-500 bg-amber-50";
      case "success": return "border-l-kc-green bg-green-50";
      default: return "border-l-primary bg-primary/5";
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

  const filteredLoans = loans.filter(l => {
    const matchStatus = loanStatusFilter === "all" || l.status === loanStatusFilter;
    const term = loanSearch.toLowerCase();
    const matchSearch = !term || l.full_name.toLowerCase().includes(term) || l.phone.includes(term);
    return matchStatus && matchSearch;
  });

  // Sections available per role
  const getSections = () => {
    const isClient = !canApproveReject && !isManager && !isExecutive && !isMarketingLead;
    // Clients only see overview + my loans link
    if (isClient) {
      return [
        { key: "overview", label: "Overview", icon: BarChart3 },
        { key: "myloans", label: "My Loans", icon: FileText },
      ];
    }
    // Marketing Lead gets a comprehensive set of sections
    if (isMarketingLead) {
      return [
        { key: "overview", label: "Overview", icon: BarChart3 },
        { key: "sms", label: "SMS Campaigns", icon: MessageSquare },
        { key: "ai-builder", label: "AI Builder", icon: Sparkles },
        { key: "segmentation", label: "Segmentation", icon: Tag },
        { key: "workflows", label: "Automations", icon: Zap },
        { key: "loans", label: "Loan Pipeline", icon: FileText },
        { key: "performance", label: "Performance", icon: Eye },
        { key: "portfolio-analytics", label: "Portfolio Analytics", icon: Target },
        { key: "reports", label: "Reports", icon: Download },
        { key: "analytics", label: "Analytics", icon: TrendingUp },
        { key: "audit", label: "Audit Trail", icon: History },
      ];
    }
    const base = [
      { key: "overview", label: "Overview", icon: BarChart3 },
    ];
    if (role === "loan_officer") base.push({ key: "workspace", label: "My Workspace", icon: Wrench });
    if (role === "branch_manager") base.push({ key: "operations", label: "Operations Hub", icon: Target });
    if (role === "regional_manager") base.push({ key: "regional", label: "Regional Command", icon: MapPin });
    base.push(
      { key: "approvals", label: "Approvals", icon: Shield },
      { key: "disbursements", label: "Disburse", icon: Banknote },
      { key: "loans", label: "Loans", icon: FileText },
    );
    if (isManager) base.push({ key: "analytics", label: "Analytics", icon: TrendingUp });
    if (isExecutive) base.push({ key: "portfolio-analytics", label: "Portfolio Analytics", icon: Target });
    if (isExecutive) base.push({ key: "client-history", label: "Client History", icon: Users });
    if (isExecutive) base.push({ key: "advanced-reports", label: "Advanced Reports", icon: FileText });
    if (isManager) base.push({ key: "par", label: "PAR & Insights", icon: PieChart });
    if (role === "ceo") base.push({ key: "command", label: "Command Center", icon: Crown });
    if (isExecutive) base.push({ key: "fraud", label: "Fraud & Risk", icon: AlertTriangle });
    if (isManager) base.push({ key: "performance", label: "Performance", icon: Activity });
    if (isExecutive || role === "loan_officer" || role === "branch_manager") base.push({ key: "kyc", label: "KYC Queue", icon: FileCheck });
    base.push({ key: "sms", label: "SMS Campaigns", icon: MessageSquare });
    if (isExecutive) base.push({ key: "staff-overview", label: "Staff & Users", icon: Users });
    if (isExecutive) base.push({ key: "recruitment", label: "Recruitment", icon: Briefcase });
    if (role === "loan_officer" || role === "branch_manager" || isExecutive) base.push({ key: "onboarding", label: "Onboard Client", icon: UserPlus });
    if (isManager) base.push({ key: "audit", label: "Audit Trail", icon: History });
    return base;
  };

  if (loading) {
    return <div className="min-h-screen bg-warm flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-warm">
      <header className="bg-background shadow-sm border-b border-border sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Demo Capital" className="h-9 w-auto rounded" />
            <span className="font-display font-bold text-lg text-foreground hidden sm:block">Demo Capital</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-foreground">{user?.user_metadata?.full_name || user?.email}</p>
              <p className="text-xs text-primary font-medium">{getRoleLabel()}</p>
            </div>
            {user && <NotificationBell userId={user.id} />}
            <Button variant="ghost" size="sm" title="Replay tutorial" onClick={() => { if (user && role) { resetTutorial(role, user.id); setTutorialRestart(t => t + 1); } }}>
              <Rocket className="w-4 h-4" />
            </Button>
            <Link to="/reports"><Button variant="outline" size="sm"><FileText className="w-4 h-4 mr-1" /> Reports</Button></Link>
            {role === "admin" && (
              <Link to="/admin"><Button variant="outline" size="sm"><Shield className="w-4 h-4 mr-1" /> Admin</Button></Link>
            )}
            <Button variant="outline" size="sm" onClick={handleSignOut}><LogOut className="w-4 h-4 mr-1" /> Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Role Banner */}
        <div className={cn("rounded-2xl p-6 text-primary-foreground", role === "ceo" ? "bg-gradient-to-r from-primary via-kc-blue-dark to-primary" : "bg-gradient-primary")}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                {role === "ceo" && <Crown className="w-7 h-7 text-amber-300" />}
                {isMarketingLead && <Megaphone className="w-7 h-7 text-amber-300" />}
                <h1 className="text-2xl font-bold font-display">{getRoleLabel()} Dashboard</h1>
              </div>
              <p className="text-primary-foreground/80 font-body mt-1 flex items-center gap-2">
                {getScopeLabel() && <><MapPin className="w-4 h-4" /> {getScopeLabel()}</>}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {canExport && (
                <>
                  <Button variant="secondary" size="sm" className="bg-primary-foreground/20 text-primary-foreground border-0 hover:bg-primary-foreground/30" onClick={handleExportLoans}>
                    <Download className="w-4 h-4 mr-1" /> Export CSV
                  </Button>
                  <Button variant="secondary" size="sm" className="bg-primary-foreground/20 text-primary-foreground border-0 hover:bg-primary-foreground/30" onClick={handleDownloadReport}>
                    <FileText className="w-4 h-4 mr-1" /> Report
                  </Button>
                </>
              )}
              <div className="flex items-center gap-2 bg-primary-foreground/20 rounded-lg px-3 py-1.5">
                <Shield className="w-4 h-4" />
                <span className="text-xs font-medium hidden sm:inline">Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {getSections().map(s => (
            <button key={s.key} onClick={() => s.key === "myloans" ? navigate("/my-loans") : setActiveSection(s.key)} className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors",
              activeSection === s.key ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted shadow-sm"
            )}>
              <s.icon className="w-3.5 h-3.5" /> {s.label}
            </button>
          ))}
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* OVERVIEW SECTION */}
            {activeSection === "overview" && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <StatCard icon={<FileText />} label="Total Loans" value={stats.totalLoans.toString()} />
                  <StatCard icon={<Activity />} label="Active" value={stats.activeLoans.toString()} color="text-kc-green" />
                  <StatCard icon={<Clock />} label="Pending" value={stats.pendingApproval.toString()} color="text-amber-500" />
                  <StatCard icon={<DollarSign />} label="Disbursed" value={`KES ${(stats.totalDisbursed / 1000).toFixed(0)}K`} color="text-primary" />
                  <StatCard icon={<AlertTriangle />} label="Overdue" value={stats.overduePayments.toString()} color="text-destructive" />
                  <StatCard icon={<TrendingUp />} label="Collection" value={`${stats.collectionRate}%`} color="text-kc-green" />
                </div>

                {/* AI Insights */}
                {insights.length > 0 && (
                  <div>
                    <h2 className="text-lg font-bold font-display text-foreground mb-3 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" /> Insights & Alerts
                    </h2>
                    <div className="grid gap-3 md:grid-cols-2">
                      {insights.map((insight) => (
                        <div key={insight.id} className={`bg-background rounded-xl p-4 border-l-4 shadow-card ${getSeverityStyles(insight.severity)}`}>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold font-display text-foreground text-sm">{insight.title}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              insight.severity === "critical" ? "bg-destructive/10 text-destructive" :
                              insight.severity === "warning" ? "bg-amber-100 text-amber-700" :
                              insight.severity === "success" ? "bg-green-100 text-green-700" :
                              "bg-primary/10 text-primary"
                            }`}>{insight.severity}</span>
                          </div>
                          <p className="text-xs text-muted-foreground font-body mt-2 leading-relaxed">{insight.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Regional/Branch Overview for managers */}
                {(isExecutive || role === "regional_manager") && (
                  <div>
                    <h2 className="text-lg font-bold font-display text-foreground mb-3 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      {role === "regional_manager" ? "Your Branches" : "Regional Overview"}
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {(role === "regional_manager"
                        ? branches.filter(b => b.region_id === staffAssignment?.region_id)
                        : regions
                      ).map((item) => {
                        const isRegion = !("region_id" in item);
                        const itemLoans = isRegion
                          ? loans.filter(l => { const b = branches.find(b => b.id === l.branch_id); return b && b.region_id === item.id; })
                          : loans.filter(l => l.branch_id === item.id);
                        const itemRepayments = repayments.filter(r => itemLoans.some(l => l.id === r.loan_id));
                        const totalDue = itemRepayments.reduce((s: number, r: any) => s + Number(r.amount_due || 0), 0);
                        const totalPaid = itemRepayments.reduce((s: number, r: any) => s + Number(r.amount_paid || 0), 0);
                        return (
                          <div key={item.id} className="bg-background rounded-xl p-4 shadow-card">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-semibold font-display text-foreground text-sm">{item.name}</h3>
                              <span className="text-xs text-muted-foreground">{(item as any).code}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-center">
                              <div><p className="text-lg font-bold text-foreground">{itemLoans.length}</p><p className="text-xs text-muted-foreground">Loans</p></div>
                              <div><p className="text-lg font-bold text-kc-green">{itemLoans.filter(l => l.status === "disbursed").length}</p><p className="text-xs text-muted-foreground">Active</p></div>
                              <div><p className="text-lg font-bold text-amber-500">{itemLoans.filter(l => l.status === "pending").length}</p><p className="text-xs text-muted-foreground">Pending</p></div>
                              <div><p className="text-lg font-bold text-primary">{totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0}%</p><p className="text-xs text-muted-foreground">Collect.</p></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Branch Manager: quick KYC + repayment summary */}
                {role === "branch_manager" && (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="bg-background rounded-xl p-5 shadow-card">
                      <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-primary" /> Repayment Summary
                      </h3>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div><p className="text-xl font-bold text-foreground">KES {(stats.totalDue / 1000).toFixed(0)}K</p><p className="text-xs text-muted-foreground">Total Due</p></div>
                        <div><p className="text-xl font-bold text-kc-green">KES {(stats.totalPaid / 1000).toFixed(0)}K</p><p className="text-xs text-muted-foreground">Collected</p></div>
                        <div><p className="text-xl font-bold text-destructive">{stats.overduePayments}</p><p className="text-xs text-muted-foreground">Overdue</p></div>
                      </div>
                    </div>
                    <div className="bg-background rounded-xl p-5 shadow-card">
                      <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
                        <FileCheck className="w-5 h-5 text-amber-500" /> KYC Queue
                      </h3>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div><p className="text-xl font-bold text-amber-500">{kycDocs.filter(d => d.status === "pending").length}</p><p className="text-xs text-muted-foreground">Pending</p></div>
                        <div><p className="text-xl font-bold text-kc-green">{kycDocs.filter(d => d.status === "approved").length}</p><p className="text-xs text-muted-foreground">Approved</p></div>
                        <div><p className="text-xl font-bold text-destructive">{kycDocs.filter(d => d.status === "rejected").length}</p><p className="text-xs text-muted-foreground">Rejected</p></div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Marketing Lead: campaign stats + pipeline summary */}
                {isMarketingLead && (
                  <div className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="bg-background rounded-xl p-5 shadow-card">
                        <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
                          <Megaphone className="w-5 h-5 text-primary" /> Campaign Targeting
                        </h3>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div><p className="text-xl font-bold text-amber-500">{stats.pendingApproval}</p><p className="text-xs text-muted-foreground">Pending Loans</p></div>
                          <div><p className="text-xl font-bold text-kc-green">{stats.activeLoans}</p><p className="text-xs text-muted-foreground">Active Loans</p></div>
                          <div><p className="text-xl font-bold text-destructive">{stats.overduePayments}</p><p className="text-xs text-muted-foreground">Overdue</p></div>
                        </div>
                      </div>
                      <div className="bg-background rounded-xl p-5 shadow-card">
                        <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-primary" /> Collections Overview
                        </h3>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div><p className="text-xl font-bold text-foreground">KES {(stats.totalDue / 1000).toFixed(0)}K</p><p className="text-xs text-muted-foreground">Total Due</p></div>
                          <div><p className="text-xl font-bold text-kc-green">KES {(stats.totalPaid / 1000).toFixed(0)}K</p><p className="text-xs text-muted-foreground">Collected</p></div>
                          <div><p className="text-xl font-bold text-primary">{stats.collectionRate}%</p><p className="text-xs text-muted-foreground">Rate</p></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* LOAN OFFICER WORKSPACE */}
            {activeSection === "workspace" && role === "loan_officer" && (
              <LoanOfficerWorkspace userId={user?.id || ""} loans={loans} repayments={repayments} onUpdate={fetchData} />
            )}

            {/* BRANCH MANAGER OPERATIONS HUB */}
            {activeSection === "operations" && role === "branch_manager" && staffAssignment?.branch_id && (
              <BranchOperationsHub
                branchId={staffAssignment.branch_id}
                branchName={branches.find(b => b.id === staffAssignment.branch_id)?.name || "Branch"}
                loans={loans}
                repayments={repayments}
                profiles={profiles}
                staffAssignments={staffAssignments}
                userRoles={userRoles}
              />
            )}

            {/* REGIONAL MANAGER COMMAND VIEW */}
            {activeSection === "regional" && role === "regional_manager" && staffAssignment?.region_id && (
              <RegionalCommandView
                regionId={staffAssignment.region_id}
                regionName={regions.find(r => r.id === staffAssignment.region_id)?.name || "Region"}
                loans={loans}
                repayments={repayments}
                branches={branches}
                profiles={profiles}
                staffAssignments={staffAssignments}
              />
            )}

            {/* CEO COMMAND CENTER */}
            {activeSection === "command" && role === "ceo" && (
              <CEOCommandCenter loans={loans} repayments={repayments} branches={branches} regions={regions} profiles={profiles} staffAssignments={staffAssignments} userRoles={userRoles} />
            )}

            {/* APPROVALS SECTION */}
            {activeSection === "approvals" && (
              <ApprovalWorkflow loans={loans} onUpdate={fetchData} />
            )}

            {/* ANALYTICS SECTION */}
            {activeSection === "analytics" && (
              <DashboardCharts loans={loans} repayments={repayments} role={role} />
            )}

            {/* FRAUD & RISK (executives) */}
            {activeSection === "fraud" && isExecutive && (
              <FraudDetectionPanel loans={loans} repayments={repayments} branches={branches} />
            )}

            {/* PERFORMANCE */}
            {activeSection === "performance" && isManager && (
              <PerformanceLeaderboard loans={loans} repayments={repayments} branches={branches} />
            )}

            {/* KYC Queue for officers/branch managers */}
            {activeSection === "kyc" && (role === "loan_officer" || role === "branch_manager" || isExecutive) && (
              <div>
                <h2 className="text-lg font-bold font-display text-foreground mb-3 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-primary" /> KYC Documents {isExecutive ? "Overview" : "Pending Review"}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {kycDocs.filter(d => isExecutive ? true : d.status === "pending").slice(0, isExecutive ? 50 : 100).map(doc => (
                    <div key={doc.id} className="bg-background rounded-xl p-4 shadow-card">
                      <div className="flex items-center gap-3 mb-3">
                        <FileCheck className={`w-8 h-8 shrink-0 ${doc.status === "approved" ? "text-kc-green" : doc.status === "rejected" ? "text-destructive" : "text-amber-500"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm">{doc.document_type.replace(/_/g, " ")}</p>
                          <p className="text-xs text-muted-foreground truncate">{doc.file_name}</p>
                        </div>
                        {isExecutive && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                            doc.status === "approved" ? "bg-green-100 text-green-700" :
                            doc.status === "rejected" ? "bg-red-100 text-red-700" :
                            "bg-amber-100 text-amber-700"
                          }`}>{doc.status}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Submitted: {new Date(doc.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                  {kycDocs.filter(d => isExecutive ? true : d.status === "pending").length === 0 && (
                    <p className="text-muted-foreground text-sm col-span-full text-center py-8">No KYC documents found</p>
                  )}
                </div>
              </div>
            )}

            {/* STAFF & USERS OVERVIEW (CEO/GM) */}
            {activeSection === "staff-overview" && isExecutive && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" /> Staff & Users Overview
                </h2>
                {/* Role summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {["ceo", "gm", "regional_manager", "branch_manager", "loan_officer", "marketing_lead", "user", "admin"].map(r => {
                    const count = userRoles.filter(ur => ur.role === r).length;
                    const labels: Record<string, string> = { ceo: "CEO", gm: "GM", regional_manager: "Regional Mgrs", branch_manager: "Branch Mgrs", loan_officer: "Loan Officers", marketing_lead: "Marketing", user: "Clients", admin: "Admins" };
                    return (
                      <div key={r} className="bg-background rounded-xl p-4 shadow-card text-center">
                        <p className="text-2xl font-bold font-display text-foreground">{count}</p>
                        <p className="text-xs text-muted-foreground">{labels[r] || r}</p>
                      </div>
                    );
                  })}
                </div>
                {/* Staff assignments by branch */}
                <div>
                  <h3 className="font-display font-semibold text-foreground mb-3">Staff Assignments by Branch</h3>
                  <div className="bg-background rounded-xl shadow-card overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border bg-muted/50">
                        <th className="text-left p-3 font-semibold text-foreground">Staff</th>
                        <th className="text-left p-3 font-semibold text-foreground">Role</th>
                        <th className="text-left p-3 font-semibold text-foreground">Branch</th>
                        <th className="text-left p-3 font-semibold text-foreground">Region</th>
                      </tr></thead>
                      <tbody>
                        {staffAssignments.slice(0, 50).map((sa, i) => {
                          const profile = profiles.find(p => p.user_id === sa.user_id);
                          const ur = userRoles.find(r => r.user_id === sa.user_id);
                          const branch = branches.find(b => b.id === sa.branch_id);
                          const region = regions.find(r => r.id === sa.region_id) || (branch ? regions.find(r => r.id === branch.region_id) : null);
                          return (
                            <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="p-3">
                                <p className="font-medium text-foreground">{profile?.full_name || "—"}</p>
                                <p className="text-xs text-muted-foreground">{profile?.email || sa.user_id.slice(0, 8)}</p>
                              </td>
                              <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">{(ur?.role || "—").replace(/_/g, " ")}</span></td>
                              <td className="p-3 text-muted-foreground">{branch?.name || "—"}</td>
                              <td className="p-3 text-muted-foreground">{region?.name || "—"}</td>
                            </tr>
                          );
                        })}
                        {staffAssignments.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No staff assignments found</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* RECRUITMENT (CEO/GM) */}
            {activeSection === "recruitment" && isExecutive && (
              <AdminRecruitment />
            )}

            {/* LOANS TABLE */}
            {activeSection === "loans" && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <h2 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" /> Loan Applications
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input value={loanSearch} onChange={e => setLoanSearch(e.target.value)} placeholder="Search..." className="pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-background w-40 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <select value={loanStatusFilter} onChange={e => setLoanStatusFilter(e.target.value)} className="text-sm border border-border rounded-lg px-2 py-1.5 bg-background">
                      <option value="all">All</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="disbursed">Disbursed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
                <div className="bg-background rounded-xl shadow-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left p-3 font-semibold text-foreground">Client</th>
                          <th className="text-left p-3 font-semibold text-foreground hidden md:table-cell">Business</th>
                          <th className="text-left p-3 font-semibold text-foreground">Amount</th>
                          <th className="text-left p-3 font-semibold text-foreground hidden sm:table-cell">Risk</th>
                          <th className="text-left p-3 font-semibold text-foreground">Status</th>
                          <th className="text-left p-3 font-semibold text-foreground hidden lg:table-cell">Approval</th>
                          {canApproveReject && <th className="text-left p-3 font-semibold text-foreground">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLoans.slice(0, 30).map((loan) => (
                          <tr key={loan.id} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="p-3">
                              <p className="font-medium text-foreground">{loan.full_name}</p>
                              <p className="text-xs text-muted-foreground">{new Date(loan.created_at).toLocaleDateString()}</p>
                            </td>
                            <td className="p-3 hidden md:table-cell text-muted-foreground">{loan.business_type}</td>
                            <td className="p-3 font-medium text-foreground">{loan.financing_amount || "—"}</td>
                            <td className="p-3 hidden sm:table-cell">
                              {loan.risk_score && (
                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground",
                                  loan.risk_score >= 80 ? "bg-kc-green" : loan.risk_score >= 65 ? "bg-amber-500" : "bg-destructive"
                                )}>{loan.risk_score}</div>
                              )}
                            </td>
                            <td className="p-3">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getStatusBadge(loan.status)}`}>{loan.status}</span>
                            </td>
                            <td className="p-3 hidden lg:table-cell">
                              <span className="text-xs text-muted-foreground capitalize">{(loan.approval_level || loan.status).replace(/_/g, " ")}</span>
                            </td>
                            {canApproveReject && (
                              <td className="p-3">
                                {loan.status === "pending" ? (
                                  <div className="flex items-center gap-1.5">
                                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-kc-green/50 text-kc-green hover:bg-kc-green hover:text-primary-foreground" disabled={updatingLoanId === loan.id} onClick={() => handleStatusChange(loan.id, "approved")}>
                                      {updatingLoanId === loan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" />}
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-destructive/50 text-destructive hover:bg-destructive hover:text-primary-foreground" disabled={updatingLoanId === loan.id} onClick={() => handleStatusChange(loan.id, "rejected")}>
                                      {updatingLoanId === loan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsDown className="w-3 h-3" />}
                                    </Button>
                                  </div>
                                ) : <span className="text-xs text-muted-foreground">—</span>}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredLoans.length > 30 && (
                    <div className="p-3 text-center border-t border-border">
                      <span className="text-sm text-muted-foreground">Showing 30 of {filteredLoans.length}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Loan officer AI recommendations */}
            {activeSection === "overview" && role === "loan_officer" && loans.filter(l => l.ai_recommendation && l.status === "pending").length > 0 && (
              <div>
                <h2 className="text-lg font-bold font-display text-foreground mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" /> Recommendations
                </h2>
                <div className="grid gap-3">
                  {loans.filter(l => l.ai_recommendation && l.status === "pending").slice(0, 5).map(loan => (
                    <div key={loan.id} className="bg-background rounded-xl p-4 shadow-card flex items-start gap-4">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0",
                        (loan.risk_score || 0) >= 80 ? "bg-kc-green" : (loan.risk_score || 0) >= 65 ? "bg-amber-500" : "bg-destructive"
                      )}>{loan.risk_score}</div>
                      <div>
                        <p className="font-semibold text-foreground">{loan.full_name} — {loan.financing_amount}</p>
                        <p className="text-sm text-muted-foreground font-body mt-1">{loan.ai_recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SMS Campaigns */}
            {activeSection === "sms" && (
              <div className="space-y-8">
                <SMSCampaigns />
                <CampaignAnalytics />
              </div>
            )}

            {/* AI Campaign Builder */}
            {activeSection === "ai-builder" && isMarketingLead && (
              <AICampaignBuilder />
            )}

            {/* Client Segmentation */}
            {activeSection === "segmentation" && isMarketingLead && (
              <ClientSegmentation loans={loans} repayments={repayments} branches={branches} regions={regions} profiles={profiles} />
            )}

            {/* Automation Workflows */}
            {activeSection === "workflows" && isMarketingLead && (
              <AutomationWorkflows />
            )}

            {/* Marketing Performance View */}
            {activeSection === "performance" && isMarketingLead && (
              <MarketingPerformanceView
                loans={loans} repayments={repayments} branches={branches} regions={regions}
                kycDocs={kycDocs} profiles={profiles} staffAssignments={staffAssignments} userRoles={userRoles}
              />
            )}

            {/* Marketing Reports */}
            {activeSection === "reports" && isMarketingLead && (
              <MarketingReports loans={loans} repayments={repayments} branches={branches} regions={regions} campaigns={smsCampaigns} />
            )}

            {/* Disbursement Workflow */}
            {activeSection === "disbursements" && (
              <DisbursementWorkflow loans={loans} products={products} onUpdate={fetchData} />
            )}

            {/* PAR & Performance Analytics */}
            {activeSection === "par" && isManager && (
              <PerformanceAnalytics loans={loans} repayments={repayments} branches={branches} profiles={profiles} />
            )}

            {/* Audit Trail */}
            {activeSection === "audit" && isManager && (
              <AuditTrail profiles={profiles} />
            )}

            {/* Client Loan History */}
            {activeSection === "client-history" && <ClientLoanHistory />}

            {/* Enhanced Portfolio Analytics */}
            {activeSection === "portfolio-analytics" && <EnhancedPortfolioAnalytics />}

            {/* Advanced Reporting */}
            {activeSection === "advanced-reports" && <AdvancedReporting />}

            {/* Client Onboarding */}
            {activeSection === "onboarding" && <ClientOnboarding />}
          </>
        )}
      </main>

      {/* Floating widgets */}
      {isExecutive && <ExecutiveAIChat />}
      <InternalMessaging />

      {/* Role-based Welcome Tutorial */}
      {role && (
        <RoleWelcomeTutorial role={role} onNavigateToSection={(section) => setActiveSection(section)} restartTrigger={tutorialRestart} />
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color?: string }) => (
  <div className="bg-background rounded-xl p-4 shadow-card">
    <div className={`w-8 h-8 mb-2 ${color || "text-muted-foreground"}`}>{icon}</div>
    <p className="text-2xl font-bold font-display text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground font-body">{label}</p>
  </div>
);

export default RoleDashboard;
