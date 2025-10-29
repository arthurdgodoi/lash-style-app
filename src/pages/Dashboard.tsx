import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Users, Clock, Plus, Link2, Copy } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { BlockSlotDialog } from "@/components/BlockSlotDialog";
import { DayScheduleView } from "@/components/DayScheduleView";
import { WeekScheduleView } from "@/components/WeekScheduleView";
import { MonthScheduleView } from "@/components/MonthScheduleView";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [workingHours, setWorkingHours] = useState<any>(null);
  const [selectedTimeForAppointment, setSelectedTimeForAppointment] = useState<string>("");
  const [blockSlotDialogOpen, setBlockSlotDialogOpen] = useState(false);
  const [selectedTimeForBlock, setSelectedTimeForBlock] = useState<string>("");
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");
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

  // Fetch appointments for selected date range
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        let startDate: Date;
        let endDate: Date;

        if (viewMode === "day") {
          startDate = selectedDate;
          endDate = selectedDate;
        } else if (viewMode === "week") {
          const { startOfWeek, endOfWeek } = await import("date-fns");
          startDate = startOfWeek(selectedDate, { locale: ptBR });
          endDate = endOfWeek(selectedDate, { locale: ptBR });
        } else {
          const { startOfMonth, endOfMonth } = await import("date-fns");
          startDate = startOfMonth(selectedDate);
          endDate = endOfMonth(selectedDate);
        }

        const startDateStr = format(startDate, "yyyy-MM-dd");
        const endDateStr = format(endDate, "yyyy-MM-dd");
        
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from("appointments")
          .select("*")
          .eq("user_id", user.id)
          .gte("appointment_date", startDateStr)
          .lte("appointment_date", endDateStr)
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

    // Setup realtime subscriptions for appointments and blocked_slots
    const appointmentsChannel = supabase
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

    const blockedSlotsChannel = supabase
      .channel('blocked-slots-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blocked_slots',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(blockedSlotsChannel);
    };
  }, [user, selectedDate, viewMode]);

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || "Cliente";
  };

  const getServiceName = (serviceId: string) => {
    return services.find(s => s.id === serviceId)?.name || "Serviço";
  };

  const copyBookingLink = async () => {
    if (!bookingSlug) {
      toast.error("Configure um link de agendamento primeiro");
      return;
    }
    try {
      const link = `${window.location.origin}/agendar/${bookingSlug}`;
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado!");
    } catch (error) {
      console.error("Erro ao copiar:", error);
      toast.error("Erro ao copiar o link");
    }
  };

  const handleCreateAppointmentAtTime = (time: string) => {
    setSelectedTimeForAppointment(time);
    setAppointmentDialogOpen(true);
  };

  const handleCreateAppointmentAtDate = (date: Date, time?: string) => {
    setSelectedDate(date);
    setSelectedTimeForAppointment(time || "");
    setAppointmentDialogOpen(true);
  };

  const handleBlockSlot = (time?: string) => {
    setSelectedTimeForBlock(time || "");
    setBlockSlotDialogOpen(true);
  };

  const handleRefreshAppointments = async () => {
    if (!user) return;
    
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      const { data: appointmentsData } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", user.id)
        .eq("appointment_date", dateStr)
        .order("appointment_time", { ascending: true });

      setAppointments(appointmentsData || []);
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleEditAppointment = (appointmentId: string) => {
    setEditingAppointmentId(appointmentId);
    setAppointmentDialogOpen(true);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background pb-20 md:pb-0">
      <TopNav />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
        <Card className="p-4 sm:p-6 lg:p-8 border-border/50 shadow-lg mb-6">
          <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-foreground mb-1">
                Agendamentos
              </h3>
              <p className="text-muted-foreground text-sm">
                Gerencie seus atendimentos
              </p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "day" | "week" | "month")}>
                <TabsList>
                  <TabsTrigger value="day">Dia</TabsTrigger>
                  <TabsTrigger value="week">Semana</TabsTrigger>
                  <TabsTrigger value="month">Mês</TabsTrigger>
                </TabsList>
              </Tabs>
              
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
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : viewMode === "day" ? (
            <DayScheduleView
              selectedDate={selectedDate}
              appointments={appointments}
              workingHours={workingHours}
              onCreateAppointment={handleCreateAppointmentAtTime}
              onBlockSlot={handleBlockSlot}
              getClientName={getClientName}
              getServiceName={getServiceName}
              userId={user.id}
              onRefresh={handleRefreshAppointments}
              onEditAppointment={handleEditAppointment}
              onNewAppointment={() => setAppointmentDialogOpen(true)}
            />
          ) : viewMode === "week" ? (
            <WeekScheduleView
              selectedDate={selectedDate}
              appointments={appointments}
              onCreateAppointment={handleCreateAppointmentAtDate}
              onEditAppointment={handleEditAppointment}
              getClientName={getClientName}
              getServiceName={getServiceName}
            />
          ) : (
            <MonthScheduleView
              selectedDate={selectedDate}
              appointments={appointments}
              onCreateAppointment={handleCreateAppointmentAtDate}
              onEditAppointment={handleEditAppointment}
              getClientName={getClientName}
              getServiceName={getServiceName}
            />
          )}
        </Card>

        {/* Booking Link Section */}
        <Card className="p-4 sm:p-6 border-border/50 shadow-lg mt-6">
          <div className="flex items-center justify-between">
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
            {bookingSlug && (
              <Button onClick={copyBookingLink} variant="outline" className="gap-2">
                <Copy className="w-4 h-4" />
                Copiar Link
              </Button>
            )}
          </div>

          {!bookingSlug && (
            <p className="text-sm text-muted-foreground mt-4">
              Configure um link em Horários de Agendamento via link
            </p>
          )}
        </Card>

        <AppointmentDialog
          open={appointmentDialogOpen}
          onOpenChange={(open) => {
            setAppointmentDialogOpen(open);
            if (!open) {
              setSelectedTimeForAppointment("");
              setEditingAppointmentId(null);
            }
          }}
          onSuccess={() => {
            toast.success(editingAppointmentId ? "Agendamento atualizado com sucesso!" : "Agendamento criado com sucesso!");
            setSelectedTimeForAppointment("");
            setEditingAppointmentId(null);
          }}
          defaultTime={selectedTimeForAppointment}
          defaultDate={selectedDate}
          appointmentId={editingAppointmentId}
        />

        <BlockSlotDialog
          open={blockSlotDialogOpen}
          onOpenChange={(open) => {
            setBlockSlotDialogOpen(open);
            if (!open) setSelectedTimeForBlock("");
          }}
          onSuccess={() => {
            setSelectedTimeForBlock("");
            // Force immediate refresh
            setSelectedDate(new Date(selectedDate));
          }}
          defaultTime={selectedTimeForBlock}
          defaultDate={selectedDate}
        />
      </main>
      
      <BottomNav />
    </div>
  );
};

export default Dashboard;
