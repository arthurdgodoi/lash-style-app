-- Create working_hours table to store business hours configuration
CREATE TABLE public.working_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_day_of_week CHECK (day_of_week >= 0 AND day_of_week <= 6)
);

-- Enable RLS
ALTER TABLE public.working_hours ENABLE ROW LEVEL SECURITY;

-- RLS Policies for working_hours
CREATE POLICY "Users can view their own working hours"
ON public.working_hours
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own working hours"
ON public.working_hours
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own working hours"
ON public.working_hours
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own working hours"
ON public.working_hours
FOR DELETE
USING (auth.uid() = user_id);

-- Public can view working hours for booking (needed for public booking page)
CREATE POLICY "Anyone can view active working hours for booking"
ON public.working_hours
FOR SELECT
USING (is_active = true);

-- Add trigger for updated_at
CREATE TRIGGER update_working_hours_updated_at
BEFORE UPDATE ON public.working_hours
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add booking_enabled field to profiles to control public booking
ALTER TABLE public.profiles
ADD COLUMN booking_enabled BOOLEAN NOT NULL DEFAULT false;

-- Add booking_slug to profiles for unique booking URLs
ALTER TABLE public.profiles
ADD COLUMN booking_slug TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_working_hours_user_day ON public.working_hours(user_id, day_of_week);
CREATE INDEX idx_profiles_booking_slug ON public.profiles(booking_slug);