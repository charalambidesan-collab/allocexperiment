import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ServiceAssignmentReviewDialog } from "@/components/ServiceAssignmentReviewDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFilter } from "@/contexts/FilterContext";

// Non-staff expense types and weights for breakdown display

const NON_STAFF_TYPES = [
  "Electricity",
  "Stationary",
  "Amortization",
  "Rent",
  "Maintenance",
  "Travel",
] as const;
type NonStaffKey = typeof NON_STAFF_TYPES[number];

const NON_STAFF_WEIGHTS: Record<NonStaffKey, number> = {
  Electricity: 0.3,
  Stationary: 0.1,
  Amortization: 0.2,
  Rent: 0.2,
  Maintenance: 0.15,
  Travel: 0.05,
};

const splitNonStaff = (amount: number): Record<NonStaffKey, number> => {
  const totalW = Object.values(NON_STAFF_WEIGHTS).reduce((s, v) => s + v, 0) || 1;
  const out: Partial<Record<NonStaffKey, number>> = {};
  let acc = 0;
  const keys = Object.keys(NON_STAFF_WEIGHTS) as NonStaffKey[];
  keys.forEach((k, i) => {
    const part = i < keys.length - 1
      ? Math.round(amount * (NON_STAFF_WEIGHTS[k] / totalW))
      : Math.max(0, amount - acc);
    out[k] = part;
    acc += part;
  });
  return out as Record<NonStaffKey, number>;
};

const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(n);

interface OrgUnitCost {
  org_unit: string;
  source_le: string;
  staff_cost: number;
  non_staff_cost: number;
  fte_value: number;
}

