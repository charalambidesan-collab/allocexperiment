import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Activity {
  id?: string;
  tower_id: string;
  service_id: string;
  cost_pool_id: string;
  activity_id: string;
  name: string;
  metric_id?: string;
}

export function useActivities(
  towerId: string | undefined,
  serviceId: string | undefined,
  costPoolId: string | undefined
) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!towerId || !serviceId || !costPoolId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    loadActivities();
  }, [towerId, serviceId, costPoolId]);

  const loadActivities = async () => {
    if (!towerId || !serviceId || !costPoolId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('tower_id', towerId)
        .eq('service_id', serviceId)
        .eq('cost_pool_id', costPoolId);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
      toast.error('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const saveActivity = async (activity: Omit<Activity, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .upsert({
          tower_id: activity.tower_id,
          service_id: activity.service_id,
          cost_pool_id: activity.cost_pool_id,
          activity_id: activity.activity_id,
          name: activity.name,
          metric_id: activity.metric_id,
        }, {
          onConflict: 'tower_id,service_id,cost_pool_id,activity_id'
        })
        .select()
        .single();

      if (error) throw error;
      
      await loadActivities();
      toast.success('Activity saved successfully');
      return data;
    } catch (error) {
      console.error('Error saving activity:', error);
      toast.error('Failed to save activity');
      throw error;
    }
  };

  const deleteActivity = async (activityId: string) => {
    if (!towerId || !serviceId || !costPoolId) return;

    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('tower_id', towerId)
        .eq('service_id', serviceId)
        .eq('cost_pool_id', costPoolId)
        .eq('activity_id', activityId);

      if (error) throw error;
      
      await loadActivities();
      toast.success('Activity deleted successfully');
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error('Failed to delete activity');
      throw error;
    }
  };

  return {
    activities,
    loading,
    saveActivity,
    deleteActivity,
    refresh: loadActivities
  };
}
