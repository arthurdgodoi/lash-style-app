-- ============================================
-- FASE 1: CORREÇÕES CRÍTICAS DE SEGURANÇA
-- ============================================

-- 1. ADICIONAR SOFT DELETE EM TODAS AS TABELAS PRINCIPAIS
-- ============================================
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE blocked_slots ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 2. CRIAR TABELA DE AUDIT LOG
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'RESTORE')),
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only view their own audit logs
CREATE POLICY "Users can view their own audit logs"
ON audit_logs FOR SELECT
USING (auth.uid() = user_id);

-- 3. ADICIONAR VALIDAÇÕES DE DADOS
-- ============================================

-- Validar email em clients
ALTER TABLE clients ADD CONSTRAINT valid_email 
  CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Validar preço positivo em appointments
ALTER TABLE appointments ADD CONSTRAINT positive_price 
  CHECK (price >= 0);

-- Validar porcentagem entre 0 e 100
ALTER TABLE appointments ADD CONSTRAINT valid_salon_percentage 
  CHECK (salon_percentage IS NULL OR (salon_percentage >= 0 AND salon_percentage <= 100));

-- Validar preço positivo em services
ALTER TABLE services ADD CONSTRAINT positive_suggested_price 
  CHECK (suggested_price IS NULL OR suggested_price >= 0);

-- Validar porcentagem em services
ALTER TABLE services ADD CONSTRAINT valid_service_salon_percentage 
  CHECK (salon_percentage IS NULL OR (salon_percentage >= 0 AND salon_percentage <= 100));

-- Validar duração positiva em services
ALTER TABLE services ADD CONSTRAINT positive_duration 
  CHECK (duration_minutes > 0);

-- Validar valor positivo em expenses
ALTER TABLE expenses ADD CONSTRAINT positive_amount 
  CHECK (amount > 0);

-- 4. ATUALIZAR RLS POLICIES PARA INCLUIR SOFT DELETE E BLOQUEAR ANÔNIMOS
-- ============================================

-- APPOINTMENTS: Atualizar policies existentes
DROP POLICY IF EXISTS "Users can view their own appointments" ON appointments;
CREATE POLICY "Users can view their own appointments"
ON appointments FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can create their own appointments" ON appointments;
CREATE POLICY "Users can create their own appointments"
ON appointments FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own appointments" ON appointments;
CREATE POLICY "Users can update their own appointments"
ON appointments FOR UPDATE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own appointments" ON appointments;
CREATE POLICY "Users can delete their own appointments"
ON appointments FOR DELETE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- CLIENTS: Atualizar policies existentes
DROP POLICY IF EXISTS "Users can view their own clients" ON clients;
CREATE POLICY "Users can view their own clients"
ON clients FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can create their own clients" ON clients;
CREATE POLICY "Users can create their own clients"
ON clients FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own clients" ON clients;
CREATE POLICY "Users can update their own clients"
ON clients FOR UPDATE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own clients" ON clients;
CREATE POLICY "Users can delete their own clients"
ON clients FOR DELETE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- SERVICES: Atualizar policies existentes
DROP POLICY IF EXISTS "Users can view their own services" ON services;
CREATE POLICY "Users can view their own services"
ON services FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can create their own services" ON services;
CREATE POLICY "Users can create their own services"
ON services FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own services" ON services;
CREATE POLICY "Users can update their own services"
ON services FOR UPDATE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own services" ON services;
CREATE POLICY "Users can delete their own services"
ON services FOR DELETE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- EXPENSES: Atualizar policies existentes
DROP POLICY IF EXISTS "Users can view their own expenses" ON expenses;
CREATE POLICY "Users can view their own expenses"
ON expenses FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can create their own expenses" ON expenses;
CREATE POLICY "Users can create their own expenses"
ON expenses FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own expenses" ON expenses;
CREATE POLICY "Users can update their own expenses"
ON expenses FOR UPDATE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own expenses" ON expenses;
CREATE POLICY "Users can delete their own expenses"
ON expenses FOR DELETE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- BLOCKED_SLOTS: Atualizar policies existentes
DROP POLICY IF EXISTS "Users can view their own blocked slots" ON blocked_slots;
CREATE POLICY "Users can view their own blocked slots"
ON blocked_slots FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can create their own blocked slots" ON blocked_slots;
CREATE POLICY "Users can create their own blocked slots"
ON blocked_slots FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own blocked slots" ON blocked_slots;
CREATE POLICY "Users can update their own blocked slots"
ON blocked_slots FOR UPDATE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own blocked slots" ON blocked_slots;
CREATE POLICY "Users can delete their own blocked slots"
ON blocked_slots FOR DELETE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- MESSAGE_TEMPLATES: Atualizar policies existentes
DROP POLICY IF EXISTS "Users can view their own message templates" ON message_templates;
CREATE POLICY "Users can view their own message templates"
ON message_templates FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own message templates" ON message_templates;
CREATE POLICY "Users can insert their own message templates"
ON message_templates FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own message templates" ON message_templates;
CREATE POLICY "Users can update their own message templates"
ON message_templates FOR UPDATE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own message templates" ON message_templates;
CREATE POLICY "Users can delete their own message templates"
ON message_templates FOR DELETE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- PROFILES: Já protegida mas garantir bloqueio explícito de anônimos
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

