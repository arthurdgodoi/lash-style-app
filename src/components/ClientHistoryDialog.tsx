import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, DollarSign, Scissors } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClientHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: any;
}

export const ClientHistoryDialog = ({ open, onOpenChange, client }: ClientHistoryDialogProps) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && client) {
      fetchClientHistory();
    }
  }, [open, client]);

  const fetchClientHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, services(name)")
        .eq("client_id", client.id)
        .order("appointment_date", { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  const totalSpent = appointments.reduce((sum, apt) => sum + parseFloat(apt.price.toString()), 0);

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico - {client.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do cliente */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Cliente desde</p>
                  <p className="font-medium">{formatDate(client.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total gasto</p>
                  <p className="font-medium text-green-600">R$ {totalSpent.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Atendimentos</p>
                  <p className="font-medium">{appointments.length}</p>
                </div>
                {client.birth_date && (
                  <div>
                    <p className="text-muted-foreground">Data de nascimento</p>
                    <p className="font-medium">{formatDate(client.birth_date)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Histórico de atendimentos */}
          <div>
            <h3 className="font-semibold mb-3">Histórico de Atendimentos</h3>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : appointments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum atendimento registrado
              </p>
            ) : (
              <div className="space-y-3">
                {appointments.map((apt) => (
                  <Card key={apt.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Scissors className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {(apt.services as any)?.name || "Serviço"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {formatDate(apt.appointment_date)} às {apt.appointment_time}
                            </span>
                          </div>
                          {apt.notes && (
                            <p className="text-sm text-muted-foreground">{apt.notes}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                apt.status === "completed"
                                  ? "bg-green-100 text-green-700"
                                  : apt.status === "cancelled"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {apt.status === "completed"
                                ? "Concluído"
                                : apt.status === "cancelled"
                                ? "Cancelado"
                                : "Agendado"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-green-600 font-semibold">
                          <DollarSign className="h-4 w-4" />
                          <span>R$ {parseFloat(apt.price.toString()).toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
