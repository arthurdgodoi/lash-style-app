import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Settings, Users, Briefcase, ChevronRight, Clock, Calendar } from "lucide-react";
import TopNav from "@/components/TopNav";
import { Button } from "@/components/ui/button";

const Configuracoes = () => {
  const [user, setUser] = useState<any>(null);
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

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <TopNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Configurações</h2>
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
                  <h3 className="text-xl font-semibold text-foreground mb-1">
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
                  <h3 className="text-xl font-semibold text-foreground mb-1">
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
            onClick={() => navigate("/horario-expediente")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                  <Clock className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-1">
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
            onClick={() => navigate("/horarios-agendamento")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-1">
                    Horários de Agendamento
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Defina os horários disponíveis para clientes
                  </p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
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
    </div>
  );
};

export default Configuracoes;
