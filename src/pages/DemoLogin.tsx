import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Mapping of role identifiers to demo emails
const roleEmailMap: Record<string, string> = {
  "admin": "admin@test.com",
  "ceo": "ceo@demo.test",
  "gm": "gm@demo.test",
  "marketing": "marketing@demo.test",
  "rm.nairobi": "rm.nairobi@demo.test",
  "rm.central": "rm.central@demo.test",
  "rm.coast": "rm.coast@demo.test",
  "rm.western": "rm.western@demo.test",
  "rm.riftvalley": "rm.riftvalley@demo.test",
  "rm.eastern": "rm.eastern@demo.test",
  "rm.northeastern": "rm.northeastern@demo.test",
  "bm.westlands": "bm.westlands@demo.test",
  "bm.cbd": "bm.cbd@demo.test",
  "bm.eastlands": "bm.eastlands@demo.test",
  "bm.karen": "bm.karen@demo.test",
  "bm.mombasa": "bm.mombasa@demo.test",
  "bm.kisumu": "bm.kisumu@demo.test",
  "bm.nakuru": "bm.nakuru@demo.test",
  "bm.nyeri": "bm.nyeri@demo.test",
  "bm.eldoret": "bm.eldoret@demo.test",
  "bm.thika": "bm.thika@demo.test",
  "bm.malindi": "bm.malindi@demo.test",
  "bm.kakamega": "bm.kakamega@demo.test",
  "bm.bungoma": "bm.bungoma@demo.test",
  "bm.vihiga": "bm.vihiga@demo.test",
  "bm.busia": "bm.busia@demo.test",
  "bm.narok": "bm.narok@demo.test",
  "bm.kericho": "bm.kericho@demo.test",
  "bm.bomet": "bm.bomet@demo.test",
  "bm.kajiado": "bm.kajiado@demo.test",
  "bm.machakos": "bm.machakos@demo.test",
  "bm.kitui": "bm.kitui@demo.test",
  "bm.embu": "bm.embu@demo.test",
  "bm.meru": "bm.meru@demo.test",
  "bm.garissa": "bm.garissa@demo.test",
  "bm.wajir": "bm.wajir@demo.test",
  "bm.isiolo": "bm.isiolo@demo.test",
  "lo.westlands1": "lo.westlands1@demo.test",
  "lo.westlands2": "lo.westlands2@demo.test",
  "lo.cbd1": "lo.cbd1@demo.test",
  "lo.cbd2": "lo.cbd2@demo.test",
  "client01": "client01@demo.test",
};

const DemoLogin = () => {
  const { roleIdentifier } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const login = async () => {
      // 1. Resolve role identifier to email
      const identifier = roleIdentifier?.toLowerCase() || "";
      const email = roleEmailMap[identifier];

      if (!email) {
        setError(`Invalid demo role: ${roleIdentifier}`);
        return;
      }

      try {
        // Sign out any existing session first
        await supabase.auth.signOut();

        // 2. Perform sign in with the standard demo password
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: "Demo2026!", // The universal demo password
        });

        if (signInError) throw signInError;

        // 3. Simple navigation mapping based on identifier
        toast.success(`Logged in automatically as ${email}`);
        
        if (identifier === "admin") {
          navigate("/admin");
        } else if (identifier.startsWith("client")) {
          navigate("/dashboard");
        } else {
          navigate("/portal"); // execs, rm, bm, lo
        }

      } catch (err: any) {
        console.error("Auto-login failed:", err);
        setError(err.message || "Failed to log in automatically");
      }
    };

    login();
  }, [roleIdentifier, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-warm flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-background rounded-2xl shadow-elevated p-8 max-w-md w-full">
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold font-display text-foreground mb-2">Demo Login Failed</h2>
          <p className="text-muted-foreground font-body mb-6">{error}</p>
          <button 
            onClick={() => navigate("/")}
            className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm flex flex-col items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-elevated p-10 max-w-sm w-full text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
        <h2 className="text-xl font-bold font-display text-foreground mb-2">Authenticating</h2>
        <p className="text-muted-foreground font-body text-sm animate-pulse">
          Logging you in securely...
        </p>
      </div>
    </div>
  );
};

export default DemoLogin;
