import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "admin" | "user" | "ceo" | "gm" | "regional_manager" | "branch_manager" | "loan_officer" | "marketing_lead";

interface ProtectedRouteProps {
  children: ReactNode;
  /** If set, only these roles can access the route */
  allowedRoles?: AppRole[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-warm flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect non-matching roles to their proper dashboard
    if (role === "user") return <Navigate to="/my-loans" replace />;
    if (role === "admin") return <Navigate to="/admin" replace />;
    return <Navigate to="/portal" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
