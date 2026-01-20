import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FilterProvider } from "@/contexts/FilterContext";
import Index from "./pages/Index";
import TowerAnalytics from "./pages/TowerAnalytics";
import AssignServices from "./pages/AssignServices";
import AssignTechApps from "./pages/AssignTechApps";
import AssignCostPools from "./pages/AssignCostPools";
import ActivityAllocation from "./pages/ActivityAllocation";
import MetricInventory from "./pages/MetricInventory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <FilterProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/tower-analytics" element={<TowerAnalytics />} />
            <Route path="/assign-services" element={<AssignServices />} />
            <Route path="/assign-tech-apps" element={<AssignTechApps />} />
            <Route path="/assign-cost-pools" element={<AssignCostPools />} />
            <Route path="/activity-allocation" element={<ActivityAllocation />} />
            <Route path="/metric-inventory" element={<MetricInventory />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </FilterProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
