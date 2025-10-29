import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  planName: string | null;
  status: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  appointmentsLimit: number | null;
  appointmentsUsed: number;
  clientsLimit: number | null;
  clientsUsed: number;
  servicesLimit: number | null;
  servicesUsed: number;
}

export const useSubscription = (userId: string | undefined) => {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchSubscriptionStatus();
  }, [userId]);

  const fetchSubscriptionStatus = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase.rpc('get_subscription_status', {
        _user_id: userId
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const sub = data[0];
        setSubscription({
          hasActiveSubscription: sub.has_active_subscription,
          planName: sub.plan_name,
          status: sub.status,
          trialEndsAt: sub.trial_ends_at,
          currentPeriodEnd: sub.current_period_end,
          appointmentsLimit: sub.appointments_limit,
          appointmentsUsed: sub.appointments_used,
          clientsLimit: sub.clients_limit,
          clientsUsed: sub.clients_used,
          servicesLimit: sub.services_limit,
          servicesUsed: sub.services_used,
        });
      } else {
        setSubscription(null);
      }
    } catch (error: any) {
      console.error("Error fetching subscription:", error);
      toast.error("Erro ao carregar informações da assinatura");
    } finally {
      setLoading(false);
    }
  };

  const checkLimit = async (limitType: 'appointments' | 'clients' | 'services'): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { data, error } = await supabase.rpc('check_subscription_limit', {
        _user_id: userId,
        _limit_type: limitType
      });

      if (error) throw error;
      return data === true;
    } catch (error: any) {
      console.error("Error checking limit:", error);
      return false;
    }
  };

  const isWithinLimit = (limitType: 'appointments' | 'clients' | 'services'): boolean => {
    if (!subscription) return false;

    if (limitType === 'appointments') {
      if (subscription.appointmentsLimit === null) return true;
      return subscription.appointmentsUsed < subscription.appointmentsLimit;
    } else if (limitType === 'clients') {
      if (subscription.clientsLimit === null) return true;
      return subscription.clientsUsed < subscription.clientsLimit;
    } else if (limitType === 'services') {
      if (subscription.servicesLimit === null) return true;
      return subscription.servicesUsed < subscription.servicesLimit;
    }

    return false;
  };

  const refresh = () => {
    fetchSubscriptionStatus();
  };

  return {
    subscription,
    loading,
    checkLimit,
    isWithinLimit,
    refresh
  };
};
