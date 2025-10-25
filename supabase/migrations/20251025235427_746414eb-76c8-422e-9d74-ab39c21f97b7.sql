-- Adicionar colunas para porcentagem do salão na tabela appointments
ALTER TABLE appointments 
ADD COLUMN include_salon_percentage boolean DEFAULT false NOT NULL,
ADD COLUMN salon_percentage numeric;