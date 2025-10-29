import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
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

interface MonthScheduleViewProps {
  selectedDate: Date;
  appointments: Appointment[];
  onCreateAppointment: (date: Date) => void;
  onEditAppointment: (appointmentId: string) => void;
  getClientName: (clientId: string) => string;
  getServiceName: (serviceId: string) => string;
}

export const MonthScheduleView = ({
  selectedDate,
  appointments,
  onCreateAppointment,
  onEditAppointment,
  getClientName,
  getServiceName,
}: MonthScheduleViewProps) => {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const startDate = startOfWeek(monthStart, { locale: ptBR });
  const endDate = endOfWeek(monthEnd, { locale: ptBR });

  const dateFormat = "d";
  const rows: Date[][] = [];
  let days: Date[] = [];
  let day = startDate;

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      days.push(day);
      day = addDays(day, 1);
    }
    rows.push(days);
    days = [];
  }

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return appointments.filter((apt) => apt.appointment_date === dateStr);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-500/90 text-white";
      case "confirmed":
        return "bg-green-500/90 text-white";
      case "completed":
        return "bg-purple-500/90 text-white";
      case "cancelled":
        return "bg-red-500/90 text-white";
      default:
        return "bg-muted text-foreground";
    }
  };

  return (
    <div className="w-full">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-px bg-border mb-px">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
          <div
            key={day}
            className="bg-background p-2 text-center text-xs font-medium text-muted-foreground uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid gap-px bg-border">
        {rows.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-px">
            {week.map((day) => {
              const dayAppointments = getAppointmentsForDate(day);
              const isCurrentMonth = isSameMonth(day, selectedDate);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "bg-background min-h-[100px] p-1 cursor-pointer hover:bg-accent/50 transition-colors",
                    !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                    isToday && "bg-primary/5"
                  )}
                  onClick={() => onCreateAppointment(day)}
                >
                  <div
                    className={cn(
                      "text-sm font-medium mb-1",
                      isToday && "text-primary font-bold",
                      !isCurrentMonth && "text-muted-foreground"
                    )}
                  >
                    {format(day, dateFormat)}
                  </div>
                  
                  <div className="space-y-1 overflow-y-auto max-h-[80px]">
                    {dayAppointments.slice(0, 3).map((apt) => (
                      <div
                        key={apt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditAppointment(apt.id);
                        }}
                        className={cn(
                          "text-[10px] p-1 rounded cursor-pointer hover:opacity-80 transition-opacity truncate",
                          getStatusColor(apt.status)
                        )}
                      >
                        <div className="font-medium">
                          {apt.appointment_time.substring(0, 5)}
                        </div>
                        <div className="truncate">
                          {getClientName(apt.client_id)}
                        </div>
                      </div>
                    ))}
                    {dayAppointments.length > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1">
                        +{dayAppointments.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
