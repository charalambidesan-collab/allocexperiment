-- Create table for cost pool assignments
CREATE TABLE IF NOT EXISTS public.cost_pool_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  tower_id text NOT NULL,
  service_id text NOT NULL,
  org_unit text NOT NULL,
  cost_pool_id text NOT NULL,
  UNIQUE(tower_id, service_id, org_unit)
);

-- Enable RLS
ALTER TABLE public.cost_pool_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view cost pool assignments" 
ON public.cost_pool_assignments 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert cost pool assignments" 
ON public.cost_pool_assignments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update cost pool assignments" 
ON public.cost_pool_assignments 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete cost pool assignments" 
ON public.cost_pool_assignments 
FOR DELETE 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_cost_pool_assignments_updated_at
BEFORE UPDATE ON public.cost_pool_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();