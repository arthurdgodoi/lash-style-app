-- Create table for booking time slot configurations
CREATE TABLE public.booking_time_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  time_slot TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, time_slot)
);

-- Enable RLS
ALTER TABLE public.booking_time_slots ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own booking time slots"
  ON public.booking_time_slots
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own booking time slots"
  ON public.booking_time_slots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own booking time slots"
  ON public.booking_time_slots
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own booking time slots"
  ON public.booking_time_slots
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create policy for public viewing (for booking page)
CREATE POLICY "Anyone can view active booking time slots"
  ON public.booking_time_slots
  FOR SELECT
  USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_booking_time_slots_updated_at
  BEFORE UPDATE ON public.booking_time_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();