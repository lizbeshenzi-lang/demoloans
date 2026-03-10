import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/login"); return; }
    
    // Route based on role
    if (role === "user") {
      navigate("/my-loans", { replace: true });
    } else if (role) {
      navigate("/portal", { replace: true });
    }
    // If role not loaded yet, wait
  }, [user, role, loading, navigate]);

  return (
    <div className="min-h-screen bg-warm flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );
};

export default Dashboard;
