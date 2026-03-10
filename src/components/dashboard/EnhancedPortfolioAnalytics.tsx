import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Repeat, 
  Clock,
  DollarSign,
  Calendar,
  RefreshCw,
  Eye,
  Filter
} from "lucide-react";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter } from "recharts";

interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  count: number;
  percentage: number;
  avg_loan_size: number;
  retention_rate: number;
  risk_score: number;
  color: string;
  trend: "up" | "down" | "stable";
  clients: Array<{
    user_id: string;
    full_name: string;
    total_loans: number;
    avg_repayment_rate: number;
    last_loan_date: string;
    lifetime_value: number;
  }>;
}

interface PortfolioMetrics {
  total_clients: number;
  active_borrowers: number;
  retention_rate_overall: number;
  avg_graduation_time: number;
  portfolio_at_risk: number;
  seasonal_trends: Array<{
    month: string;
    applications: number;
    disbursements: number;
    repayment_rate: number;
  }>;
}

const SEGMENT_COLORS = {
  loyal: "hsl(var(--primary))",
  growing: "hsl(var(--secondary))", 
  seasonal: "hsl(var(--accent))",
  problematic: "hsl(var(--destructive))",
  premium: "hsl(142, 76%, 36%)", // emerald-600
  new: "hsl(221, 83%, 53%)" // blue-600
};

