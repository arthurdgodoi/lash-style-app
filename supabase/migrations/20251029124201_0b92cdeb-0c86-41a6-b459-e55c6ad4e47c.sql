-- Corrigir warning de search_path na função soft_delete_record
CREATE OR REPLACE FUNCTION soft_delete_record()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;