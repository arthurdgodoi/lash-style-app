import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  client_id: string;
  service_id: string;
  appointment_date: string;
  appointment_time: string;
  price: number;
  status: string;
  notes?: string;
}

interface WeekScheduleViewProps {
  selectedDate: Date;
  appointments: Appointment[];
  onCreateAppointment: (date: Date, time?: string) => void;
  onEditAppointment: (appointmentId: string) => void;
  getClientName: (clientId: string) => string;
  getServiceName: (serviceId: string) => string;
}

export const WeekScheduleView = ({
  selectedDate,
  appointments,
  onCreateAppointment,
  onEditAppointment,
  getClientName,
  getServiceName,
}: WeekScheduleViewProps) => {
  // Debug log
  console.log('WeekScheduleView - Appointments received:', appointments);
  
  const weekStart = startOfWeek(selectedDate, { locale: ptBR });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Generate time slots from 6am to 11pm
  const timeSlots = Array.from({ length: 18 }, (_, i) => {
    const hour = i + 6;
    return `${hour.toString().padStart(2, "0")}:00`;
  });

  const getAppointmentsForDateTime = (date: Date, time: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const appointments_filtered = appointments.filter(
      (apt) => {
        const aptTime = apt.appointment_time.substring(0, 5); // "09:00:00" -> "09:00"
        const matches = apt.appointment_date === dateStr && aptTime === time;
        return matches;
      }
    );
    console.log('WeekScheduleView - Date:', dateStr, 'Time:', time, 'Found:', appointments_filtered.length);
    return appointments_filtered;
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
    <div className="w-full overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Week Days Header */}
        <div className="grid grid-cols-8 gap-px bg-border mb-px">
          <div className="bg-background p-2 text-xs font-medium text-muted-foreground">
            Horário
          </div>
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "bg-background p-2 text-center",
                isSameDay(day, new Date()) && "bg-primary/5"
              )}
            >
              <div className="text-xs font-medium text-muted-foreground uppercase">
                {format(day, "EEE", { locale: ptBR })}
              </div>
              <div
                className={cn(
                  "text-lg font-semibold",
                  isSameDay(day, new Date())
                    ? "text-primary"
                    : "text-foreground"
                )}
              >
                {format(day, "dd")}
              </div>
            </div>
          ))}
        </div>

        {/* Time Slots Grid */}
        <div className="grid grid-cols-8 gap-px bg-border">
          {timeSlots.map((time) => (
            <>
              {/* Time Label */}
              <div
                key={`time-${time}`}
                className="bg-background p-2 text-xs text-muted-foreground font-medium"
              >
                {time}
              </div>
              
              {/* Day Cells */}
              {weekDays.map((day) => {
                const dayAppointments = getAppointmentsForDateTime(day, time);
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div
                    key={`${day.toISOString()}-${time}`}
                    className={cn(
                      "bg-background p-1 min-h-[60px] cursor-pointer hover:bg-accent/50 transition-colors relative",
                      isToday && "bg-primary/5"
                    )}
                    onClick={() => onCreateAppointment(day, time)}
                  >
                    <div className="space-y-1">
                      {dayAppointments.map((apt) => (
                        <div
                          key={apt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditAppointment(apt.id);
                          }}
                          className={cn(
                            "text-[10px] p-1 rounded border cursor-pointer hover:opacity-80 transition-opacity",
                            getStatusColor(apt.status)
                          )}
                        >
                          <div className="font-medium truncate">
                            {getClientName(apt.client_id)}
                          </div>
                          <div className="truncate opacity-90">
                            {getServiceName(apt.service_id)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  );
};
