-- Adicionar campos de pagamento na tabela appointments
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Criar índice para buscar pagamentos pendentes rapidamente
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status ON appointments(payment_status, user_id) WHERE deleted_at IS NULL;