const EnhancedPortfolioAnalytics = () => {
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegment | null>(null);
  const [timeRange, setTimeRange] = useState("12m");

  useEffect(() => {
    fetchPortfolioAnalytics();
  }, [timeRange]);

  const fetchPortfolioAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all loan applications with repayments
      const [loansRes, profilesRes] = await Promise.all([
        supabase
          .from("loan_applications")
          .select(`*, loan_repayments(*)`)
          .not("user_id", "is", null),
        supabase
          .from("profiles")
          .select("user_id, full_name")
      ]);

      const loans = loansRes.data;
      const profiles = profilesRes.data || [];
      if (!loans) return;

      const profileMap = profiles.reduce((acc: Record<string, string>, p) => {
        acc[p.user_id] = p.full_name || "Unknown";
        return acc;
      }, {});

      // Group loans by client
      const clientGroups = loans.reduce((acc: any, loan) => {
        const userId = loan.user_id;
        if (!userId) return acc;
        
        if (!acc[userId]) {
          acc[userId] = {
            user_id: userId,
            full_name: profileMap[userId] || "Unknown",
            loans: [],
            repayments: []
          };
        }
        
        acc[userId].loans.push(loan);
        acc[userId].repayments.push(...(loan.loan_repayments || []));
        return acc;
      }, {});

      // Analyze each client and assign to segments
      const segmentedClients = Object.values(clientGroups).map((client: any) => {
        const totalLoans = client.loans.length;
        const completedLoans = client.loans.filter((l: any) => l.status === "completed").length;
        const lastLoanDate = new Date(Math.max(...client.loans.map((l: any) => new Date(l.created_at).getTime())));
        
        // Calculate repayment performance
        const totalRepayments = client.repayments.length;
        const paidRepayments = client.repayments.filter((r: any) => r.status === "paid").length;
        const avgRepaymentRate = totalRepayments > 0 ? (paidRepayments / totalRepayments) * 100 : 0;
        
        // Calculate lifetime value
        const lifetimeValue = client.loans.reduce((sum: number, loan: any) => 
          sum + (parseFloat(loan.financing_amount) || 0), 0);
        
        // Loan size progression (graduation analysis)
        const sortedLoans = client.loans.sort((a: any, b: any) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        let graduations = 0;
        for (let i = 1; i < sortedLoans.length; i++) {
          const prevAmount = parseFloat(sortedLoans[i-1].financing_amount) || 0;
          const currAmount = parseFloat(sortedLoans[i].financing_amount) || 0;
          if (currAmount > prevAmount * 1.25) graduations++; // 25% increase threshold
        }
        
        const graduationRate = sortedLoans.length > 1 ? (graduations / (sortedLoans.length - 1)) * 100 : 0;
        
        // Days since last loan
        const daysSinceLastLoan = Math.floor((Date.now() - lastLoanDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Segment classification logic
        let segment = "new";
        
        if (totalLoans >= 3 && avgRepaymentRate >= 90 && daysSinceLastLoan <= 180) {
          segment = "loyal";
        } else if (totalLoans >= 2 && graduationRate >= 50 && avgRepaymentRate >= 85) {
          segment = "growing";
        } else if (lifetimeValue >= 100000 && avgRepaymentRate >= 80) {
          segment = "premium";
        } else if (avgRepaymentRate < 70 || daysSinceLastLoan > 365) {
          segment = "problematic";
        } else if (totalLoans >= 2 && (daysSinceLastLoan > 90 && daysSinceLastLoan <= 365)) {
          segment = "seasonal";
        }

        return {
          user_id: client.user_id,
          full_name: client.full_name,
          segment,
          total_loans: totalLoans,
          avg_repayment_rate: avgRepaymentRate,
          last_loan_date: lastLoanDate.toISOString(),
          lifetime_value: lifetimeValue,
          graduation_rate: graduationRate,
          days_since_last_loan: daysSinceLastLoan
        };
      });

      // Create segment summaries
      const segmentSummaries: CustomerSegment[] = [
        {
          id: "loyal",
          name: "Loyal Customers",
          description: "3+ loans, 90%+ repayment rate, active within 6 months",
          count: 0,
          percentage: 0,
          avg_loan_size: 0,
          retention_rate: 0,
          risk_score: 15,
          color: SEGMENT_COLORS.loyal,
          trend: "up",
          clients: []
        },
        {
          id: "growing",
          name: "Growing Customers",
          description: "Increasing loan sizes, good repayment history",
          count: 0,
          percentage: 0,
          avg_loan_size: 0,
          retention_rate: 0,
          risk_score: 25,
          color: SEGMENT_COLORS.growing,
          trend: "up",
          clients: []
        },
        {
          id: "premium",
          name: "Premium Customers",
          description: "High-value clients with large loan amounts",
          count: 0,
          percentage: 0,
          avg_loan_size: 0,
          retention_rate: 0,
          risk_score: 20,
          color: SEGMENT_COLORS.premium,
          trend: "stable",
          clients: []
        },
        {
          id: "seasonal",
          name: "Seasonal Customers",
          description: "Periodic borrowers with seasonal patterns",
          count: 0,
          percentage: 0,
          avg_loan_size: 0,
          retention_rate: 0,
          risk_score: 40,
          color: SEGMENT_COLORS.seasonal,
          trend: "stable",
          clients: []
        },
        {
          id: "problematic",
          name: "At-Risk Customers",
          description: "Low repayment rates or long dormancy periods",
          count: 0,
          percentage: 0,
          avg_loan_size: 0,
          retention_rate: 0,
          risk_score: 75,
          color: SEGMENT_COLORS.problematic,
          trend: "down",
          clients: []
        },
        {
          id: "new",
          name: "New Customers",
          description: "Recent borrowers with limited history",
          count: 0,
          percentage: 0,
          avg_loan_size: 0,
          retention_rate: 0,
          risk_score: 35,
          color: SEGMENT_COLORS.new,
          trend: "up",
          clients: []
        }
      ];

      // Populate segment data
      segmentedClients.forEach((client: any) => {
        const segment = segmentSummaries.find(s => s.id === client.segment);
        if (segment) {
          segment.count++;
          segment.clients.push({
            user_id: client.user_id,
            full_name: client.full_name,
            total_loans: client.total_loans,
            avg_repayment_rate: client.avg_repayment_rate,
            last_loan_date: client.last_loan_date,
            lifetime_value: client.lifetime_value
          });
        }
      });

      // Calculate segment metrics
      const totalClients = segmentedClients.length;
      segmentSummaries.forEach(segment => {
        segment.percentage = totalClients > 0 ? (segment.count / totalClients) * 100 : 0;
        
        if (segment.clients.length > 0) {
          segment.avg_loan_size = segment.clients.reduce((sum, c) => 
            sum + c.lifetime_value, 0) / segment.clients.length / segment.clients.reduce((sum, c) => sum + c.total_loans, 0);
          
          segment.retention_rate = segment.clients.filter(c => 
            new Date(c.last_loan_date) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
          ).length / segment.clients.length * 100;
        }
      });

      // Calculate seasonal trends (last 12 months)
      const monthlyData: any = {};
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthKey] = {
          month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          applications: 0,
          disbursements: 0,
          total_repayments: 0,
          paid_repayments: 0
        };
      }

      loans.forEach(loan => {
        const createdMonth = loan.created_at.slice(0, 7);
        if (monthlyData[createdMonth]) {
          monthlyData[createdMonth].applications++;
          if (loan.status === "disbursed" || loan.status === "completed") {
            monthlyData[createdMonth].disbursements++;
          }
        }

        (loan.loan_repayments || []).forEach((repayment: any) => {
          const repaymentMonth = repayment.created_at.slice(0, 7);
          if (monthlyData[repaymentMonth]) {
            monthlyData[repaymentMonth].total_repayments++;
            if (repayment.status === "paid") {
              monthlyData[repaymentMonth].paid_repayments++;
            }
          }
        });
      });

      const seasonalTrends = Object.values(monthlyData).map((data: any) => ({
        ...data,
        repayment_rate: data.total_repayments > 0 ? 
          (data.paid_repayments / data.total_repayments) * 100 : 0
      }));

      setSegments(segmentSummaries.filter(s => s.count > 0));
      setMetrics({
        total_clients: totalClients,
        active_borrowers: segmentedClients.filter((c: any) => c.days_since_last_loan <= 180).length,
        retention_rate_overall: totalClients > 0 ? 
          (segmentedClients.filter((c: any) => c.days_since_last_loan <= 365).length / totalClients) * 100 : 0,
        avg_graduation_time: 0, // Would need more complex calculation
        portfolio_at_risk: segmentSummaries.find(s => s.id === "problematic")?.percentage || 0,
        seasonal_trends: seasonalTrends
      });

    } catch (error) {
      console.error("Error fetching portfolio analytics:", error);
    }
    setLoading(false);
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "down": return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Target className="w-4 h-4 text-blue-600" />;
    }
  };

  const getRiskColor = (score: number) => {
    if (score <= 25) return "text-green-600 bg-green-50 border-green-200";
    if (score <= 50) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Enhanced Portfolio Analytics</h2>
          <p className="text-muted-foreground">
            Advanced customer segmentation with retention rates and risk metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={timeRange === "6m" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange("6m")}
          >
            6M
          </Button>
          <Button
            variant={timeRange === "12m" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange("12m")}
          >
            12M
          </Button>
          <Button
            variant={timeRange === "24m" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange("24m")}
          >
            24M
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Clients</p>
                  <p className="text-2xl font-bold">{metrics.total_clients}</p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Borrowers</p>
                  <p className="text-2xl font-bold">{metrics.active_borrowers}</p>
                </div>
                <Repeat className="w-8 h-8 text-secondary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Retention Rate</p>
                  <p className="text-2xl font-bold">{metrics.retention_rate_overall.toFixed(1)}%</p>
                </div>
                <Target className="w-8 h-8 text-accent" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Portfolio at Risk</p>
                  <p className="text-2xl font-bold">{metrics.portfolio_at_risk.toFixed(1)}%</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="segments" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="segments">Customer Segments</TabsTrigger>
          <TabsTrigger value="trends">Seasonal Trends</TabsTrigger>
          <TabsTrigger value="retention">Retention Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="segments" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Segment Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Segment Distribution</CardTitle>
                <CardDescription>
                  Customer portfolio breakdown by behavioral segments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={segments}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
                    >
                      {segments.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Risk vs Retention Matrix */}
            <Card>
              <CardHeader>
                <CardTitle>Risk vs Retention Matrix</CardTitle>
                <CardDescription>
                  Risk score plotted against retention rate by segment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="retention_rate" 
                      domain={[0, 100]}
                      label={{ value: 'Retention Rate (%)', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      dataKey="risk_score" 
                      domain={[0, 100]}
                      label={{ value: 'Risk Score', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'retention_rate' ? `${value}%` : value,
                        name === 'retention_rate' ? 'Retention Rate' : 'Risk Score'
                      ]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ''}
                    />
                    <Scatter data={segments} fill="hsl(var(--primary))" />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Segment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {segments.map((segment) => (
              <Card 
                key={segment.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedSegment(segment)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: segment.color }}
                      />
                      <h3 className="font-semibold">{segment.name}</h3>
                    </div>
                    {getTrendIcon(segment.trend)}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4">
                    {segment.description}
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Clients:</span>
                      <span className="font-medium">{segment.count} ({segment.percentage.toFixed(1)}%)</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm">Avg Loan Size:</span>
                      <span className="font-medium">{formatCurrency(segment.avg_loan_size || 0)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm">Retention Rate:</span>
                      <span className="font-medium">{segment.retention_rate.toFixed(1)}%</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Risk Score:</span>
                      <Badge className={getRiskColor(segment.risk_score)}>
                        {segment.risk_score}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {metrics && (
            <Card>
              <CardHeader>
                <CardTitle>Seasonal Performance Trends</CardTitle>
                <CardDescription>
                  Monthly analysis of applications, disbursements, and repayment rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={metrics.seasonal_trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="applications" fill="hsl(var(--primary))" name="Applications" />
                    <Bar yAxisId="left" dataKey="disbursements" fill="hsl(var(--secondary))" name="Disbursements" />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="repayment_rate" 
                      stroke="hsl(var(--accent))" 
                      strokeWidth={2}
                      name="Repayment Rate (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="retention" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Retention by Segment</CardTitle>
                <CardDescription>
                  12-month retention rate comparison across customer segments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={segments}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Retention Rate']} />
                    <Bar 
                      dataKey="retention_rate" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Loan Size by Segment</CardTitle>
                <CardDescription>
                  Portfolio value distribution across customer segments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={segments}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Avg Loan Size']} />
                    <Bar 
                      dataKey="avg_loan_size" 
                      fill="hsl(var(--secondary))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Selected Segment Details Modal */}
      {selectedSegment && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: selectedSegment.color }}
                />
                <CardTitle>{selectedSegment.name}</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedSegment(null)}>
                Close
              </Button>
            </div>
            <CardDescription>
              {selectedSegment.description} • {selectedSegment.count} clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {selectedSegment.clients.map((client) => (
                  <div 
                    key={client.user_id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{client.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {client.total_loans} loans • {client.avg_repayment_rate.toFixed(1)}% repayment rate
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(client.lifetime_value)}</p>
                      <p className="text-sm text-muted-foreground">
                        Last: {new Date(client.last_loan_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedPortfolioAnalytics;
