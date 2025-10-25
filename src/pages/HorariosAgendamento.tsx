import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import TopNav from "@/components/TopNav";
import { toast } from "sonner";
import { Clock, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface BookingTimeSlot {
  id: string;
  time_slot: string;
  is_active: boolean;
}

const HorariosAgendamento = () => {
  const [user, setUser] = useState<any>(null);
  const [timeSlots, setTimeSlots] = useState<BookingTimeSlot[]>([]);
  const [newTimeSlot, setNewTimeSlot] = useState("");
  const [loading, setLoading] = useState(true);
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
      fetchTimeSlots(session.user.id);
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchTimeSlots(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchTimeSlots = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("booking_time_slots")
      .select("*")
      .eq("user_id", userId)
      .order("time_slot", { ascending: true });

    if (error) {
      console.error("Error fetching time slots:", error);
      toast.error("Erro ao carregar horários");
    } else {
      setTimeSlots(data || []);
    }
    setLoading(false);
  };

  const handleAddTimeSlot = async () => {
    if (!newTimeSlot || !user) return;

    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(newTimeSlot)) {
      toast.error("Formato de horário inválido. Use HH:MM (ex: 09:00)");
      return;
    }

    const { error } = await supabase
      .from("booking_time_slots")
      .insert({
        user_id: user.id,
        time_slot: newTimeSlot,
        is_active: true,
      });

    if (error) {
      if (error.code === "23505") {
        toast.error("Este horário já foi adicionado");
      } else {
        toast.error("Erro ao adicionar horário");
      }
      console.error("Error adding time slot:", error);
    } else {
      toast.success("Horário adicionado com sucesso!");
      setNewTimeSlot("");
      fetchTimeSlots(user.id);
    }
  };

  const handleToggleActive = async (slotId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("booking_time_slots")
      .update({ is_active: !currentStatus })
      .eq("id", slotId);

    if (error) {
      toast.error("Erro ao atualizar horário");
      console.error("Error updating time slot:", error);
    } else {
      toast.success("Horário atualizado!");
      if (user) fetchTimeSlots(user.id);
    }
  };

  const handleDeleteTimeSlot = async (slotId: string) => {
    const { error } = await supabase
      .from("booking_time_slots")
      .delete()
      .eq("id", slotId);

    if (error) {
      toast.error("Erro ao excluir horário");
      console.error("Error deleting time slot:", error);
    } else {
      toast.success("Horário excluído!");
      if (user) fetchTimeSlots(user.id);
    }
  };

  const generateQuickSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 18; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      if (hour < 18) {
        slots.push(`${hour.toString().padStart(2, "0")}:30`);
      }
    }
    return slots;
  };

  const handleAddQuickSlots = async () => {
    if (!user) return;

    const quickSlots = generateQuickSlots();
    const existingTimes = timeSlots.map(slot => slot.time_slot);
    const newSlots = quickSlots.filter(time => !existingTimes.includes(time));

    if (newSlots.length === 0) {
      toast.info("Todos os horários já foram adicionados");
      return;
    }

    const { error } = await supabase
      .from("booking_time_slots")
      .insert(
        newSlots.map(time => ({
          user_id: user.id,
          time_slot: time,
          is_active: true,
        }))
      );

    if (error) {
      toast.error("Erro ao adicionar horários");
      console.error("Error adding quick slots:", error);
    } else {
      toast.success(`${newSlots.length} horários adicionados!`);
      fetchTimeSlots(user.id);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background overflow-x-hidden">
      <TopNav />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-5xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Horários de Agendamento
          </h2>
          <p className="text-muted-foreground">
            Configure os horários que ficarão disponíveis para seus clientes agendarem
          </p>
        </div>

        <div className="grid gap-6">
          <Card className="p-6 border-border/50 shadow-lg">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Adicionar Horário
            </h3>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="time"
                  value={newTimeSlot}
                  onChange={(e) => setNewTimeSlot(e.target.value)}
                  placeholder="09:00"
                  className="flex-1"
                />
                <Button onClick={handleAddTimeSlot} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar
                </Button>
              </div>

              <div className="pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={handleAddQuickSlots}
                  className="w-full"
                >
                  Adicionar horários padrão (08:00 às 18:00, a cada 30 min)
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border/50 shadow-lg">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Horários Configurados ({timeSlots.length})
            </h3>

            {loading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : timeSlots.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Nenhum horário configurado ainda
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Adicione horários para que seus clientes possam agendar
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {timeSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <span className="text-lg font-medium text-foreground">
                        {slot.time_slot.substring(0, 5)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={slot.is_active}
                          onCheckedChange={() =>
                            handleToggleActive(slot.id, slot.is_active)
                          }
                        />
                        <Label className="text-sm text-muted-foreground">
                          {slot.is_active ? "Ativo" : "Inativo"}
                        </Label>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTimeSlot(slot.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default HorariosAgendamento;
