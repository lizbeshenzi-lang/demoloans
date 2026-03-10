import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/kechita-logo.jpg";
import { Lock, Loader2, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";

const strengthRules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Number", test: (p: string) => /\d/.test(p) },
  { label: "Special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

type Status = "checking" | "ready" | "invalid";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [status, setStatus] = useState<Status>("checking");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setStatus("ready");
      }
    });

    // Also handle hash-based recovery (older email links)
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      setStatus("ready");
    }

    // Give it 2 seconds to detect recovery before showing invalid
    const timer = setTimeout(() => {
      setStatus((prev) => (prev === "checking" ? "invalid" : prev));
    }, 2000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const passedRules = strengthRules.filter((r) => r.test(password));
  const strength = passedRules.length;
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "bg-destructive", "bg-orange-400", "bg-yellow-400", "bg-secondary"][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (strength < 2) {
      toast({ title: "Password too weak", description: "Please choose a stronger password.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setDone(true);
      toast({ title: "Password updated!", description: "Your new password is active." });
      setTimeout(() => navigate("/login"), 3000);
    }
    setLoading(false);
  };

  // Loading / checking state
  if (status === "checking") {
    return (
      <div className="min-h-screen bg-warm flex items-center justify-center px-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Invalid / expired link
  if (status === "invalid") {
    return (
      <div className="min-h-screen bg-warm flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-background rounded-2xl shadow-elevated p-8 text-center">
            <Link to="/">
              <img src={logo} alt="Demo Capital" className="h-16 w-auto mx-auto rounded-lg mb-6" />
            </Link>
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold font-display text-foreground mb-3">Link Expired</h1>
            <p className="text-muted-foreground font-body mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link to="/forgot-password">
              <Button className="w-full bg-gradient-primary">Request New Link</Button>
            </Link>
            <Link to="/login" className="block mt-3 text-sm text-primary hover:underline font-body">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (done) {
    return (
      <div className="min-h-screen bg-warm flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-background rounded-2xl shadow-elevated p-8 text-center">
            <Link to="/">
              <img src={logo} alt="Demo Capital" className="h-16 w-auto mx-auto rounded-lg mb-6" />
            </Link>
            <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-secondary" />
            </div>
            <h1 className="text-2xl font-bold font-display text-foreground mb-3">Password Reset!</h1>
            <p className="text-muted-foreground font-body mb-6">
              Your password has been updated successfully. Redirecting you to login…
            </p>
            <Link to="/login">
              <Button className="w-full bg-gradient-primary">Go to Login</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-background rounded-2xl shadow-elevated p-8">
          <div className="text-center mb-8">
            <Link to="/">
              <img src={logo} alt="Demo Capital" className="h-16 w-auto mx-auto rounded-lg mb-4" />
            </Link>
            <h1 className="text-2xl font-bold font-display text-foreground">Set New Password</h1>
            <p className="text-muted-foreground font-body mt-1">Choose a strong password for your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New password */}
            <div>
              <Label htmlFor="password" className="font-body">New Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength bar */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : "bg-border"}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground font-body">{strengthLabel}</p>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    {strengthRules.map((rule) => (
                      <span key={rule.label} className={`flex items-center gap-1 text-xs font-body ${rule.test(password) ? "text-secondary" : "text-muted-foreground"}`}>
                        {rule.test(password) ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3 opacity-40" />}
                        {rule.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <Label htmlFor="confirmPassword" className="font-body">Confirm Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`pl-10 pr-10 ${confirmPassword && confirmPassword !== password ? "border-destructive" : ""}`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="text-xs text-destructive mt-1 font-body">Passwords don't match</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-primary"
              disabled={loading || strength < 2 || password !== confirmPassword}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset Password"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground font-body mt-6">
            <Link to="/login" className="text-primary hover:underline">← Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
