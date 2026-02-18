-- =============================================================================
-- SCHEMA COMPLETO DO BANCO DE DADOS
-- Projeto: Lash Style App (wrbsknjrlacdemgtqoyh)
-- Gerado em: 2026-02-18
-- Descrição: Schema consolidado com todas as tabelas, policies, funções e triggers
-- =============================================================================
-- Para recriar o banco do zero, execute este arquivo em ordem no Supabase SQL Editor.
-- Requer extensões: pg_cron, pg_net (disponíveis no Supabase por padrão)
-- =============================================================================


-- =============================================================================
-- SEÇÃO 1: EXTENSÕES
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;


-- =============================================================================
-- SEÇÃO 2: TIPOS CUSTOMIZADOS (ENUMs)
-- =============================================================================

CREATE TYPE public.subscription_status AS ENUM (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'unpaid'
);


-- =============================================================================
-- SEÇÃO 3: FUNÇÕES UTILITÁRIAS
-- =============================================================================

-- Função para atualizar coluna updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Alias para compatibilidade
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Função para criar perfil automaticamente ao registrar novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$;

-- Função para soft delete com registro em audit_log
CREATE OR REPLACE FUNCTION public.soft_delete_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Registrar deleção no audit log
  INSERT INTO public.audit_logs (user_id, table_name, record_id, action, old_data)
  VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    OLD.id,
    'DELETE',
    row_to_json(OLD)
  );

  -- Marcar como deletado (soft delete) em vez de deletar fisicamente
  IF TG_TABLE_NAME = 'appointments' THEN
    UPDATE public.appointments SET deleted_at = now() WHERE id = OLD.id;
  ELSIF TG_TABLE_NAME = 'clients' THEN
    UPDATE public.clients SET deleted_at = now() WHERE id = OLD.id;
  ELSIF TG_TABLE_NAME = 'services' THEN
    UPDATE public.services SET deleted_at = now() WHERE id = OLD.id;
  ELSIF TG_TABLE_NAME = 'expenses' THEN
    UPDATE public.expenses SET deleted_at = now() WHERE id = OLD.id;
  ELSIF TG_TABLE_NAME = 'blocked_slots' THEN
    UPDATE public.blocked_slots SET deleted_at = now() WHERE id = OLD.id;
  END IF;

  -- Retorna NULL para cancelar o DELETE físico original
  RETURN NULL;
END;
$$;

