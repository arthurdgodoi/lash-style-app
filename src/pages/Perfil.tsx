import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, User, Phone, Mail, ArrowLeft, MapPin, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Perfil = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [professionalName, setProfessionalName] = useState("");
  const [location, setLocation] = useState("");
  const [pixKey, setPixKey] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile({ ...data, email: user.email });
      setProfessionalName(data?.professional_name || "");
      setLocation(data?.location || "");
      setPixKey(data?.pix_key || "");
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

  const handleSaveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          professional_name: professionalName,
          location: location,
          pix_key: pixKey,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });
      
      setIsEditing(false);
      fetchProfile();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Você saiu da sua conta com sucesso.",
    });
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <TopNav />
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <TopNav />
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Meu Perfil
              </CardTitle>
              <CardDescription>
                Informações da sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
                <p className="text-foreground">{profile?.full_name || "Não informado"}</p>
              </div>

              {profile?.email && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <p className="text-foreground">{profile.email}</p>
                </div>
              )}

              {profile?.phone && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Telefone
                  </label>
                  <p className="text-foreground">{profile.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Informações para Mensagens</span>
                {!isEditing && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    Editar
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                Essas informações serão usadas nos modelos de mensagem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="professional_name" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nome (usado nas mensagens)
                </Label>
                {isEditing ? (
                  <Input
                    id="professional_name"
                    value={professionalName}
                    onChange={(e) => setProfessionalName(e.target.value)}
                    placeholder="Digite seu nome profissional"
                  />
                ) : (
                  <p className="text-foreground">{professionalName || "Não informado"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Localização
                </Label>
                {isEditing ? (
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Digite sua localização"
                  />
                ) : (
                  <p className="text-foreground">{location || "Não informado"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pix_key" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Chave Pix
                </Label>
                {isEditing ? (
                  <Input
                    id="pix_key"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="Digite sua chave Pix"
                  />
                ) : (
                  <p className="text-foreground">{pixKey || "Não informado"}</p>
                )}
              </div>

              {isEditing && (
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile} className="flex-1">
                    Salvar
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsEditing(false);
                      setProfessionalName(profile?.professional_name || "");
                      setLocation(profile?.location || "");
                      setPixKey(profile?.pix_key || "");
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Segurança e Dados</CardTitle>
              <CardDescription>
                Faça backup dos seus dados regularmente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Exporte todos os seus dados (clientes, serviços, agendamentos, despesas) em formato JSON para backup.
              </p>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    toast({
                      title: "Exportando dados...",
                      description: "Aguarde enquanto preparamos seu arquivo",
                    });
                    
                    const { data, error } = await supabase.functions.invoke('export-user-data');
                    
                    if (error) throw error;
                    
                    // Create download link
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `meus-dados-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    
                    toast({
                      title: "Dados exportados",
                      description: "O arquivo foi baixado com sucesso",
                    });
                  } catch (error: any) {
                    toast({
                      title: "Erro ao exportar",
                      description: error.message,
                      variant: "destructive",
                    });
                  }
                }}
                className="w-full"
              >
                📥 Exportar Meus Dados
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={handleLogout}
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair da Conta
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};

export default Perfil;
