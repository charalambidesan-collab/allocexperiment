-- Drop the old tech_apps table and create new one with correct structure
DROP TABLE IF EXISTS public.tech_apps CASCADE;

-- Create tech_apps table matching the CSV structure
CREATE TABLE public.tech_apps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  area text NOT NULL,
  scenario text NOT NULL,
  department text NOT NULL,
  app text NOT NULL,
  source_le text NOT NULL,
  cost_value numeric NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.tech_apps ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view tech apps"
  ON public.tech_apps
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert tech apps"
  ON public.tech_apps
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update tech apps"
  ON public.tech_apps
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete tech apps"
  ON public.tech_apps
  FOR DELETE
  USING (true);

-- Create index for faster queries
CREATE INDEX idx_tech_apps_department ON public.tech_apps(department);
CREATE INDEX idx_tech_apps_app ON public.tech_apps(app);

-- Create trigger for updated_at
CREATE TRIGGER update_tech_apps_updated_at
  BEFORE UPDATE ON public.tech_apps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create a new table to store tech app assignments (bucket and service assignments)
CREATE TABLE public.tech_app_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  department text NOT NULL,
  app text NOT NULL,
  bucket_type text, -- 'prorata' or 'specific'
  assigned_services jsonb DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE public.tech_app_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view tech app assignments"
  ON public.tech_app_assignments
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert tech app assignments"
  ON public.tech_app_assignments
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update tech app assignments"
  ON public.tech_app_assignments
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete tech app assignments"
  ON public.tech_app_assignments
  FOR DELETE
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_tech_app_assignments_updated_at
  BEFORE UPDATE ON public.tech_app_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();