import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import NotificationBell from "@/components/dashboard/NotificationBell";
import logo from "@/assets/kechita-logo.jpg";
import { toast } from "sonner";
import {
  FileText, Download, LogOut, User, BarChart3, Calendar, Building2, Loader2, ArrowLeft
} from "lucide-react";
import {
  generateLoanSummaryPDF,
  generateRepaymentSchedulePDF,
  generateBranchPerformancePDF,
} from "@/lib/pdf-report";

const Reports = () => {
  const { user, role, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [loans, setLoans] = useState<any[]>([]);
  const [repayments, setRepayments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  const isStaff = role && role !== "user";

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoadingData(true);
      const [loansRes, repaymentsRes, branchesRes] = await Promise.all([
        supabase.from("loan_applications").select("*"),
        supabase.from("loan_repayments").select("*"),
        supabase.from("branches").select("*"),
      ]);
      setLoans(loansRes.data || []);
      setRepayments(repaymentsRes.data || []);
      setBranches(branchesRes.data || []);
      setLoadingData(false);
    };
    fetchData();
  }, [user]);

  const handleGenerate = (type: string) => {
    setGenerating(type);
    try {
      if (type === "portfolio") {
        generateLoanSummaryPDF(loans, repayments);
      } else if (type === "repayment" && loans.length > 0) {
        // Generate for the most recent active loan
        const activeLoan = loans.find(l => ["disbursed", "approved"].includes(l.status)) || loans[0];
        const loanRepayments = repayments.filter(r => r.loan_id === activeLoan.id);
        generateRepaymentSchedulePDF(activeLoan, loanRepayments);
      } else if (type === "branch") {
        generateBranchPerformancePDF(branches, loans, repayments);
      }
      toast.success("Report generated! Use your browser's Save as PDF option.");
    } catch {
      toast.error("Failed to generate report");
    }
    setTimeout(() => setGenerating(null), 1000);
  };

  const reportTypes = [
    {
      id: "portfolio",
      title: "Loan Portfolio Summary",
      description: "Complete overview of all loan applications, disbursements, collection rates, and status breakdown.",
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/10",
      available: true,
    },
    {
      id: "repayment",
      title: "Repayment Schedule",
      description: "Detailed week-by-week repayment schedule for a loan with amounts due, paid, and balances.",
      icon: Calendar,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      available: loans.length > 0,
    },
    {
      id: "branch",
      title: "Branch Performance",
      description: "Compare branch-level metrics including loan volume, disbursements, collections, and overdue rates.",
      icon: Building2,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      available: isStaff && branches.length > 0,
    },
  ];

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/">
              <img src={logo} alt="Demo" className="h-9 w-9 rounded-lg object-cover" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-foreground">Reports</h1>
              <p className="text-xs text-muted-foreground">Download PDF reports</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell userId={user.id} />
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Generate Reports
          </h2>
          <p className="text-muted-foreground mt-1">
            Select a report type below. Reports open in a new window — use <strong>Ctrl+P</strong> (or ⌘P) to save as PDF.
          </p>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading report data…</span>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reportTypes.map((report) => (
              <Card
                key={report.id}
                className={`transition-all hover:shadow-lg ${!report.available ? "opacity-50" : "cursor-pointer"}`}
              >
                <CardHeader className="pb-3">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${report.bgColor} mb-3`}>
                    <report.icon className={`h-6 w-6 ${report.color}`} />
                  </div>
                  <CardTitle className="text-base">{report.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {report.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    variant={report.available ? "default" : "secondary"}
                    disabled={!report.available || generating === report.id}
                    onClick={() => handleGenerate(report.id)}
                  >
                    {generating === report.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {generating === report.id ? "Generating…" : "Generate PDF"}
                  </Button>
                  {!report.available && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      {report.id === "branch" ? "Staff access required" : "No data available"}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Per-loan repayment schedules */}
        {loans.length > 0 && (
          <div className="mt-10">
            <h3 className="text-lg font-semibold text-foreground mb-4">Individual Loan Repayment Schedules</h3>
            <div className="bg-card rounded-xl border border-border divide-y divide-border">
              {loans.slice(0, 20).map((loan) => {
                const loanReps = repayments.filter(r => r.loan_id === loan.id);
                return (
                  <div key={loan.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{loan.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {loan.business_type} · {loan.financing_amount || "N/A"} · {loanReps.length} payments
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loanReps.length === 0}
                      onClick={() => {
                        generateRepaymentSchedulePDF(loan, loanReps);
                        toast.success("Schedule generated!");
                      }}
                    >
                      <Download className="h-3.5 w-3.5 mr-1" /> PDF
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Reports;
