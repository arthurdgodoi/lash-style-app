-- Atualizar planos com IDs reais do Stripe
UPDATE subscription_plans 
SET 
  stripe_price_id = 'price_1SNYrxRY09dvVqG7yhavq4Hd',
  stripe_product_id = 'prod_TKDI4KZCYtkV09'
WHERE name = 'Básico';

UPDATE subscription_plans 
SET 
  stripe_price_id = 'price_1SNYsDRY09dvVqG7KWz8lN6i',
  stripe_product_id = 'prod_TKDIzUuB9b9aLx'
WHERE name = 'Profissional';

UPDATE subscription_plans 
SET 
  stripe_price_id = 'price_1SNYsQRY09dvVqG7m5dff12j',
  stripe_product_id = 'prod_TKDJIBceCkgvck'
WHERE name = 'Premium';