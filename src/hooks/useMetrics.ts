import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Metric {
  id?: string;
  tower_id: string;
  service_id: string;
  metric_id: string;
  service: string;
  source_le: string;
  name: string;
  franchise_percentages: Record<string, number>;
  selected_years: Record<string, string[]>;
  le_allocations: Record<string, Record<string, Record<string, number>>>;
  active_le_map: Record<string, string[]>;
}

export function useMetrics(towerId: string | undefined, serviceId: string | undefined) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!towerId || !serviceId) {
      setMetrics([]);
      setLoading(false);
      return;
    }

    loadMetrics();
  }, [towerId, serviceId]);

  const loadMetrics = async () => {
    if (!towerId || !serviceId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('metrics')
        .select('*')
        .eq('tower_id', towerId)
        .eq('service_id', serviceId);

      if (error) throw error;
      setMetrics((data || []) as Metric[]);
    } catch (error) {
      console.error('Error loading metrics:', error);
      toast.error('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  const saveMetric = async (metric: Omit<Metric, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('metrics')
        .upsert({
          tower_id: metric.tower_id,
          service_id: metric.service_id,
          metric_id: metric.metric_id,
          service: metric.service,
          source_le: metric.source_le,
          name: metric.name,
          franchise_percentages: metric.franchise_percentages,
          selected_years: metric.selected_years,
          le_allocations: metric.le_allocations,
          active_le_map: metric.active_le_map,
        }, {
          onConflict: 'tower_id,service_id,metric_id'
        })
        .select()
        .single();

      if (error) throw error;
      
      await loadMetrics();
      toast.success('Metric saved successfully');
      return data;
    } catch (error) {
      console.error('Error saving metric:', error);
      toast.error('Failed to save metric');
      throw error;
    }
  };

  const deleteMetric = async (metricId: string) => {
    if (!towerId || !serviceId) return;

    try {
      const { error } = await supabase
        .from('metrics')
        .delete()
        .eq('tower_id', towerId)
        .eq('service_id', serviceId)
        .eq('metric_id', metricId);

      if (error) throw error;
      
      await loadMetrics();
      toast.success('Metric deleted successfully');
    } catch (error) {
      console.error('Error deleting metric:', error);
      toast.error('Failed to delete metric');
      throw error;
    }
  };

  return {
    metrics,
    loading,
    saveMetric,
    deleteMetric,
    refresh: loadMetrics
  };
}
