import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "user" | "ceo" | "gm" | "regional_manager" | "branch_manager" | "loan_officer" | "marketing_lead";

interface StaffAssignment {
  branch_id: string | null;
  region_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole | null;
  staffAssignment: StaffAssignment | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [staffAssignment, setStaffAssignment] = useState<StaffAssignment | null>(null);

  const fetchRoleAndAssignment = async (userId: string) => {
    const [roleRes, assignRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).single(),
      supabase.from("staff_assignments").select("branch_id, region_id").eq("user_id", userId).single(),
    ]);
    if (roleRes.data) setRole(roleRes.data.role as AppRole);
    if (assignRes.data) setStaffAssignment(assignRes.data);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchRoleAndAssignment(session.user.id), 0);
        } else {
          setRole(null);
          setStaffAssignment(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRoleAndAssignment(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setStaffAssignment(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, staffAssignment, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
