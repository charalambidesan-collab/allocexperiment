import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import TechAppAssignment from "@/components/TechAppAssignment";

export default function AssignTechApps() {
  const [selectedTower, setSelectedTower] = useState<string | undefined>();

  useEffect(() => {
    document.title = "Assign Tech Apps to Services | Cost Allocation Tool";
    const stored = localStorage.getItem("selectedTower");
    if (stored) setSelectedTower(stored);
  }, []);

  return (
    <PageLayout>
      <main className="p-6">
        <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex gap-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 shadow-lg p-4">
            <div className="text-sm font-semibold text-primary mb-3">{selectedTower || "Department"}</div>
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
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-semibold shadow-md text-xs whitespace-nowrap"
              >
                Technology Apps to Services
              </Link>
            </div>
          </div>
          
          <div className="rounded-2xl border border-primary/20 bg-primary/5 shadow-lg p-4 flex-1">
            <div className="text-sm font-semibold text-primary mb-3">Allocate</div>
            <div className="flex gap-4">
              <Link 
                to="/assign-cost-pools" 
                className="px-6 py-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors font-medium text-xs whitespace-nowrap"
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

        {selectedTower ? (
          <section className="rounded-2xl border border-border bg-card shadow-lg p-6 w-full">
            <TechAppAssignment initialTower={selectedTower} />
          </section>
        ) : (
          <section className="rounded-2xl border border-border bg-card shadow-lg p-6 w-full">
            <div className="text-center text-muted-foreground text-xs py-12">
              Select a department from the filters to begin assigning tech apps
            </div>
          </section>
        )}
        </div>
      </main>
    </PageLayout>
  );
}
