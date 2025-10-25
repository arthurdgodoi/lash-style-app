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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <TopNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Olá, {profile?.full_name || "Lash Designer"}! 👋
            </h2>
            <p className="text-muted-foreground">
              Bem-vindo ao seu painel de agendamentos
            </p>
          </div>
          <Button onClick={() => setAppointmentDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Agendamento
          </Button>
        </div>

        <Card className="p-8 border-border/50 shadow-lg mb-8">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-foreground mb-1">
              Agendamentos
            </h3>
            <p className="text-muted-foreground text-sm">
              Gerencie seus atendimentos
            </p>
          </div>

          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <p className="text-muted-foreground">
              Seus próximos agendamentos aparecerão aqui
            </p>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 border-border/50 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hoje</p>
                <h3 className="text-2xl font-bold text-foreground">0</h3>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border/50 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clientes</p>
                <h3 className="text-2xl font-bold text-foreground">0</h3>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border/50 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Esta Semana</p>
                <h3 className="text-2xl font-bold text-foreground">0</h3>
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
