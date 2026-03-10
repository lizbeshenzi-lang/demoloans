import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Sparkles, MessageSquare, Tag, Zap, Eye, Download,
  TrendingUp, History, ChevronRight, ChevronLeft, X, Rocket,
  BarChart3, FileText, Crown, Shield, AlertTriangle, Activity,
  MapPin, Target, Wrench, Banknote, FileCheck, UserPlus,
  PieChart, DollarSign, Home, Upload, Clock, CheckCircle,
  Megaphone, Users
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TutorialStep {
  key: string;
  icon: any;
  title: string;
  description: string;
  color: string;
}

const ROLE_TUTORIALS: Record<string, { welcome: string; steps: TutorialStep[] }> = {
  ceo: {
    welcome: "Welcome, Chief Executive Officer",
    steps: [
      { key: "overview", icon: BarChart3, title: "Executive Overview", description: "Your dashboard shows organization-wide KPIs — total loans, disbursements, collection rates, and overdue payments across all 7 regions and 26 branches.", color: "from-primary to-primary/70" },
      { key: "command", icon: Crown, title: "Command Center", description: "Deep-dive into every region and branch. Compare performance, identify underperformers, and track targets. This is your strategic decision-making hub.", color: "from-amber-500 to-amber-400" },
      { key: "fraud", icon: AlertTriangle, title: "Fraud & Risk Detection", description: "AI-powered risk monitoring flags suspicious patterns — duplicate applications, rapid-fire loans, and anomalous repayment behaviors across the portfolio.", color: "from-red-500 to-red-400" },
      { key: "approvals", icon: Shield, title: "Approval Workflow", description: "Review and approve high-value loans that require executive sign-off. Multi-level approval ensures proper governance.", color: "from-blue-500 to-blue-400" },
      { key: "disbursements", icon: Banknote, title: "Disbursement Management", description: "Oversee loan disbursements across the organization. Track M-Pesa and bank transfer payouts with full audit trails.", color: "from-emerald-500 to-green-400" },
      { key: "analytics", icon: TrendingUp, title: "Analytics & Charts", description: "Visual portfolio analytics — loan distribution, repayment trends, branch comparisons, and growth trajectories.", color: "from-indigo-500 to-indigo-400" },
      { key: "performance", icon: Activity, title: "Performance Leaderboard", description: "See which branches and loan officers are top performers. Use this data to reward excellence and address gaps.", color: "from-pink-500 to-rose-400" },
      { key: "sms", icon: MessageSquare, title: "SMS Campaigns", description: "Monitor marketing and collection SMS campaigns. Review delivery rates and campaign effectiveness.", color: "from-sky-500 to-cyan-400" },
      { key: "audit", icon: History, title: "Audit Trail", description: "Complete transparency — every approval, rejection, disbursement, and role change is logged for compliance.", color: "from-gray-500 to-gray-400" },
    ],
  },
  gm: {
    welcome: "Welcome, General Manager",
    steps: [
      { key: "overview", icon: BarChart3, title: "Organization Overview", description: "Real-time dashboard with KPIs across all regions — total portfolio, active loans, pending approvals, and collection performance.", color: "from-primary to-primary/70" },
      { key: "approvals", icon: Shield, title: "Approval Workflow", description: "Review loan applications requiring GM-level approval. Approve, reject, or escalate with notes for the audit trail.", color: "from-blue-500 to-blue-400" },
      { key: "disbursements", icon: Banknote, title: "Disbursement Oversight", description: "Monitor and authorize disbursements. Track payment methods, references, and completion across branches.", color: "from-emerald-500 to-green-400" },
      { key: "fraud", icon: AlertTriangle, title: "Fraud & Risk Panel", description: "AI flags high-risk patterns in the portfolio. Review flagged loans and take action before losses occur.", color: "from-red-500 to-red-400" },
      { key: "analytics", icon: TrendingUp, title: "Portfolio Analytics", description: "Charts showing loan distribution by product, status, branch, and time period. Export data for board reports.", color: "from-indigo-500 to-indigo-400" },
      { key: "performance", icon: Activity, title: "Staff Performance", description: "Track loan officer productivity, branch collection rates, and regional comparisons.", color: "from-pink-500 to-rose-400" },
      { key: "par", icon: PieChart, title: "PAR & Insights", description: "Portfolio at Risk analysis with aging brackets and trend data to guide collection strategy.", color: "from-amber-500 to-amber-400" },
      { key: "audit", icon: History, title: "Audit Trail", description: "Review all system actions — loan status changes, role assignments, and data modifications.", color: "from-gray-500 to-gray-400" },
    ],
  },
  regional_manager: {
    welcome: "Welcome, Regional Manager",
    steps: [
      { key: "overview", icon: BarChart3, title: "Regional Overview", description: "See your region's performance at a glance — total loans, active portfolio, pending approvals, and collection rates across your branches.", color: "from-primary to-primary/70" },
      { key: "regional", icon: MapPin, title: "Regional Command", description: "Detailed view of every branch in your region. Compare branch performance, loan officer productivity, and collection targets.", color: "from-amber-500 to-amber-400" },
      { key: "approvals", icon: Shield, title: "Loan Approvals", description: "Review and approve loans within your region's threshold. Add approval notes and set conditions.", color: "from-blue-500 to-blue-400" },
      { key: "disbursements", icon: Banknote, title: "Disbursements", description: "Authorize and track disbursements for approved loans in your region.", color: "from-emerald-500 to-green-400" },
      { key: "loans", icon: FileText, title: "Loan Pipeline", description: "Full visibility into all loan applications across your branches. Filter by status, search by client name.", color: "from-sky-500 to-cyan-400" },
      { key: "analytics", icon: TrendingUp, title: "Analytics", description: "Visual breakdown of your region's loan portfolio, repayment trends, and product distribution.", color: "from-indigo-500 to-indigo-400" },
      { key: "par", icon: PieChart, title: "PAR & Insights", description: "Portfolio at Risk analysis specific to your region. Identify which branches need collection attention.", color: "from-pink-500 to-rose-400" },
      { key: "sms", icon: MessageSquare, title: "SMS Campaigns", description: "Create region-specific SMS campaigns for reminders and marketing.", color: "from-violet-500 to-purple-400" },
      { key: "audit", icon: History, title: "Audit Trail", description: "Track all actions taken within your region for accountability.", color: "from-gray-500 to-gray-400" },
    ],
  },
  branch_manager: {
    welcome: "Welcome, Branch Manager",
    steps: [
      { key: "overview", icon: BarChart3, title: "Branch Overview", description: "Your branch's key metrics — portfolio size, active loans, pending approvals, collection rate, and overdue payments.", color: "from-primary to-primary/70" },
      { key: "operations", icon: Target, title: "Operations Hub", description: "Manage your branch operations: loan officer workloads, daily targets, and repayment schedules all in one place.", color: "from-amber-500 to-amber-400" },
      { key: "approvals", icon: Shield, title: "Loan Approvals", description: "Review pending loan applications assigned to your branch. Approve, reject, or escalate to regional manager.", color: "from-blue-500 to-blue-400" },
      { key: "disbursements", icon: Banknote, title: "Disbursements", description: "Process approved loans for disbursement. Record M-Pesa or bank transfer details.", color: "from-emerald-500 to-green-400" },
      { key: "loans", icon: FileText, title: "Loan Pipeline", description: "All loan applications in your branch. Track statuses and search by client.", color: "from-sky-500 to-cyan-400" },
      { key: "kyc", icon: FileCheck, title: "KYC Queue", description: "Review client identity documents. Approve or reject KYC submissions to move loans forward.", color: "from-teal-500 to-teal-400" },
      { key: "onboarding", icon: UserPlus, title: "Client Onboarding", description: "Register new clients with the 3-step wizard: personal info, business details, and 9 required photos.", color: "from-pink-500 to-rose-400" },
      { key: "sms", icon: MessageSquare, title: "SMS Campaigns", description: "Send targeted SMS to your branch clients — payment reminders, marketing offers, and updates.", color: "from-violet-500 to-purple-400" },
      { key: "audit", icon: History, title: "Audit Trail", description: "View all branch activity for compliance and accountability.", color: "from-gray-500 to-gray-400" },
    ],
  },
  loan_officer: {
    welcome: "Welcome, Loan Officer",
    steps: [
      { key: "overview", icon: BarChart3, title: "Your Dashboard", description: "See your assigned loans at a glance — pending reviews, active disbursements, collection progress, and overdue alerts.", color: "from-primary to-primary/70" },
      { key: "workspace", icon: Wrench, title: "My Workspace", description: "Your personal command center with daily tasks, pending actions, and client follow-ups organized by priority.", color: "from-amber-500 to-amber-400" },
      { key: "approvals", icon: Shield, title: "Loan Reviews", description: "Review loan applications assigned to you. Add risk assessments, recommendations, and forward for approval.", color: "from-blue-500 to-blue-400" },
      { key: "disbursements", icon: Banknote, title: "Disbursements", description: "Process approved loans for payout. Record payment method and reference numbers.", color: "from-emerald-500 to-green-400" },
      { key: "loans", icon: FileText, title: "My Loans", description: "Full list of your assigned loan applications with status tracking and client details.", color: "from-sky-500 to-cyan-400" },
      { key: "kyc", icon: FileCheck, title: "KYC Documents", description: "Upload and verify client documents — IDs, business licenses, and supporting papers.", color: "from-teal-500 to-teal-400" },
      { key: "onboarding", icon: UserPlus, title: "Client Registration", description: "Onboard new clients using the 3-step wizard: capture personal details, business info, and 9 required photos (ID, portrait, premises, collateral).", color: "from-pink-500 to-rose-400" },
      { key: "sms", icon: MessageSquare, title: "SMS Tools", description: "Send payment reminders and follow-up messages to your assigned clients.", color: "from-violet-500 to-purple-400" },
    ],
  },
  marketing_lead: {
    welcome: "Welcome, Marketing Lead",
    steps: [
      { key: "overview", icon: BarChart3, title: "Your Command Center", description: "Real-time stats across all regions and branches — total loans, collection rates, overdue payments, and campaign targeting insights.", color: "from-primary to-primary/70" },
      { key: "sms", icon: MessageSquare, title: "SMS Campaigns", description: "Create, schedule, and monitor SMS campaigns for marketing, reminders, and recovery. Track delivery rates by branch and region.", color: "from-blue-500 to-blue-400" },
      { key: "ai-builder", icon: Sparkles, title: "AI Campaign Builder", description: "Generate localized SMS templates using AI. Describe your goal and get optimized messages with send-time recommendations.", color: "from-violet-500 to-purple-400" },
      { key: "segmentation", icon: Tag, title: "Client Segmentation", description: "Filter clients by loan status, location, repayment behavior, and business type. Build targeted audiences and export as CSV.", color: "from-amber-500 to-orange-400" },
      { key: "workflows", icon: Zap, title: "Automation Workflows", description: "Rule-based triggers: recovery SMS when overdue, reminders before due dates, welcome messages on disbursement. Runs 24/7.", color: "from-emerald-500 to-green-400" },
      { key: "performance", icon: Eye, title: "Performance Intelligence", description: "Branch collection rates, regional summaries, staff metrics, and KYC onboarding funnel — all in one view.", color: "from-pink-500 to-rose-400" },
      { key: "reports", icon: Download, title: "Reports & Exports", description: "One-click exports for branch performance, campaign ROI, and recovery targets.", color: "from-teal-500 to-teal-400" },
      { key: "analytics", icon: TrendingUp, title: "Campaign Analytics", description: "Delivery trends, send-time heatmaps, and campaign comparisons with date range filtering.", color: "from-indigo-500 to-indigo-400" },
      { key: "audit", icon: History, title: "Audit Trail", description: "Full transparency — every action logged for compliance and accountability.", color: "from-gray-500 to-gray-400" },
    ],
  },
  user: {
    welcome: "Welcome to Kechita Capital",
    steps: [
      { key: "home", icon: Home, title: "Your Dashboard", description: "Your personal hub showing active loans, repayment progress, and credit score. Everything about your financial journey in one place.", color: "from-primary to-primary/70" },
      { key: "loans", icon: FileText, title: "My Loan Applications", description: "View all your loan applications — pending, approved, disbursed, and completed. Track the status of each application in real time.", color: "from-blue-500 to-blue-400" },
      { key: "repayments", icon: DollarSign, title: "Repayment Schedule", description: "See your weekly repayment schedule with amounts due, paid, and upcoming. Never miss a payment with clear progress tracking.", color: "from-emerald-500 to-green-400" },
      { key: "kyc", icon: Upload, title: "Upload Documents", description: "Submit your KYC documents — National ID, business license, bank statements. Required documents are clearly listed with status indicators.", color: "from-amber-500 to-amber-400" },
      { key: "score", icon: CheckCircle, title: "Credit Score", description: "Track your credit score built from your repayment history. Higher scores unlock better loan terms and larger amounts.", color: "from-pink-500 to-rose-400" },
      { key: "timeline", icon: Clock, title: "Activity Timeline", description: "Full history of your loan journey — applications, approvals, disbursements, and payments logged chronologically.", color: "from-indigo-500 to-indigo-400" },
    ],
  },
};

