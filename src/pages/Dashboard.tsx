import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar as CalendarIcon, Users, Clock, Plus, Link2, Copy, Settings } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TopNav from "@/components/TopNav";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { DayScheduleView } from "@/components/DayScheduleView";
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
  const [bookingSlug, setBookingSlug] = useState("");
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [showBookingSettings, setShowBookingSettings] = useState(false);
  const [workingHours, setWorkingHours] = useState<any>(null);
  const [selectedTimeForAppointment, setSelectedTimeForAppointment] = useState<string>("");
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
        setBookingSlug(profileData.booking_slug || "");
        setBookingEnabled(profileData.booking_enabled || false);
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

        // Fetch working hours for the selected day
        const dayOfWeek = selectedDate.getDay();
        const { data: workingHoursData } = await supabase
          .from("working_hours")
          .select("*")
          .eq("user_id", user.id)
          .eq("day_of_week", dayOfWeek)
          .eq("is_active", true)
          .maybeSingle();

        setAppointments(appointmentsData || []);
        setClients(clientsData || []);
        setServices(servicesData || []);
        setWorkingHours(workingHoursData || null);
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

  const handleSaveBookingSettings = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          booking_slug: bookingSlug || null,
          booking_enabled: bookingEnabled,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Configurações de agendamento salvas!");
      setShowBookingSettings(false);
    } catch (error) {
      console.error("Error saving booking settings:", error);
      toast.error("Erro ao salvar configurações");
    }
  };

  const copyBookingLink = () => {
    if (!bookingSlug) {
      toast.error("Configure um link de agendamento primeiro");
      return;
    }
    const link = `${window.location.origin}/agendar/${bookingSlug}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const handleCreateAppointmentAtTime = (time: string) => {
    setSelectedTimeForAppointment(time);
    setAppointmentDialogOpen(true);
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
          ) : (
            <DayScheduleView
              selectedDate={selectedDate}
              appointments={appointments}
              workingHours={workingHours}
              onCreateAppointment={handleCreateAppointmentAtTime}
              getClientName={getClientName}
              getServiceName={getServiceName}
            />
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

        {/* Booking Link Section */}
        <Card className="p-6 border-border/50 shadow-lg mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Link2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Link de Agendamento</h3>
                <p className="text-sm text-muted-foreground">
                  Compartilhe com seus clientes para agendamentos automáticos
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBookingSettings(!showBookingSettings)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurar
            </Button>
          </div>

          {showBookingSettings ? (
            <div className="space-y-4 mt-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <Label htmlFor="booking-enabled">Agendamentos Habilitados</Label>
                <Switch
                  id="booking-enabled"
                  checked={bookingEnabled}
                  onCheckedChange={setBookingEnabled}
                />
              </div>

              <div>
                <Label htmlFor="booking-slug">Link Personalizado</Label>
                <div className="flex gap-2 mt-2">
                  <span className="inline-flex items-center px-3 bg-muted rounded-l-md text-sm text-muted-foreground">
                    {window.location.origin}/agendar/
                  </span>
                  <Input
                    id="booking-slug"
                    value={bookingSlug}
                    onChange={(e) => setBookingSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="seu-link"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowBookingSettings(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveBookingSettings}>
                  Salvar
                </Button>
              </div>
            </div>
          ) : bookingEnabled && bookingSlug ? (
            <div className="flex items-center gap-2 mt-4 p-3 bg-muted/30 rounded-lg">
              <Input
                value={`${window.location.origin}/agendar/${bookingSlug}`}
                readOnly
                className="flex-1"
              />
              <Button onClick={copyBookingLink} variant="outline" size="icon">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-4">
              Configure um link para começar a receber agendamentos online
            </p>
          )}
        </Card>

        <AppointmentDialog
          open={appointmentDialogOpen}
          onOpenChange={(open) => {
            setAppointmentDialogOpen(open);
            if (!open) setSelectedTimeForAppointment("");
          }}
          onSuccess={() => {
            toast.success("Agendamento criado com sucesso!");
            setSelectedTimeForAppointment("");
          }}
          defaultTime={selectedTimeForAppointment}
          defaultDate={selectedDate}
        />
      </main>
    </div>
  );
};

export default Dashboard;
