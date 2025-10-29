import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Crown, Check, Zap, AlertCircle } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  description: string;
  stripe_price_id: string;
  price_monthly: number;
  max_appointments_per_month: number | null;
  max_clients: number | null;
  max_services: number | null;
  features: string[];
  is_featured: boolean;
}

const Assinatura = () => {
  const { user, subscription: authSubscription, refreshSubscription } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const { subscription, loading: subLoading, refresh } = useSubscription(user?.id);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      
      const formattedPlans: Plan[] = (data || []).map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features as string[] : []
      }));
      
      setPlans(formattedPlans);
    } catch (error: any) {
      toast.error("Erro ao carregar planos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: Plan) => {
    if (subscription?.planName === plan.name) {
      toast.info("Você já está neste plano");
      return;
    }

    try {
      toast.loading("Redirecionando para pagamento...");
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: plan.stripe_price_id }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("URL de checkout não retornada");
      }
    } catch (error: any) {
      console.error("Error creating checkout:", error);
      toast.error("Erro ao criar sessão de pagamento", {
        description: error.message || "Tente novamente"
      });
    }
  };

  const handleManageSubscription = async () => {
    try {
      toast.loading("Abrindo portal de gerenciamento...");
      
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error("URL do portal não retornada");
      }
    } catch (error: any) {
      console.error("Error opening portal:", error);
      toast.error("Erro ao abrir portal", {
        description: error.message || "Tente novamente"
      });
    }
  };

  // Check subscription on mount and after payment
  useEffect(() => {
    if (!user) return;

    const checkSub = async () => {
      try {
        await refreshSubscription();
        refresh();
      } catch (error) {
        console.error("Error checking subscription:", error);
      }
    };

    // Check for success/cancel params
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast.success("Assinatura ativada com sucesso!");
      checkSub();
      window.history.replaceState({}, '', '/assinatura');
    } else if (params.get('canceled') === 'true') {
      toast.info("Pagamento cancelado");
      window.history.replaceState({}, '', '/assinatura');
    }
  }, [user, refreshSubscription, refresh]);

  const formatLimit = (limit: number | null) => {
    return limit === null ? "Ilimitado" : limit.toString();
  };

  const getUsagePercentage = (used: number, limit: number | null) => {
    if (limit === null) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  if (!user || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background pb-20 md:pb-0">
      <TopNav />

      <main className="container mx-auto px-4 py-8">
        {/* Mensagem para usuários sem assinatura ativa */}
        {authSubscription && !authSubscription.subscribed && (
          <Card className="mb-8 border-destructive/50 bg-destructive/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                Assinatura Necessária
              </CardTitle>
              <CardDescription>
                Você precisa de uma assinatura ativa para acessar o aplicativo. Escolha um plano abaixo para continuar.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Status da Assinatura Atual */}
        {subscription && authSubscription?.subscribed && (
          <Card className="mb-8 border-primary/20 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-primary" />
                    {subscription.planName || "Plano Atual"}
                  </CardTitle>
                  <CardDescription>
                    {subscription.status === 'trialing' && subscription.trialEndsAt && (
                      <span className="flex items-center gap-2 mt-2">
                        <AlertCircle className="w-4 h-4" />
                        Trial termina em {format(new Date(subscription.trialEndsAt), "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                    )}
                    {subscription.status === 'active' && subscription.currentPeriodEnd && (
                      <span className="mt-2 block">
                        Renova em {format(new Date(subscription.currentPeriodEnd), "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                    {subscription.status === 'trialing' ? 'Trial' : subscription.status}
                  </Badge>
                  {subscription.status === 'active' && (
                    <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                      Gerenciar
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Uso de Agendamentos */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Agendamentos este mês</span>
                    <span className="font-medium">
                      {subscription.appointmentsUsed} / {formatLimit(subscription.appointmentsLimit)}
                    </span>
                  </div>
                  <Progress 
                    value={getUsagePercentage(subscription.appointmentsUsed, subscription.appointmentsLimit)} 
                    className="h-2"
                  />
                </div>

                {/* Uso de Clientes */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Clientes cadastrados</span>
                    <span className="font-medium">
                      {subscription.clientsUsed} / {formatLimit(subscription.clientsLimit)}
                    </span>
                  </div>
                  <Progress 
                    value={getUsagePercentage(subscription.clientsUsed, subscription.clientsLimit)} 
                    className="h-2"
                  />
                </div>

                {/* Uso de Serviços */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Serviços cadastrados</span>
                    <span className="font-medium">
                      {subscription.servicesUsed} / {formatLimit(subscription.servicesLimit)}
                    </span>
                  </div>
                  <Progress 
                    value={getUsagePercentage(subscription.servicesUsed, subscription.servicesLimit)} 
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Título */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Escolha seu plano
          </h2>
          <p className="text-muted-foreground text-lg">
            Comece grátis por 14 dias. Cancele quando quiser.
          </p>
        </div>

        {/* Planos */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative ${plan.is_featured ? 'border-primary shadow-xl scale-105' : 'border-border/50'}`}
              >
                {plan.is_featured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Zap className="w-3 h-3 mr-1" />
                      Mais Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">R$ {plan.price_monthly.toFixed(2)}</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className="w-full" 
                    variant={plan.is_featured ? "default" : "outline"}
                    onClick={() => handleUpgrade(plan)}
                    disabled={subscription?.planName === plan.name}
                  >
                    {subscription?.planName === plan.name ? 'Plano Atual' : 'Escolher Plano'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Garantia */}
        <Card className="border-border/50 bg-muted/50">
          <CardContent className="pt-6 text-center">
            <h3 className="font-semibold text-lg mb-2">Garantia de 14 dias</h3>
            <p className="text-muted-foreground">
              Experimente qualquer plano sem riscos. Se não gostar, devolvemos seu dinheiro.
            </p>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
};

export default Assinatura;
