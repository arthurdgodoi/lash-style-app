import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Users, Clock, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TopNav from "@/components/TopNav";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Fetch appointments for selected date
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from("appointments")
          .select("*")
          .eq("user_id", user.id)
          .eq("appointment_date", dateStr)
          .order("appointment_time", { ascending: true });

        if (appointmentsError) throw appointmentsError;

        // Fetch clients and services
        const { data: clientsData } = await supabase
          .from("clients")
          .select("*")
          .eq("user_id", user.id);

        const { data: servicesData } = await supabase
          .from("services")
          .select("*")
          .eq("user_id", user.id);

        setAppointments(appointmentsData || []);
        setClients(clientsData || []);
        setServices(servicesData || []);
      } catch (error: any) {
        toast.error("Erro ao carregar agendamentos");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();

    // Setup realtime subscription
    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedDate]);

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || "Cliente";
  };

  const getServiceName = (serviceId: string) => {
    return services.find(s => s.id === serviceId)?.name || "Serviço";
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <TopNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Olá, {profile?.full_name || "Lash Designer"}!
          </h2>
          <p className="text-muted-foreground mb-4">
            Bem-vindo ao seu painel de agendamentos
          </p>
          <Button onClick={() => setAppointmentDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Agendamento
          </Button>
        </div>

        <Card className="p-8 border-border/50 shadow-lg mb-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-1">
                Agendamentos
              </h3>
              <p className="text-muted-foreground text-sm">
                Gerencie seus atendimentos
              </p>
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="gap-2 hover:bg-accent hover:border-primary transition-all duration-200 cursor-pointer"
                >
                  <CalendarIcon className="w-4 h-4" />
                  {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <CalendarIcon className="w-8 h-8 text-primary" />
              </div>
              <p className="text-muted-foreground">
                Nenhum agendamento para esta data
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <Card key={appointment.id} className="p-4 border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-sm font-semibold text-foreground">
                          {format(new Date(`2000-01-01T${appointment.appointment_time}`), "HH:mm")}
                        </p>
                      </div>
                      <div className="h-10 w-px bg-border" />
                      <div>
                        <p className="font-medium text-foreground">
                          {getClientName(appointment.client_id)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {getServiceName(appointment.service_id)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        R$ {parseFloat(appointment.price).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {appointment.status}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 border-border/50 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <CalendarIcon className="w-6 h-6 text-primary" />
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
            toast.success("Agendamento criado com sucesso!");
          }}
        />
      </main>
    </div>
  );
};

export default Dashboard;
