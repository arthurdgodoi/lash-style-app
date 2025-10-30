import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EXPORT-USER-DATA] ${step}${detailsStr}`);
};

// Função para converter objeto em XML
const toXML = (obj: any, rootName: string = 'root'): string => {
  const escape = (str: string) => {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const convert = (data: any, name: string, indent: string = ''): string => {
    if (data === null || data === undefined) {
      return `${indent}<${name} />\n`;
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return `${indent}<${name} />\n`;
      }
      return data.map(item => convert(item, name.replace(/s$/, ''), indent)).join('');
    }

    if (typeof data === 'object') {
      const entries = Object.entries(data);
      if (entries.length === 0) {
        return `${indent}<${name} />\n`;
      }
      
      let xml = `${indent}<${name}>\n`;
      for (const [key, value] of entries) {
        xml += convert(value, key, indent + '  ');
      }
      xml += `${indent}</${name}>\n`;
      return xml;
    }

    return `${indent}<${name}>${escape(String(data))}</${name}>\n`;
  };

  return `<?xml version="1.0" encoding="UTF-8"?>\n${convert(obj, rootName)}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    
    logStep("User authenticated", { userId: user.id });

    // Buscar perfil
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Buscar clientes
    const { data: clients } = await supabaseClient
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null);

    // Buscar serviços
    const { data: services } = await supabaseClient
      .from("services")
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null);

    // Buscar agendamentos dos últimos 6 meses
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const { data: appointments } = await supabaseClient
      .from("appointments")
      .select(`
        *,
        clients(name, phone, email),
        services(name, duration_minutes)
      `)
      .eq("user_id", user.id)
      .gte("appointment_date", sixMonthsAgo.toISOString().split('T')[0])
      .is("deleted_at", null);

    // Buscar despesas
    const { data: expenses } = await supabaseClient
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null);

    // Buscar horários de trabalho
    const { data: workingHours } = await supabaseClient
      .from("working_hours")
      .select("*")
      .eq("user_id", user.id);

    // Buscar horários de agendamento
    const { data: bookingTimeSlots } = await supabaseClient
      .from("booking_time_slots")
      .select("*")
      .eq("user_id", user.id);

    const exportData = {
      exported_at: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
      },
      profile,
      clients: clients || [],
      services: services || [],
      appointments: appointments || [],
      expenses: expenses || [],
      working_hours: workingHours || [],
      booking_time_slots: bookingTimeSlots || [],
    };

    logStep("Export completed", { 
      clients: clients?.length || 0,
      services: services?.length || 0,
      appointments: appointments?.length || 0,
      expenses: expenses?.length || 0
    });

    const xmlData = toXML(exportData, 'user_data');

    return new Response(xmlData, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/xml",
        "Content-Disposition": `attachment; filename="meus-dados-${new Date().toISOString().split('T')[0]}.xml"`
      },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