export default function AssignServices() {
  const { selectedFilters } = useFilter();
  const [assignedServiceByOu, setAssignedServiceByOu] = useState<Record<string, string>>({});
  const [originalAssignments, setOriginalAssignments] = useState<Record<string, string>>({});
  const [selectedTower, setSelectedTower] = useState<string | undefined>();
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [hasReviewedChanges, setHasReviewedChanges] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [orgUnitCosts, setOrgUnitCosts] = useState<OrgUnitCost[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);

  useEffect(() => {
    document.title = "Assign Services to Org Units | Cost Allocation Tool";
    const stored = localStorage.getItem("selectedTower");
    if (stored) setSelectedTower(stored);
  }, []);

  // Load org unit costs from database based on filters
  useEffect(() => {
    const loadOrgUnitCosts = async () => {
      if (!selectedTower) return;
      
      try {
        let query = supabase
          .from('org_unit_costs')
          .select('*')
          .eq('tower_id', selectedTower);
        
        if (selectedFilters.area) {
          query = query.eq('area', selectedFilters.area);
        }
        if (selectedFilters.scenario) {
          query = query.eq('scenario', selectedFilters.scenario);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // Aggregate costs by org_unit
        const aggregatedCosts: Record<string, OrgUnitCost> = {};
        data?.forEach(row => {
          if (!aggregatedCosts[row.org_unit]) {
            aggregatedCosts[row.org_unit] = {
              org_unit: row.org_unit,
              source_le: row.source_le,
              staff_cost: 0,
              non_staff_cost: 0,
              fte_value: 0,
            };
          }
          
          // Use expense_type to distinguish Staff from Non-Staff categories
          if (row.expense_type === 'Staff') {
            aggregatedCosts[row.org_unit].staff_cost = Number(row.cost_value);
            aggregatedCosts[row.org_unit].fte_value = Number(row.fte_value);
          } else {
            aggregatedCosts[row.org_unit].non_staff_cost += Number(row.cost_value);
          }
        });
        
        setOrgUnitCosts(Object.values(aggregatedCosts));
      } catch (error) {
        console.error("Failed to load org unit costs:", error);
        toast.error("Failed to load org unit costs");
      }
    };
    
    loadOrgUnitCosts();
  }, [selectedTower, selectedFilters.area, selectedFilters.scenario]);

  // Load available services based on filters
  useEffect(() => {
    const loadServices = async () => {
      if (!selectedTower) return;
      
      try {
        let query = supabase
          .from('services')
          .select('*')
          .eq('tower_id', selectedTower);
        
        if (selectedFilters.area) {
          query = query.eq('area', selectedFilters.area);
        }
        if (selectedFilters.scenario) {
          query = query.eq('scenario', selectedFilters.scenario);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        setAvailableServices(data || []);
      } catch (error) {
        console.error("Failed to load services:", error);
        toast.error("Failed to load services");
      }
    };
    
    loadServices();
  }, [selectedTower, selectedFilters.area, selectedFilters.scenario]);

  const getProviderLE = (ou: string): string => {
    const orgUnit = orgUnitCosts.find(oc => oc.org_unit === ou);
    return orgUnit?.source_le ?? "UK";
  };
  
  const getTotals = (ou: string) => {
    const orgUnit = orgUnitCosts.find(oc => oc.org_unit === ou);
    return { 
      staff: orgUnit?.staff_cost ?? 0, 
      non_staff: orgUnit?.non_staff_cost ?? 0,
      fte: orgUnit?.fte_value ?? 0
    };
  };

  const locations = useMemo(() => {
    const set = new Set<string>();
    orgUnitCosts.forEach((oc) => set.add(oc.source_le));
    return Array.from(set);
  }, [orgUnitCosts]);

  const servicesForTower = useMemo(() => {
    return availableServices.map(s => s.id);
  }, [availableServices]);

  const orgUnitsForTower = useMemo(() => {
    return orgUnitCosts.map(oc => oc.org_unit);
  }, [orgUnitCosts]);
  
  // Filter available services by source_le for each org unit and return distinct by name
  const getAvailableServicesForOrgUnit = (orgUnit: string) => {
    const sourceLe = getProviderLE(orgUnit);
    // Case-insensitive comparison for source_le
    const filtered = availableServices.filter(s => s.source_le.toUpperCase() === sourceLe.toUpperCase());
    
    // Return only distinct services by name
    const uniqueByName = filtered.reduce((acc: any[], current) => {
      const exists = acc.find(item => item.name === current.name);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []);
    
    return uniqueByName;
  };

  useEffect(() => {
    if (!selectedTower) { 
      setAssignedServiceByOu({});
      setOriginalAssignments({});
      return; 
    }
    
    // Load assignments from database
    const loadAssignments = async () => {
      try {
        const { data, error } = await supabase
          .from('org_unit_assignments')
          .select('*')
          .eq('tower_id', selectedTower);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const savedData: Record<string, string> = {};
          data.forEach(assignment => {
            const orgUnit = assignment.org_unit;
            const serviceName = assignment.service_id; // This is actually the service name
            
            // Find the matching service_id for this org unit's location
            const orgUnitLe = getProviderLE(orgUnit);
            const matchingService = availableServices.find(
              s => s.name === serviceName && 
              s.source_le.toUpperCase() === orgUnitLe.toUpperCase()
            );
            
            if (matchingService) {
              savedData[orgUnit] = matchingService.id;
            }
          });
          setAssignedServiceByOu(savedData);
          setOriginalAssignments(savedData);
          return;
        }
      } catch (error) {
        console.error("Failed to load saved assignments:", error);
        toast.error("Failed to load saved assignments");
      }
      
      // If no saved data, default to empty (Unassigned)
      setAssignedServiceByOu({});
      setOriginalAssignments({});
    };

    loadAssignments();
  }, [selectedTower, orgUnitsForTower, availableServices]);

  // Check if there are any changes
  const hasChanges = useMemo(() => {
    return orgUnitsForTower.some(ou => assignedServiceByOu[ou] !== originalAssignments[ou]);
  }, [assignedServiceByOu, originalAssignments, orgUnitsForTower]);

  // Reset review confirmation when assignments change
  useEffect(() => {
    setHasReviewedChanges(false);
    setReviewConfirmed(false);
  }, [assignedServiceByOu]);

  const handleSubmit = async () => {
    if (!selectedTower) return;
    
    try {
      // Find org units whose service assignment has changed
      const changedOrgUnits = orgUnitsForTower.filter(
        ou => assignedServiceByOu[ou] !== originalAssignments[ou]
      );

      // Delete cost pool assignments for org units that changed services
      if (changedOrgUnits.length > 0) {
        const { error: deleteError } = await supabase
          .from('cost_pool_assignments')
          .delete()
          .eq('tower_id', selectedTower)
          .in('org_unit', changedOrgUnits);

        if (deleteError) {
          console.error("Failed to delete cost pool assignments:", deleteError);
          // Continue anyway - not critical
        }
      }

      // Prepare upsert data - save service name instead of service_id
      const assignments = Object.entries(assignedServiceByOu).map(([org_unit, service_id]) => {
        // Find the service to get its name
        const service = availableServices.find(s => s.id === service_id);
        const serviceName = service?.name || service_id;
        
        return {
          tower_id: selectedTower,
          org_unit,
          service_id: serviceName // Store service name in service_id column
        };
      });

      // Upsert all assignments
      const { error } = await supabase
        .from('org_unit_assignments')
        .upsert(assignments, { 
          onConflict: 'tower_id,org_unit',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      setOriginalAssignments(assignedServiceByOu);
      setHasReviewedChanges(false);
      setReviewConfirmed(false);
      toast.success('Service assignments saved successfully!');
    } catch (error) {
      console.error("Failed to save assignments:", error);
      toast.error('Failed to save service assignments');
    }
  };

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

        {selectedTower && (
          <section className="rounded-2xl border border-border bg-card shadow-lg p-6 w-full">
            {locations.map((loc, index) => (
              <div key={loc} className="mt-6 first:mt-0">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs font-bold text-primary">Source LE: {loc}</div>
                  {index === 0 && (
                <div className="flex gap-2">
                  <button 
                    className="px-4 py-2 rounded-xl bg-warning text-warning-foreground font-semibold shadow-sm hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
                    onClick={() => setReviewDialogOpen(true)}
                    disabled={!hasChanges}
                  >
                    Review
                  </button>
                  <button 
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold shadow-sm hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
                    onClick={handleSubmit}
                    disabled={!hasChanges || !hasReviewedChanges}
                  >
                    Submit
                  </button>
                </div>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[0.7rem] table-fixed min-w-[800px]">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-border">
                        <th className="px-4 py-3 w-48 font-semibold">Org Unit</th>
                        <th className="px-4 py-3 w-24 font-semibold text-center">FTE</th>
                        <th className="px-4 py-3 w-36 font-semibold text-center">Staff</th>
                        <th className="px-4 py-3 w-36 font-semibold text-center">Non-staff</th>
                        <th className="px-4 py-3 w-56 font-semibold">Select Service</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orgUnitsForTower
                        .filter((ou) => getProviderLE(ou) === loc)
                        .sort((a, b) => {
                          const aAssigned = assignedServiceByOu[a];
                          const bAssigned = assignedServiceByOu[b];
                          
                          // Unassigned first
                          if (!aAssigned && bAssigned) return -1;
                          if (aAssigned && !bAssigned) return 1;
                          if (!aAssigned && !bAssigned) return 0;
                          
                          // Then sort by service name
                          const aService = availableServices.find(s => s.id === aAssigned);
                          const bService = availableServices.find(s => s.id === bAssigned);
                          const aName = aService?.name || '';
                          const bName = bService?.name || '';
                          return aName.localeCompare(bName);
                        })
                        .map((ou) => {
                        const totals = getTotals(ou);
                        const nonStaffBreakdown = splitNonStaff(totals.non_staff);
                        
                          return (
                            <tr key={`${loc}-${ou}`} className={`border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${!assignedServiceByOu[ou] ? 'bg-warning/10' : ''}`}>
                            <td className="px-4 py-3 font-mono font-medium">{ou}</td>
                            <td className="px-4 py-3 font-semibold text-center">
                              {totals.fte.toFixed(1)}
                            </td>
                            <td className="px-4 py-3 font-semibold text-center">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help underline decoration-dotted">{gbp(totals.staff)}</span>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-card border border-border p-3 shadow-lg">
                                    <div className="text-sm">
                                      <div className="font-bold mb-1 text-primary">Staff Costs</div>
                                      <div className="text-foreground">{gbp(totals.staff)}</div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </td>
                            <td className="px-4 py-3 font-semibold text-center">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help underline decoration-dotted">{gbp(totals.non_staff)}</span>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-card border border-border p-3 shadow-lg">
                                    <div className="text-sm space-y-1">
                                      <div className="font-bold mb-2 text-primary border-b border-border pb-1">Non-Staff Breakdown</div>
                                      {NON_STAFF_TYPES.map((type) => (
                                        <div key={type} className="flex justify-between gap-4">
                                          <span className="text-muted-foreground">{type}:</span>
                                          <span className="font-medium text-foreground">{gbp(nonStaffBreakdown[type])}</span>
                                        </div>
                                      ))}
                                      <div className="flex justify-between gap-4 border-t border-border pt-1 mt-1 font-bold">
                                        <span className="text-primary">Total:</span>
                                        <span className="text-primary">{gbp(totals.non_staff)}</span>
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </td>
                            <td className="px-4 py-3">
                              <select className="w-full rounded-xl border border-input bg-card p-2 focus:ring-2 focus:ring-ring focus:outline-none transition-shadow z-50" value={assignedServiceByOu[ou] || ""} onChange={(e) => setAssignedServiceByOu((m) => ({ ...m, [ou]: e.target.value }))}>
                                <option value="">Unassigned</option>
                                {getAvailableServicesForOrgUnit(ou).map((svc) => (
                                  <option key={`${ou}-${svc.id}`} value={svc.id}>
                                    {svc.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                      {orgUnitsForTower.filter((ou) => getProviderLE(ou) === loc).length === 0 && (
                        <tr><td className="px-4 py-6 text-muted-foreground text-center" colSpan={5}>No org units in this location for the selected tower.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>
        )}

        {!selectedTower && (
          <section className="rounded-2xl border border-border bg-card shadow-lg p-6 w-full">
            <div className="text-center text-muted-foreground py-12">
              Select a tower above to begin assigning services to org units
            </div>
          </section>
        )}
        </div>
      </main>

      <ServiceAssignmentReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        assignments={assignedServiceByOu}
        originalAssignments={originalAssignments}
        selectedTower={selectedTower}
        orgUnits={orgUnitsForTower}
        services={servicesForTower}
        availableServices={availableServices}
        orgUnitCosts={orgUnitCosts}
        confirmed={reviewConfirmed}
        onConfirmReview={(checked) => {
          setReviewConfirmed(checked);
          setHasReviewedChanges(checked);
        }}
      />
    </PageLayout>
  );
}
