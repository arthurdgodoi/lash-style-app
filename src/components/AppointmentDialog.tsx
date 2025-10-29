import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CalendarIcon, Plus, Check } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import ClientDialog from "./ClientDialog";
import ServiceDialog from "./ServiceDialog";

const appointmentSchema = z.object({
  client_id: z.string().min(1, { message: "Selecione um cliente" }),
  service_id: z.string().min(1, { message: "Selecione um procedimento" }),
  appointment_date: z.date({ required_error: "Selecione uma data" }),
  appointment_time: z.string().min(1, { message: "Digite o horário" }),
  price: z.string().min(1, { message: "Digite o valor" }),
  include_salon_percentage: z.boolean().default(false),
  salon_percentage: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    if (data.include_salon_percentage) {
      return data.salon_percentage && parseFloat(data.salon_percentage) > 0 && parseFloat(data.salon_percentage) <= 100;
    }
    return true;
  },
  {
    message: "Digite uma porcentagem válida entre 0 e 100",
    path: ["salon_percentage"],
  }
);

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultTime?: string;
  defaultDate?: Date;
  appointmentId?: string | null;
}

export const AppointmentDialog = ({
  open,
  onOpenChange,
  onSuccess,
  defaultTime,
  defaultDate,
  appointmentId,
}: AppointmentDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [includeSalonPercentage, setIncludeSalonPercentage] = useState(false);

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      client_id: "",
      service_id: "",
      appointment_time: "",
      price: "",
      include_salon_percentage: false,
      salon_percentage: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      fetchClients();
      fetchServices();
      setIncludeSalonPercentage(false);
      
      if (appointmentId) {
        // Load appointment data for editing
        fetchAppointmentData(appointmentId);
      } else {
        // Reset form for new appointment
        form.reset({
          client_id: "",
          service_id: "",
          appointment_time: defaultTime || "",
          appointment_date: defaultDate || new Date(),
          price: "",
          include_salon_percentage: false,
          salon_percentage: "",
          notes: "",
        });
        if (defaultTime) {
          form.setValue("appointment_time", defaultTime);
        }
        if (defaultDate) {
          form.setValue("appointment_date", defaultDate);
        }
      }
    }
  }, [open, defaultTime, defaultDate, appointmentId]);

  useEffect(() => {
    if (clientSearch) {
      fetchClients(clientSearch);
    }
  }, [clientSearch]);

  const fetchClients = async (search?: string) => {
    try {
      let query = supabase
        .from("clients")
        .select("*")
        .order("name");

      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  };

  const fetchAppointmentData = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        form.reset({
          client_id: data.client_id,
          service_id: data.service_id,
          appointment_time: data.appointment_time,
          appointment_date: new Date(data.appointment_date),
          price: data.price.toString(),
          include_salon_percentage: data.include_salon_percentage || false,
          salon_percentage: data.salon_percentage?.toString() || "",
          notes: data.notes || "",
        });
        setIncludeSalonPercentage(data.include_salon_percentage || false);
      }
    } catch (error) {
      console.error("Error fetching appointment:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do agendamento",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (values: AppointmentFormValues) => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const appointmentData = {
        user_id: user.id,
        client_id: values.client_id,
        service_id: values.service_id,
        appointment_date: format(values.appointment_date, "yyyy-MM-dd"),
        appointment_time: values.appointment_time,
        price: parseFloat(values.price),
        include_salon_percentage: values.include_salon_percentage,
        salon_percentage: values.include_salon_percentage && values.salon_percentage 
          ? parseFloat(values.salon_percentage) 
          : null,
        notes: values.notes || null,
      };

      let error;
      if (appointmentId) {
        // Update existing appointment
        const result = await supabase
          .from("appointments")
          .update(appointmentData)
          .eq("id", appointmentId);
        error = result.error;
      } else {
        // Create new appointment
        const result = await supabase
          .from("appointments")
          .insert(appointmentData);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: appointmentId 
          ? "Agendamento atualizado com sucesso." 
          : "Agendamento criado com sucesso.",
      });

      form.reset();
      onSuccess();
      onOpenChange(false);
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

  const handleClientDialogSuccess = () => {
    setShowClientDialog(false);
    fetchClients();
  };

  const handleServiceDialogSuccess = () => {
    setShowServiceDialog(false);
    fetchServices();
  };

  const handleCancelAppointment = async () => {
    if (!appointmentId) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointmentId);
        
      if (error) throw error;
      
      toast({
        title: "Sucesso!",
        description: "Agendamento cancelado com sucesso.",
      });
      
      onSuccess();
      onOpenChange(false);
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{appointmentId ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Cliente</FormLabel>
                    <div className="flex gap-2">
                      <Popover open={clientOpen} onOpenChange={setClientOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "flex-1 justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? clients.find((client) => client.id === field.value)?.name
                                : "Selecione um cliente"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                          <Command>
                            <CommandInput
                              placeholder="Buscar cliente..."
                              value={clientSearch}
                              onValueChange={setClientSearch}
                            />
                            <CommandList>
                              <CommandEmpty>
                                Nenhum cliente encontrado.
                              </CommandEmpty>
                              <CommandGroup>
                                {clients.map((client) => (
                                  <CommandItem
                                    key={client.id}
                                    value={client.name}
                                    onSelect={() => {
                                      form.setValue("client_id", client.id);
                                      setClientOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        client.id === field.value
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {client.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowClientDialog(true)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="appointment_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-auto p-0" 
                        align="start"
                        sideOffset={5}
                        alignOffset={-10}
                      >
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="appointment_time"
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

              <FormField
                control={form.control}
                name="service_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Procedimento</FormLabel>
                    <div className="flex gap-2">
                      <Popover open={serviceOpen} onOpenChange={setServiceOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "flex-1 justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? services.find((service) => service.id === field.value)?.name
                                : "Selecione um procedimento"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar procedimento..." />
                          <CommandList>
                            <CommandEmpty>
                              Nenhum procedimento encontrado.
                            </CommandEmpty>
                            <CommandGroup>
                              {services.map((service) => (
                                <CommandItem
                                  key={service.id}
                                  value={service.name}
                                  onSelect={() => {
                                    form.setValue("service_id", service.id);
                                    if (service.suggested_price) {
                                      form.setValue("price", service.suggested_price.toString());
                                    }
                                    setServiceOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      service.id === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>{service.name}</span>
                                    {service.suggested_price && (
                                      <span className="text-xs text-muted-foreground">
                                        R$ {service.suggested_price}
                                      </span>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowServiceDialog(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 150.00"
                        type="number"
                        step="0.01"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="include_salon_percentage"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Incluir porcentagem do salão</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          setIncludeSalonPercentage(checked);
                          if (!checked) {
                            form.setValue("salon_percentage", "");
                          }
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {includeSalonPercentage && (
                <FormField
                  control={form.control}
                  name="salon_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Porcentagem do Salão (%)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: 30"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ex: técnica usada, materiais..."
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
                  Fechar
                </Button>
                {appointmentId && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleCancelAppointment}
                    disabled={loading}
                  >
                    Cancelar Agendamento
                  </Button>
                )}
                <Button type="submit" disabled={loading}>
                  {loading ? "Salvando..." : appointmentId ? "Salvar Alterações" : "Criar Agendamento"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ClientDialog
        open={showClientDialog}
        onOpenChange={setShowClientDialog}
        onSuccess={handleClientDialogSuccess}
      />

      <ServiceDialog
        open={showServiceDialog}
        onOpenChange={setShowServiceDialog}
        onSuccess={handleServiceDialogSuccess}
      />
    </>
  );
};
