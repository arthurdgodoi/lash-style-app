import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, Banknote, QrCode, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  currentPrice: number;
  onSuccess?: () => void;
}

const CompletionDialog = ({
  open,
  onOpenChange,
  appointmentId,
  currentPrice,
  onSuccess,
}: CompletionDialogProps) => {
  const [price, setPrice] = useState(currentPrice.toString());
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPrice(currentPrice.toString());
  }, [currentPrice]);

  const handleComplete = async (isPending: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          status: "completed",
          price: parseFloat(price),
          payment_method: isPending ? null : paymentMethod,
          payment_status: isPending ? "pending" : "paid",
        })
        .eq("id", appointmentId);

      if (error) throw error;

      toast.success(isPending ? "Marcado como pagamento pendente" : "Atendimento concluído com sucesso!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao completar atendimento:", error);
      toast.error("Erro ao completar atendimento");
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { id: "money", label: "Dinheiro", icon: Banknote },
    { id: "card", label: "Cartão", icon: CreditCard },
    { id: "pix", label: "PIX", icon: QrCode },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Finalizar Atendimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="price">Valor Final</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label>Forma de Pagamento</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <Button
                    key={method.id}
                    variant="outline"
                    className={cn(
                      "flex flex-col h-20 gap-2",
                      paymentMethod === method.id && "border-primary bg-primary/10"
                    )}
                    onClick={() => setPaymentMethod(method.id)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{method.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button
              onClick={() => handleComplete(false)}
              disabled={!paymentMethod || loading}
              className="w-full"
            >
              {loading ? "Processando..." : "Confirmar Pagamento"}
            </Button>

            <Button
              variant="outline"
              onClick={() => handleComplete(true)}
              disabled={loading}
              className="w-full gap-2"
            >
              <Clock className="h-4 w-4" />
              Pagamento Pendente
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompletionDialog;
