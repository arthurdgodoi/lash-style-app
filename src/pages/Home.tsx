import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Calendar, Clock, User, DollarSign, TrendingUp, ChevronLeft, ChevronRight, Plus, MessageCircle, Bell } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { format, startOfDay, endOfDay, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { AppointmentDialog } from "@/components/AppointmentDialog";

const Home = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [messageTemplates, setMessageTemplates] = useState<any>({});
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [clickedButtons, setClickedButtons] = useState<Record<string, boolean>>({});
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
      fetchTodayData(session.user.id, new Date());
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchTodayData(session.user.id, new Date());
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchTodayData(user.id, selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    // Load clicked buttons from localStorage
    const stored = localStorage.getItem('whatsapp_clicks');
    if (stored) {
      setClickedButtons(JSON.parse(stored));
    }
  }, []);

  const fetchTodayData = async (userId: string, date: Date) => {
    setLoading(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");

      // Fetch user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      setProfile(profileData);

      // Fetch today's appointments
      const { data: appointmentsData } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", userId)
        .eq("appointment_date", dateStr)
        .order("appointment_time", { ascending: true });

      // Fetch clients
      const { data: clientsData } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", userId);

      // Fetch services
      const { data: servicesData } = await supabase
        .from("services")
        .select("*")
        .eq("user_id", userId);

      // Fetch message templates
      const { data: templatesData } = await supabase
        .from("message_templates")
        .select("*")
        .eq("user_id", userId);

      const templates: any = {};
      if (templatesData) {
        templatesData.forEach((template) => {
          templates[template.template_type] = template.message;
        });
      }

      setTodayAppointments(appointmentsData || []);
      setClients(clientsData || []);
      setServices(servicesData || []);
      setMessageTemplates(templates);

      // Calculate today's revenue
      const revenue = (appointmentsData || [])
        .filter((apt) => apt.status === "completed")
        .reduce((sum, apt) => sum + Number(apt.price || 0), 0);
      setTodayRevenue(revenue);
    } catch (error) {
      console.error("Error fetching today's data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.name || "Cliente não encontrado";
  };

  const getServiceName = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    return service?.name || "Serviço não encontrado";
  };

  const generateWhatsAppLink = (templateType: string) => {
    if (!nextAppointment) return null;
    
    const client = clients.find((c) => c.id === nextAppointment.client_id);
    const phone = client?.phone?.replace(/\D/g, "");
    
    if (!phone) return null;

    const template = messageTemplates[templateType];
    if (!template) return null;

    const formattedPhone = phone.startsWith("55") ? phone : `55${phone}`;

    const message = template
      .replace(/{nome_cliente}/g, client?.name || "")
      .replace(/{nome_profissional}/g, profile?.professional_name || profile?.full_name || "")
      .replace(/{horario_agendamento}/g, `${format(new Date(nextAppointment.appointment_date), "dd/MM/yyyy")} às ${nextAppointment.appointment_time.substring(0, 5)}`)
      .replace(/{valor}/g, `R$ ${Number(nextAppointment.price || 0).toFixed(2)}`)
      .replace(/{chave_pix}/g, profile?.pix_key || "")
      .replace(/{localizacao}/g, profile?.location || "");
    
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  };

  const handleWhatsAppClick = (templateType: string, appointmentId: string) => {
    const link = generateWhatsAppLink(templateType);
    if (link) {
      window.open(link, "_blank");
      
      // Mark as clicked
      const key = `${appointmentId}-${templateType}`;
      const newClickedButtons = { ...clickedButtons, [key]: true };
      setClickedButtons(newClickedButtons);
      localStorage.setItem('whatsapp_clicks', JSON.stringify(newClickedButtons));
    }
  };

  const isButtonClicked = (appointmentId: string, templateType: string) => {
    const key = `${appointmentId}-${templateType}`;
    return clickedButtons[key] || false;
  };

  const nextAppointment = todayAppointments.find((apt) => {
    const now = new Date();
    const aptTime = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
    return aptTime > now && apt.status === "scheduled";
  });

  const completedCount = todayAppointments.filter((apt) => apt.status === "completed").length;
  const scheduledCount = todayAppointments.filter((apt) => apt.status === "scheduled").length;

  const handlePreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleAppointmentClick = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setIsAppointmentDialogOpen(true);
  };

  const handleNewAppointment = () => {
    setSelectedAppointmentId(null);
    setIsAppointmentDialogOpen(true);
  };

  const handleAppointmentClose = () => {
    setIsAppointmentDialogOpen(false);
    setSelectedAppointmentId(null);
    if (user) {
      fetchTodayData(user.id, selectedDate);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <TopNav />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Olá, {profile?.full_name || "usuário"}!
          </h2>
          <p className="text-base md:text-lg text-muted-foreground border-b-2 border-primary pb-2 inline-block">
            Bem-vindo ao seu painel de agendamentos
          </p>
        </div>

        {/* Date Navigation */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handlePreviousDay}
            className="h-10 w-10"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "min-w-[200px] justify-center text-center font-normal px-4"
                )}
              >
                <div className="flex flex-col items-center">
                  <div className="text-base md:text-lg font-semibold">
                    {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground capitalize">
                    {format(selectedDate, "EEEE", { locale: ptBR })}
                  </div>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-auto p-0 z-50 bg-background" 
              align="center"
              sideOffset={5}
              alignOffset={0}
            >
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setCalendarOpen(false);
                  }
                }}
                initialFocus
                className="pointer-events-auto"
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleNextDay}
            className="h-10 w-10"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {format(selectedDate, "yyyy-MM-dd") !== format(new Date(), "yyyy-MM-dd") && (
          <div className="mb-6 text-center">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleToday}
            >
              Voltar para Hoje
            </Button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="mb-2">
              <span className="text-sm text-muted-foreground">Hoje</span>
            </div>
            <p className="text-xl md:text-2xl font-bold">{todayAppointments.length}</p>
            <p className="text-xs text-muted-foreground">Agendamentos</p>
          </Card>

          <Card className="p-4">
            <div className="mb-2">
              <span className="text-sm text-muted-foreground">Concluídos</span>
            </div>
            <p className="text-xl md:text-2xl font-bold">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Atendimentos</p>
          </Card>

          <Card className="p-4">
            <div className="mb-2">
              <span className="text-sm text-muted-foreground">Pendentes</span>
            </div>
            <p className="text-xl md:text-2xl font-bold">{scheduledCount}</p>
            <p className="text-xs text-muted-foreground">A realizar</p>
          </Card>

          <Card className="p-4">
            <div className="mb-2">
              <span className="text-sm text-muted-foreground">Faturamento</span>
            </div>
            <p className="text-xl md:text-2xl font-bold">
              R$ {todayRevenue.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">Hoje</p>
          </Card>
        </div>

        {/* Next Appointment */}
        {nextAppointment && (
          <div className="flex justify-center mb-8">
            <Card className="p-6 border-primary w-full max-w-md">
              <h3 className="text-base md:text-lg font-semibold mb-4 flex items-center justify-center">
                <Clock className="w-5 h-5 mr-2 text-primary" />
                Próximo Atendimento
              </h3>
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Horário:</span>
                  <span className="font-semibold">
                    {nextAppointment.appointment_time.substring(0, 5)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-semibold">
                    {getClientName(nextAppointment.client_id)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Serviço:</span>
                  <span className="font-semibold">
                    {getServiceName(nextAppointment.service_id)}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col gap-3 pt-4 border-t border-border/50">
                <Button
                  variant="outline"
                  size="default"
                  className={cn(
                    "w-full gap-2 justify-center",
                    isButtonClicked(nextAppointment.id, "confirmation") && "opacity-50"
                  )}
                  onClick={() => handleWhatsAppClick("confirmation", nextAppointment.id)}
                  disabled={!generateWhatsAppLink("confirmation")}
                >
                  <MessageCircle className="h-4 w-4" />
                  Confirmar horário
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  className={cn(
                    "w-full gap-2 justify-center",
                    isButtonClicked(nextAppointment.id, "reminder") && "opacity-50"
                  )}
                  onClick={() => handleWhatsAppClick("reminder", nextAppointment.id)}
                  disabled={!generateWhatsAppLink("reminder")}
                >
                  <Bell className="h-4 w-4" />
                  Enviar lembrete
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Schedule */}
        <Card className="p-6">
          <h3 className="text-base md:text-lg font-semibold mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Agendamentos
          </h3>
          
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : todayAppointments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum agendamento para esta data
            </p>
          ) : (
            <div className="space-y-3">
              {todayAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  onClick={() => handleAppointmentClick(appointment.id)}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                      <span className="text-xs font-medium text-primary">
                        {appointment.appointment_time.substring(0, 5)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">
                        {getClientName(appointment.client_id)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getServiceName(appointment.service_id)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">
                      R$ {Number(appointment.price || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {appointment.status === "scheduled" ? "Agendado" : 
                       appointment.status === "completed" ? "Concluído" : 
                       appointment.status === "cancelled" ? "Cancelado" : appointment.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>

      <BottomNav />

      {/* Floating Action Button */}
      <Button
        onClick={handleNewAppointment}
        size="lg"
        className="fixed bottom-24 md:bottom-8 right-4 md:right-8 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 z-50"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {isAppointmentDialogOpen && (
        <AppointmentDialog
          open={isAppointmentDialogOpen}
          onOpenChange={setIsAppointmentDialogOpen}
          appointmentId={selectedAppointmentId || undefined}
          onSuccess={handleAppointmentClose}
        />
      )}
    </div>
  );
};

export default Home;
