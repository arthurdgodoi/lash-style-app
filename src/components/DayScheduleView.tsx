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
    // Generate time slots from 6am to 11pm (like week view)
    const slots: string[] = [];
    for (let hour = 6; hour <= 23; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
    }
    setTimeSlots(slots);
  }, []);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-500/90 border-blue-600 text-white";
      case "confirmed":
        return "bg-green-500/90 border-green-600 text-white";
      case "completed":
        return "bg-purple-500/90 border-purple-600 text-white";
      case "cancelled":
        return "bg-red-500/90 border-red-600 text-white";
      default:
        return "bg-muted border-border text-foreground";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h3 className="text-xl sm:text-2xl font-bold text-foreground">
          {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </h3>
        {isFullDayBlocked ? (
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
        )}
      </div>

      {isFullDayBlocked && (
        <Card className="p-4 border-destructive/50 bg-destructive/5 mb-4">
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
      )}

      {timeSlots.length > 0 && (
        <div className="w-full overflow-x-auto">
          <div className="min-w-[300px]">
            {/* Header */}
            <div className="grid grid-cols-2 gap-px bg-border mb-px">
              <div className="bg-background p-2 text-xs font-medium text-muted-foreground">
                Horário
              </div>
              <div className="bg-background p-2 text-center">
                <div className="text-xs font-medium text-muted-foreground uppercase">
                  {format(selectedDate, "EEE", { locale: ptBR })}
                </div>
                <div className="text-lg font-semibold text-primary">
                  {format(selectedDate, "dd")}
                </div>
              </div>
            </div>

            {/* Time Slots Grid */}
            <div className="grid gap-px bg-border">
              {timeSlots.map((time) => {
                const appointment = getAppointmentAtTime(time);
                const blockedSlot = getBlockedSlotAtTime(time);
                const isBlocked = isFullDayBlocked || !!blockedSlot;
                
                return (
                  <div key={time} className="grid grid-cols-2 gap-px bg-border">
                    {/* Time Label */}
                    <div className="bg-background p-2 text-xs text-muted-foreground font-medium">
                      {time}
                    </div>
                    
                    {/* Day Cell */}
                    <div
                      className={`bg-background p-1 min-h-[60px] cursor-pointer hover:bg-accent/50 transition-colors relative ${
                        isBlocked ? "bg-destructive/5" : ""
                      }`}
                      onClick={() => {
                        if (!isBlocked && !appointment) {
                          onCreateAppointment(time);
                        }
                      }}
                    >
                      {isBlocked ? (
                        <div className="flex items-center justify-between h-full p-1">
                          <div className="flex items-center gap-1">
                            <Ban className="w-3 h-3 text-destructive flex-shrink-0" />
                            <div>
                              <p className="text-[10px] font-medium text-foreground">Bloqueado</p>
                              {blockedSlot?.reason && (
                                <p className="text-[9px] text-muted-foreground truncate">
                                  {blockedSlot.reason}
                                </p>
                              )}
                            </div>
                          </div>
                          {!isFullDayBlocked && blockedSlot && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnblock(blockedSlot.id);
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ) : appointment ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div
                              className={`text-[10px] p-1 rounded border cursor-pointer hover:opacity-80 transition-opacity h-full ${getStatusColor(
                                appointment.status
                              )}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="font-medium truncate">
                                {getClientName(appointment.client_id)}
                              </div>
                              <div className="truncate opacity-90">
                                {getServiceName(appointment.service_id)}
                              </div>
                              <div className="text-[9px] opacity-90">
                                R$ {parseFloat(appointment.price.toString()).toFixed(2)}
                              </div>
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card">
                            {(appointment.status === "scheduled" || appointment.status === "confirmed") && (
                              <>
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
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                onBlockSlot(time);
                              }}
                            >
                              <Ban className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCreateAppointment(time);
                              }}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
