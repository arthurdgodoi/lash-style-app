import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Ban, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
}: DayScheduleViewProps) => {
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [isFullDayBlocked, setIsFullDayBlocked] = useState(false);

  useEffect(() => {
    // Generate time slots based on working hours or default 8:00 - 20:00
    const startHour = workingHours?.start_time
      ? parseInt(workingHours.start_time.split(":")[0])
      : 8;
    const endHour = workingHours?.end_time
      ? parseInt(workingHours.end_time.split(":")[0])
      : 20;

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-foreground">
          {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </h3>
        <Button
          variant="outline"
          onClick={() => onBlockSlot()}
          className="gap-2"
        >
          <Ban className="w-4 h-4" />
          Bloquear Dia Inteiro
        </Button>
      </div>

      {isFullDayBlocked && (
        <Card className="p-4 border-destructive/50 bg-destructive/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Ban className="w-5 h-5 text-destructive" />
              <div>
                <p className="font-medium text-foreground">Dia bloqueado</p>
                <p className="text-sm text-muted-foreground">
                  {blockedSlots.find(s => s.is_full_day)?.reason || "Sem agendamentos neste dia"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const fullDayBlock = blockedSlots.find(s => s.is_full_day);
                if (fullDayBlock) handleUnblock(fullDayBlock.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {timeSlots.map((time) => {
          const appointment = getAppointmentAtTime(time);
          const blockedSlot = getBlockedSlotAtTime(time);
          const isBlocked = isFullDayBlocked || !!blockedSlot;
          
          return (
            <Card
              key={time}
              className={`p-4 transition-all duration-200 ${
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
              <div className="flex items-center gap-4">
                <div className="w-20 text-center">
                  <p className="text-lg font-semibold text-foreground">{time}</p>
                </div>
                <div className="h-12 w-px bg-border" />
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
                        {appointment.status}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Horário disponível</p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          onBlockSlot(time);
                        }}
                      >
                        <Ban className="w-4 h-4" />
                        Bloquear
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Plus className="w-4 h-4" />
                        Agendar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
