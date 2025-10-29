-- Liberar acesso total para a conta arthurgodoi018@gmail.com
-- Atualizar assinatura existente para plano Premium ativo

UPDATE user_subscriptions
SET 
  status = 'active',
  plan_id = 'c6e73a6b-7aae-4216-afaa-31ad50d70b25',
  current_period_start = NOW(),
  current_period_end = NOW() + INTERVAL '10 years',
  trial_ends_at = NULL,
  updated_at = NOW()
WHERE user_id = 'f8dbcdbb-4452-4d07-ae14-9b1370f0d773';