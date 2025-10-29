import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, subscription, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  
  // DEV MODE: Bypass subscription check in development
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    if (isDev) {
      console.log("🔧 DEV MODE: Subscription check disabled");
    }
    
    if (!loading) {
      if (!user) {
        navigate("/auth");
        setChecking(false);
        return;
      }

      // Wait for subscription data to be available
      if (subscription !== null) {
        if (!subscription.subscribed && !isDev) {
          navigate("/assinatura");
        }
        setChecking(false);
      }
    }
  }, [user, subscription, loading, navigate, isDev]);

  if (loading || checking || subscription === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return user && (subscription.subscribed || isDev) ? <>{children}</> : null;
};
