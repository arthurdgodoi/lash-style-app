import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey || !webhookSecret) {
      throw new Error("Missing required environment variables");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });
    
    // Get the signature from headers
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No stripe-signature header found");
    }

    // Get raw body for signature verification
    const body = await req.text();
    logStep("Request body received", { bodyLength: body.length });

    // Initialize Supabase admin client for logging
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Helper function to log to billing_events table
    const logBillingEvent = async (
      eventType: string,
      stripeEventId: string,
      payload: any,
      userId?: string,
      error?: string
    ) => {
      try {
        await supabaseAdmin.from('billing_events').insert({
          user_id: userId || null,
          event_type: eventType,
          stripe_event_id: stripeEventId,
          payload: payload,
          error: error || null,
        });
        logStep('Billing event logged', { eventType, stripeEventId, userId });
      } catch (err) {
        logStep('ERROR logging to billing_events', { error: err });
      }
    };

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Signature verified", { eventType: event.type, eventId: event.id });
      
      // Log event to billing_events (we'll get user_id later in specific handlers)
      await logBillingEvent(event.type, event.id, event.data.object);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logStep("Signature verification failed", { error: errorMessage });
      return new Response(
        JSON.stringify({ error: `Webhook signature verification failed: ${errorMessage}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Process the event
    logStep("Processing event", { type: event.type });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completed", { 
          sessionId: session.id, 
          customerId: session.customer,
          subscriptionId: session.subscription 
        });

        if (session.mode === "subscription" && session.customer && session.subscription) {
          // Get customer email
          const customer = await stripe.customers.retrieve(session.customer as string);
          const email = (customer as Stripe.Customer).email;
          
          if (!email) {
            logStep("No email found for customer", { customerId: session.customer });
            break;
          }

          // Find user by email
          const { data: users, error: userError } = await supabaseClient.auth.admin.listUsers();
          if (userError) throw userError;
          
          const user = users.users.find(u => u.email === email);
          if (!user) {
            logStep("User not found", { email });
            break;
          }

          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const productId = subscription.items.data[0].price.product as string;

          // Find or create subscription plan
          const { data: plan } = await supabaseClient
            .from("subscription_plans")
            .select("id")
            .eq("stripe_product_id", productId)
            .single();

          if (!plan) {
            logStep("Subscription plan not found", { productId });
            break;
          }

          // Update or create user subscription
          const { error: upsertError } = await supabaseClient
            .from("user_subscriptions")
            .upsert({
              user_id: user.id,
              plan_id: plan.id,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              status: subscription.status as any,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              trial_ends_at: subscription.trial_end 
                ? new Date(subscription.trial_end * 1000).toISOString() 
                : null,
            }, {
              onConflict: "user_id"
            });

          if (upsertError) throw upsertError;
          logStep("Subscription created/updated in database", { userId: user.id });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription event", { 
          subscriptionId: subscription.id,
          status: subscription.status,
          customerId: subscription.customer 
        });

        // Get customer email
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        const email = (customer as Stripe.Customer).email;
        
        if (!email) {
          logStep("No email found for customer", { customerId: subscription.customer });
          break;
        }

        // Find user by email
        const { data: users, error: userError } = await supabaseClient.auth.admin.listUsers();
        if (userError) throw userError;
        
        const user = users.users.find(u => u.email === email);
        if (!user) {
          logStep("User not found", { email });
          break;
        }

        const productId = subscription.items.data[0].price.product as string;

        // Find subscription plan
        const { data: plan } = await supabaseClient
          .from("subscription_plans")
          .select("id")
          .eq("stripe_product_id", productId)
          .single();

        if (!plan) {
          logStep("Subscription plan not found", { productId });
          break;
        }

        // Update subscription
        const { error: updateError } = await supabaseClient
          .from("user_subscriptions")
          .upsert({
            user_id: user.id,
            plan_id: plan.id,
            stripe_customer_id: subscription.customer as string,
            stripe_subscription_id: subscription.id,
            status: subscription.status as any,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_ends_at: subscription.trial_end 
              ? new Date(subscription.trial_end * 1000).toISOString() 
              : null,
            canceled_at: subscription.canceled_at 
              ? new Date(subscription.canceled_at * 1000).toISOString() 
              : null,
          }, {
            onConflict: "user_id"
          });

        if (updateError) throw updateError;
        logStep("Subscription updated in database", { userId: user.id, status: subscription.status });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted", { 
          subscriptionId: subscription.id,
          customerId: subscription.customer 
        });

        // Get customer email
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        const email = (customer as Stripe.Customer).email;
        
        if (!email) {
          logStep("No email found for customer", { customerId: subscription.customer });
          break;
        }

        // Find user by email
        const { data: users, error: userError } = await supabaseClient.auth.admin.listUsers();
        if (userError) throw userError;
        
        const user = users.users.find(u => u.email === email);
        if (!user) {
          logStep("User not found", { email });
          break;
        }

        // Mark subscription as canceled
        const { error: updateError } = await supabaseClient
          .from("user_subscriptions")
          .update({
            status: "canceled",
            canceled_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .eq("stripe_subscription_id", subscription.id);

        if (updateError) throw updateError;
        logStep("Subscription marked as canceled", { userId: user.id });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment succeeded", { 
          invoiceId: invoice.id,
          customerId: invoice.customer,
          subscriptionId: invoice.subscription 
        });

        if (invoice.subscription) {
          // Get customer email
          const customer = await stripe.customers.retrieve(invoice.customer as string);
          const email = (customer as Stripe.Customer).email;
          
          if (!email) {
            logStep("No email found for customer", { customerId: invoice.customer });
            break;
          }

          // Find user by email
          const { data: users, error: userError } = await supabaseClient.auth.admin.listUsers();
          if (userError) throw userError;
          
          const user = users.users.find(u => u.email === email);
          if (!user) {
            logStep("User not found", { email });
            break;
          }

          // Update subscription status to active if it was in another state
          const { error: updateError } = await supabaseClient
            .from("user_subscriptions")
            .update({
              status: "active",
            })
            .eq("user_id", user.id)
            .eq("stripe_subscription_id", invoice.subscription as string)
            .neq("status", "active");

          if (updateError) throw updateError;
          logStep("Subscription status updated to active", { userId: user.id });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment failed", { 
          invoiceId: invoice.id,
          customerId: invoice.customer,
          subscriptionId: invoice.subscription 
        });

        if (invoice.subscription) {
          // Get customer email
          const customer = await stripe.customers.retrieve(invoice.customer as string);
          const email = (customer as Stripe.Customer).email;
          
          if (!email) {
            logStep("No email found for customer", { customerId: invoice.customer });
            break;
          }

          // Find user by email
          const { data: users, error: userError } = await supabaseClient.auth.admin.listUsers();
          if (userError) throw userError;
          
          const user = users.users.find(u => u.email === email);
          if (!user) {
            logStep("User not found", { email });
            break;
          }

          // Update subscription status to past_due
          const { error: updateError } = await supabaseClient
            .from("user_subscriptions")
            .update({
              status: "past_due",
            })
            .eq("user_id", user.id)
            .eq("stripe_subscription_id", invoice.subscription as string);

          if (updateError) throw updateError;
          logStep("Subscription status updated to past_due", { userId: user.id });

          // Create notification for the user
          const { error: notifError } = await supabaseClient
            .from("notifications")
            .insert({
              user_id: user.id,
              title: "Falha no Pagamento",
              message: "Houve uma falha no pagamento da sua assinatura. Por favor, atualize suas informações de pagamento.",
            });

          if (notifError) {
            logStep("Failed to create notification", { error: notifError });
          } else {
            logStep("Payment failure notification created", { userId: user.id });
          }
        }
        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Trial ending soon", { 
          subscriptionId: subscription.id,
          trialEnd: subscription.trial_end 
        });

        // Get customer email
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        const email = (customer as Stripe.Customer).email;
        
        if (!email) {
          logStep("No email found for customer", { customerId: subscription.customer });
          break;
        }

        // Find user by email
        const { data: users, error: userError } = await supabaseClient.auth.admin.listUsers();
        if (userError) throw userError;
        
        const user = users.users.find(u => u.email === email);
        if (!user) {
          logStep("User not found", { email });
          break;
        }

        // Create notification
        const trialEndDate = subscription.trial_end 
          ? new Date(subscription.trial_end * 1000).toLocaleDateString('pt-BR')
          : "em breve";

        const { error: notifError } = await supabaseClient
          .from("notifications")
          .insert({
            user_id: user.id,
            title: "Seu período de teste está acabando",
            message: `Seu período de teste termina em ${trialEndDate}. Não se esqueça de adicionar um método de pagamento para continuar usando o serviço.`,
          });

        if (notifError) {
          logStep("Failed to create notification", { error: notifError });
        } else {
          logStep("Trial ending notification created", { userId: user.id });
        }
        break;
      }

      case "invoice.upcoming": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Upcoming invoice", { 
          invoiceId: invoice.id,
          customerId: invoice.customer 
        });

        // Get customer email
        const customer = await stripe.customers.retrieve(invoice.customer as string);
        const email = (customer as Stripe.Customer).email;
        
        if (!email) {
          logStep("No email found for customer", { customerId: invoice.customer });
          break;
        }

        // Find user by email
        const { data: users, error: userError } = await supabaseClient.auth.admin.listUsers();
        if (userError) throw userError;
        
        const user = users.users.find(u => u.email === email);
        if (!user) {
          logStep("User not found", { email });
          break;
        }

        // Create notification
        const amount = invoice.amount_due ? (invoice.amount_due / 100).toFixed(2) : "0.00";
        const dueDate = invoice.period_end 
          ? new Date(invoice.period_end * 1000).toLocaleDateString('pt-BR')
          : "em breve";

        const { error: notifError } = await supabaseClient
          .from("notifications")
          .insert({
            user_id: user.id,
            title: "Próxima cobrança",
            message: `Sua próxima cobrança de R$ ${amount} será processada em ${dueDate}.`,
          });

        if (notifError) {
          logStep("Failed to create notification", { error: notifError });
        } else {
          logStep("Upcoming invoice notification created", { userId: user.id });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(
      JSON.stringify({ received: true, eventType: event.type }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook", { message: errorMessage, stack: error instanceof Error ? error.stack : undefined });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
