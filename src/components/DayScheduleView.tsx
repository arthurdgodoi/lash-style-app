import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Ban, Trash2, Clock, Check, Calendar, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Appointment {
  id: string;
  appointment_time: string;
  client_id: string;
  service_id: string;
  price: number;
  status: string;
}

interface BlockedSlot {
  id: string;
  blocked_time: string | null;
  is_full_day: boolean;
  reason: string | null;
}

interface DayScheduleViewProps {
  selectedDate: Date;
  appointments: Appointment[];
  workingHours: { start_time: string; end_time: string } | null;
  onCreateAppointment: (time: string) => void;
  onBlockSlot: (time?: string) => void;
  getClientName: (id: string) => string;
  getServiceName: (id: string) => string;
  userId: string;
  onRefresh?: () => void;
  onEditAppointment?: (appointmentId: string) => void;
}

export const DayScheduleView = ({
  selectedDate,
  appointments,
  workingHours,
  onCreateAppointment,
  onBlockSlot,
  getClientName,
  getServiceName,
  userId,
  onRefresh,
  onEditAppointment,
}: DayScheduleViewProps) => {
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [isFullDayBlocked, setIsFullDayBlocked] = useState(false);

  useEffect(() => {
    // Generate time slots based on working hours
    if (!workingHours) {
      setTimeSlots([]);
      return;
    }

    const startTime = workingHours.start_time;
    const endTime = workingHours.end_time;
    
    if (!startTime || !endTime) {
      setTimeSlots([]);
      return;
    }

    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    const slots: string[] = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
    }
    setTimeSlots(slots);
  }, [workingHours]);

  useEffect(() => {
    fetchBlockedSlots();
  }, [selectedDate, userId]);

  const fetchBlockedSlots = async () => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("blocked_slots")
      .select("*")
      .eq("user_id", userId)
      .eq("blocked_date", dateStr);

    if (error) {
      console.error("Error fetching blocked slots:", error);
      return;
    }

    const fullDayBlock = data?.find(slot => slot.is_full_day);
    setIsFullDayBlocked(!!fullDayBlock);
    setBlockedSlots(data || []);
  };

  const handleUnblock = async (blockId: string) => {
    const { error } = await supabase
      .from("blocked_slots")
      .delete()
      .eq("id", blockId);

    if (error) {
      toast.error("Erro ao desbloquear");
      return;
    }

    toast.success("Desbloqueado com sucesso!");
    fetchBlockedSlots();
  };

  const getAppointmentAtTime = (time: string) => {
    return appointments.find((apt) => {
      const aptTime = apt.appointment_time.substring(0, 5);
      return aptTime === time;
    });
  };

  const getBlockedSlotAtTime = (time: string) => {
    return blockedSlots.find((slot) => {
      if (slot.is_full_day) return true;
      if (!slot.blocked_time) return false;
      const blockTime = slot.blocked_time.substring(0, 5);
      return blockTime === time;
    });
  };

  const handleConfirmAppointment = async (appointmentId: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "confirmed" })
      .eq("id", appointmentId);

    if (error) {
      toast.error("Erro ao confirmar agendamento");
      return;
    }

    toast.success("Agendamento confirmado!");
    onRefresh?.();
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appointmentId);

    if (error) {
      toast.error("Erro ao cancelar agendamento");
      return;
    }

    toast.success("Agendamento cancelado!");
    onRefresh?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h3 className="text-xl sm:text-2xl font-bold text-foreground">
          {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </h3>
        {workingHours && (
          isFullDayBlocked ? (
            <Button
              variant="outline"
              onClick={() => {
                const fullDayBlock = blockedSlots.find(s => s.is_full_day);
                if (fullDayBlock) handleUnblock(fullDayBlock.id);
              }}
              className="gap-2 w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4" />
              Desbloquear Agenda
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => onBlockSlot()}
              className="gap-2 w-full sm:w-auto"
            >
              <Ban className="w-4 h-4" />
              Bloquear horário
            </Button>
          )
        )}
      </div>

      {!workingHours ? (
        <Card className="p-8 text-center border-border/50">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
            <Clock className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-2">
            Nenhum horário de expediente configurado para este dia
          </p>
          <p className="text-sm text-muted-foreground">
            Configure os horários de expediente em Configurações → Horário de Expediente
          </p>
        </Card>
      ) : isFullDayBlocked ? (
        <Card className="p-4 border-destructive/50 bg-destructive/5">
          <div className="flex items-center gap-3">
            <Ban className="w-5 h-5 text-destructive" />
            <div>
              <p className="font-medium text-foreground">Agenda bloqueada</p>
              <p className="text-sm text-muted-foreground">
                {blockedSlots.find(s => s.is_full_day)?.reason || "Sem agendamentos neste dia"}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {workingHours && timeSlots.length > 0 && (
        <div className="space-y-2">
        {timeSlots.map((time) => {
          const appointment = getAppointmentAtTime(time);
          const blockedSlot = getBlockedSlotAtTime(time);
          const isBlocked = isFullDayBlocked || !!blockedSlot;
          
          return (
            <Card
              key={time}
              className={`p-3 sm:p-4 transition-all duration-200 ${
                isBlocked
                  ? "border-destructive/50 bg-destructive/5 opacity-60"
                  : appointment
                  ? "border-primary bg-primary/5"
                  : "border-border/50 hover:border-primary/50 hover:bg-accent/50 cursor-pointer"
              }`}
              onClick={() => {
                if (isBlocked || appointment) return;
                onCreateAppointment(time);
              }}
            >
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="w-16 sm:w-20 text-center flex-shrink-0">
                  <p className="text-base sm:text-lg font-semibold text-foreground">{time}</p>
                </div>
                <div className="h-12 w-px bg-border hidden sm:block" />
                {isBlocked ? (
                  <div className="flex-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Ban className="w-4 h-4 text-destructive" />
                      <div>
                        <p className="font-medium text-foreground">Horário bloqueado</p>
                        {blockedSlot?.reason && (
                          <p className="text-sm text-muted-foreground">{blockedSlot.reason}</p>
                        )}
                      </div>
                    </div>
                    {!isFullDayBlocked && blockedSlot && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnblock(blockedSlot.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ) : appointment ? (
                  appointment.status === "scheduled" || appointment.status === "confirmed" ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div className="flex-1 flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity">
                          <div>
                            <p className="font-medium text-foreground">
                              {getClientName(appointment.client_id)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {getServiceName(appointment.service_id)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">
                              R$ {parseFloat(appointment.price.toString()).toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {appointment.status === "scheduled" ? "Agendado" : 
                               appointment.status === "confirmed" ? "Confirmado" : 
                               appointment.status}
                            </p>
                          </div>
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card">
                        {appointment.status === "scheduled" && (
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmAppointment(appointment.id);
                            }}
                          >
                            <Check className="w-4 h-4 mr-2 text-green-600" />
                            Confirmar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditAppointment?.(appointment.id);
                          }}
                        >
                          <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                          Reagendar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelAppointment(appointment.id);
                          }}
                        >
                          <X className="w-4 h-4 mr-2 text-destructive" />
                          Desmarcar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">
                          {getClientName(appointment.client_id)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {getServiceName(appointment.service_id)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">
                          R$ {parseFloat(appointment.price.toString()).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {appointment.status === "cancelled" ? "Cancelado" : appointment.status}
                        </p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-sm text-muted-foreground">Horário disponível</p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 sm:gap-2 flex-1 sm:flex-initial"
                        onClick={(e) => {
                          e.stopPropagation();
                          onBlockSlot(time);
                        }}
                      >
                        <Ban className="w-4 h-4" />
                        <span className="hidden sm:inline">Bloquear</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 flex-1 sm:flex-initial">
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Agendar</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
        </div>
      )}
    </div>
  );
};
