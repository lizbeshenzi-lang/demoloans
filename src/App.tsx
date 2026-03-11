import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "next-themes";
import ProtectedRoute from "@/components/ProtectedRoute";
import OfflineIndicator from "@/components/OfflineIndicator";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import MyLoans from "./pages/MyLoans";
import RoleDashboard from "./pages/RoleDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Apply from "./pages/Apply";
import Contact from "./pages/Contact";
import Reports from "./pages/Reports";
import Careers from "./pages/Careers";
import InterviewRoom from "./pages/InterviewRoom";
import NotFound from "./pages/NotFound";
import Credentials from "./pages/Credentials";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <OfflineIndicator />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/my-loans" element={<ProtectedRoute allowedRoles={["user"]}><MyLoans /></ProtectedRoute>} />
            <Route path="/portal" element={<ProtectedRoute allowedRoles={["ceo", "gm", "regional_manager", "branch_manager", "loan_officer", "marketing_lead"]}><RoleDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/apply" element={<ProtectedRoute><Apply /></ProtectedRoute>} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/reports" element={<ProtectedRoute allowedRoles={["admin", "ceo", "gm", "regional_manager", "branch_manager", "marketing_lead"]}><Reports /></ProtectedRoute>} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/interview/:id" element={<InterviewRoom />} />
            <Route path="/credentials" element={<ProtectedRoute allowedRoles={["admin"]}><Credentials /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
