import { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveContainer, Sankey, Tooltip as RechartsTooltip, Rectangle } from "recharts";
import { AlertCircle } from "lucide-react";

// Franchise colors (matching AllocationReviewDialog)
const FRANCHISE_COLORS: Record<string, string> = {
  "Franchise A": "#3b82f6",
  "Franchise B": "#10b981",
  "Franchise C": "#f59e0b",
  "Franchise D": "#ef4444",
  "Franchise E": "#8b5cf6",
  "Franchise F": "#ec4899",
  "Franchise G": "#6366f1"
};

const LE_COLORS = ["#06b6d4", "#14b8a6", "#84cc16", "#eab308", "#f97316", "#f43f5e", "#a855f7", "#6366f1", "#8b5cf6", "#ec4899"];

// Custom Sankey node component
const SankeyNode = ({ x, y, width, height, payload, containerWidth }: any) => {
  const isOut = x + width + 6 > containerWidth;
  const fill = payload.color || "#94a3b8";
  return (
    <g>
      <Rectangle x={x} y={y} width={width} height={height} fill={fill} fillOpacity="1" stroke="hsl(var(--border))" strokeWidth={1} />
      <text textAnchor={isOut ? "end" : "start"} x={isOut ? x - 6 : x + width + 6} y={y + height / 2} fontSize="14" fill="hsl(var(--foreground))" dominantBaseline="middle">
        {payload.name}
      </text>
    </g>
  );
};