interface RoleWelcomeTutorialProps {
  role: string;
  onNavigateToSection?: (section: string) => void;
  restartTrigger?: number;
}

const STORAGE_KEY = "kechita_tutorial_completed";

export const resetTutorial = (role: string, userId: string) => {
  localStorage.removeItem(`${STORAGE_KEY}_${role}_${userId}`);
};

const RoleWelcomeTutorial = ({ role, onNavigateToSection, restartTrigger = 0 }: RoleWelcomeTutorialProps) => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const tutorial = ROLE_TUTORIALS[role];

  useEffect(() => {
    if (!user || !tutorial) return;
    const completed = localStorage.getItem(`${STORAGE_KEY}_${role}_${user.id}`);
    if (!completed) setVisible(true);
  }, [user, role, tutorial]);

  useEffect(() => {
    if (restartTrigger > 0 && tutorial) {
      setCurrentStep(0);
      setVisible(true);
    }
  }, [restartTrigger, tutorial]);

  if (!visible || !tutorial) return null;

  const handleComplete = () => {
    if (user) localStorage.setItem(`${STORAGE_KEY}_${role}_${user.id}`, "true");
    setVisible(false);
  };

  const handleNext = () => {
    if (currentStep < tutorial.steps.length - 1) setCurrentStep(currentStep + 1);
    else handleComplete();
  };

  const handleGoToSection = () => {
    onNavigateToSection?.(tutorial.steps[currentStep].key);
    handleComplete();
  };

  const step = tutorial.steps[currentStep];
  const StepIcon = step.icon;
  const progress = ((currentStep + 1) / tutorial.steps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Progress */}
        <div className="h-1 bg-muted">
          <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>

        {/* Header */}
        <div className={cn("p-6 bg-gradient-to-r text-white", step.color)}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Rocket className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">
                {currentStep === 0 ? tutorial.welcome : `Step ${currentStep + 1} of ${tutorial.steps.length}`}
              </span>
            </div>
            <button onClick={handleComplete} className="text-white/70 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <StepIcon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold font-display">{step.title}</h2>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-muted-foreground font-body leading-relaxed text-sm">{step.description}</p>
          <div className="flex justify-center gap-1.5 mt-5">
            {tutorial.steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  i === currentStep ? "bg-primary w-6" : i < currentStep ? "bg-primary/40" : "bg-muted-foreground/20"
                )}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0} className="text-muted-foreground">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            {onNavigateToSection && (
              <Button variant="outline" size="sm" onClick={handleGoToSection}>
                Try it now <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {currentStep === tutorial.steps.length - 1 ? (
                <>Let's go! <Rocket className="w-4 h-4 ml-1" /></>
              ) : (
                <>Next <ChevronRight className="w-4 h-4 ml-1" /></>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleWelcomeTutorial;
