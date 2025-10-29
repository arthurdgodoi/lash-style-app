-- ============================================
-- FASE 2: SISTEMA DE MONETIZAÇÃO COM STRIPE
-- ============================================

-- 1. CRIAR ENUM PARA STATUS DE ASSINATURA
-- ============================================
CREATE TYPE subscription_status AS ENUM (
  'trialing',
  'active', 
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'unpaid'
);

-- 2. CRIAR TABELA DE PLANOS DE ASSINATURA
-- ============================================
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  stripe_price_id TEXT UNIQUE NOT NULL,
  stripe_product_id TEXT,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  currency TEXT NOT NULL DEFAULT 'BRL',
  
  -- Limites do plano
  max_appointments_per_month INTEGER, -- NULL = ilimitado
  max_clients INTEGER,
  max_services INTEGER,
  
  -- Features incluídas
  features JSONB DEFAULT '[]'::jsonb,
  
  -- Configurações
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode visualizar planos ativos (para página de pricing)
CREATE POLICY "Anyone can view active plans"
ON subscription_plans FOR SELECT
USING (is_active = true);

-- 3. CRIAR TABELA DE ASSINATURAS DE USUÁRIOS
-- ============================================
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  
  -- Stripe IDs
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_payment_method_id TEXT,
  
  -- Status e datas
  status subscription_status NOT NULL DEFAULT 'trialing',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  
  -- Controle de uso do período atual
  appointments_used_this_month INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Um usuário só pode ter uma assinatura ativa
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas sua própria assinatura
CREATE POLICY "Users can view their own subscription"
ON user_subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- Usuários podem atualizar sua própria assinatura
CREATE POLICY "Users can update their own subscription"
ON user_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

-- 4. CRIAR ÍNDICES
-- ============================================
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active, sort_order);

