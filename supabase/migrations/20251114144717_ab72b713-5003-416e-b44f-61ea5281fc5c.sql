-- Create table for org unit to service assignments
CREATE TABLE public.org_unit_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tower_id text NOT NULL,
  org_unit text NOT NULL,
  service_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tower_id, org_unit)
);

-- Enable Row Level Security
ALTER TABLE public.org_unit_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (matching other tables in the project)
CREATE POLICY "Anyone can view org unit assignments" 
ON public.org_unit_assignments 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert org unit assignments" 
ON public.org_unit_assignments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update org unit assignments" 
ON public.org_unit_assignments 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete org unit assignments" 
ON public.org_unit_assignments 
FOR DELETE 
USING (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_org_unit_assignments_updated_at
BEFORE UPDATE ON public.org_unit_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();