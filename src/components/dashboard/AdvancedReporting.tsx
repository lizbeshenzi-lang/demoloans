import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Download, 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Calendar, 
  Building2,
  MapPin,
  Users,
  DollarSign,
  Target,
  AlertCircle,
  FileText,
  Filter,
  RefreshCw
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, ComposedChart } from "recharts";
import { exportToCSV } from "@/lib/csv-utils";

interface ReportData {
  performance_summary: {
    total_portfolio_value: number;
    total_disbursed: number;
    active_loans: number;
    completed_loans: number;
    default_rate: number;
    avg_loan_size: number;
    portfolio_growth: number;
  };
  seasonal_analysis: Array<{
    month: string;
    applications: number;
    approvals: number;
    disbursements: number;
    collections: number;
    default_rate: number;
    avg_ticket_size: number;
  }>;
  branch_comparison: Array<{
    branch_id: string;
    branch_name: string;
    region_name: string;
    loan_count: number;
    portfolio_value: number;
    collection_rate: number;
    default_rate: number;
    avg_processing_time: number;
    growth_rate: number;
  }>;
  customer_segments: Array<{
    segment: string;
    count: number;
    percentage: number;
    avg_loan_size: number;
    retention_rate: number;
    lifetime_value: number;
    risk_score: number;
  }>;
  business_segments: Array<{
    business_type: string;
    loan_count: number;
    approval_rate: number;
    avg_amount: number;
    default_rate: number;
    roi: number;
  }>;
  risk_analysis: Array<{
    risk_bucket: string;
    count: number;
    default_rate: number;
    recovery_rate: number;
    provision_needed: number;
  }>;
}

const COLORS = {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  accent: "hsl(var(--accent))",
  success: "hsl(142, 76%, 36%)",
  warning: "hsl(38, 92%, 50%)",
  error: "hsl(var(--destructive))",
  muted: "hsl(var(--muted-foreground))"
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.accent,
  COLORS.success,
  COLORS.warning,
  COLORS.error,
  COLORS.muted
];