export default function TowerAnalytics() {
  const location = useLocation();
  const [selectedTower, setSelectedTower] = useState<string | undefined>();
  const [allocationData, setAllocationData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [unassignedOrgUnits, setUnassignedOrgUnits] = useState<string[]>([]);
  const [unassignedTechApps, setUnassignedTechApps] = useState<number>(0);
  const [orgUnitsWithoutCostPools, setOrgUnitsWithoutCostPools] = useState<string[]>([]);
  const [orgUnitServiceMap, setOrgUnitServiceMap] = useState<Record<string, string>>({});
  const [costPools, setCostPools] = useState<any[]>([]);
  const [costPoolsWithoutActivities, setCostPoolsWithoutActivities] = useState<string[]>([]);
  const [orgUnitCostsDetailed, setOrgUnitCostsDetailed] = useState<any[]>([]);
  const [costPoolAssignmentsDetailed, setCostPoolAssignmentsDetailed] = useState<any[]>([]);

  useEffect(() => {
    document.title = "Department Analytics | Cost Allocation Tool";
    const stored = localStorage.getItem("selectedTower");
    if (stored) setSelectedTower(stored);
  }, []);

  // Load data when tower is selected
  useEffect(() => {
    if (!selectedTower) return;
    
    const loadData = async () => {
      try {
        // Load activity allocations for all services in this tower
        const { data: allocations } = await supabase
          .from('activity_allocations')
          .select('*')
          .eq('tower', selectedTower);
        
        setAllocationData(allocations || []);

        // Load metrics for this tower
        const { data: metricsData } = await supabase
          .from('metrics')
          .select('*')
          .eq('tower_id', selectedTower);
        
        setMetrics(metricsData || []);

        // Load services for this tower
        const { data: servicesData } = await supabase
          .from('services')
          .select('*')
          .eq('tower_id', selectedTower);
        
        setServices(servicesData || []);

        // Load cost pools - extract unique service names from services in this tower
        const serviceNames = [...new Set((servicesData || []).map(s => s.name))];
        const { data: costPoolsData } = await supabase
          .from('cost_pools')
          .select('*')
          .in('service_id', serviceNames);
        
        setCostPools(costPoolsData || []);

        // Find cost pools without activity allocations
        const costPoolsWithAllocations = new Set((allocations || []).map(a => a.cost_pool_id));
        const costPoolsWithoutAllocations = (costPoolsData || [])
          .filter(cp => !costPoolsWithAllocations.has(cp.id))
          .map(cp => `${cp.service_id}_${cp.name}_${cp.source_le}`);
        setCostPoolsWithoutActivities(costPoolsWithoutAllocations);

        // Calculate actual unassigned org units - fetch full cost details
        const { data: orgUnitCosts } = await supabase
          .from('org_unit_costs')
          .select('*')
          .eq('tower_id', selectedTower);

        setOrgUnitCostsDetailed(orgUnitCosts || []);

        const { data: orgUnitAssignments } = await supabase
          .from('org_unit_assignments')
          .select('org_unit, service_id')
          .eq('tower_id', selectedTower);

        const assignedOrgUnits = new Set((orgUnitAssignments || []).map(a => a.org_unit));
        const allOrgUnits = [...new Set((orgUnitCosts || []).map(c => c.org_unit))];
        const unassigned = allOrgUnits.filter(ou => !assignedOrgUnits.has(ou));
        setUnassignedOrgUnits(unassigned);

        // Build org unit to service map
        const ouServiceMap: Record<string, string> = {};
        (orgUnitAssignments || []).forEach((assignment: any) => {
          ouServiceMap[assignment.org_unit] = assignment.service_id;
        });
        setOrgUnitServiceMap(ouServiceMap);

        // Calculate org units without cost pool assignments - fetch full assignment details
        const { data: costPoolAssignments } = await supabase
          .from('cost_pool_assignments')
          .select('*')
          .eq('tower_id', selectedTower);

        setCostPoolAssignmentsDetailed(costPoolAssignments || []);

        const orgUnitsWithCostPools = new Set((costPoolAssignments || []).map(a => a.org_unit));
        const orgUnitsWithoutPools = allOrgUnits.filter(ou => assignedOrgUnits.has(ou) && !orgUnitsWithCostPools.has(ou));
        setOrgUnitsWithoutCostPools(orgUnitsWithoutPools);

        // Calculate unassigned tech apps
        const { data: techApps } = await supabase
          .from('tech_apps')
          .select('app')
          .eq('department', selectedTower);

        const { data: techAppAssignments } = await supabase
          .from('tech_app_assignments')
          .select('app')
          .eq('department', selectedTower);

        const assignedApps = new Set((techAppAssignments || []).map(a => a.app));
        const allApps = [...new Set((techApps || []).map(a => a.app))];
        const unassignedAppsCount = allApps.filter(app => !assignedApps.has(app)).length;
        setUnassignedTechApps(unassignedAppsCount);
        
      } catch (error) {
        console.error('Error loading department analytics:', error);
      }
    };

    loadData();
  }, [selectedTower]);

  // Subscribe to real-time updates for activity allocations
  useEffect(() => {
    if (!selectedTower) return;

    const channel = supabase
      .channel('activity-allocations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_allocations',
          filter: `tower=eq.${selectedTower}`
        },
        (payload) => {
          console.log('Activity allocation change detected:', payload);
          // Reload all data when changes occur
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

    async function loadData() {
      try {
        // Load activity allocations for all services in this tower
        const { data: allocations } = await supabase
          .from('activity_allocations')
          .select('*')
          .eq('tower', selectedTower);
        
        setAllocationData(allocations || []);

        // Load metrics for this tower
        const { data: metricsData } = await supabase
          .from('metrics')
          .select('*')
          .eq('tower_id', selectedTower);
        
        setMetrics(metricsData || []);

        // Load services for this tower
        const { data: servicesData } = await supabase
          .from('services')
          .select('*')
          .eq('tower_id', selectedTower);
        
        setServices(servicesData || []);

        // Load cost pools - extract unique service names from services in this tower
        const serviceNames = [...new Set((servicesData || []).map(s => s.name))];
        const { data: costPoolsData } = await supabase
          .from('cost_pools')
          .select('*')
          .in('service_id', serviceNames);
        
        setCostPools(costPoolsData || []);

        // Find cost pools without activity allocations
        const costPoolsWithAllocations = new Set((allocations || []).map(a => a.cost_pool_id));
        const costPoolsWithoutAllocations = (costPoolsData || [])
          .filter(cp => !costPoolsWithAllocations.has(cp.id))
          .map(cp => `${cp.service_id}_${cp.name}_${cp.source_le}`);
        setCostPoolsWithoutActivities(costPoolsWithoutAllocations);

        // Calculate actual unassigned org units - fetch full cost details
        const { data: orgUnitCosts } = await supabase
          .from('org_unit_costs')
          .select('*')
          .eq('tower_id', selectedTower);

        setOrgUnitCostsDetailed(orgUnitCosts || []);

        const { data: orgUnitAssignments } = await supabase
          .from('org_unit_assignments')
          .select('org_unit, service_id')
          .eq('tower_id', selectedTower);

        const assignedOrgUnits = new Set((orgUnitAssignments || []).map(a => a.org_unit));
        const allOrgUnits = [...new Set((orgUnitCosts || []).map(c => c.org_unit))];
        const unassigned = allOrgUnits.filter(ou => !assignedOrgUnits.has(ou));
        setUnassignedOrgUnits(unassigned);

        // Build org unit to service map
        const ouServiceMap: Record<string, string> = {};
        (orgUnitAssignments || []).forEach((assignment: any) => {
          ouServiceMap[assignment.org_unit] = assignment.service_id;
        });
        setOrgUnitServiceMap(ouServiceMap);

        // Calculate org units without cost pool assignments - fetch full assignment details
        const { data: costPoolAssignments } = await supabase
          .from('cost_pool_assignments')
          .select('*')
          .eq('tower_id', selectedTower);

        setCostPoolAssignmentsDetailed(costPoolAssignments || []);

        const orgUnitsWithCostPools = new Set((costPoolAssignments || []).map(a => a.org_unit));
        const orgUnitsWithoutPools = allOrgUnits.filter(ou => assignedOrgUnits.has(ou) && !orgUnitsWithCostPools.has(ou));
        setOrgUnitsWithoutCostPools(orgUnitsWithoutPools);

        // Calculate unassigned tech apps
        const { data: techApps } = await supabase
          .from('tech_apps')
          .select('app')
          .eq('department', selectedTower);

        const { data: techAppAssignments } = await supabase
          .from('tech_app_assignments')
          .select('app')
          .eq('department', selectedTower);

        const assignedApps = new Set((techAppAssignments || []).map(a => a.app));
        const allApps = [...new Set((techApps || []).map(a => a.app))];
        const unassignedAppsCount = allApps.filter(app => !assignedApps.has(app)).length;
        setUnassignedTechApps(unassignedAppsCount);
        
      } catch (error) {
        console.error('Error loading department analytics:', error);
      }
    }
  }, [selectedTower]);

  // Recalculate activity totals from current assignments and costs
  const recalculatedTotals = useMemo(() => {
    const totalsMap = new Map<string, Record<string, number>>(); // allocationId -> { activityId -> total }

    allocationData.forEach(allocation => {
      const poolId = allocation.cost_pool_id;
      const activities = allocation.activities || [];
      const allocationMatrix = allocation.allocation_matrix || {};
      
      // Get org units assigned to this cost pool
      const assignedOrgUnits = costPoolAssignmentsDetailed.filter(
        (a: any) => a.cost_pool_id === poolId
      );

      // Calculate total cost for this pool
      let totalStaff = 0;
      let totalNonStaff = 0;

      assignedOrgUnits.forEach((assignment: any) => {
        const ouCosts = orgUnitCostsDetailed.filter(
          (c: any) => c.org_unit === assignment.org_unit
        );
        
        ouCosts.forEach((cost: any) => {
          if (cost.expense_group === 'Staff') {
            totalStaff += cost.cost_value || 0;
          } else {
            totalNonStaff += cost.cost_value || 0;
          }
        });
      });

      // Calculate totals per activity based on allocation percentages
      const activityTotals: Record<string, number> = {};
      
      activities.forEach((activity: any) => {
        const allocPerc = allocationMatrix[activity.id] || {};
        const staffPerc = allocPerc.Staff || 0;
        const nonStaffPerc = (allocPerc.Electricity || 0); // Use average of non-staff
        
        const staffAlloc = totalStaff * staffPerc / 100;
        const nonStaffAlloc = totalNonStaff * nonStaffPerc / 100;
        
        activityTotals[activity.id] = Math.round(staffAlloc + nonStaffAlloc);
      });

      totalsMap.set(allocation.id, activityTotals);
    });

    return totalsMap;
  }, [allocationData, costPoolAssignmentsDetailed, orgUnitCostsDetailed]);

  // Build Sankey data for Services → Franchises → LEs
  const sankeyData = useMemo(() => {
    const nodes: Array<{ name: string; color?: string; costPoolBreakdown?: Record<string, number> }> = [];
    const links: Array<{ source: number; target: number; value: number }> = [];
    const nodeIndexMap = new Map<string, number>();
    const leColorMap = new Map<string, string>();
    let leColorIndex = 0;

    const getNodeIndex = (name: string, color?: string) => {
      if (nodeIndexMap.has(name)) return nodeIndexMap.get(name)!;
      const index = nodes.length;
      nodes.push({ name, color });
      nodeIndexMap.set(name, index);
      return index;
    };

    const getLEColor = (leName: string) => {
      if (leColorMap.has(leName)) return leColorMap.get(leName)!;
      const color = LE_COLORS[leColorIndex % LE_COLORS.length];
      leColorMap.set(leName, color);
      leColorIndex++;
      return color;
    };

    // Track service → franchise → LE flows
    const serviceToFranchise = new Map<string, Map<string, number>>();
    const franchiseToLE = new Map<string, Map<string, number>>();
    
    // Track cost pool contributions to franchises and LEs
    const franchiseCostPoolContributions = new Map<string, Map<string, number>>();
    const leCostPoolContributions = new Map<string, Map<string, number>>();

    allocationData.forEach(allocation => {
      const serviceName = allocation.service;
      const activities = allocation.activities || [];
      const activityTotals = recalculatedTotals.get(allocation.id) || {};
      const costPoolId = allocation.cost_pool_id;
      const costPool = costPools.find(cp => cp.id === costPoolId);
      const costPoolName = costPool ? `${costPool.service_id} - ${costPool.name}` : costPoolId;

      if (!serviceToFranchise.has(serviceName)) {
        serviceToFranchise.set(serviceName, new Map());
      }
      const franchiseMap = serviceToFranchise.get(serviceName)!;

      activities.forEach((activity: any) => {
        const total = activityTotals[activity.id] || 0;
        if (total === 0 || !activity.metricId) return;

        const metric = metrics.find(m => m.metric_id === activity.metricId);
        if (!metric) return;

        const franchisePerc = metric.franchise_percentages || {};
        const leAllocations = metric.le_allocations || {};

        Object.entries(franchisePerc).forEach(([franchise, perc]: [string, any]) => {
          if (perc === 0) return;
          const franchiseAmount = total * perc / 100;
          
          // Service → Franchise
          franchiseMap.set(franchise, (franchiseMap.get(franchise) || 0) + franchiseAmount);

          // Track cost pool contribution to franchise
          if (!franchiseCostPoolContributions.has(franchise)) {
            franchiseCostPoolContributions.set(franchise, new Map());
          }
          const franchiseCostPools = franchiseCostPoolContributions.get(franchise)!;
          franchiseCostPools.set(costPoolName, (franchiseCostPools.get(costPoolName) || 0) + franchiseAmount);

          // Franchise → LE
          const franchiseLEAlloc = leAllocations[franchise] || {};
          Object.entries(franchiseLEAlloc).forEach(([leOption, leData]: [string, any]) => {
            const leMetricPerc = leData[metric.metric_id] || 0;
            if (leMetricPerc === 0) return;
            const leAmount = franchiseAmount * leMetricPerc / 100;
            
            if (!franchiseToLE.has(franchise)) franchiseToLE.set(franchise, new Map());
            const leMap = franchiseToLE.get(franchise)!;
            const leName = `LE: ${leOption.toUpperCase()}`;
            leMap.set(leName, (leMap.get(leName) || 0) + leAmount);
            
            // Track cost pool contribution to LE
            if (!leCostPoolContributions.has(leName)) {
              leCostPoolContributions.set(leName, new Map());
            }
            const leCostPools = leCostPoolContributions.get(leName)!;
            leCostPools.set(costPoolName, (leCostPools.get(costPoolName) || 0) + leAmount);
          });
        });
      });
    });

    // Build nodes and links: Services → Franchises
    serviceToFranchise.forEach((franchiseMap, serviceName) => {
      // Calculate total value for this service across all franchises
      const totalServiceValue = Array.from(franchiseMap.values()).reduce((sum, val) => sum + val, 0);
      
      // Skip services with no costs
      if (totalServiceValue <= 0) return;
      
      const serviceIndex = getNodeIndex(serviceName, "#64748b");
      
      franchiseMap.forEach((value, franchise) => {
        if (value > 0) {
          const franchiseIndex = getNodeIndex(franchise, FRANCHISE_COLORS[franchise] || "#94a3b8");
          
          // Add cost pool breakdown to franchise node
          const costPoolBreakdown: Record<string, number> = {};
          const contributions = franchiseCostPoolContributions.get(franchise);
          if (contributions) {
            contributions.forEach((amount, costPoolName) => {
              costPoolBreakdown[costPoolName] = amount;
            });
          }
          nodes[franchiseIndex].costPoolBreakdown = costPoolBreakdown;
          
          links.push({ source: serviceIndex, target: franchiseIndex, value: Math.round(value) });
        }
      });
    });

    // Build links: Franchises → LEs
    franchiseToLE.forEach((leMap, franchise) => {
      const franchiseIndex = getNodeIndex(franchise, FRANCHISE_COLORS[franchise] || "#94a3b8");
      leMap.forEach((value, le) => {
        if (value > 0) {
          const leIndex = getNodeIndex(le, getLEColor(le));
          
          // Add cost pool breakdown to LE node
          const costPoolBreakdown: Record<string, number> = {};
          const contributions = leCostPoolContributions.get(le);
          if (contributions) {
            contributions.forEach((amount, costPoolName) => {
              costPoolBreakdown[costPoolName] = amount;
            });
          }
          nodes[leIndex].costPoolBreakdown = costPoolBreakdown;
          
          links.push({ source: franchiseIndex, target: leIndex, value: Math.round(value) });
        }
      });
    });

    return { nodes, links };
  }, [allocationData, metrics, recalculatedTotals]);

  // Calculate total financial impact
  const totalFinancialImpact = useMemo(() => {
    return allocationData.reduce((sum, allocation) => {
      const activityTotals = recalculatedTotals.get(allocation.id) || {};
      return sum + Object.values(activityTotals).reduce((a: number, b: any) => a + (b || 0), 0);
    }, 0);
  }, [allocationData, recalculatedTotals]);

  // Calculate franchise totals for department breakdown
  const franchiseTotals = useMemo(() => {
    const totals = {
      "Franchise A": 0,
      "Franchise B": 0,
      "Franchise C": 0,
      "Franchise D": 0,
      "Franchise E": 0,
      "Franchise F": 0,
      "Franchise G": 0,
    };

    allocationData.forEach((allocation) => {
      const costPool = costPools.find(cp => cp.id === allocation.cost_pool_id);
      if (!costPool) return;
      
      const activities = allocation.activities || [];
      const activityTotals = recalculatedTotals.get(allocation.id) || {};
      
      activities.forEach((activity: any) => {
        const total = activityTotals[activity.id] || 0;
        if (total === 0) return;

        const metric = metrics.find(m => m.metric_id === activity.metricId);
        const franchisePerc = metric?.franchise_percentages || {};
        
        // Add to franchise totals
        totals["Franchise A"] += total * (franchisePerc["Franchise A"] || 0) / 100;
        totals["Franchise B"] += total * (franchisePerc["Franchise B"] || 0) / 100;
        totals["Franchise C"] += total * (franchisePerc["Franchise C"] || 0) / 100;
        totals["Franchise D"] += total * (franchisePerc["Franchise D"] || 0) / 100;
        totals["Franchise E"] += total * (franchisePerc["Franchise E"] || 0) / 100;
        totals["Franchise F"] += total * (franchisePerc["Franchise F"] || 0) / 100;
        totals["Franchise G"] += total * (franchisePerc["Franchise G"] || 0) / 100;
      });
    });

    return totals;
  }, [allocationData, recalculatedTotals, costPools, metrics]);

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
                className={`px-6 py-3 rounded-xl transition-opacity text-xs whitespace-nowrap ${
                  location.pathname === "/tower-analytics"
                    ? "bg-primary text-primary-foreground hover:opacity-90 font-semibold shadow-md"
                    : "border border-border bg-card hover:bg-muted font-medium"
                }`}
              >
                Department Analytics
              </Link>
              <Link 
                to="/assign-services" 
                className={`px-6 py-3 rounded-xl transition-opacity text-xs whitespace-nowrap ${
                  location.pathname === "/assign-services"
                    ? "bg-primary text-primary-foreground hover:opacity-90 font-semibold shadow-md"
                    : "border border-border bg-card hover:bg-muted font-medium"
                }`}
              >
                Org Units to Services
              </Link>
              <Link 
                to="/assign-tech-apps" 
                className={`px-6 py-3 rounded-xl transition-opacity text-xs whitespace-nowrap ${
                  location.pathname === "/assign-tech-apps"
                    ? "bg-primary text-primary-foreground hover:opacity-90 font-semibold shadow-md"
                    : "border border-border bg-card hover:bg-muted font-medium"
                }`}
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
                className={`px-6 py-3 rounded-xl transition-opacity text-xs whitespace-nowrap ${
                  location.pathname === "/assign-cost-pools"
                    ? "bg-primary text-primary-foreground hover:opacity-90 font-semibold shadow-md"
                    : "border border-border bg-card hover:bg-muted font-medium"
                }`}
              >
                Org Units to Cost Pools
              </Link>
              <Link 
                to="/activity-allocation" 
                className={`px-6 py-3 rounded-xl transition-opacity text-xs whitespace-nowrap ${
                  location.pathname === "/activity-allocation"
                    ? "bg-primary text-primary-foreground hover:opacity-90 font-semibold shadow-md"
                    : "border border-border bg-card hover:bg-muted font-medium"
                }`}
              >
                Tag your Metrics
              </Link>
              <Link 
                to="/metric-inventory" 
                className={`px-6 py-3 rounded-xl transition-opacity text-xs whitespace-nowrap ${
                  location.pathname === "/metric-inventory"
                    ? "bg-primary text-primary-foreground hover:opacity-90 font-semibold shadow-md"
                    : "border border-border bg-card hover:bg-muted font-medium"
                }`}
              >
                Metric Inventory
              </Link>
            </div>
          </div>
        </div>

        {/* Grid Layout: 2x2 */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* Section 1: Sankey Graph - Top Left (6/10 width) */}
          <section className="rounded-2xl border border-border bg-card shadow-lg p-6 lg:col-span-6">
            <h2 className="text-lg font-semibold mb-4">Department Allocation Flow</h2>
            {sankeyData.nodes.length > 0 ? (
              <div className="w-full h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <Sankey 
                    data={sankeyData} 
                    node={<SankeyNode />} 
                    link={{ stroke: "#94a3b8", strokeOpacity: 0.3 }} 
                    nodePadding={15} 
                    margin={{ top: 10, right: 150, bottom: 10, left: 10 }}
                  >
                    <RechartsTooltip content={({ payload }: any) => {
                      if (!payload || payload.length === 0) return null;
                      const data = payload[0];
                      if (data.payload?.source !== undefined) {
                        return (
                          <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                            <p className="font-semibold text-sm">{data.payload.source?.name} → {data.payload.target?.name}</p>
                            <p className="text-xs text-muted-foreground">£{data.payload.value?.toLocaleString()}</p>
                          </div>
                        );
                      }
                      
                      // This is a node
                      const nodePayload = data.payload ?? {};
                      const costPoolBreakdown = nodePayload.costPoolBreakdown || nodePayload.payload?.costPoolBreakdown;
                      const nodeName = data.name ?? nodePayload.name ?? nodePayload.payload?.name;
                      const nodeValue = data.value ?? nodePayload.value ?? nodePayload.payload?.value;
                      
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg max-w-xs">
                          <p className="font-semibold text-sm">{nodeName}</p>
                          <p className="text-xs text-muted-foreground">
                            Total: £{Number(nodeValue ?? 0).toLocaleString()}
                          </p>
                          {costPoolBreakdown && Object.keys(costPoolBreakdown).length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border">
                              <p className="text-xs font-medium mb-1">Cost Pool Breakdown:</p>
                              {Object.entries(costPoolBreakdown)
                                .sort(([, a], [, b]) => (b as number) - (a as number))
                                .map(([costPoolName, amount]) => (
                                  <div key={costPoolName} className="flex justify-between text-xs">
                                    <span className="text-muted-foreground truncate mr-2">{costPoolName}</span>
                                    <span className="font-medium">£{Number(amount as number).toLocaleString()}</span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    }} />
                  </Sankey>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                No allocation data available
              </div>
            )}
          </section>

          {/* Section 2: Tasks - Top Right (4/10 width) */}
          <section className="rounded-2xl border border-border bg-card shadow-lg p-6 lg:col-span-4">
            <h2 className="text-lg font-semibold mb-4">Tasks</h2>
            <div className="space-y-3">
              {unassignedOrgUnits.length > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
                  <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-orange-900 dark:text-orange-100">
                      {unassignedOrgUnits.length} Org Unit{unassignedOrgUnits.length !== 1 ? 's' : ''} need to be assigned to services
                    </p>
                    <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                      {unassignedOrgUnits.join(', ')}
                    </p>
                  </div>
                </div>
              )}
              
              {unassignedTechApps > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
                  <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-orange-900 dark:text-orange-100">
                      {unassignedTechApps} Technology App{unassignedTechApps !== 1 ? 's' : ''} need to be assigned
                    </p>
                  </div>
                </div>
              )}
              
              {orgUnitsWithoutCostPools.length > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
                  <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-orange-900 dark:text-orange-100">
                      {orgUnitsWithoutCostPools.length} Org Unit{orgUnitsWithoutCostPools.length !== 1 ? 's' : ''} not assigned to cost pools
                    </p>
                    <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                      {orgUnitsWithoutCostPools.map(ou => {
                        const serviceName = orgUnitServiceMap[ou];
                        return serviceName ? `${ou} (${serviceName})` : ou;
                      }).join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {costPoolsWithoutActivities.length > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
                  <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-orange-900 dark:text-orange-100">
                      {costPoolsWithoutActivities.length} Cost Pool{costPoolsWithoutActivities.length !== 1 ? 's' : ''} without activities
                    </p>
                    <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                      {costPoolsWithoutActivities.join(', ')}
                    </p>
                  </div>
                </div>
              )}
              
              {unassignedOrgUnits.length === 0 && unassignedTechApps === 0 && orgUnitsWithoutCostPools.length === 0 && costPoolsWithoutActivities.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                  <p className="text-sm">All tasks completed! 🎉</p>
                </div>
              )}
            </div>
          </section>

          {/* Section 3: Financial Impact - Bottom Left (6/10 width) */}
          <section className="rounded-2xl border border-border bg-card shadow-lg p-6 lg:col-span-6">
            <h2 className="text-lg font-semibold mb-4">Department Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1.5 px-1.5 font-semibold text-muted-foreground">Service</th>
                    <th className="text-left py-1.5 px-1.5 font-semibold text-muted-foreground">Cost Pool</th>
                    <th className="text-left py-1.5 px-1.5 font-semibold text-muted-foreground">Activity</th>
                    <th className="text-right py-1.5 px-1.5 font-semibold text-muted-foreground">Franchise A</th>
                    <th className="text-right py-1.5 px-1.5 font-semibold text-muted-foreground">Franchise B</th>
                    <th className="text-right py-1.5 px-1.5 font-semibold text-muted-foreground">Franchise C</th>
                    <th className="text-right py-1.5 px-1.5 font-semibold text-muted-foreground">Franchise D</th>
                    <th className="text-right py-1.5 px-1.5 font-semibold text-muted-foreground">Franchise E</th>
                    <th className="text-right py-1.5 px-1.5 font-semibold text-muted-foreground">Franchise F</th>
                    <th className="text-right py-1.5 px-1.5 font-semibold text-muted-foreground">Franchise G</th>
                  </tr>
                  <tr className="border-b-2 border-border bg-muted/50">
                    <th colSpan={3} className="text-left py-1.5 px-1.5 font-semibold text-[9px]"></th>
                    <th className="text-right py-1.5 px-1.5 font-semibold text-[9px]">£{franchiseTotals["Franchise A"].toLocaleString()}</th>
                    <th className="text-right py-1.5 px-1.5 font-semibold text-[9px]">£{franchiseTotals["Franchise B"].toLocaleString()}</th>
                    <th className="text-right py-1.5 px-1.5 font-semibold text-[9px]">£{franchiseTotals["Franchise C"].toLocaleString()}</th>
                    <th className="text-right py-1.5 px-1.5 font-semibold text-[9px]">£{franchiseTotals["Franchise D"].toLocaleString()}</th>
                    <th className="text-right py-1.5 px-1.5 font-semibold text-[9px]">£{franchiseTotals["Franchise E"].toLocaleString()}</th>
                    <th className="text-right py-1.5 px-1.5 font-semibold text-[9px]">£{franchiseTotals["Franchise F"].toLocaleString()}</th>
                    <th className="text-right py-1.5 px-1.5 font-semibold text-[9px]">£{franchiseTotals["Franchise G"].toLocaleString()}</th>
                  </tr>
                </thead>
                <tbody>
                  {allocationData.map((allocation) => {
                    // Skip allocations where cost pool doesn't exist
                    const costPool = costPools.find(cp => cp.id === allocation.cost_pool_id);
                    if (!costPool) return null;
                    
                    const activities = allocation.activities || [];
                    const activityTotals = recalculatedTotals.get(allocation.id) || {};
                    
                    return activities.map((activity: any, idx: number) => {
                      const total = activityTotals[activity.id] || 0;
                      if (total === 0) return null;

                      const metric = metrics.find(m => m.metric_id === activity.metricId);
                      const franchisePerc = metric?.franchise_percentages || {};
                      
                      const costPoolName = costPool.name;
                      
                      // Calculate franchise impacts
                      const franchiseImpacts = {
                        "Franchise A": total * (franchisePerc["Franchise A"] || 0) / 100,
                        "Franchise B": total * (franchisePerc["Franchise B"] || 0) / 100,
                        "Franchise C": total * (franchisePerc["Franchise C"] || 0) / 100,
                        "Franchise D": total * (franchisePerc["Franchise D"] || 0) / 100,
                        "Franchise E": total * (franchisePerc["Franchise E"] || 0) / 100,
                        "Franchise F": total * (franchisePerc["Franchise F"] || 0) / 100,
                        "Franchise G": total * (franchisePerc["Franchise G"] || 0) / 100,
                      };

                      return (
                        <tr key={`${allocation.id}-${idx}`} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-1.5 px-1.5 text-muted-foreground">{allocation.service}</td>
                          <td className="py-1.5 px-1.5 text-muted-foreground">{costPoolName}</td>
                          <td className="py-1.5 px-1.5">
                            <div className="font-medium">{activity.name}</div>
                            <div className="text-muted-foreground text-[9px]">£{total.toLocaleString()}</div>
                          </td>
                          {Object.entries(franchiseImpacts).map(([franchise, impact]) => (
                            <td key={franchise} className="py-1.5 px-1.5 text-right">
                              {impact !== 0 ? (
                                <div className={impact > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                  <div className="font-medium">
                                    £{Math.abs(impact).toLocaleString()}
                                  </div>
                                  <div className="text-[8px]">
                                    ({franchisePerc[franchise]?.toFixed(1)}%)
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    });
                  })}
                  {allocationData.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-muted-foreground">
                        No allocation data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 4: Two Way Review - Bottom Right (4/10 width) */}
          <section className="rounded-2xl border border-border bg-card shadow-lg p-6 lg:col-span-4">
            <h2 className="text-lg font-semibold mb-4">Two Way Review</h2>
            <div className="text-center text-muted-foreground text-sm py-12">
              Two way review section - awaiting details
            </div>
          </section>
        </div>
        </div>
      </main>
    </PageLayout>
  );
}
