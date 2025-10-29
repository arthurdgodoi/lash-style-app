-- Atualizar planos com os IDs de produção do Stripe

-- Plano Básico
UPDATE subscription_plans 
SET 
  stripe_price_id = 'price_1SNfY8DCU73sHDYp05ZT3NEW',
  stripe_product_id = 'prod_TKKCUDy8feB95s'
WHERE name = 'Básico';

-- Plano Profissional
UPDATE subscription_plans 
SET 
  stripe_price_id = 'price_1SNfYeDCU73sHDYpQHREqOni',
  stripe_product_id = 'prod_TKKDWHRE7223Ea'
WHERE name = 'Profissional';

-- Plano Premium
UPDATE subscription_plans 
SET 
  stripe_price_id = 'price_1SNfYuDCU73sHDYpkSQAzbXf',
  stripe_product_id = 'prod_TKKDb0AvxzNBRz'
WHERE name = 'Premium';