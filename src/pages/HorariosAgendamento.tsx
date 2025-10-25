import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import TopNav from "@/components/TopNav";
import { Clock, Save } from "lucide-react";
import { toast } from "sonner";

interface TimeSlot {
  id: string;
  time_slot: string;
  is_active: boolean;
}

const HorariosAgendamento = () => {
  const [user, setUser] = useState<any>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Generate all possible time slots from 00:00 to 23:30 in 30-minute intervals
  const allPossibleSlots = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? "00" : "30";
    return `${hour.toString().padStart(2, "0")}:${minute}`;
  });

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

  useEffect(() => {
    if (user) {
      loadTimeSlots();
    }
  }, [user]);

  const loadTimeSlots = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("booking_time_slots")
      .select("*")
      .eq("user_id", user.id)
      .order("time_slot");

    if (error) {
      console.error("Error loading time slots:", error);
      toast.error("Erro ao carregar horários");
      setLoading(false);
      return;
    }

    // Create a map of existing slots
    const existingSlotsMap = new Map(
      data?.map((slot) => [slot.time_slot.substring(0, 5), slot]) || []
    );

    // Merge with all possible slots
    const mergedSlots = allPossibleSlots.map((slot) => {
      const existing = existingSlotsMap.get(slot);
      return existing || {
        id: "",
        time_slot: slot,
        is_active: false,
      };
    });

    setTimeSlots(mergedSlots);
    setLoading(false);
  };

  const toggleTimeSlot = (index: number) => {
    const newSlots = [...timeSlots];
    newSlots[index].is_active = !newSlots[index].is_active;
    setTimeSlots(newSlots);
  };

  const handleSave = async () => {
    try {
      // Delete all existing slots for this user
      const { error: deleteError } = await supabase
        .from("booking_time_slots")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      // Insert only active slots
      const activeSlotsToInsert = timeSlots
        .filter((slot) => slot.is_active)
        .map((slot) => ({
          user_id: user.id,
          time_slot: slot.time_slot,
          is_active: true,
        }));

      if (activeSlotsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("booking_time_slots")
          .insert(activeSlotsToInsert);

        if (insertError) throw insertError;
      }

      toast.success("Horários salvos com sucesso!");
    } catch (error: any) {
      console.error("Error saving time slots:", error);
      toast.error("Erro ao salvar horários: " + error.message);
    }
  };

  const selectAll = () => {
    setTimeSlots(timeSlots.map((slot) => ({ ...slot, is_active: true })));
  };

  const deselectAll = () => {
    setTimeSlots(timeSlots.map((slot) => ({ ...slot, is_active: false })));
  };

  const selectBusinessHours = () => {
    // Select slots from 08:00 to 18:00
    setTimeSlots(
      timeSlots.map((slot) => {
        const [hour] = slot.time_slot.split(":").map(Number);
        return {
          ...slot,
          is_active: hour >= 8 && hour < 18,
        };
      })
    );
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
        <TopNav />
        <main className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Carregando...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <TopNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Horários de Agendamento
          </h2>
          <p className="text-muted-foreground">
            Selecione os horários que aparecerão para os clientes no link de agendamento
          </p>
        </div>

        <Card className="p-6 border-border/50 shadow-lg mb-6">
          <div className="flex flex-wrap gap-4 mb-6">
            <Button onClick={selectAll} variant="outline" className="gap-2">
              <Clock className="w-4 h-4" />
              Selecionar Todos
            </Button>
            <Button onClick={deselectAll} variant="outline" className="gap-2">
              <Clock className="w-4 h-4" />
              Desmarcar Todos
            </Button>
            <Button onClick={selectBusinessHours} variant="outline" className="gap-2">
              <Clock className="w-4 h-4" />
              Horário Comercial (8h-18h)
            </Button>
            <Button onClick={handleSave} className="gap-2 ml-auto">
              <Save className="w-4 h-4" />
              Salvar Configurações
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {timeSlots.map((slot, index) => (
              <div
                key={slot.time_slot}
                className="flex items-center space-x-2 p-3 rounded-lg border border-border/50 hover:border-primary/50 transition-colors"
              >
                <Checkbox
                  id={`slot-${index}`}
                  checked={slot.is_active}
                  onCheckedChange={() => toggleTimeSlot(index)}
                />
                <label
                  htmlFor={`slot-${index}`}
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  {slot.time_slot}
                </label>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 border-border/50 shadow-lg bg-muted/30">
          <div className="flex items-start gap-4">
            <Clock className="w-6 h-6 text-primary mt-1" />
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Como funciona?
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Selecione os horários que deseja disponibilizar para agendamento</li>
                <li>Os clientes só verão os horários marcados aqui</li>
                <li>Os horários bloqueados e já agendados não aparecerão</li>
                <li>Esta configuração se aplica a todos os dias da semana</li>
              </ul>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default HorariosAgendamento;