-- 5. CRIAR FUNÇÃO PARA VERIFICAR LIMITES
-- ============================================
CREATE OR REPLACE FUNCTION check_subscription_limit(
  _user_id UUID,
  _limit_type TEXT -- 'appointments', 'clients', 'services'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _subscription RECORD;
  _current_count INTEGER;
  _limit INTEGER;
BEGIN
  -- Buscar assinatura do usuário
  SELECT 
    us.*,
    sp.max_appointments_per_month,
    sp.max_clients,
    sp.max_services
  INTO _subscription
  FROM user_subscriptions us
  LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = _user_id
  AND us.status IN ('trialing', 'active');
  
  -- Se não tem assinatura ativa, bloquear
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar limite baseado no tipo
  IF _limit_type = 'appointments' THEN
    _limit := _subscription.max_appointments_per_month;
    
    -- Se limite é NULL, é ilimitado
    IF _limit IS NULL THEN
      RETURN TRUE;
    END IF;
    
    -- Contar appointments do mês atual
    SELECT COUNT(*)
    INTO _current_count
    FROM appointments
    WHERE user_id = _user_id
    AND appointment_date >= date_trunc('month', CURRENT_DATE)
    AND appointment_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
    AND deleted_at IS NULL;
    
    RETURN _current_count < _limit;
    
  ELSIF _limit_type = 'clients' THEN
    _limit := _subscription.max_clients;
    
    IF _limit IS NULL THEN
      RETURN TRUE;
    END IF;
    
    SELECT COUNT(*)
    INTO _current_count
    FROM clients
    WHERE user_id = _user_id
    AND deleted_at IS NULL;
    
    RETURN _current_count < _limit;
    
  ELSIF _limit_type = 'services' THEN
    _limit := _subscription.max_services;
    
    IF _limit IS NULL THEN
      RETURN TRUE;
    END IF;
    
    SELECT COUNT(*)
    INTO _current_count
    FROM services
    WHERE user_id = _user_id
    AND deleted_at IS NULL;
    
    RETURN _current_count < _limit;
    
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- 6. CRIAR FUNÇÃO PARA OBTER STATUS DA ASSINATURA
-- ============================================
CREATE OR REPLACE FUNCTION get_subscription_status(_user_id UUID)
RETURNS TABLE (
  has_active_subscription BOOLEAN,
  plan_name TEXT,
  status TEXT,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  appointments_limit INTEGER,
  appointments_used INTEGER,
  clients_limit INTEGER,
  clients_used INTEGER,
  services_limit INTEGER,
  services_used INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN us.status IN ('trialing', 'active') THEN TRUE 
      ELSE FALSE 
    END as has_active_subscription,
    sp.name as plan_name,
    us.status::TEXT as status,
    us.trial_ends_at,
    us.current_period_end,
    sp.max_appointments_per_month as appointments_limit,
    (
      SELECT COUNT(*)::INTEGER
      FROM appointments a
      WHERE a.user_id = _user_id
      AND a.appointment_date >= date_trunc('month', CURRENT_DATE)
      AND a.appointment_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
      AND a.deleted_at IS NULL
    ) as appointments_used,
    sp.max_clients as clients_limit,
    (
      SELECT COUNT(*)::INTEGER
      FROM clients c
      WHERE c.user_id = _user_id
      AND c.deleted_at IS NULL
    ) as clients_used,
    sp.max_services as services_limit,
    (
      SELECT COUNT(*)::INTEGER
      FROM services s
      WHERE s.user_id = _user_id
      AND s.deleted_at IS NULL
    ) as services_used
  FROM user_subscriptions us
  LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = _user_id;
END;
$$;

-- 7. TRIGGER PARA CRIAR TRIAL AUTOMÁTICO AO CRIAR NOVO USUÁRIO
-- ============================================
CREATE OR REPLACE FUNCTION create_trial_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _trial_plan_id UUID;
BEGIN
  -- Buscar plano básico/trial (primeiro plano ativo ou criar um default)
  SELECT id INTO _trial_plan_id
  FROM subscription_plans
  WHERE is_active = true
  ORDER BY price_monthly ASC
  LIMIT 1;
  
  -- Se não existir plano, não criar assinatura ainda
  IF _trial_plan_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Criar assinatura trial de 14 dias
  INSERT INTO user_subscriptions (
    user_id,
    plan_id,
    status,
    trial_ends_at,
    current_period_start,
    current_period_end
  ) VALUES (
    NEW.id,
    _trial_plan_id,
    'trialing',
    now() + INTERVAL '14 days',
    now(),
    now() + INTERVAL '14 days'
  );
  
  RETURN NEW;
END;
$$;

-- Criar trigger para novos usuários
DROP TRIGGER IF EXISTS create_trial_on_signup ON auth.users;
CREATE TRIGGER create_trial_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_trial_subscription();

-- 8. TRIGGER PARA ATUALIZAR updated_at
-- ============================================
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- 9. INSERIR PLANOS PADRÃO
-- ============================================
INSERT INTO subscription_plans (name, description, stripe_price_id, price_monthly, max_appointments_per_month, max_clients, max_services, features, sort_order) VALUES
(
  'Básico',
  'Perfeito para quem está começando',
  'price_basic_placeholder', -- Substituir com price_id real do Stripe
  29.90,
  50,
  30,
  10,
  '["Até 50 agendamentos/mês", "Até 30 clientes", "Até 10 serviços", "Suporte por email"]'::jsonb,
  1
),
(
  'Profissional',
  'Para profissionais estabelecidos',
  'price_pro_placeholder', -- Substituir com price_id real do Stripe
  59.90,
  150,
  100,
  30,
  '["Até 150 agendamentos/mês", "Até 100 clientes", "Até 30 serviços", "Suporte prioritário", "Relatórios avançados"]'::jsonb,
  2
),
(
  'Premium',
  'Solução completa sem limites',
  'price_premium_placeholder', -- Substituir com price_id real do Stripe
  99.90,
  NULL, -- ilimitado
  NULL, -- ilimitado
  NULL, -- ilimitado
  '["Agendamentos ilimitados", "Clientes ilimitados", "Serviços ilimitados", "Suporte 24/7", "Relatórios personalizados", "Integração WhatsApp"]'::jsonb,
  3
);