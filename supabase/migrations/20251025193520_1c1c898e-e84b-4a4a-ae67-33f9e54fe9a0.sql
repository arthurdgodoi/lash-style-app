-- Add salon percentage fields to services table
ALTER TABLE public.services 
ADD COLUMN include_salon_percentage BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN salon_percentage DECIMAL(5, 2);

-- Update existing records to have include_salon_percentage as false
UPDATE public.services SET include_salon_percentage = false WHERE include_salon_percentage IS NULL;