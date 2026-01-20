import { useState, useEffect } from "react";
import { useFilterOptions } from "@/hooks/useFilterOptions";

interface GlobalFiltersProps {
  onFiltersChange: (filters: { tower?: string; scenario?: string; area?: string }) => void;
}

export default function GlobalFilters({ onFiltersChange }: GlobalFiltersProps) {
  const { data: filterOptions, isLoading, error } = useFilterOptions();

  useEffect(() => {
    if (filterOptions) {
      // Debug: show fetched options
      console.log("Filter options loaded", filterOptions);
    }
    if (error) {
      console.error("Failed to load filter options", error);
    }
  }, [filterOptions, error]);
  const [area, setArea] = useState<string | undefined>(() => {
    try {
      return localStorage.getItem("selectedArea") || undefined;
    } catch {
      return undefined;
    }
  });

  const [tower, setTower] = useState<string | undefined>(() => {
    try {
      return localStorage.getItem("selectedTower") || undefined;
    } catch {
      return undefined;
    }
  });

  const [scenario, setScenario] = useState<string | undefined>(() => {
    try {
      return localStorage.getItem("selectedScenario") || undefined;
    } catch {
      return undefined;
    }
  });

  const handleSearch = () => {
    if (tower) {
      localStorage.setItem("selectedTower", tower);
    }
    if (area) {
      localStorage.setItem("selectedArea", area);
    }
    if (scenario) {
      localStorage.setItem("selectedScenario", scenario);
    }
    onFiltersChange({ tower, scenario, area });
  };

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-border bg-card shadow-lg p-6 w-full">
        <div className="text-center text-muted-foreground">Loading filter options...</div>
      </section>
    );
  }

  if (!filterOptions) {
    return (
      <section className="rounded-2xl border border-border bg-card shadow-lg p-6 w-full">
        <div className="text-center text-muted-foreground">No filter data found. Please ensure services are loaded.</div>
      </section>
    );
  }

  const areas = filterOptions.areas || [];
  const towers = filterOptions.towers || [];
  const scenarios = filterOptions.scenarios || [];

  return (
    <section className="rounded-2xl border border-border bg-card shadow-lg p-6 w-full">
      <div className="grid gap-4 md:grid-cols-[1.3fr_2fr_2fr_1.2fr] items-end">
        <div>
          <label className="text-sm font-semibold text-foreground">Area</label>
          <select 
            className="mt-2 w-full rounded-xl border border-input bg-card text-foreground text-sm p-3 focus:ring-2 focus:ring-ring focus:outline-none transition-shadow"
            value={area || ""} 
            onChange={(e) => setArea(e.target.value || undefined)}
            disabled={isLoading}
          >
            <option value="" disabled>Select an area</option>
            {areas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground">Department</label>
          <select 
            className="mt-2 w-full rounded-xl border border-input bg-card text-foreground text-sm p-3 focus:ring-2 focus:ring-ring focus:outline-none transition-shadow"
            value={tower || ""} 
            onChange={(e) => setTower(e.target.value || undefined)}
            disabled={isLoading}
          >
            <option value="" disabled>Select a department</option>
            {towers.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground">Scenario</label>
          <select 
            className="mt-2 w-full rounded-xl border border-input bg-card text-foreground text-sm p-3 focus:ring-2 focus:ring-ring focus:outline-none transition-shadow" 
            value={scenario || ""} 
            onChange={(e) => setScenario(e.target.value || undefined)}
            disabled={isLoading}
          >
            <option value="" disabled>Select a scenario</option>
            {scenarios.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button 
            className="rounded-xl bg-primary text-primary-foreground px-6 py-3 font-semibold hover:opacity-90 transition-opacity shadow-md disabled:opacity-50 w-full" 
            disabled={!tower || !area || !scenario || isLoading}
            onClick={handleSearch}
          >
            Search
          </button>
        </div>
      </div>
    </section>
  );
}
