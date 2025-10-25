import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Clock, Save } from "lucide-react";

interface WorkingHour {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const daysOfWeek = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

const HorarioExpediente = () => {
  const [user, setUser] = useState<any>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await loadWorkingHours(session.user.id);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadWorkingHours = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("working_hours")
      .select("*")
      .eq("user_id", userId)
      .order("day_of_week");

    if (error) {
      console.error("Error loading working hours:", error);
    } else {
      const hoursMap = new Map(data.map(h => [h.day_of_week, h]));
      const allDays = daysOfWeek.map(day => {
        const existing = hoursMap.get(day.value);
        return existing || {
          day_of_week: day.value,
          start_time: "09:00",
          end_time: "18:00",
          is_active: false,
        };
      });
      setWorkingHours(allDays);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      // Delete all existing working hours for this user
      await supabase
        .from("working_hours")
        .delete()
        .eq("user_id", user.id);

      // Insert only active days
      const activeHours = workingHours.filter(h => h.is_active);
      if (activeHours.length > 0) {
        const { error } = await supabase
          .from("working_hours")
          .insert(
            activeHours.map(h => ({
              user_id: user.id,
              day_of_week: h.day_of_week,
              start_time: h.start_time,
              end_time: h.end_time,
              is_active: h.is_active,
            }))
          );

        if (error) throw error;
      }

      toast.success("Horário de expediente salvo com sucesso!");
    } catch (error) {
      console.error("Error saving working hours:", error);
      toast.error("Erro ao salvar horário de expediente");
    }
  };

  const updateWorkingHour = (dayIndex: number, field: keyof WorkingHour, value: any) => {
    setWorkingHours(prev => {
      const newHours = [...prev];
      newHours[dayIndex] = { ...newHours[dayIndex], [field]: value };
      return newHours;
    });
  };

  if (loading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <TopNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Horário de Expediente</h2>
          <p className="text-muted-foreground">
            Configure seus horários de trabalho para agendamentos via link
          </p>
        </div>

        <Card className="p-6 border-border/50 shadow-lg">
          <div className="space-y-6">
            {workingHours.map((hour, index) => (
              <div
                key={hour.day_of_week}
                className="flex flex-col md:flex-row md:items-center gap-4 pb-6 border-b border-border/50 last:border-0"
              >
                <div className="flex items-center gap-3 md:w-48">
                  <Switch
                    checked={hour.is_active}
                    onCheckedChange={(checked) =>
                      updateWorkingHour(index, "is_active", checked)
                    }
                  />
                  <Label className="text-base font-medium">
                    {daysOfWeek[index].label}
                  </Label>
                </div>

                <div className="flex-1 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <Input
                      type="time"
                      value={hour.start_time}
                      onChange={(e) =>
                        updateWorkingHour(index, "start_time", e.target.value)
                      }
                      disabled={!hour.is_active}
                      className="w-32"
                    />
                  </div>

                  <span className="text-muted-foreground">até</span>

                  <Input
                    type="time"
                    value={hour.end_time}
                    onChange={(e) =>
                      updateWorkingHour(index, "end_time", e.target.value)
                    }
                    disabled={!hour.is_active}
                    className="w-32"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <Button onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" />
              Salvar Configurações
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default HorarioExpediente;
