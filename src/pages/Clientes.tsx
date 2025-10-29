import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Plus, Pencil, Trash2, Mail, Phone, Calendar, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import ClientDialog from "@/components/ClientDialog";
import { ClientHistoryDialog } from "@/components/ClientHistoryDialog";

const Clientes = () => {
  const [user, setUser] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyClient, setHistoryClient] = useState<any>(null);
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
      fetchClients();
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

  const fetchClients = async () => {
    setLoading(true);
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setClients(data || []);
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
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

    try {
      const { error } = await supabase.from("clients").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cliente excluído com sucesso",
      });

      fetchClients();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (client: any) => {
    setSelectedClient(client);
    setDialogOpen(true);
  };

  const handleNewClient = () => {
    setSelectedClient(null);
    setDialogOpen(true);
  };

  const handleViewHistory = (client: any) => {
    setHistoryClient(client);
    setHistoryDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background pb-20 md:pb-0">
      <TopNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Clientes</h2>
            <p className="text-muted-foreground">
              Gerencie sua carteira de clientes
            </p>
          </div>
          <Button onClick={handleNewClient}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Cliente
          </Button>
        </div>

        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Carregando clientes...</p>
          </Card>
        ) : clients.length === 0 ? (
          <Card className="p-8 border-border/50 shadow-lg text-center">
            <div className="max-w-md mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Nenhum cliente cadastrado
              </h3>
              <p className="text-muted-foreground mb-6">
                Comece criando seu primeiro cliente.
              </p>
              <Button onClick={handleNewClient}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Cliente
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <Card 
                key={client.id} 
                className="p-6 border-border/50 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
                onClick={() => handleViewHistory(client)}
              >
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    {client.name}
                  </h3>
                  
                  <div className="space-y-2">
                    {client.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    
                    {client.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    
                    {client.birth_date && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(client.birth_date)}</span>
                      </div>
                    )}
                    
                    {client.notes && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <FileText className="w-4 h-4 mt-0.5" />
                        <span className="line-clamp-2">{client.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(client);
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(client.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <ClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchClients}
        client={selectedClient}
      />

      <ClientHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        client={historyClient}
      />
      
      <BottomNav />
    </div>
  );
};

export default Clientes;