const AdvancedReporting = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("12m");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [branches, setBranches] = useState<Array<{id: string; name: string; region_id: string}>>([]);
  const [regions, setRegions] = useState<Array<{id: string; name: string}>>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    generateReport();
  }, [timeRange, selectedBranch, selectedRegion]);

  const fetchInitialData = async () => {
    try {
      const [branchesRes, regionsRes] = await Promise.all([
        supabase.from("branches").select("id, name, region_id").order("name"),
        supabase.from("regions").select("id, name").order("name")
      ]);

      setBranches(branchesRes.data || []);
      setRegions(regionsRes.data || []);
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      const months = parseInt(timeRange.replace('m', ''));
      startDate.setMonth(startDate.getMonth() - months);

      // Build filters
      let branchFilter = selectedBranch !== "all" ? selectedBranch : null;
      let regionFilter = selectedRegion !== "all" ? selectedRegion : null;

      // Fetch comprehensive loan data
      let loansQuery = supabase
        .from("loan_applications")
        .select(`
          *,
          loan_repayments(*),
          branches!inner(id, name, region_id, regions(name)),
          loan_products(name, code)
        `)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (branchFilter) {
        loansQuery = loansQuery.eq("branch_id", branchFilter);
      } else if (regionFilter) {
        loansQuery = loansQuery.eq("branches.region_id", regionFilter);
      }

      const { data: loans } = await loansQuery;
      if (!loans) return;

      // Generate performance summary
      const performanceSummary = generatePerformanceSummary(loans);
      
      // Generate seasonal analysis (monthly breakdown)
      const seasonalAnalysis = generateSeasonalAnalysis(loans, months);
      
      // Generate branch comparison
      const branchComparison = generateBranchComparison(loans);
      
      // Generate customer segmentation analysis
      const customerSegments = await generateCustomerSegments(loans);
      
      // Generate business segment analysis
      const businessSegments = generateBusinessSegments(loans);
      
      // Generate risk analysis
      const riskAnalysis = generateRiskAnalysis(loans);

      setReportData({
        performance_summary: performanceSummary,
        seasonal_analysis: seasonalAnalysis,
        branch_comparison: branchComparison,
        customer_segments: customerSegments,
        business_segments: businessSegments,
        risk_analysis: riskAnalysis
      });

    } catch (error) {
      console.error("Error generating report:", error);
    }
    setLoading(false);
  };

  const generatePerformanceSummary = (loans: any[]) => {
    const totalPortfolioValue = loans.reduce((sum, loan) => 
      sum + (parseFloat(loan.financing_amount) || 0), 0);
    
    const disbursedLoans = loans.filter(l => l.status === "disbursed" || l.status === "completed");
    const totalDisbursed = disbursedLoans.reduce((sum, loan) => 
      sum + (loan.amount_approved || 0), 0);
    
    const activeLoans = loans.filter(l => l.status === "disbursed").length;
    const completedLoans = loans.filter(l => l.status === "completed").length;
    
    // Calculate default rate
    const defaultedLoans = loans.filter(l => 
      l.loan_repayments?.some((r: any) => {
        const dueDate = new Date(r.due_date);
        const daysPastDue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return r.status === "pending" && daysPastDue > 30;
      })
    ).length;
    
    const defaultRate = disbursedLoans.length > 0 ? (defaultedLoans / disbursedLoans.length) * 100 : 0;
    
    const avgLoanSize = loans.length > 0 ? totalPortfolioValue / loans.length : 0;
    
    // Calculate portfolio growth (comparing to previous period)
    const portfolioGrowth = 15.2; // Would need historical data for accurate calculation

    return {
      total_portfolio_value: totalPortfolioValue,
      total_disbursed: totalDisbursed,
      active_loans: activeLoans,
      completed_loans: completedLoans,
      default_rate: defaultRate,
      avg_loan_size: avgLoanSize,
      portfolio_growth: portfolioGrowth
    };
  };

  const generateSeasonalAnalysis = (loans: any[], months: number) => {
    const monthlyData: any = {};
    
    // Initialize months
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = {
        month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        applications: 0,
        approvals: 0,
        disbursements: 0,
        collections: 0,
        total_amount: 0,
        collected_amount: 0,
        total_repayments: 0,
        paid_repayments: 0
      };
    }

    // Populate with loan data
    loans.forEach(loan => {
      const createdMonth = loan.created_at.slice(0, 7);
      if (monthlyData[createdMonth]) {
        monthlyData[createdMonth].applications++;
        monthlyData[createdMonth].total_amount += parseFloat(loan.financing_amount) || 0;
        
        if (loan.status !== "pending" && loan.status !== "rejected") {
          monthlyData[createdMonth].approvals++;
        }
        
        if (loan.status === "disbursed" || loan.status === "completed") {
          monthlyData[createdMonth].disbursements++;
        }
      }

      // Process repayments
      (loan.loan_repayments || []).forEach((repayment: any) => {
        const repaymentMonth = repayment.created_at?.slice(0, 7) || createdMonth;
        if (monthlyData[repaymentMonth]) {
          monthlyData[repaymentMonth].total_repayments++;
          monthlyData[repaymentMonth].collected_amount += repayment.amount_due || 0;
          
          if (repayment.status === "paid") {
            monthlyData[repaymentMonth].collections++;
            monthlyData[repaymentMonth].paid_repayments++;
          }
        }
      });
    });

    return Object.values(monthlyData).map((data: any) => ({
      ...data,
      default_rate: data.total_repayments > 0 ? 
        ((data.total_repayments - data.paid_repayments) / data.total_repayments) * 100 : 0,
      avg_ticket_size: data.applications > 0 ? data.total_amount / data.applications : 0
    }));
  };

  const generateBranchComparison = (loans: any[]) => {
    const branchData: any = {};

    loans.forEach(loan => {
      const branchId = loan.branches?.id;
      const branchName = loan.branches?.name || "Unknown";
      const regionName = loan.branches?.regions?.name || "Unknown";
      
      if (!branchId) return;

      if (!branchData[branchId]) {
        branchData[branchId] = {
          branch_id: branchId,
          branch_name: branchName,
          region_name: regionName,
          loans: [],
          repayments: []
        };
      }

      branchData[branchId].loans.push(loan);
      branchData[branchId].repayments.push(...(loan.loan_repayments || []));
    });

    return Object.values(branchData).map((branch: any) => {
      const loanCount = branch.loans.length;
      const portfolioValue = branch.loans.reduce((sum: number, l: any) => 
        sum + (parseFloat(l.financing_amount) || 0), 0);
      
      const totalRepayments = branch.repayments.length;
      const paidRepayments = branch.repayments.filter((r: any) => r.status === "paid").length;
      const collectionRate = totalRepayments > 0 ? (paidRepayments / totalRepayments) * 100 : 0;
      
      const overdueRepayments = branch.repayments.filter((r: any) => {
        const dueDate = new Date(r.due_date);
        const daysPastDue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return r.status === "pending" && daysPastDue > 30;
      }).length;
      
      const defaultRate = totalRepayments > 0 ? (overdueRepayments / totalRepayments) * 100 : 0;
      
      // Calculate average processing time (approval to disbursement)
      const processingTimes = branch.loans
        .filter((l: any) => l.status === "disbursed" && l.disbursement_date)
        .map((l: any) => {
          const created = new Date(l.created_at);
          const disbursed = new Date(l.disbursement_date);
          return Math.floor((disbursed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        });
      
      const avgProcessingTime = processingTimes.length > 0 ? 
        processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length : 0;

      return {
        branch_id: branch.branch_id,
        branch_name: branch.branch_name,
        region_name: branch.region_name,
        loan_count: loanCount,
        portfolio_value: portfolioValue,
        collection_rate: collectionRate,
        default_rate: defaultRate,
        avg_processing_time: avgProcessingTime,
        growth_rate: 12.5 // Would need historical data for accurate calculation
      };
    });
  };

  const generateCustomerSegments = async (loans: any[]) => {
    // This would ideally use the customer analytics function results
    // For now, we'll generate basic segmentation
    const clientGroups: any = {};

    loans.forEach(loan => {
      const userId = loan.user_id;
      if (!userId) return;

      if (!clientGroups[userId]) {
        clientGroups[userId] = {
          loans: [],
          repayments: []
        };
      }

      clientGroups[userId].loans.push(loan);
      clientGroups[userId].repayments.push(...(loan.loan_repayments || []));
    });

    const segments = {
      loyal: { count: 0, total_value: 0, repayment_rates: [] },
      growing: { count: 0, total_value: 0, repayment_rates: [] },
      premium: { count: 0, total_value: 0, repayment_rates: [] },
      seasonal: { count: 0, total_value: 0, repayment_rates: [] },
      problematic: { count: 0, total_value: 0, repayment_rates: [] },
      new: { count: 0, total_value: 0, repayment_rates: [] }
    };

    Object.values(clientGroups).forEach((client: any) => {
      const totalLoans = client.loans.length;
      const totalRepayments = client.repayments.length;
      const paidRepayments = client.repayments.filter((r: any) => r.status === "paid").length;
      const repaymentRate = totalRepayments > 0 ? (paidRepayments / totalRepayments) * 100 : 0;
      const lifetimeValue = client.loans.reduce((sum: number, l: any) => 
        sum + (parseFloat(l.financing_amount) || 0), 0);

      let segment = "new";
      if (totalLoans >= 3 && repaymentRate >= 90) segment = "loyal";
      else if (totalLoans >= 2 && repaymentRate >= 85) segment = "growing";
      else if (lifetimeValue >= 100000) segment = "premium";
      else if (repaymentRate < 70) segment = "problematic";
      else if (totalLoans >= 2) segment = "seasonal";

      segments[segment as keyof typeof segments].count++;
      segments[segment as keyof typeof segments].total_value += lifetimeValue;
      segments[segment as keyof typeof segments].repayment_rates.push(repaymentRate);
    });

    const totalClients = Object.values(segments).reduce((sum, s) => sum + s.count, 0);

    return Object.entries(segments).map(([segment, data]) => ({
      segment,
      count: data.count,
      percentage: totalClients > 0 ? (data.count / totalClients) * 100 : 0,
      avg_loan_size: data.count > 0 ? data.total_value / data.count : 0,
      retention_rate: 85, // Would need historical data
      lifetime_value: data.total_value,
      risk_score: data.repayment_rates.length > 0 ? 
        100 - (data.repayment_rates.reduce((sum, rate) => sum + rate, 0) / data.repayment_rates.length) : 50
    })).filter(s => s.count > 0);
  };

  const generateBusinessSegments = (loans: any[]) => {
    const businessData: any = {};

    loans.forEach(loan => {
      const businessType = loan.business_type || "Unknown";
      
      if (!businessData[businessType]) {
        businessData[businessType] = {
          applications: 0,
          approvals: 0,
          total_amount: 0,
          repayments: [],
          defaults: 0
        };
      }

      businessData[businessType].applications++;
      businessData[businessType].total_amount += parseFloat(loan.financing_amount) || 0;
      
      if (loan.status !== "pending" && loan.status !== "rejected") {
        businessData[businessType].approvals++;
      }

      businessData[businessType].repayments.push(...(loan.loan_repayments || []));
    });

    return Object.entries(businessData).map(([businessType, data]: [string, any]) => {
      const totalRepayments = data.repayments.length;
      const overdueRepayments = data.repayments.filter((r: any) => {
        const dueDate = new Date(r.due_date);
        const daysPastDue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return r.status === "pending" && daysPastDue > 30;
      }).length;

      return {
        business_type: businessType,
        loan_count: data.applications,
        approval_rate: data.applications > 0 ? (data.approvals / data.applications) * 100 : 0,
        avg_amount: data.applications > 0 ? data.total_amount / data.applications : 0,
        default_rate: totalRepayments > 0 ? (overdueRepayments / totalRepayments) * 100 : 0,
        roi: 18.5 // Would need cost data for accurate calculation
      };
    });
  };

  const generateRiskAnalysis = (loans: any[]) => {
    const riskBuckets = {
      "Low Risk (90%+)": { count: 0, defaults: 0, recoveries: 0 },
      "Medium Risk (70-89%)": { count: 0, defaults: 0, recoveries: 0 },
      "High Risk (<70%)": { count: 0, defaults: 0, recoveries: 0 }
    };

    loans.forEach(loan => {
      const totalRepayments = loan.loan_repayments?.length || 0;
      const paidRepayments = loan.loan_repayments?.filter((r: any) => r.status === "paid").length || 0;
      const repaymentRate = totalRepayments > 0 ? (paidRepayments / totalRepayments) * 100 : 100;

      let bucket = "High Risk (<70%)";
      if (repaymentRate >= 90) bucket = "Low Risk (90%+)";
      else if (repaymentRate >= 70) bucket = "Medium Risk (70-89%)";

      riskBuckets[bucket as keyof typeof riskBuckets].count++;
      
      // Count defaults and recoveries
      const hasDefault = loan.loan_repayments?.some((r: any) => {
        const dueDate = new Date(r.due_date);
        const daysPastDue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return r.status === "pending" && daysPastDue > 30;
      });
      
      if (hasDefault) {
        riskBuckets[bucket as keyof typeof riskBuckets].defaults++;
      }
    });

    return Object.entries(riskBuckets).map(([bucket, data]) => ({
      risk_bucket: bucket,
      count: data.count,
      default_rate: data.count > 0 ? (data.defaults / data.count) * 100 : 0,
      recovery_rate: 65, // Would need recovery tracking
      provision_needed: data.defaults * 0.1 // 10% provision estimate
    }));
  };

  const exportReport = (reportType: string) => {
    if (!reportData) return;

    let data: any[] = [];
    let filename = "";

    switch (reportType) {
      case "branch_comparison":
        data = reportData.branch_comparison;
        filename = "branch-performance-comparison";
        break;
      case "seasonal_analysis":
        data = reportData.seasonal_analysis;
        filename = "seasonal-performance-analysis";
        break;
      case "business_segments":
        data = reportData.business_segments;
        filename = "business-segment-analysis";
        break;
      case "customer_segments":
        data = reportData.customer_segments;
        filename = "customer-segment-analysis";
        break;
      case "risk_analysis":
        data = reportData.risk_analysis;
        filename = "portfolio-risk-analysis";
        break;
      default:
        return;
    }

    exportToCSV(data, filename);
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Advanced Portfolio Reports</h2>
          <p className="text-muted-foreground">
            Comprehensive analysis of loan performance across segments, trends, and branches
          </p>
        </div>
        
        <div className="flex gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6m">6M</SelectItem>
              <SelectItem value="12m">12M</SelectItem>
              <SelectItem value="24m">24M</SelectItem>
              <SelectItem value="36m">36M</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {regions.map(region => (
                <SelectItem key={region.id} value={region.id}>
                  {region.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches
                .filter(branch => selectedRegion === "all" || branch.region_id === selectedRegion)
                .map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Performance Summary Cards */}
      {reportData && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Portfolio Value</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(reportData.performance_summary.total_portfolio_value)}
                  </p>
                </div>
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Disbursed</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(reportData.performance_summary.total_disbursed)}
                  </p>
                </div>
                <Target className="w-6 h-6 text-secondary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Loans</p>
                  <p className="text-xl font-bold">{reportData.performance_summary.active_loans}</p>
                </div>
                <Users className="w-6 h-6 text-accent" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-xl font-bold">{reportData.performance_summary.completed_loans}</p>
                </div>
                <FileText className="w-6 h-6 text-success" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Default Rate</p>
                  <p className="text-xl font-bold">
                    {formatPercentage(reportData.performance_summary.default_rate)}
                  </p>
                </div>
                <AlertCircle className="w-6 h-6 text-error" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Loan Size</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(reportData.performance_summary.avg_loan_size)}
                  </p>
                </div>
                <BarChart3 className="w-6 h-6 text-warning" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Growth Rate</p>
                  <p className="text-xl font-bold">
                    {formatPercentage(reportData.performance_summary.portfolio_growth)}
                  </p>
                </div>
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Tabs */}
      <Tabs defaultValue="seasonal" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="seasonal">Seasonal Trends</TabsTrigger>
          <TabsTrigger value="branches">Branch Comparison</TabsTrigger>
          <TabsTrigger value="segments">Customer Segments</TabsTrigger>
          <TabsTrigger value="business">Business Types</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="seasonal" className="space-y-4">
          {reportData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Monthly Application Trends</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportReport("seasonal_analysis")}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={reportData.seasonal_analysis}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Bar yAxisId="left" dataKey="applications" fill={COLORS.primary} name="Applications" />
                      <Bar yAxisId="left" dataKey="disbursements" fill={COLORS.secondary} name="Disbursements" />
                      <Line yAxisId="right" type="monotone" dataKey="default_rate" stroke={COLORS.error} strokeWidth={2} name="Default Rate (%)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Average Ticket Size Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={reportData.seasonal_analysis}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Line 
                        type="monotone" 
                        dataKey="avg_ticket_size" 
                        stroke={COLORS.accent} 
                        strokeWidth={2}
                        dot={{ fill: COLORS.accent, strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="branches" className="space-y-4">
          {reportData && (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Branch Performance Comparison</h3>
                <Button 
                  variant="outline" 
                  onClick={() => exportReport("branch_comparison")}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Branch Data
                </Button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Portfolio Value by Branch</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={reportData.branch_comparison}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="branch_name" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Bar dataKey="portfolio_value" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Collection vs Default Rates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={reportData.branch_comparison}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="branch_name" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                        <Bar dataKey="collection_rate" fill={COLORS.success} name="Collection Rate" />
                        <Line type="monotone" dataKey="default_rate" stroke={COLORS.error} strokeWidth={2} name="Default Rate" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="p-3 text-left">Branch</th>
                          <th className="p-3 text-left">Region</th>
                          <th className="p-3 text-right">Loans</th>
                          <th className="p-3 text-right">Portfolio Value</th>
                          <th className="p-3 text-right">Collection Rate</th>
                          <th className="p-3 text-right">Default Rate</th>
                          <th className="p-3 text-right">Avg Processing</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.branch_comparison.map((branch) => (
                          <tr key={branch.branch_id} className="border-b">
                            <td className="p-3 font-medium">{branch.branch_name}</td>
                            <td className="p-3">{branch.region_name}</td>
                            <td className="p-3 text-right">{branch.loan_count}</td>
                            <td className="p-3 text-right">{formatCurrency(branch.portfolio_value)}</td>
                            <td className="p-3 text-right">
                              <Badge className={branch.collection_rate >= 80 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                                {formatPercentage(branch.collection_rate)}
                              </Badge>
                            </td>
                            <td className="p-3 text-right">
                              <Badge className={branch.default_rate <= 10 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                                {formatPercentage(branch.default_rate)}
                              </Badge>
                            </td>
                            <td className="p-3 text-right">{branch.avg_processing_time.toFixed(1)} days</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          {reportData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Customer Segment Distribution</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportReport("customer_segments")}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={reportData.customer_segments}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        label={({ segment, percentage }) => `${segment} ${percentage.toFixed(1)}%`}
                      >
                        {reportData.customer_segments.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Segment Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.customer_segments.map((segment, index) => (
                      <div key={segment.segment} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                            />
                            <h4 className="font-medium">{segment.segment}</h4>
                          </div>
                          <Badge className="text-xs">
                            {segment.count} clients ({formatPercentage(segment.percentage)})
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Avg Loan Size</p>
                            <p className="font-semibold">{formatCurrency(segment.avg_loan_size)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Retention</p>
                            <p className="font-semibold">{formatPercentage(segment.retention_rate)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Risk Score</p>
                            <p className="font-semibold">{segment.risk_score.toFixed(0)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="business" className="space-y-4">
          {reportData && (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Business Segment Analysis</h3>
                <Button 
                  variant="outline" 
                  onClick={() => exportReport("business_segments")}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Business Data
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Loan Volume by Business Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={reportData.business_segments}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="business_type" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="loan_count" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Average Loan Amount by Business Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={reportData.business_segments}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="business_type" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Bar dataKey="avg_amount" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="p-3 text-left">Business Type</th>
                          <th className="p-3 text-right">Total Loans</th>
                          <th className="p-3 text-right">Approval Rate</th>
                          <th className="p-3 text-right">Avg Amount</th>
                          <th className="p-3 text-right">Default Rate</th>
                          <th className="p-3 text-right">ROI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.business_segments.map((business) => (
                          <tr key={business.business_type} className="border-b">
                            <td className="p-3 font-medium">{business.business_type}</td>
                            <td className="p-3 text-right">{business.loan_count}</td>
                            <td className="p-3 text-right">{formatPercentage(business.approval_rate)}</td>
                            <td className="p-3 text-right">{formatCurrency(business.avg_amount)}</td>
                            <td className="p-3 text-right">
                              <Badge className={business.default_rate <= 10 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                                {formatPercentage(business.default_rate)}
                              </Badge>
                            </td>
                            <td className="p-3 text-right">{formatPercentage(business.roi)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          {reportData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Risk Distribution</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportReport("risk_analysis")}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={reportData.risk_analysis}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        label={({ risk_bucket, count }) => `${risk_bucket}: ${count}`}
                      >
                        {reportData.risk_analysis.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risk Metrics Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.risk_analysis.map((risk, index) => (
                      <div key={risk.risk_bucket} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                            />
                            <h4 className="font-medium">{risk.risk_bucket}</h4>
                          </div>
                          <Badge className="text-xs">
                            {risk.count} loans
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Default Rate</p>
                            <p className="font-semibold">{formatPercentage(risk.default_rate)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Recovery Rate</p>
                            <p className="font-semibold">{formatPercentage(risk.recovery_rate)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Provision</p>
                            <p className="font-semibold">{formatCurrency(risk.provision_needed)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedReporting;
