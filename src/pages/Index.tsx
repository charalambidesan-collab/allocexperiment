import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import GlobalFilters from "@/components/GlobalFilters";
import { useFilter } from "@/contexts/FilterContext";

const Index = () => {
  const { isFilterSelected, selectedFilters, setFilters } = useFilter();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Cost Allocation Front Door";
  }, []);
  const handleFiltersChange = (filters: { tower?: string; scenario?: string; area?: string }) => {
    setFilters(filters);
    navigate("/tower-analytics");
  };

  if (!isFilterSelected) {
    return (
      <main className="min-h-screen w-full bg-background flex items-center justify-center p-6">
        <div className="mx-auto max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Cost Allocation Front Door</h1>
            <p className="text-muted-foreground">Please select your filters to begin</p>
          </div>
          <GlobalFilters 
            onFiltersChange={handleFiltersChange}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex gap-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 shadow-lg p-4">
            <div className="text-sm font-semibold text-primary mb-3">{selectedFilters.tower || "Department"}</div>
            <div className="flex gap-4 px-1">
              <Link 
                to="/tower-analytics" 
                className="px-6 py-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors font-medium text-xs whitespace-nowrap"
              >
                Department Analytics
              </Link>
              <Link 
                to="/assign-services" 
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-semibold shadow-md text-xs whitespace-nowrap"
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
            <div className="text-sm font-semibold text-primary mb-3">Allocate</div>
            <div className="flex gap-4 px-1">
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
      </div>
    </main>
  );
};

export default Index;
