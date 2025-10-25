import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Appointment {
  id: string;
  appointment_time: string;
  client_id: string;
  service_id: string;
  price: number;
  status: string;
}

interface DayScheduleViewProps {
  selectedDate: Date;
  appointments: Appointment[];
  workingHours: { start_time: string; end_time: string } | null;
  onCreateAppointment: (time: string) => void;
  getClientName: (id: string) => string;
  getServiceName: (id: string) => string;
}

export const DayScheduleView = ({
  selectedDate,
  appointments,
  workingHours,
  onCreateAppointment,
  getClientName,
  getServiceName,
}: DayScheduleViewProps) => {
  const [timeSlots, setTimeSlots] = useState<string[]>([]);

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

  const getAppointmentAtTime = (time: string) => {
    return appointments.find((apt) => {
      const aptTime = apt.appointment_time.substring(0, 5);
      return aptTime === time;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-foreground">
          {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </h3>
      </div>

      <div className="space-y-2">
        {timeSlots.map((time) => {
          const appointment = getAppointmentAtTime(time);
          
          return (
            <Card
              key={time}
              className={`p-4 transition-all duration-200 ${
                appointment
                  ? "border-primary bg-primary/5"
                  : "border-border/50 hover:border-primary/50 hover:bg-accent/50 cursor-pointer"
              }`}
              onClick={() => !appointment && onCreateAppointment(time)}
            >
              <div className="flex items-center gap-4">
                <div className="w-20 text-center">
                  <p className="text-lg font-semibold text-foreground">{time}</p>
                </div>
                <div className="h-12 w-px bg-border" />
                {appointment ? (
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
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Agendar
                    </Button>
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
