import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  Target, 
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

interface LoanHistoryData {
  client: {
    full_name: string;
    phone: string;
    email: string;
    user_id: string;
  };
  loans: Array<{
    id: string;
    amount_approved: number;
    financing_amount: string;
    status: string;
    created_at: string;
    disbursement_date: string;
    product_name: string;
    branch_name: string;
    repayment_rate: number;
    total_repayments: number;
    completed_repayments: number;
  }>;
  stats: {
    total_borrowed: number;
    total_repaid: number;
    average_loan_size: number;
    graduation_rate: number;
    loyalty_score: number;
    risk_category: string;
  };
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const ClientLoanHistory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<LoanHistoryData | null>(null);
  const [clients, setClients] = useState<Array<{id: string; name: string; phone: string}>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .not("full_name", "is", null)
        .order("full_name");

      if (profiles) {
        setClients(profiles.map(p => ({
          id: p.user_id,
          name: p.full_name || "Unknown",
          phone: p.phone || ""
        })));
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchClientHistory = async (userId: string) => {
    setLoading(true);
    try {
      // Get client profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      // Get all loans for this client
      const { data: loans } = await supabase
        .from("loan_applications")
        .select(`
          *,
          loan_products(name),
          branches(name)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      // Get repayment data for each loan
      const loansWithRepayments = await Promise.all(
        (loans || []).map(async (loan) => {
          const { data: repayments } = await supabase
            .from("loan_repayments")
            .select("*")
            .eq("loan_id", loan.id);

          const totalRepayments = repayments?.length || 0;
          const completedRepayments = repayments?.filter(r => r.status === "paid").length || 0;
          const repaymentRate = totalRepayments > 0 ? (completedRepayments / totalRepayments) * 100 : 0;

          return {
            ...loan,
            product_name: loan.loan_products?.name || "Unknown Product",
            branch_name: loan.branches?.name || "Unknown Branch",
            repayment_rate: repaymentRate,
            total_repayments: totalRepayments,
            completed_repayments: completedRepayments
          };
        })
      );

      // Calculate stats
      const totalBorrowed = loansWithRepayments.reduce((sum, loan) => 
        sum + (parseFloat(loan.financing_amount) || 0), 0);
      
      const completedLoans = loansWithRepayments.filter(l => l.status === "completed");
      const totalRepaid = completedLoans.reduce((sum, loan) => 
        sum + (loan.amount_approved || 0), 0);

      const averageLoanSize = loansWithRepayments.length > 0 ? 
        totalBorrowed / loansWithRepayments.length : 0;

      // Calculate graduation rate (increasing loan sizes)
      const sortedLoans = [...loansWithRepayments].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      let graduations = 0;
      for (let i = 1; i < sortedLoans.length; i++) {
        const prevAmount = parseFloat(sortedLoans[i-1].financing_amount) || 0;
        const currAmount = parseFloat(sortedLoans[i].financing_amount) || 0;
        if (currAmount > prevAmount * 1.2) graduations++; // 20% increase threshold
      }
      const graduationRate = sortedLoans.length > 1 ? (graduations / (sortedLoans.length - 1)) * 100 : 0;

      // Calculate loyalty score based on multiple factors
      const avgRepaymentRate = loansWithRepayments.length > 0 ?
        loansWithRepayments.reduce((sum, loan) => sum + loan.repayment_rate, 0) / loansWithRepayments.length : 0;
      
      const loyaltyScore = Math.min(100, (
        (avgRepaymentRate * 0.4) + 
        (Math.min(loansWithRepayments.length * 10, 40)) + 
        (graduationRate * 0.2)
      ));

      // Determine risk category
      let riskCategory = "Low";
      if (avgRepaymentRate < 70) riskCategory = "High";
      else if (avgRepaymentRate < 85) riskCategory = "Medium";

      setSelectedClient({
        client: {
          full_name: profile?.full_name || "Unknown",
          phone: profile?.phone || "",
          email: profile?.email || "",
          user_id: userId
        },
        loans: loansWithRepayments,
        stats: {
          total_borrowed: totalBorrowed,
          total_repaid: totalRepaid,
          average_loan_size: averageLoanSize,
          graduation_rate: graduationRate,
          loyalty_score: loyaltyScore,
          risk_category: riskCategory
        }
      });

    } catch (error) {
      console.error("Error fetching client history:", error);
    }
    setLoading(false);
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  );

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "Low": return "bg-green-100 text-green-800 border-green-200";
      case "Medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "High": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "disbursed": return "bg-blue-100 text-blue-800";
      case "approved": return "bg-yellow-100 text-yellow-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const prepareLoanTrendData = () => {
    if (!selectedClient) return [];
    
    return selectedClient.loans
      .slice()
      .reverse() // Show chronologically
      .map((loan, index) => ({
        loan: `Loan ${index + 1}`,
        amount: parseFloat(loan.financing_amount) || 0,
        repaymentRate: loan.repayment_rate,
        date: new Date(loan.created_at).toLocaleDateString()
      }));
  };

  const prepareRepaymentData = () => {
    if (!selectedClient) return [];
    
    const statusCount = selectedClient.loans.reduce((acc: any, loan) => {
      acc[loan.status] = (acc[loan.status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusCount).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count as number
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Client Loan History & Portfolio Analysis
          </CardTitle>
          <CardDescription>
            Detailed borrowing timeline, loan graduation tracking, and repayment analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search clients by name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="max-h-40 overflow-y-auto border rounded-lg">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                  onClick={() => fetchClientHistory(client.id)}
                >
                  <div>
                    <p className="font-medium">{client.name}</p>
                    <p className="text-sm text-muted-foreground">{client.phone}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    View History
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedClient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedClient.client.full_name}</span>
              <Badge className={getRiskColor(selectedClient.stats.risk_category)}>
                {selectedClient.stats.risk_category} Risk
              </Badge>
            </CardTitle>
            <CardDescription>
              {selectedClient.client.phone} • {selectedClient.client.email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="timeline">Loan Timeline</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="repayments">Repayments</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Borrowed</p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(selectedClient.stats.total_borrowed)}
                          </p>
                        </div>
                        <DollarSign className="w-8 h-8 text-primary" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Repaid</p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(selectedClient.stats.total_repaid)}
                          </p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Loyalty Score</p>
                          <p className="text-2xl font-bold">
                            {selectedClient.stats.loyalty_score.toFixed(0)}%
                          </p>
                        </div>
                        <Target className="w-8 h-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Graduation Rate</p>
                          <p className="text-2xl font-bold flex items-center gap-1">
                            {selectedClient.stats.graduation_rate.toFixed(0)}%
                            {selectedClient.stats.graduation_rate > 50 ? 
                              <ArrowUpRight className="w-4 h-4 text-green-600" /> :
                              <ArrowDownRight className="w-4 h-4 text-red-600" />
                            }
                          </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4">
                <div className="space-y-4">
                  {selectedClient.loans.map((loan, index) => (
                    <Card key={loan.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{loan.product_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(loan.created_at).toLocaleDateString()} • {loan.branch_name}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(parseFloat(loan.financing_amount) || 0)}</p>
                            <Badge className={getStatusColor(loan.status)}>
                              {loan.status}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground">Repayment Rate</p>
                            <p className="font-medium">{loan.repayment_rate.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Payments Made</p>
                            <p className="font-medium">{loan.completed_repayments}/{loan.total_repayments}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Disbursed</p>
                            <p className="font-medium">
                              {loan.disbursement_date ? 
                                new Date(loan.disbursement_date).toLocaleDateString() : 
                                "Pending"
                              }
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Loan Size Progression</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={prepareLoanTrendData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="loan" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Line 
                            type="monotone" 
                            dataKey="amount" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Repayment Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={prepareLoanTrendData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="loan" />
                          <YAxis />
                          <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                          <Bar 
                            dataKey="repaymentRate" 
                            fill="hsl(var(--secondary))" 
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="repayments" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Loan Status Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={prepareRepaymentData()}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {prepareRepaymentData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Repayment Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedClient.loans.map((loan) => (
                        <div key={loan.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                          <div>
                            <p className="font-medium">{loan.product_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(parseFloat(loan.financing_amount) || 0)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{loan.repayment_rate.toFixed(1)}%</p>
                            <p className="text-sm text-muted-foreground">
                              {loan.completed_repayments}/{loan.total_repayments} payments
                            </p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientLoanHistory;
