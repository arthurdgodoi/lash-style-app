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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const blockSlotSchema = z.object({
  blocked_time: z.string().optional(),
  is_full_day: z.boolean(),
  reason: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
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
  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate);

  const form = useForm<BlockSlotFormValues>({
    resolver: zodResolver(blockSlotSchema),
    defaultValues: {
      blocked_time: defaultTime || "",
      is_full_day: !defaultTime,
      reason: "",
      start_time: defaultTime || "",
      end_time: "",
    },
  });

  const isFullDay = form.watch("is_full_day");
  const hasDefaultTime = !!defaultTime;

  const onSubmit = async (values: BlockSlotFormValues) => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Se for um período, criar bloqueios para cada hora
      if (hasDefaultTime && values.start_time && values.end_time) {
        const [startHour] = values.start_time.split(":").map(Number);
        const [endHour] = values.end_time.split(":").map(Number);
        
        if (startHour >= endHour) {
          toast.error("O horário de término deve ser após o horário de início");
          return;
        }

        const blocksToInsert = [];
        for (let hour = startHour; hour < endHour; hour++) {
          blocksToInsert.push({
            user_id: user.id,
            blocked_date: format(selectedDate, "yyyy-MM-dd"),
            blocked_time: `${hour.toString().padStart(2, "0")}:00`,
            is_full_day: false,
            reason: values.reason || null,
          });
        }

        const { error } = await supabase.from("blocked_slots").insert(blocksToInsert);
        if (error) throw error;

        toast.success(`Período bloqueado com sucesso! (${blocksToInsert.length} horários)`);
      } else {
        // Bloquear horário único ou dia inteiro
        const { error } = await supabase.from("blocked_slots").insert({
          user_id: user.id,
          blocked_date: format(selectedDate, "yyyy-MM-dd"),
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
      }

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
            <div className="space-y-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "dd/MM/yyyy") : <span>Selecione uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
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
                      disabled={hasDefaultTime}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {!isFullDay && !hasDefaultTime && (
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

            {hasDefaultTime && !isFullDay && (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Bloquear período</p>
                  <p className="text-xs text-muted-foreground">
                    Defina o horário de início e fim para bloquear múltiplos horários
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Horário Início</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: 07:00"
                            type="time"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="end_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Horário Fim</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: 11:00"
                            type="time"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
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
