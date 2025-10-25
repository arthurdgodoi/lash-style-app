import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Clock, Plus } from "lucide-react";
import TopNav from "@/components/TopNav";
import { AppointmentDialog } from "@/components/AppointmentDialog";

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
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

      setProfile(profileData);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <TopNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-10 animate-fade-in">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-4xl font-bold text-foreground mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Olá, {profile?.full_name || "Lash Designer"}!
              </h2>
              <p className="text-muted-foreground text-lg">
                Bem-vindo ao seu painel de agendamentos
              </p>
            </div>
            <Button 
              onClick={() => setAppointmentDialogOpen(true)} 
              className="gap-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              size="lg"
            >
              <Plus className="w-5 h-5" />
              Novo Agendamento
            </Button>
          </div>
        </div>

        <Card className="p-8 border-border/50 shadow-xl hover:shadow-2xl transition-all duration-300 mb-8 animate-fade-in bg-gradient-to-br from-card to-card/80 backdrop-blur">
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-foreground mb-2">
              Agendamentos
            </h3>
            <p className="text-muted-foreground">
              Gerencie seus atendimentos
            </p>
          </div>

          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl mb-6 shadow-inner">
              <Calendar className="w-10 h-10 text-primary" />
            </div>
            <p className="text-muted-foreground text-lg mb-2">
              Nenhum agendamento ainda
            </p>
            <p className="text-muted-foreground/70 text-sm">
              Seus próximos agendamentos aparecerão aqui
            </p>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-delay">
          <Card className="p-6 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-card to-card/90">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl shadow-sm">
                <Calendar className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Hoje</p>
                <h3 className="text-3xl font-bold text-foreground">0</h3>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-card to-card/90">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-accent/20 to-accent/10 rounded-2xl shadow-sm">
                <Users className="w-7 h-7 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Clientes</p>
                <h3 className="text-3xl font-bold text-foreground">0</h3>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-card to-card/90">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl shadow-sm">
                <Clock className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Esta Semana</p>
                <h3 className="text-3xl font-bold text-foreground">0</h3>
              </div>
            </div>
          </Card>
        </div>

        <AppointmentDialog
          open={appointmentDialogOpen}
          onOpenChange={setAppointmentDialogOpen}
          onSuccess={() => {
            // Aqui você pode adicionar lógica para atualizar a lista de agendamentos
          }}
        />
      </main>
    </div>
  );
};

export default Dashboard;
