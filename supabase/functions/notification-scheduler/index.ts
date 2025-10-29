import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Appointment {
  id: string;
  user_id: string;
  client_id: string;
  appointment_date: string;
  appointment_time: string;
}

interface Client {
  name: string;
}

interface WorkingHours {
  day_of_week: number;
  is_active: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting notification scheduler...');

    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Calculate time 16 hours from now
    const sixteenHoursLater = new Date(now.getTime() + 16 * 60 * 60 * 1000);
    const targetDate = sixteenHoursLater.toISOString().split('T')[0];
    const targetTimeStart = sixteenHoursLater.toTimeString().split(' ')[0].substring(0, 5);
    const targetTimeEnd = new Date(sixteenHoursLater.getTime() + 60 * 60 * 1000).toTimeString().split(' ')[0].substring(0, 5);

    console.log(`Looking for appointments on ${targetDate} between ${targetTimeStart} and ${targetTimeEnd}`);

    // Get all appointments that are 16 hours away
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id, user_id, client_id, appointment_date, appointment_time')
      .eq('appointment_date', targetDate)
      .gte('appointment_time', targetTimeStart)
      .lte('appointment_time', targetTimeEnd)
      .eq('status', 'scheduled');

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError);
      throw appointmentsError;
    }

    console.log(`Found ${appointments?.length || 0} appointments`);

    // Create notifications for appointments 16 hours away
    if (appointments && appointments.length > 0) {
      for (const appointment of appointments) {
        // Get client name
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('name')
          .eq('id', appointment.client_id)
          .single();

        if (clientError) {
          console.error('Error fetching client:', clientError);
          continue;
        }

        // Check if notification already exists to avoid duplicates
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', appointment.user_id)
          .eq('title', 'Confirme o horário')
          .ilike('message', `%${client.name}%`)
          .eq('created_at', now.toISOString().split('T')[0]);

        if (!existingNotification || existingNotification.length === 0) {
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: appointment.user_id,
              title: 'Confirme o horário',
              message: `Confirme o horário de ${client.name} marcado para ${appointment.appointment_date} às ${appointment.appointment_time}`,
              is_read: false
            });

          if (notificationError) {
            console.error('Error creating notification:', notificationError);
          } else {
            console.log(`Created notification for appointment ${appointment.id}`);
          }
        }
      }
    }

    // Create morning notifications at 7 AM on working days
    if (currentHour === 7) {
      console.log('Checking for morning notifications...');

      // Get all users
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw usersError;
      }

      console.log(`Found ${users?.length || 0} users`);

      if (users && users.length > 0) {
        for (const user of users) {
          // Check if today is a working day for this user
          const { data: workingHours, error: workingHoursError } = await supabase
            .from('working_hours')
            .select('day_of_week, is_active')
            .eq('user_id', user.id)
            .eq('day_of_week', currentDay)
            .eq('is_active', true);

          if (workingHoursError) {
            console.error('Error fetching working hours:', workingHoursError);
            continue;
          }

          if (workingHours && workingHours.length > 0) {
            // Get today's appointments count
            const todayDate = now.toISOString().split('T')[0];
            const { data: todayAppointments, error: todayAppointmentsError } = await supabase
              .from('appointments')
              .select('id')
              .eq('user_id', user.id)
              .eq('appointment_date', todayDate)
              .eq('status', 'scheduled');

            if (todayAppointmentsError) {
              console.error('Error fetching today appointments:', todayAppointmentsError);
              continue;
            }

            const appointmentCount = todayAppointments?.length || 0;

            // Check if notification already exists today
            const { data: existingMorningNotification } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', user.id)
              .eq('title', 'Bom dia! ☀️')
              .gte('created_at', todayDate);

            if (!existingMorningNotification || existingMorningNotification.length === 0) {
              const message = appointmentCount > 0
                ? `Você tem ${appointmentCount} atendimento${appointmentCount > 1 ? 's' : ''} agendado${appointmentCount > 1 ? 's' : ''} para hoje.`
                : 'Você não tem atendimentos agendados para hoje.';

              const { error: morningNotificationError } = await supabase
                .from('notifications')
                .insert({
                  user_id: user.id,
                  title: 'Bom dia! ☀️',
                  message: message,
                  is_read: false
                });

              if (morningNotificationError) {
                console.error('Error creating morning notification:', morningNotificationError);
              } else {
                console.log(`Created morning notification for user ${user.id}`);
              }
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notifications processed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in notification-scheduler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
