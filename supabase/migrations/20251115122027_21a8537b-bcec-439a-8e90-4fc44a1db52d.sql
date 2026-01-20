-- Create table for org unit costs
CREATE TABLE public.org_unit_costs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  area text NOT NULL,
  scenario text NOT NULL,
  tower_id text NOT NULL,
  source_le text NOT NULL,
  org_unit text NOT NULL,
  expense_group text NOT NULL,
  expense_type text NOT NULL,
  cost_value numeric NOT NULL DEFAULT 0,
  fte_value numeric NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.org_unit_costs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view org unit costs" 
ON public.org_unit_costs 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert org unit costs" 
ON public.org_unit_costs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update org unit costs" 
ON public.org_unit_costs 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete org unit costs" 
ON public.org_unit_costs 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_org_unit_costs_updated_at
BEFORE UPDATE ON public.org_unit_costs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for common queries
CREATE INDEX idx_org_unit_costs_tower ON public.org_unit_costs(tower_id);
CREATE INDEX idx_org_unit_costs_org_unit ON public.org_unit_costs(org_unit);