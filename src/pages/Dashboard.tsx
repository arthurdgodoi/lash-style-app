import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Calendar, Users, Clock } from "lucide-react";
import TopNav from "@/components/TopNav";
const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);

      // Fetch profile
      const {
        data: profileData
      } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setProfile(profileData);
    };
    checkUser();
    const {
      data: {
        subscription
      }
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
  return <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <TopNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Olá, {profile?.full_name || "Lash Designer"}! 👋
          </h2>
          <p className="text-muted-foreground">
            Bem-vindo ao seu painel de agendamentos
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 border-border/50 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl mx-0">
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

        <Card className="p-8 border-border/50 shadow-lg text-center">
          <div className="max-w-md mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Sistema de Agendamentos
            </h3>
            <p className="text-muted-foreground">
              Em breve você poderá gerenciar todos os seus agendamentos de forma elegante e
              profissional.
            </p>
          </div>
        </Card>
      </main>
    </div>;
};
export default Dashboard;