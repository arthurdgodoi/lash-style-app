import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Briefcase, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TopNav from "@/components/TopNav";
import ServiceDialog from "@/components/ServiceDialog";

const Servicos = () => {
  const [user, setUser] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

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
      fetchServices();
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

  const fetchServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este serviço?")) return;

    try {
      const { error } = await supabase.from("services").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Serviço excluído com sucesso",
      });

      fetchServices();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (service: any) => {
    setSelectedService(service);
    setDialogOpen(true);
  };

  const handleNewService = () => {
    setSelectedService(null);
    setDialogOpen(true);
  };

  const getPriceModeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      fixed: "Fixo",
      free: "Livre",
      range: "Faixa",
    };
    return labels[mode] || mode;
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <TopNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Serviços</h2>
            <p className="text-muted-foreground">
              Configure os serviços que você oferece
            </p>
          </div>
          <Button onClick={handleNewService}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Serviço
          </Button>
        </div>

        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Carregando serviços...</p>
          </Card>
        ) : services.length === 0 ? (
          <Card className="p-8 border-border/50 shadow-lg text-center">
            <div className="max-w-md mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <Briefcase className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Nenhum serviço cadastrado
              </h3>
              <p className="text-muted-foreground mb-6">
                Comece criando seu primeiro serviço.
              </p>
              <Button onClick={handleNewService}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Serviço
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <Card key={service.id} className="p-6 border-border/50 shadow-lg">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {service.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{service.duration_minutes} min</span>
                      <span>•</span>
                      <span>{getPriceModeLabel(service.price_mode)}</span>
                    </div>
                  </div>
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      service.is_active
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {service.is_active ? "Ativo" : "Inativo"}
                  </div>
                </div>

                {service.suggested_price && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground">Valor sugerido:</p>
                    <p className="text-xl font-bold text-foreground">
                      R$ {Number(service.suggested_price).toFixed(2)}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(service)}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(service.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <ServiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchServices}
        service={selectedService}
      />
    </div>
  );
};

export default Servicos;
