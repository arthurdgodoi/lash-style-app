import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const ModelosMensagem = () => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [scheduledMessage, setScheduledMessage] = useState("");
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [reminderMessage, setReminderMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const variables = [
    { label: "Nome da cliente", value: "{nome_cliente}" },
    { label: "Nome da profissional", value: "{nome_profissional}" },
    { label: "Horário do agendamento", value: "{horario_agendamento}" },
    { label: "Chave Pix", value: "{chave_pix}" },
    { label: "Valor", value: "{valor}" },
    { label: "Localização", value: "{localizacao}" },
  ];

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
      await loadTemplates(session.user.id);
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadTemplates(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadTemplates = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;

      if (data) {
        data.forEach((template) => {
          if (template.template_type === "scheduled") {
            setScheduledMessage(template.message);
          } else if (template.template_type === "confirmation") {
            setConfirmationMessage(template.message);
          } else if (template.template_type === "reminder") {
            setReminderMessage(template.message);
          }
        });
      }
    } catch (error) {
      console.error("Error loading templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (templateType: string, message: string) => {
    if (!user) return;

    try {
      setLoading(true);
      
      if (message.trim()) {
        await supabase
          .from("message_templates")
          .upsert(
            {
              user_id: user.id,
              template_type: templateType,
              message: message,
            },
            { onConflict: "user_id,template_type" }
          );
      }

      toast({
        title: "Mensagem salva",
        description: "Seu modelo de mensagem foi salvo com sucesso.",
      });
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar seu modelo de mensagem.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background pb-20 md:pb-0">
      <TopNav />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Modelos de Mensagem</h2>
          <p className="text-muted-foreground">
            Configure mensagens automáticas para seus clientes
          </p>
        </div>

        <Card className="border-border/50 shadow-lg mb-6">
          <CardHeader className="bg-muted/30">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <CardTitle className="text-base md:text-lg">Variáveis Disponíveis</CardTitle>
                <CardDescription>
                  Use estas variáveis em suas mensagens. Elas serão substituídas automaticamente pelos dados reais.
                  <br />
                  <strong>Importante:</strong> Os valores de Nome da profissional, Localização e Chave Pix são preenchidos no seu perfil.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {variables.map((variable) => (
                <Badge 
                  key={variable.value} 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-secondary/80 transition-colors"
                  onClick={() => navigator.clipboard.writeText(variable.value)}
                >
                  {variable.label}: <code className="ml-1">{variable.value}</code>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle>Horário Agendado</CardTitle>
              <CardDescription>
                Mensagem enviada imediatamente após o agendamento ser confirmado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="scheduled">Mensagem</Label>
                <Textarea
                  id="scheduled"
                  placeholder="Ex: Olá {nome_cliente}! Seu horário foi agendado com {nome_profissional} para {horario_agendamento}. Localização: {localizacao}"
                  value={scheduledMessage}
                  onChange={(e) => setScheduledMessage(e.target.value)}
                  className="mt-2 min-h-[120px]"
                />
              </div>
              <div className="flex justify-end">
                <Button 
                  onClick={() => handleSaveTemplate("scheduled", scheduledMessage)}
                  disabled={loading}
                >
                  {loading ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle>Confirmação de horário - 1 dia antes</CardTitle>
              <CardDescription>
                Mensagem enviada um dia antes do agendamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="confirmation">Mensagem</Label>
                <Textarea
                  id="confirmation"
                  placeholder="Ex: Olá {nome_cliente}! Lembramos que seu horário com {nome_profissional} está marcado para amanhã às {horario_agendamento}."
                  value={confirmationMessage}
                  onChange={(e) => setConfirmationMessage(e.target.value)}
                  className="mt-2 min-h-[120px]"
                />
              </div>
              <div className="flex justify-end">
                <Button 
                  onClick={() => handleSaveTemplate("confirmation", confirmationMessage)}
                  disabled={loading}
                >
                  {loading ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle>Lembrete de horário - dia do agendamento</CardTitle>
              <CardDescription>
                Mensagem enviada no dia do agendamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="reminder">Mensagem</Label>
                <Textarea
                  id="reminder"
                  placeholder="Ex: Olá {nome_cliente}! Hoje é o dia do seu horário com {nome_profissional} às {horario_agendamento}. Valor: {valor}. Chave Pix: {chave_pix}"
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                  className="mt-2 min-h-[120px]"
                />
              </div>
              <div className="flex justify-end">
                <Button 
                  onClick={() => handleSaveTemplate("reminder", reminderMessage)}
                  disabled={loading}
                >
                  {loading ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
};

export default ModelosMensagem;
