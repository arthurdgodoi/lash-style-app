-- Add new fields to profiles table for message templates
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS professional_name TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS pix_key TEXT;