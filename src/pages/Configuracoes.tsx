import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Settings, Users, Briefcase, ChevronRight, Clock, Calendar, Link2, Copy, MessageSquare } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Configuracoes = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const copyBookingLink = async () => {
    if (!profile?.booking_slug) {
      toast.error("Configure um link de agendamento primeiro");
      return;
    }
    try {
      const link = `${window.location.origin}/agendar/${profile.booking_slug}`;
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado!");
    } catch (error) {
      console.error("Erro ao copiar:", error);
      toast.error("Erro ao copiar o link");
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background pb-20 md:pb-0">
      <TopNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Configurações</h2>
          <p className="text-muted-foreground">
            Personalize suas preferências e dados
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card 
            className="p-6 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 group"
            onClick={() => navigate("/clientes")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground mb-1">
                    Clientes
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Gerencie seus clientes
                  </p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Card>

          <Card 
            className="p-6 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 group"
            onClick={() => navigate("/servicos")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                  <Briefcase className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground mb-1">
                    Serviços
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Gerencie seus serviços
                  </p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Card>

          <Card 
            className="p-6 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 group"
            onClick={() => navigate("/assinatura")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                  <Settings className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground mb-1">
                    Assinatura
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Gerencie seu plano
                  </p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Card>

          <Card 
            className="p-6 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 group"
            onClick={() => navigate("/horario-expediente")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                  <Clock className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground mb-1">
                    Horário de Expediente
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Configure seus horários de trabalho
                  </p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Card>

          <Card 
            className="p-6 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 group"
            onClick={() => navigate("/modelos-mensagem")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                  <MessageSquare className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground mb-1">
                    Modelos de Mensagem
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Configure mensagens automáticas
                  </p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Card>

          <Card className="p-6 border-border/50 shadow-lg">
            <div 
              className="flex items-center justify-between cursor-pointer group"
              onClick={() => navigate("/horarios-agendamento")}
            >
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground mb-1">
                    Horários de Agendamento via link
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    em breve
                  </p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            
            {profile?.booking_slug && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Link de agendamento configurado</span>
                  </div>
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      copyBookingLink();
                    }} 
                    variant="outline" 
                    size="sm"
                    className="gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar Link
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        <Card className="p-8 border-border/50 shadow-lg mt-8">
          <div className="max-w-md mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <Settings className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Outras Configurações
            </h3>
            <p className="text-muted-foreground">
              Em breve você poderá gerenciar seu perfil, notificações e outras preferências.
            </p>
          </div>
        </Card>
      </main>
      
      <BottomNav />
    </div>
  );
};

export default Configuracoes;
