-- Tabela para logs de eventos Stripe (billing_events)
CREATE TABLE IF NOT EXISTS public.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE,
  payload JSONB,
  processed_at TIMESTAMPTZ DEFAULT now(),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_billing_events_user_id ON public.billing_events(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_created_at ON public.billing_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_events_stripe_event_id ON public.billing_events(stripe_event_id);

-- RLS para billing_events
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own billing events"
  ON public.billing_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Tabela para captura de erros do app
CREATE TABLE IF NOT EXISTS public.app_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  page_url TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_app_errors_user_id ON public.app_errors(user_id);
CREATE INDEX IF NOT EXISTS idx_app_errors_created_at ON public.app_errors(created_at DESC);

-- RLS para app_errors
ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own errors"
  ON public.app_errors
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert errors"
  ON public.app_errors
  FOR INSERT
  WITH CHECK (true);

-- Adicionar coluna is_early_adopter em user_subscriptions
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS is_early_adopter BOOLEAN DEFAULT false;

-- Função para marcar primeiros 50 early adopters
CREATE OR REPLACE FUNCTION public.mark_early_adopter()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
BEGIN
  -- Contar quantos usuários já têm assinatura ativa/trial
  SELECT COUNT(*) INTO active_count
  FROM user_subscriptions
  WHERE status IN ('active', 'trialing');
  
  -- Se for um dos primeiros 50, marcar como early adopter
  IF active_count <= 50 THEN
    NEW.is_early_adopter = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para marcar early adopters
DROP TRIGGER IF EXISTS trigger_mark_early_adopter ON public.user_subscriptions;
CREATE TRIGGER trigger_mark_early_adopter
  BEFORE INSERT ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_early_adopter();

-- Desativar planos atuais
UPDATE public.subscription_plans SET is_active = false;

-- Criar Plano Único Beta
INSERT INTO public.subscription_plans (
  name,
  description,
  price_monthly,
  price_yearly,
  currency,
  max_appointments_per_month,
  max_clients,
  max_services,
  features,
  is_active,
  is_featured,
  sort_order,
  stripe_price_id
) VALUES (
  'Plano Beta',
  'Acesso completo durante o período de lançamento. Preço especial para os primeiros 50 usuários!',
  49.90,
  539.00,
  'BRL',
  1000,
  500,
  50,
  jsonb_build_array(
    '✅ 14 dias grátis para testar',
    '📅 Até 1.000 agendamentos por mês',
    '👥 Até 500 clientes cadastrados',
    '💼 Até 50 serviços diferentes',
    '📱 Integração com WhatsApp',
    '🔗 Link público para agendamentos',
    '💰 Controle financeiro completo',
    '📧 Suporte por email',
    '🎁 Preço fixo garantido para sempre',
    '⚡ Atualizações automáticas'
  ),
  true,
  true,
  1,
  'price_placeholder_beta'
) ON CONFLICT DO NOTHING;