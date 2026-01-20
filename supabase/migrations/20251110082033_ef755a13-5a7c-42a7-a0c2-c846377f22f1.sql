-- Create tables for persistent storage of allocation data

-- Towers table
CREATE TABLE public.towers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Services table
CREATE TABLE public.services (
  id TEXT PRIMARY KEY,
  tower_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cost pools table
CREATE TABLE public.cost_pools (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Metrics table with franchise percentages and LE allocations
CREATE TABLE public.metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tower_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  metric_id TEXT NOT NULL,
  service TEXT NOT NULL,
  source_le TEXT NOT NULL,
  name TEXT NOT NULL,
  franchise_percentages JSONB NOT NULL DEFAULT '{}',
  selected_years JSONB NOT NULL DEFAULT '{}',
  le_allocations JSONB NOT NULL DEFAULT '{}',
  active_le_map JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tower_id, service_id, metric_id)
);

-- Activities table
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tower_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  cost_pool_id TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  name TEXT NOT NULL,
  metric_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tower_id, service_id, cost_pool_id, activity_id)
);

-- Tech apps table
CREATE TABLE public.tech_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tower_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  app_name TEXT NOT NULL,
  assignments JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tower_id, service_id, app_name)
);

-- Enable RLS on all tables
ALTER TABLE public.towers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_apps ENABLE ROW LEVEL SECURITY;

-- Create public access policies (since this is a public-facing app)
CREATE POLICY "Anyone can view towers" ON public.towers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert towers" ON public.towers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update towers" ON public.towers FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete towers" ON public.towers FOR DELETE USING (true);

CREATE POLICY "Anyone can view services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Anyone can insert services" ON public.services FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update services" ON public.services FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete services" ON public.services FOR DELETE USING (true);

CREATE POLICY "Anyone can view cost pools" ON public.cost_pools FOR SELECT USING (true);
CREATE POLICY "Anyone can insert cost pools" ON public.cost_pools FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update cost pools" ON public.cost_pools FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete cost pools" ON public.cost_pools FOR DELETE USING (true);

CREATE POLICY "Anyone can view metrics" ON public.metrics FOR SELECT USING (true);
CREATE POLICY "Anyone can insert metrics" ON public.metrics FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update metrics" ON public.metrics FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete metrics" ON public.metrics FOR DELETE USING (true);

CREATE POLICY "Anyone can view activities" ON public.activities FOR SELECT USING (true);
CREATE POLICY "Anyone can insert activities" ON public.activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update activities" ON public.activities FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete activities" ON public.activities FOR DELETE USING (true);

CREATE POLICY "Anyone can view tech apps" ON public.tech_apps FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tech apps" ON public.tech_apps FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tech apps" ON public.tech_apps FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete tech apps" ON public.tech_apps FOR DELETE USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_towers_updated_at
  BEFORE UPDATE ON public.towers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cost_pools_updated_at
  BEFORE UPDATE ON public.cost_pools
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_metrics_updated_at
  BEFORE UPDATE ON public.metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tech_apps_updated_at
  BEFORE UPDATE ON public.tech_apps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();