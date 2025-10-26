import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import TopNav from "@/components/TopNav";
import ExpenseDialog from "@/components/ExpenseDialog";
import { toast } from "sonner";

type FilterType = "today" | "week" | "month" | "custom";

interface Transaction {
  id: string;
  type: "income" | "expense";
  description: string;
  amount: number;
  date: string;
  isFixed?: boolean;
}

const Financeiro = () => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<FilterType>("month");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const getDateRange = () => {
    const now = new Date();
    
    switch (filterType) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "week":
        return { start: startOfWeek(now, { locale: ptBR }), end: endOfWeek(now, { locale: ptBR }) };
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "custom":
        if (customStartDate && customEndDate) {
          return { start: startOfDay(customStartDate), end: endOfDay(customEndDate) };
        }
        return { start: startOfMonth(now), end: endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const fetchFinancialData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const startDate = format(start, "yyyy-MM-dd");
      const endDate = format(end, "yyyy-MM-dd");

      // Buscar agendamentos (receitas)
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select("*, clients(name), services(name)")
        .eq("user_id", user.id)
        .gte("appointment_date", startDate)
        .lte("appointment_date", endDate)
        .in("status", ["scheduled", "confirmed", "completed"]);

      if (appointmentsError) throw appointmentsError;

      // Buscar despesas
      const { data: expenses, error: expensesError } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .gte("payment_date", startDate)
        .lte("payment_date", endDate);

      if (expensesError) throw expensesError;

      // Processar receitas
      let revenue = 0;
      let salonPercentageTotal = 0;
      const incomeTransactions: Transaction[] = [];

      appointments?.forEach((apt) => {
        const price = parseFloat(apt.price.toString());
        revenue += price;

        if (apt.include_salon_percentage && apt.salon_percentage) {
          const salonAmount = (price * parseFloat(apt.salon_percentage.toString())) / 100;
          salonPercentageTotal += salonAmount;
        }

        incomeTransactions.push({
          id: apt.id,
          type: "income",
          description: `${(apt.services as any)?.name || "Serviço"} - ${(apt.clients as any)?.name || "Cliente"}`,
          amount: price,
          date: apt.appointment_date,
        });
      });

      // Processar despesas
      let expensesTotal = salonPercentageTotal;
      const expenseTransactions: Transaction[] = [];

      // Adicionar porcentagem do salão como despesa
      if (salonPercentageTotal > 0) {
        expenseTransactions.push({
          id: "salon-percentage",
          type: "expense",
          description: "Porcentagem do Salão",
          amount: salonPercentageTotal,
          date: format(new Date(), "yyyy-MM-dd"),
        });
      }

      expenses?.forEach((exp) => {
        const amount = parseFloat(exp.amount.toString());
        expensesTotal += amount;

        expenseTransactions.push({
          id: exp.id,
          type: "expense",
          description: exp.description,
          amount: amount,
          date: exp.payment_date,
          isFixed: exp.is_fixed,
        });
      });

      // Combinar e ordenar transações
      const allTransactions = [...incomeTransactions, ...expenseTransactions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setTransactions(allTransactions);
      setTotalRevenue(revenue);
      setTotalExpenses(expensesTotal);
    } catch (error) {
      console.error("Erro ao buscar dados financeiros:", error);
      toast.error("Erro ao carregar dados financeiros");
    } finally {
      setLoading(false);
    }
  };

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
      fetchFinancialData();
    }
  }, [user, filterType, customStartDate, customEndDate]);

  if (!user) {
    return null;
  }

  const profit = totalRevenue - totalExpenses;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <TopNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Financeiro</h2>
          <p className="text-muted-foreground">
            Acompanhe seus ganhos e despesas
          </p>
        </div>

        {/* Filtros */}
        <Card className="mb-6 p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant={filterType === "today" ? "default" : "outline"}
                onClick={() => setFilterType("today")}
              >
                Hoje
              </Button>
              <Button
                variant={filterType === "week" ? "default" : "outline"}
                onClick={() => setFilterType("week")}
              >
                Semana
              </Button>
              <Button
                variant={filterType === "month" ? "default" : "outline"}
                onClick={() => setFilterType("month")}
              >
                Mês
              </Button>
              <Button
                variant={filterType === "custom" ? "default" : "outline"}
                onClick={() => setFilterType("custom")}
              >
                Personalizado
              </Button>
            </div>

            {filterType === "custom" && (
              <div className="flex flex-wrap gap-2 items-center justify-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? format(customStartDate, "dd/MM/yyyy") : "Data inicial"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                <span className="text-muted-foreground">até</span>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, "dd/MM/yyyy") : "Data final"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <Button onClick={() => setExpenseDialogOpen(true)} className="w-full max-w-xs">
              <Plus className="mr-2 h-4 w-4" />
              Nova Despesa
            </Button>
          </div>
        </Card>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receitas</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {totalRevenue.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                R$ {totalExpenses.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro</CardTitle>
              <DollarSign className={cn("h-4 w-4", profit >= 0 ? "text-green-600" : "text-red-600")} />
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", profit >= 0 ? "text-green-600" : "text-red-600")}>
                R$ {profit.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Extrato */}
        <Card>
          <CardHeader>
            <CardTitle>Extrato de Transações</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma transação encontrada no período selecionado
              </p>
            ) : (
              <div className="space-y-2">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {transaction.description}
                        {transaction.isFixed && (
                          <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            Fixa
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(transaction.date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "text-lg font-semibold",
                        transaction.type === "income" ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {transaction.type === "income" ? "+" : "-"} R$ {transaction.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <ExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        onSuccess={fetchFinancialData}
      />
    </div>
  );
};

export default Financeiro;
