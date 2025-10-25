import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

const blockSlotSchema = z.object({
  blocked_time: z.string().optional(),
  is_full_day: z.boolean(),
  reason: z.string().optional(),
});

type BlockSlotFormValues = z.infer<typeof blockSlotSchema>;

interface BlockSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultDate: Date;
  defaultTime?: string;
}

export const BlockSlotDialog = ({
  open,
  onOpenChange,
  onSuccess,
  defaultDate,
  defaultTime,
}: BlockSlotDialogProps) => {
  const [loading, setLoading] = useState(false);

  const form = useForm<BlockSlotFormValues>({
    resolver: zodResolver(blockSlotSchema),
    defaultValues: {
      blocked_time: defaultTime || "",
      is_full_day: !defaultTime,
      reason: "",
    },
  });

  const isFullDay = form.watch("is_full_day");

  const onSubmit = async (values: BlockSlotFormValues) => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { error } = await supabase.from("blocked_slots").insert({
        user_id: user.id,
        blocked_date: format(defaultDate, "yyyy-MM-dd"),
        blocked_time: values.is_full_day ? null : values.blocked_time || null,
        is_full_day: values.is_full_day,
        reason: values.reason || null,
      });

      if (error) throw error;

      toast.success(
        values.is_full_day 
          ? "Dia bloqueado com sucesso!" 
          : "Horário bloqueado com sucesso!"
      );

      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao bloquear: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bloquear Horário</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium text-foreground">
                Data: {format(defaultDate, "dd/MM/yyyy")}
              </p>
              {defaultTime && !isFullDay && (
                <p className="text-sm text-muted-foreground">
                  Horário: {defaultTime}
                </p>
              )}
            </div>

            <FormField
              control={form.control}
              name="is_full_day"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>Bloquear o dia inteiro</Label>
                    <p className="text-sm text-muted-foreground">
                      Desabilita todos os horários do dia
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {!isFullDay && (
              <FormField
                control={form.control}
                name="blocked_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 14:30"
                        type="time"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Compromisso pessoal, feriado..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Bloqueando..." : "Bloquear"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
