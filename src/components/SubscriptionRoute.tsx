import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface SubscriptionRouteProps {
  children: React.ReactNode;
}

export const SubscriptionRoute = ({ children }: SubscriptionRouteProps) => {
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
      }
      setChecking(false);
    }
  }, [user, loading, navigate]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return user ? <>{children}</> : null;
};
