import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Calendar, Users, Briefcase, DollarSign, LogOut, Settings, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const TopNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Você saiu da sua conta com sucesso.",
    });
    navigate("/auth");
  };

  const navItems = [
    { path: "/", label: "Agenda", icon: Calendar },
    { path: "/clientes", label: "Clientes", icon: Users },
    { path: "/servicos", label: "Serviços", icon: Briefcase },
    { path: "/financeiro", label: "Financeiro", icon: DollarSign },
  ];

  return (
    <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">Agenda Lash</h1>
            </Link>

            <nav className="hidden md:flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "gap-2",
                        isActive && "shadow-sm"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 bg-card">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Notificações</h3>
                    <Button variant="ghost" size="sm" className="text-xs">
                      Marcar todas como lidas
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer">
                      <p className="text-sm text-foreground font-medium">
                        Novo agendamento
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Você tem um novo agendamento para amanhã às 14h
                      </p>
                    </div>
                    <div className="p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                      <p className="text-sm text-foreground font-medium">
                        Lembrete
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Confirmar agendamento de hoje às 10h
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => navigate("/notificacoes")}>
                    Ver todas as notificações
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card">
                <DropdownMenuItem onClick={() => navigate("/configuracoes")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <nav className="md:hidden grid grid-cols-2 gap-2 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-2 w-full",
                    isActive && "shadow-sm"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default TopNav;
