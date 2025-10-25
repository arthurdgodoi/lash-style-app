import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, addDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, User, Mail, Phone, Briefcase } from "lucide-react";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  suggested_price: number;
}

interface WorkingHour {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface Appointment {
  appointment_date: string;
  appointment_time: string;
}

const AgendamentoPublico = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [professionalName, setProfessionalName] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service_id: "",
    time_slot: "",
    notes: "",
  });

  useEffect(() => {
    loadProfessionalData();
  }, [slug]);

  useEffect(() => {
    if (selectedDate && formData.service_id && professionalId) {
      loadAvailableSlots();
    }
  }, [selectedDate, formData.service_id, professionalId]);

  const loadProfessionalData = async () => {
    if (!slug) {
      toast.error("Link inválido");
      return;
    }

    setLoading(true);

    // Load professional profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, booking_enabled")
      .eq("booking_slug", slug)
      .single();

    if (profileError || !profile || !profile.booking_enabled) {
      toast.error("Profissional não encontrado ou agendamentos desabilitados");
      setLoading(false);
      return;
    }

    setProfessionalName(profile.full_name);
    setProfessionalId(profile.id);

    // Load services
    const { data: servicesData } = await supabase
      .from("services")
      .select("*")
      .eq("user_id", profile.id)
      .eq("is_active", true);

    setServices(servicesData || []);

    // Load working hours
    const { data: hoursData } = await supabase
      .from("working_hours")
      .select("*")
      .eq("user_id", profile.id)
      .eq("is_active", true);

    setWorkingHours(hoursData || []);
    setLoading(false);
  };

  const loadAvailableSlots = async () => {
    if (!selectedDate || !formData.service_id) return;

    const dayOfWeek = selectedDate.getDay();
    const workingDay = workingHours.find(h => h.day_of_week === dayOfWeek);

    if (!workingDay) {
      setAvailableSlots([]);
      return;
    }

    const service = services.find(s => s.id === formData.service_id);
    if (!service) return;

    // Get configured booking time slots
    const { data: configuredSlots } = await supabase
      .from("booking_time_slots")
      .select("time_slot")
      .eq("user_id", professionalId)
      .eq("is_active", true)
      .order("time_slot");

    // If no configured slots, return empty
    if (!configuredSlots || configuredSlots.length === 0) {
      setAvailableSlots([]);
      return;
    }

    // Get existing appointments for this date
    const { data: appointments } = await supabase
      .from("appointments")
      .select("appointment_time, service_id")
      .eq("user_id", professionalId)
      .eq("appointment_date", format(selectedDate, "yyyy-MM-dd"));

    // Get blocked slots for this date
    const { data: blockedSlots } = await supabase
      .from("blocked_slots")
      .select("*")
      .eq("user_id", professionalId)
      .eq("blocked_date", format(selectedDate, "yyyy-MM-dd"));

    // Check if day is fully blocked
    const isFullDayBlocked = blockedSlots?.some(slot => slot.is_full_day);
    if (isFullDayBlocked) {
      setAvailableSlots([]);
      return;
    }

    // Filter configured slots based on working hours, appointments, and blocked slots
    const availableSlots = configuredSlots
      .map(slot => slot.time_slot.substring(0, 5))
      .filter(timeSlot => {
        const [slotHour, slotMinute] = timeSlot.split(":").map(Number);
        const [startHour, startMinute] = workingDay.start_time.split(":").map(Number);
        const [endHour, endMinute] = workingDay.end_time.split(":").map(Number);

        // Check if slot is within working hours
        const slotMinutes = slotHour * 60 + slotMinute;
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;
        
        if (slotMinutes < startMinutes || slotMinutes >= endMinutes) {
          return false;
        }

        // Check if slot is blocked
        const isBlocked = blockedSlots?.some(slot => {
          if (!slot.blocked_time) return false;
          return slot.blocked_time.substring(0, 5) === timeSlot;
        });

        if (isBlocked) return false;

        // Check if this slot conflicts with existing appointments
        const hasConflict = appointments?.some(apt => {
          const aptService = services.find(s => s.id === apt.service_id);
          if (!aptService) return false;

          const aptTime = apt.appointment_time;
          const [aptHour, aptMinute] = aptTime.split(":").map(Number);
          const aptEndMinutes = aptHour * 60 + aptMinute + aptService.duration_minutes;
          const slotEndMinutes = slotMinutes + service.duration_minutes;

          return (
            (slotMinutes >= aptHour * 60 + aptMinute && slotMinutes < aptEndMinutes) ||
            (slotEndMinutes > aptHour * 60 + aptMinute && slotEndMinutes <= aptEndMinutes) ||
            (slotMinutes <= aptHour * 60 + aptMinute && slotEndMinutes >= aptEndMinutes)
          );
        });

        return !hasConflict;
      });

    setAvailableSlots(availableSlots);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate || !formData.time_slot || !formData.service_id) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      // Create client
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .insert({
          user_id: professionalId,
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // Get service price
      const service = services.find(s => s.id === formData.service_id);
      if (!service) throw new Error("Serviço não encontrado");

      // Create appointment
      const { error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          user_id: professionalId,
          client_id: clientData.id,
          service_id: formData.service_id,
          appointment_date: format(selectedDate, "yyyy-MM-dd"),
          appointment_time: formData.time_slot,
          price: service.suggested_price || 0,
          notes: formData.notes || null,
          status: "scheduled",
        });

      if (appointmentError) throw appointmentError;

      toast.success("Agendamento realizado com sucesso!");
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        service_id: "",
        time_slot: "",
        notes: "",
      });
      setSelectedDate(undefined);
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      toast.error("Erro ao criar agendamento: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background py-12 px-4">
      <div className="container mx-auto max-w-3xl">
        <Card className="p-8 border-border/50 shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Agendamento Online
            </h1>
            <p className="text-lg text-muted-foreground">
              {professionalName}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">Nome Completo *</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="pl-10"
                  placeholder="Seu nome"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="pl-10"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="service">Serviço *</Label>
              <Select value={formData.service_id} onValueChange={(value) => setFormData({ ...formData, service_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um serviço" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - {service.duration_minutes} min
                      {service.suggested_price && ` - R$ ${service.suggested_price.toFixed(2)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data *</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => {
                  const dayOfWeek = date.getDay();
                  const hasWorkingHour = workingHours.some(h => h.day_of_week === dayOfWeek);
                  return !hasWorkingHour || date < startOfDay(new Date());
                }}
                locale={ptBR}
                className="rounded-md border pointer-events-auto"
              />
            </div>

            {selectedDate && formData.service_id && (
              <div>
                <Label>Horário *</Label>
                {availableSlots.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot}
                        type="button"
                        variant={formData.time_slot === slot ? "default" : "outline"}
                        onClick={() => setFormData({ ...formData, time_slot: slot })}
                        className="gap-2"
                      >
                        <Clock className="w-4 h-4" />
                        {slot}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">
                    Nenhum horário disponível para esta data
                  </p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Alguma observação sobre o agendamento?"
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full" size="lg">
              Confirmar Agendamento
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AgendamentoPublico;
