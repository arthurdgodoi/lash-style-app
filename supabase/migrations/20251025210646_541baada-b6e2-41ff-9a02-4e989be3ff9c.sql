-- Create blocked_slots table for blocking specific time slots or entire days
CREATE TABLE public.blocked_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  blocked_date DATE NOT NULL,
  blocked_time TIME,
  is_full_day BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own blocked slots"
ON public.blocked_slots
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own blocked slots"
ON public.blocked_slots
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own blocked slots"
ON public.blocked_slots
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blocked slots"
ON public.blocked_slots
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_blocked_slots_updated_at
BEFORE UPDATE ON public.blocked_slots
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();