-- 5. CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_appointments_user_date ON appointments(user_id, appointment_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_deleted ON appointments(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_user ON clients(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_deleted ON clients(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_services_user_active ON services(user_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_services_deleted ON services(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, payment_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_deleted ON expenses(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at);

-- 6. CRIAR FUNÇÃO PARA SOFT DELETE
-- ============================================
CREATE OR REPLACE FUNCTION soft_delete_record()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir no audit log
  INSERT INTO audit_logs (user_id, table_name, record_id, action, old_data)
  VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    OLD.id,
    'DELETE',
    row_to_json(OLD)
  );
  
  -- Marcar como deletado ao invés de deletar
  IF TG_TABLE_NAME = 'appointments' THEN
    UPDATE appointments SET deleted_at = now() WHERE id = OLD.id;
  ELSIF TG_TABLE_NAME = 'clients' THEN
    UPDATE clients SET deleted_at = now() WHERE id = OLD.id;
  ELSIF TG_TABLE_NAME = 'services' THEN
    UPDATE services SET deleted_at = now() WHERE id = OLD.id;
  ELSIF TG_TABLE_NAME = 'expenses' THEN
    UPDATE expenses SET deleted_at = now() WHERE id = OLD.id;
  ELSIF TG_TABLE_NAME = 'blocked_slots' THEN
    UPDATE blocked_slots SET deleted_at = now() WHERE id = OLD.id;
  END IF;
  
  -- Retornar NULL para cancelar o DELETE original
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar triggers para soft delete
DROP TRIGGER IF EXISTS soft_delete_appointments ON appointments;
CREATE TRIGGER soft_delete_appointments
  BEFORE DELETE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION soft_delete_record();

DROP TRIGGER IF EXISTS soft_delete_clients ON clients;
CREATE TRIGGER soft_delete_clients
  BEFORE DELETE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION soft_delete_record();

DROP TRIGGER IF EXISTS soft_delete_services ON services;
CREATE TRIGGER soft_delete_services
  BEFORE DELETE ON services
  FOR EACH ROW
  EXECUTE FUNCTION soft_delete_record();

DROP TRIGGER IF EXISTS soft_delete_expenses ON expenses;
CREATE TRIGGER soft_delete_expenses
  BEFORE DELETE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION soft_delete_record();

DROP TRIGGER IF EXISTS soft_delete_blocked_slots ON blocked_slots;
CREATE TRIGGER soft_delete_blocked_slots
  BEFORE DELETE ON blocked_slots
  FOR EACH ROW
  EXECUTE FUNCTION soft_delete_record();