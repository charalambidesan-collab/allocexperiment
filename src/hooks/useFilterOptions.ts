import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FilterOptions {
  areas: string[];
  towers: string[];
  scenarios: string[];
}

export function useFilterOptions() {
  return useQuery({
    queryKey: ["filter-options"],
    queryFn: async (): Promise<FilterOptions> => {
      const { data, error } = await supabase
        .from("services")
        .select("area, tower_id, scenario");

      if (error) throw error;

      // Extract unique values
      const areas = [...new Set(data.map((item) => item.area).filter(Boolean))].sort();
      const towers = [...new Set(data.map((item) => item.tower_id).filter(Boolean))].sort();
      const scenarios = [...new Set(data.map((item) => item.scenario).filter(Boolean))].sort();

      return {
        areas,
        towers,
        scenarios,
      };
    },
  });
}