-- Função para verificar limites do plano de assinatura
CREATE OR REPLACE FUNCTION public.check_subscription_limit(
  _user_id UUID,
  _limit_type TEXT  -- 'appointments' | 'clients' | 'services'
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
  SELECT
    us.*,
    sp.max_appointments_per_month,
    sp.max_clients,
    sp.max_services
  INTO _subscription
  FROM public.user_subscriptions us
  LEFT JOIN public.subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = _user_id
    AND us.status IN ('trialing', 'active');

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF _limit_type = 'appointments' THEN
    _limit := _subscription.max_appointments_per_month;
    IF _limit IS NULL THEN RETURN TRUE; END IF;
    SELECT COUNT(*) INTO _current_count
    FROM public.appointments
    WHERE user_id = _user_id
      AND appointment_date >= date_trunc('month', CURRENT_DATE)
      AND appointment_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
      AND deleted_at IS NULL;
    RETURN _current_count < _limit;

  ELSIF _limit_type = 'clients' THEN
    _limit := _subscription.max_clients;
    IF _limit IS NULL THEN RETURN TRUE; END IF;
    SELECT COUNT(*) INTO _current_count FROM public.clients
    WHERE user_id = _user_id AND deleted_at IS NULL;
    RETURN _current_count < _limit;

  ELSIF _limit_type = 'services' THEN
    _limit := _subscription.max_services;
    IF _limit IS NULL THEN RETURN TRUE; END IF;
    SELECT COUNT(*) INTO _current_count FROM public.services
    WHERE user_id = _user_id AND deleted_at IS NULL;
    RETURN _current_count < _limit;

  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Função para retornar status completo da assinatura do usuário
CREATE OR REPLACE FUNCTION public.get_subscription_status(_user_id UUID)
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
    CASE WHEN us.status IN ('trialing', 'active') THEN TRUE ELSE FALSE END AS has_active_subscription,
    sp.name AS plan_name,
    us.status::TEXT AS status,
    us.trial_ends_at,
    us.current_period_end,
    sp.max_appointments_per_month AS appointments_limit,
    (SELECT COUNT(*)::INTEGER FROM public.appointments a
     WHERE a.user_id = _user_id
       AND a.appointment_date >= date_trunc('month', CURRENT_DATE)
       AND a.appointment_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
       AND a.deleted_at IS NULL) AS appointments_used,
    sp.max_clients AS clients_limit,
    (SELECT COUNT(*)::INTEGER FROM public.clients c
     WHERE c.user_id = _user_id AND c.deleted_at IS NULL) AS clients_used,
    sp.max_services AS services_limit,
    (SELECT COUNT(*)::INTEGER FROM public.services s
     WHERE s.user_id = _user_id AND s.deleted_at IS NULL) AS services_used
  FROM public.user_subscriptions us
  LEFT JOIN public.subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = _user_id;
END;
$$;

-- Função para criar trial automaticamente ao novo usuário se cadastrar
CREATE OR REPLACE FUNCTION public.create_trial_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _trial_plan_id UUID;
BEGIN
  SELECT id INTO _trial_plan_id
  FROM public.subscription_plans
  WHERE is_active = true
  ORDER BY price_monthly ASC
  LIMIT 1;

  IF _trial_plan_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_subscriptions (
    user_id, plan_id, status,
    trial_ends_at, current_period_start, current_period_end
  ) VALUES (
    NEW.id, _trial_plan_id, 'trialing',
    now() + INTERVAL '14 days',
    now(),
    now() + INTERVAL '14 days'
  );

  RETURN NEW;
END;
$$;

-- Função para marcar early adopters (primeiros 50 usuários)
CREATE OR REPLACE FUNCTION public.mark_early_adopter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM public.user_subscriptions
  WHERE status IN ('active', 'trialing');

  IF active_count <= 50 THEN
    NEW.is_early_adopter = true;
  END IF;

  RETURN NEW;
END;
$$;


-- =============================================================================
-- SEÇÃO 4: TABELAS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 4.1 profiles
-- Dados do profissional (nome, telefone, slug público, chave pix, localização)
-- Criado automaticamente via trigger on_auth_user_created
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  professional_name TEXT,          -- Nome usado nos modelos de mensagem WhatsApp
  location        TEXT,            -- Localização exibida nas mensagens
  pix_key         TEXT,            -- Chave Pix para recebimento
  booking_enabled BOOLEAN NOT NULL DEFAULT false,  -- Ativa página pública de agendamento
  booking_slug    TEXT UNIQUE,     -- Slug da URL pública: /agendar/{slug}
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"   ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE INDEX idx_profiles_booking_slug ON public.profiles(booking_slug);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger auth: cria perfil ao registrar usuário
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- -----------------------------------------------------------------------------
-- 4.2 clients
-- Clientes do profissional
-- Soft delete via deleted_at
-- -----------------------------------------------------------------------------
CREATE TABLE public.clients (
  id         UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL,
  name       TEXT NOT NULL,
  phone      TEXT,
  email      TEXT,
  birth_date DATE,
  notes      TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_email CHECK (
    email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  )
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own clients"   ON public.clients FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id AND deleted_at IS NULL);
CREATE POLICY "Users can create their own clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "Users can update their own clients" ON public.clients FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "Users can delete their own clients" ON public.clients FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE INDEX idx_clients_user    ON public.clients(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_deleted ON public.clients(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER soft_delete_clients
  BEFORE DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.soft_delete_record();


-- -----------------------------------------------------------------------------
-- 4.3 services
-- Serviços oferecidos pelo profissional
-- Soft delete via deleted_at
-- price_mode: 'fixed' | 'free' | 'range'
-- -----------------------------------------------------------------------------
CREATE TABLE public.services (
  id                       UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                  UUID    NOT NULL,
  name                     TEXT    NOT NULL,
  duration_minutes         INTEGER NOT NULL,
  price_mode               TEXT    NOT NULL CHECK (price_mode IN ('fixed', 'free', 'range')),
  suggested_price          DECIMAL(10,2),
  is_active                BOOLEAN NOT NULL DEFAULT true,
  include_salon_percentage BOOLEAN NOT NULL DEFAULT false,
  salon_percentage         DECIMAL(5,2),
  deleted_at               TIMESTAMP WITH TIME ZONE,
  created_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT positive_suggested_price        CHECK (suggested_price IS NULL OR suggested_price >= 0),
  CONSTRAINT valid_service_salon_percentage  CHECK (salon_percentage IS NULL OR (salon_percentage >= 0 AND salon_percentage <= 100)),
  CONSTRAINT positive_duration               CHECK (duration_minutes > 0)
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own services"   ON public.services FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id AND deleted_at IS NULL);
CREATE POLICY "Users can create their own services" ON public.services FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "Users can update their own services" ON public.services FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "Users can delete their own services" ON public.services FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE INDEX idx_services_user_active ON public.services(user_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_services_deleted     ON public.services(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER soft_delete_services
  BEFORE DELETE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.soft_delete_record();


-- -----------------------------------------------------------------------------
-- 4.4 appointments
-- Agendamentos: relaciona cliente + serviço + data/hora + pagamento
-- Soft delete via deleted_at
-- status: 'scheduled' | 'completed' | 'canceled'
-- payment_status: 'pending' | 'paid' | 'partial'
-- payment_method: 'pix' | 'cash' | 'card' | ...
-- -----------------------------------------------------------------------------
CREATE TABLE public.appointments (
  id                       UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                  UUID    NOT NULL,
  client_id                UUID    NOT NULL REFERENCES public.clients(id)  ON DELETE CASCADE,
  service_id               UUID    NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  appointment_date         DATE    NOT NULL,
  appointment_time         TIME    NOT NULL,
  price                    NUMERIC(10,2) NOT NULL,
  notes                    TEXT,
  status                   TEXT    NOT NULL DEFAULT 'scheduled',
  payment_method           TEXT,
  payment_status           TEXT    DEFAULT 'pending',
  include_salon_percentage BOOLEAN NOT NULL DEFAULT false,
  salon_percentage         NUMERIC,
  deleted_at               TIMESTAMP WITH TIME ZONE,
  created_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT positive_price             CHECK (price >= 0),
  CONSTRAINT valid_salon_percentage     CHECK (salon_percentage IS NULL OR (salon_percentage >= 0 AND salon_percentage <= 100))
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own appointments"   ON public.appointments FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id AND deleted_at IS NULL);
CREATE POLICY "Users can create their own appointments" ON public.appointments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "Users can update their own appointments" ON public.appointments FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "Users can delete their own appointments" ON public.appointments FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE INDEX idx_appointments_user_date     ON public.appointments(user_id, appointment_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_client        ON public.appointments(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_deleted       ON public.appointments(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_appointments_payment_status ON public.appointments(payment_status, user_id) WHERE deleted_at IS NULL;

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER soft_delete_appointments
  BEFORE DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.soft_delete_record();


-- -----------------------------------------------------------------------------
-- 4.5 blocked_slots
-- Horários ou dias inteiros bloqueados pelo profissional
-- Soft delete via deleted_at
-- is_full_day = true → dia inteiro bloqueado
-- is_full_day = false → apenas blocked_time bloqueado
-- -----------------------------------------------------------------------------
CREATE TABLE public.blocked_slots (
  id           UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID    NOT NULL,
  blocked_date DATE    NOT NULL,
  blocked_time TIME,               -- NULL se is_full_day = true
  is_full_day  BOOLEAN NOT NULL DEFAULT false,
  reason       TEXT,
  deleted_at   TIMESTAMP WITH TIME ZONE,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blocked slots"   ON public.blocked_slots FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id AND deleted_at IS NULL);
CREATE POLICY "Users can create their own blocked slots" ON public.blocked_slots FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "Users can update their own blocked slots" ON public.blocked_slots FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "Users can delete their own blocked slots" ON public.blocked_slots FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE TRIGGER update_blocked_slots_updated_at
  BEFORE UPDATE ON public.blocked_slots
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER soft_delete_blocked_slots
  BEFORE DELETE ON public.blocked_slots
  FOR EACH ROW EXECUTE FUNCTION public.soft_delete_record();


-- -----------------------------------------------------------------------------
-- 4.6 expenses
-- Despesas do profissional (fixas ou variáveis)
-- Soft delete via deleted_at
-- -----------------------------------------------------------------------------
CREATE TABLE public.expenses (
  id           UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID    NOT NULL,
  description  TEXT    NOT NULL,
  amount       NUMERIC NOT NULL,
  is_fixed     BOOLEAN NOT NULL DEFAULT false,  -- true = despesa fixa mensal
  payment_date DATE    NOT NULL,
  deleted_at   TIMESTAMP WITH TIME ZONE,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT positive_amount CHECK (amount > 0)
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own expenses"   ON public.expenses FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id AND deleted_at IS NULL);
CREATE POLICY "Users can create their own expenses" ON public.expenses FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "Users can update their own expenses" ON public.expenses FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "Users can delete their own expenses" ON public.expenses FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE INDEX idx_expenses_user_date ON public.expenses(user_id, payment_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_deleted   ON public.expenses(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER soft_delete_expenses
  BEFORE DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.soft_delete_record();


-- -----------------------------------------------------------------------------
-- 4.7 working_hours
-- Horário de expediente por dia da semana
-- day_of_week: 0 = Domingo ... 6 = Sábado
-- is_active = false → dia não trabalhado
-- -----------------------------------------------------------------------------
CREATE TABLE public.working_hours (
  id           UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID    NOT NULL,
  day_of_week  INTEGER NOT NULL,
  start_time   TIME    NOT NULL,
  end_time     TIME    NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_day_of_week CHECK (day_of_week >= 0 AND day_of_week <= 6)
);

ALTER TABLE public.working_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own working hours"   ON public.working_hours FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own working hours" ON public.working_hours FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own working hours" ON public.working_hours FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own working hours" ON public.working_hours FOR DELETE USING (auth.uid() = user_id);
-- Política pública: página de agendamento precisa consultar horários
CREATE POLICY "Anyone can view active working hours for booking" ON public.working_hours FOR SELECT USING (is_active = true);

CREATE INDEX idx_working_hours_user_day ON public.working_hours(user_id, day_of_week);

CREATE TRIGGER update_working_hours_updated_at
  BEFORE UPDATE ON public.working_hours
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- -----------------------------------------------------------------------------
-- 4.8 booking_time_slots
-- Horários disponíveis para agendamento público
-- Combinação única: user_id + time_slot
-- -----------------------------------------------------------------------------
CREATE TABLE public.booking_time_slots (
  id         UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID    NOT NULL,
  time_slot  TIME    NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, time_slot)
);

ALTER TABLE public.booking_time_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own booking time slots"   ON public.booking_time_slots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own booking time slots" ON public.booking_time_slots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own booking time slots" ON public.booking_time_slots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own booking time slots" ON public.booking_time_slots FOR DELETE USING (auth.uid() = user_id);
-- Política pública: página de agendamento precisa consultar slots
CREATE POLICY "Anyone can view active booking time slots" ON public.booking_time_slots FOR SELECT USING (is_active = true);

CREATE TRIGGER update_booking_time_slots_updated_at
  BEFORE UPDATE ON public.booking_time_slots
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- -----------------------------------------------------------------------------
-- 4.9 message_templates
-- Modelos de mensagem WhatsApp por tipo
-- template_type único por usuário: 'confirmation' | 'reminder' | 'followup' | etc.
-- -----------------------------------------------------------------------------
CREATE TABLE public.message_templates (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL,
  template_type TEXT NOT NULL,
  message       TEXT NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, template_type)
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own message templates"   ON public.message_templates FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "Users can insert their own message templates" ON public.message_templates FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "Users can update their own message templates" ON public.message_templates FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "Users can delete their own message templates" ON public.message_templates FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- -----------------------------------------------------------------------------
-- 4.10 notifications
-- Notificações in-app do sistema (ex: lembrete de agendamento amanhã)
-- Geradas pela edge function notification-scheduler via cron job
-- -----------------------------------------------------------------------------
CREATE TABLE public.notifications (
  id         UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID    NOT NULL,
  title      TEXT    NOT NULL,
  message    TEXT    NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"  ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_notifications_user_id_is_read ON public.notifications(user_id, is_read);


-- -----------------------------------------------------------------------------
-- 4.11 audit_logs
-- Log imutável de operações de deleção (soft delete) nas tabelas principais
-- Inserido automaticamente via trigger soft_delete_record()
-- -----------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
  id         UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL,
  table_name TEXT NOT NULL,
  record_id  UUID NOT NULL,
  action     TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'RESTORE')),
  old_data   JSONB,
  new_data   JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id, created_at);


-- -----------------------------------------------------------------------------
-- 4.12 subscription_plans
-- Planos de assinatura disponíveis (gerenciados via Stripe)
-- max_* = NULL significa ilimitado
-- -----------------------------------------------------------------------------
CREATE TABLE public.subscription_plans (
  id                         UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name                       TEXT    NOT NULL,
  description                TEXT,
  stripe_price_id            TEXT    NOT NULL UNIQUE,
  stripe_product_id          TEXT,
  price_monthly              DECIMAL(10,2) NOT NULL,
  price_yearly               DECIMAL(10,2),
  currency                   TEXT    NOT NULL DEFAULT 'BRL',
  max_appointments_per_month INTEGER,   -- NULL = ilimitado
  max_clients                INTEGER,   -- NULL = ilimitado
  max_services               INTEGER,   -- NULL = ilimitado
  features                   JSONB   DEFAULT '[]'::jsonb,
  is_active                  BOOLEAN NOT NULL DEFAULT true,
  is_featured                BOOLEAN NOT NULL DEFAULT false,
  sort_order                 INTEGER DEFAULT 0,
  created_at                 TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at                 TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode ver planos ativos (página pública de pricing)
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans FOR SELECT USING (is_active = true);

CREATE INDEX idx_subscription_plans_active ON public.subscription_plans(is_active, sort_order);

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- -----------------------------------------------------------------------------
-- 4.13 user_subscriptions
-- Assinatura ativa do usuário (1 por usuário)
-- Sincronizada via Stripe Webhook → edge function stripe-webhook
-- -----------------------------------------------------------------------------
CREATE TABLE public.user_subscriptions (
  id                          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan_id                     UUID REFERENCES public.subscription_plans(id),
  stripe_customer_id          TEXT,
  stripe_subscription_id      TEXT,
  stripe_payment_method_id    TEXT,
  status                      public.subscription_status NOT NULL DEFAULT 'trialing',
  current_period_start        TIMESTAMP WITH TIME ZONE,
  current_period_end          TIMESTAMP WITH TIME ZONE,
  trial_ends_at               TIMESTAMP WITH TIME ZONE,
  canceled_at                 TIMESTAMP WITH TIME ZONE,
  appointments_used_this_month INTEGER DEFAULT 0,
  is_early_adopter            BOOLEAN DEFAULT false,  -- primeiros 50 usuários
  created_at                  TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription"   ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscription" ON public.user_subscriptions FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_user_subscriptions_user_id        ON public.user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status         ON public.user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_stripe_customer ON public.user_subscriptions(stripe_customer_id);

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para marcar early adopters ao criar assinatura
CREATE TRIGGER trigger_mark_early_adopter
  BEFORE INSERT ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.mark_early_adopter();

-- Trigger auth: cria trial automaticamente ao registrar usuário
CREATE TRIGGER create_trial_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_trial_subscription();


-- -----------------------------------------------------------------------------
-- 4.14 billing_events
-- Log de todos os eventos Stripe recebidos via webhook
-- Garante rastreabilidade de cobranças e deduplicação via stripe_event_id
-- -----------------------------------------------------------------------------
CREATE TABLE public.billing_events (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE,
  payload         JSONB,
  processed_at    TIMESTAMP WITH TIME ZONE DEFAULT now(),
  error           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own billing events" ON public.billing_events FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_billing_events_user_id        ON public.billing_events(user_id);
CREATE INDEX idx_billing_events_created_at     ON public.billing_events(created_at DESC);
CREATE INDEX idx_billing_events_stripe_event_id ON public.billing_events(stripe_event_id);


-- -----------------------------------------------------------------------------
-- 4.15 app_errors
-- Erros de frontend capturados pelo ErrorBoundary e enviados ao banco
-- INSERT permitido para qualquer um (incluindo anônimos) para não perder erros
-- -----------------------------------------------------------------------------
CREATE TABLE public.app_errors (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message TEXT NOT NULL,
  error_stack   TEXT,
  page_url      TEXT,
  user_agent    TEXT,
  metadata      JSONB,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own errors" ON public.app_errors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can insert errors"        ON public.app_errors FOR INSERT WITH CHECK (true);

CREATE INDEX idx_app_errors_user_id    ON public.app_errors(user_id);
CREATE INDEX idx_app_errors_created_at ON public.app_errors(created_at DESC);


-- =============================================================================
-- SEÇÃO 5: DADOS INICIAIS
-- =============================================================================

-- Plano Beta atual (único ativo)
INSERT INTO public.subscription_plans (
  name, description, price_monthly, price_yearly, currency,
  max_appointments_per_month, max_clients, max_services,
  features, is_active, is_featured, sort_order, stripe_price_id, stripe_product_id
) VALUES (
  'Plano Beta',
  'Acesso completo durante o período de lançamento. Preço especial para os primeiros 50 usuários!',
  49.90, 539.00, 'BRL',
  1000, 500, 50,
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
  true, true, 1,
  'price_1SNfY8DCU73sHDYp05ZT3NEW',   -- stripe_price_id produção
  'prod_TKKCUDy8feB95s'                -- stripe_product_id produção
) ON CONFLICT DO NOTHING;


-- =============================================================================
-- SEÇÃO 6: CRON JOB — NOTIFICAÇÕES AUTOMÁTICAS
-- =============================================================================

-- Dispara a edge function notification-scheduler a cada hora
-- Ela verifica agendamentos 16h à frente e cria notificações para os usuários
SELECT cron.schedule(
  'notification-scheduler',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://wrbsknjrlacdemgtqoyh.supabase.co/functions/v1/notification-scheduler',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyYnNrbmpybGFjZGVtZ3Rxb3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MDU1MzIsImV4cCI6MjA3Njk4MTUzMn0.yr8ozLh1-QJe-SC2L93UndJbLBDYfKro9hzuFtotCfo"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);


-- =============================================================================
-- FIM DO SCHEMA
-- =============================================================================
-- Tabelas criadas: 15
-- Funções criadas: 7
-- Triggers criados: ~20
-- Políticas RLS criadas: ~45
-- =============================================================================
