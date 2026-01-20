-- Create activity allocations table
CREATE TABLE public.activity_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tower TEXT NOT NULL,
  service TEXT NOT NULL,
  cost_pool_id TEXT NOT NULL,
  activities JSONB NOT NULL,
  allocation_matrix JSONB NOT NULL,
  activity_totals JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.activity_allocations ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since there's no auth yet)
CREATE POLICY "Anyone can view activity allocations" 
ON public.activity_allocations 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create activity allocations" 
ON public.activity_allocations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update activity allocations" 
ON public.activity_allocations 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete activity allocations" 
ON public.activity_allocations 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_activity_allocations_updated_at
BEFORE UPDATE ON public.activity_allocations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_activity_allocations_tower_service ON public.activity_allocations(tower, service);