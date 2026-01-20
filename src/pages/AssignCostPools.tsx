import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import ServiceAllocationMatrix from "@/components/ServiceAllocationMatrix";
import { useFilter } from "@/contexts/FilterContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function AssignCostPools() {
  const [selectedTower, setSelectedTower] = useState<string | undefined>();
  const { selectedService, setSelectedService, selectedFilters } = useFilter();
  const [tempService, setTempService] = useState("");

  useEffect(() => {
    document.title = "Assign Cost Pools | Cost Allocation Tool";
    const stored = localStorage.getItem("selectedTower");
    if (stored) setSelectedTower(stored);
    setTempService(selectedService);
  }, [selectedService]);

  // Fetch available services filtered by tower (department), area, and scenario directly from services
  const { data: servicesForTower = [] } = useQuery({
    queryKey: ["tower-services", selectedTower, selectedFilters],
    queryFn: async () => {
      if (!selectedTower) return [];

      // Build base query from services table
      let serviceQuery = supabase
        .from("services")
        .select("id, name, area, scenario")
        .eq("tower_id", selectedTower);

      // Apply area and scenario filters (case-insensitive)
      if (selectedFilters.area) {
        serviceQuery = serviceQuery.ilike("area", selectedFilters.area);
      }
      if (selectedFilters.scenario) {
        serviceQuery = serviceQuery.ilike("scenario", selectedFilters.scenario);
      }

      const { data: services, error: serviceError } = await serviceQuery;
      if (serviceError) throw serviceError;

      // Return distinct service names (labels), keeping one id per name, sorted by name
      const uniqueByName = new Map<string, { id: string; name: string }>();
      (services || []).forEach((svc: any) => {
        if (svc?.name && !uniqueByName.has(svc.name)) {
          uniqueByName.set(svc.name, { id: svc.id, name: svc.name });
        }
      });

      return Array.from(uniqueByName.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!selectedTower,
  });

  return (
    <PageLayout>
      <main className="p-6">
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex gap-4 px-1">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-primary">{selectedTower || "Department"}</div>
              <div className="flex items-center gap-2 invisible pointer-events-none" aria-hidden="true">
                <select className="rounded-xl border border-input bg-card text-foreground px-3 py-1.5 text-xs">
                  <option>Select Service</option>
                </select>
                <button className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs">
                  Go
                </button>
              </div>
            </div>
            <div className="flex gap-4">
              <Link 
                to="/tower-analytics" 
                className="px-6 py-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors font-medium text-xs whitespace-nowrap"
              >
                Department Analytics
              </Link>
              <Link 
                to="/assign-services" 
                className="px-6 py-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors font-medium text-xs whitespace-nowrap"
              >
                Org Units to Services
              </Link>
              <Link 
                to="/assign-tech-apps" 
                className="px-6 py-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors font-medium text-xs whitespace-nowrap"
              >
                Technology Apps to Services
              </Link>
            </div>
          </div>
          
          <div className="rounded-2xl border border-primary/20 bg-primary/5 shadow-lg p-4 flex-1">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-primary">Allocate</div>
              <div className="flex items-center gap-2">
                <select 
                  className="rounded-xl border border-input bg-card text-foreground px-3 py-1.5 text-xs focus:ring-2 focus:ring-ring focus:outline-none transition-shadow"
                  value={tempService}
                  onChange={(e) => setTempService(e.target.value)}
                >
                  <option value="">Select Service</option>
                  {servicesForTower.map((svc) => (
                    <option key={svc.id} value={svc.name}>{svc.name}</option>
                  ))}
                </select>
                <button 
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity text-xs disabled:opacity-50"
                  disabled={!tempService}
                  onClick={() => setSelectedService(tempService)}
                >
                  Go
                </button>
              </div>
            </div>
            <div className="flex gap-4 px-1">
              <Link 
                to="/assign-cost-pools" 
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-semibold shadow-md text-xs whitespace-nowrap"
              >
                Org Units to Cost Pools
              </Link>
              <Link 
                to="/activity-allocation" 
                className="px-6 py-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors font-medium text-xs whitespace-nowrap"
              >
                Tag your Metrics
              </Link>
              <Link 
                to="/metric-inventory" 
                className="px-6 py-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors font-medium text-xs whitespace-nowrap"
              >
                Metric Inventory
              </Link>
            </div>
          </div>
        </div>

        {selectedTower && (
          <ServiceAllocationMatrix initialTower={selectedTower} startAt="pools" />
        )}
        
        {!selectedTower && (
          <section className="rounded-2xl border border-border bg-card shadow-lg p-6 w-full">
            <div className="text-center text-muted-foreground text-xs py-12">
              Select a department from the home page to begin building cost pools
            </div>
          </section>
        )}
        </div>
      </main>
    </PageLayout>
  );
}
