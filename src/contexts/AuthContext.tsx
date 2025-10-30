import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// 🔧 FEATURE FLAG: Desative temporariamente a verificação de assinatura
const ENABLE_SUBSCRIPTION_CHECK = false; // Mude para true quando quiser reativar

interface SubscriptionData {
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  subscription: SubscriptionData | null;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscription = async (currentSession: Session | null) => {
    if (!ENABLE_SUBSCRIPTION_CHECK) {
      // Quando desativado, sempre retorna como se estivesse com assinatura ativa
      setSubscription({ subscribed: true, product_id: null, subscription_end: null });
      return;
    }

    if (!currentSession) {
      setSubscription(null);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      if (error) {
        console.error("Error checking subscription:", error);
        setSubscription({ subscribed: false, product_id: null, subscription_end: null });
        return;
      }

      setSubscription(data);
    } catch (error) {
      console.error("Error checking subscription:", error);
      setSubscription({ subscribed: false, product_id: null, subscription_end: null });
    }
  };

  const refreshSubscription = async () => {
    await checkSubscription(session);
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // Defer subscription check to avoid deadlock
        if (currentSession) {
          setTimeout(() => {
            checkSubscription(currentSession);
          }, 0);
        } else {
          setSubscription(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession) {
        setTimeout(() => {
          checkSubscription(currentSession);
        }, 0);
      }
      
      setLoading(false);
    });

    // Refresh subscription every 60 seconds (DESATIVADO quando ENABLE_SUBSCRIPTION_CHECK = false)
    // const interval = setInterval(() => {
    //   supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
    //     if (currentSession) {
    //       checkSubscription(currentSession);
    //     }
    //   });
    // }, 60000);

    return () => {
      authSubscription.unsubscribe();
      // clearInterval(interval);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, subscription, loading, refreshSubscription }}>
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
