import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { TechAppReviewDialog } from "@/components/TechAppReviewDialog";
import { supabase } from "@/integrations/supabase/client";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";

type TechApp = {
  tower: string;
  location: string;
  application: string;
  cost: number;
};

const TECH_APPS_DATA: TechApp[] = [
  { tower: "DEP04", location: "UK", application: "APP00001", cost: 125000 },
  { tower: "DEP04", location: "UK", application: "APP00002", cost: 98000 },
  { tower: "DEP04", location: "UK", application: "APP00003", cost: 156000 },
  { tower: "DEP04", location: "UK", application: "APP00004", cost: 87000 },
  { tower: "DEP04", location: "UK", application: "APP00005", cost: 203000 },
  { tower: "DEP04", location: "India", application: "APP00001", cost: 45000 },
  { tower: "DEP04", location: "India", application: "APP00002", cost: 67000 },
  { tower: "DEP04", location: "India", application: "APP00003", cost: 52000 },
  { tower: "DEP04", location: "India", application: "APP00004", cost: 38000 },
  { tower: "DEP04", location: "India", application: "APP00005", cost: 71000 },
  { tower: "DEP01", location: "UK", application: "APP00001", cost: 142000 },
  { tower: "DEP01", location: "UK", application: "APP00002", cost: 189000 },
  { tower: "DEP01", location: "UK", application: "APP00003", cost: 95000 },
  { tower: "DEP01", location: "UK", application: "APP00004", cost: 167000 },
  { tower: "DEP01", location: "UK", application: "APP00005", cost: 124000 },
  { tower: "DEP01", location: "India", application: "APP00001", cost: 58000 },
  { tower: "DEP01", location: "India", application: "APP00002", cost: 43000 },
  { tower: "DEP01", location: "India", application: "APP00003", cost: 62000 },
  { tower: "DEP01", location: "India", application: "APP00004", cost: 49000 },
  { tower: "DEP01", location: "India", application: "APP00005", cost: 55000 },
  { tower: "DEP02", location: "UK", application: "APP00001", cost: 178000 },
  { tower: "DEP02", location: "UK", application: "APP00002", cost: 134000 },
  { tower: "DEP02", location: "UK", application: "APP00003", cost: 201000 },
  { tower: "DEP02", location: "UK", application: "APP00004", cost: 92000 },
  { tower: "DEP02", location: "UK", application: "APP00005", cost: 156000 },
  { tower: "DEP02", location: "India", application: "APP00001", cost: 64000 },
  { tower: "DEP02", location: "India", application: "APP00002", cost: 47000 },
  { tower: "DEP02", location: "India", application: "APP00003", cost: 73000 },
  { tower: "DEP02", location: "India", application: "APP00004", cost: 51000 },
  { tower: "DEP02", location: "India", application: "APP00005", cost: 68000 },
  { tower: "DEP03", location: "UK", application: "APP00001", cost: 195000 },
  { tower: "DEP03", location: "UK", application: "APP00002", cost: 143000 },
  { tower: "DEP03", location: "UK", application: "APP00003", cost: 167000 },
  { tower: "DEP03", location: "UK", application: "APP00004", cost: 189000 },
  { tower: "DEP03", location: "UK", application: "APP00005", cost: 211000 },
  { tower: "DEP03", location: "India", application: "APP00001", cost: 59000 },
  { tower: "DEP03", location: "India", application: "APP00002", cost: 72000 },
  { tower: "DEP03", location: "India", application: "APP00003", cost: 48000 },
  { tower: "DEP03", location: "India", application: "APP00004", cost: 63000 },
  { tower: "DEP03", location: "India", application: "APP00005", cost: 54000 },
];

const SAMPLE_SERVICES: Record<string, string[]> = {
  DEP04: ["SERVICE04", "FIN00102", "FIN00103"],
  DEP01: ["SERVICE01", "RSK31019"],
  DEP02: ["SERVICE02", "SRV89886", "SRV89887"],
  DEP03: ["SERVICE03", "TRS20218"],
};

const gbp = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);

export default function TechAppAssignment({ initialTower }: { initialTower?: string }) {
  const [selectedTower] = useState<string | undefined>(initialTower);
  const [costPools, setCostPools] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [allocationData, setAllocationData] = useState<any[]>([]);
  const [orgUnitCostsDetailed, setOrgUnitCostsDetailed] = useState<any[]>([]);
  const [costPoolAssignmentsDetailed, setCostPoolAssignmentsDetailed] = useState<any[]>([]);
  const [appBuckets, setAppBuckets] = useState<Record<string, 'prorata' | 'specific'>>({});
  const [appSpecificType, setAppSpecificType] = useState<Record<string, 'service' | 'costpool'>>({});
  const [costPoolAssignments, setCostPoolAssignments] = useState<Record<string, string[]>>({});
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [dragOverBucket, setDragOverBucket] = useState<'prorata' | 'specific' | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  
  // Initial state for tracking changes
  const [initialAppBuckets, setInitialAppBuckets] = useState<Record<string, 'prorata' | 'specific'>>({});
  const [initialAppSpecificType, setInitialAppSpecificType] = useState<Record<string, 'service' | 'costpool'>>({});
  const [initialCostPoolAssignments, setInitialCostPoolAssignments] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const loadData = async () => {
      if (!selectedTower) return;
      
      // Load activity allocations
      const { data: allocations } = await supabase
        .from('activity_allocations')
        .select('*')
        .eq('tower', selectedTower);
      setAllocationData(allocations || []);
      
      // Load metrics
      const { data: metricsData } = await supabase
        .from('metrics')
        .select('*')
        .eq('tower_id', selectedTower);
      setMetrics(metricsData || []);
      
      // Load services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('tower_id', selectedTower);
      setServices(servicesData || []);
      
      // Load cost pools
      const serviceNames = [...new Set((servicesData || []).map(s => s.name))];
      const { data: costPoolsData } = await supabase
        .from('cost_pools')
        .select('*')
        .in('service_id', serviceNames);
      setCostPools(costPoolsData || []);
      
      // Load org unit costs
      const { data: orgUnitCosts } = await supabase
        .from('org_unit_costs')
        .select('*')
        .eq('tower_id', selectedTower);
      setOrgUnitCostsDetailed(orgUnitCosts || []);
      
      // Load cost pool assignments
      const { data: costPoolAssignments } = await supabase
        .from('cost_pool_assignments')
        .select('*')
        .eq('tower_id', selectedTower);
      setCostPoolAssignmentsDetailed(costPoolAssignments || []);
    };
    loadData();
    
    // Load tech app assignments from database
    const loadAssignments = async () => {
      if (!selectedTower) return;
      
      const { data } = await supabase
        .from('tech_app_assignments')
        .select('*')
        .eq('department', selectedTower);
      
      if (data && data.length > 0) {
        const buckets: Record<string, 'prorata' | 'specific'> = {};
        const assignments: Record<string, string[]> = {};
        const specificTypes: Record<string, 'service' | 'costpool'> = {};
        
        data.forEach(record => {
          if (record.bucket_type) {
            buckets[record.app] = record.bucket_type as 'prorata' | 'specific';
          }
          if (record.assigned_services && Array.isArray(record.assigned_services)) {
            assignments[record.app] = record.assigned_services as string[];
            // Infer type from assignment format
            if (record.assigned_services.length > 0) {
              const firstAssign = record.assigned_services[0] as string;
              // Cost pool format has 3 underscores (LE_Service_CostPoolId)
              const underscoreCount = (firstAssign.match(/_/g) || []).length;
              specificTypes[record.app] = underscoreCount >= 2 ? 'costpool' : 'service';
            }
          }
        });
        
        setAppBuckets(buckets);
        setCostPoolAssignments(assignments);
        setAppSpecificType(specificTypes);
        
        // Set initial state for change tracking
        setInitialAppBuckets(JSON.parse(JSON.stringify(buckets)));
        setInitialCostPoolAssignments(JSON.parse(JSON.stringify(assignments)));
        setInitialAppSpecificType(JSON.parse(JSON.stringify(specificTypes)));
        setReviewConfirmed(false);
      } else {
        // Fallback to localStorage if no database records
        const saved1 = localStorage.getItem(`techAppBuckets_${selectedTower}`);
        const saved2 = localStorage.getItem(`techAppCostPools_${selectedTower}`);
        const buckets = saved1 ? JSON.parse(saved1) : {};
        const assignments = saved2 ? JSON.parse(saved2) : {};
        
        setAppBuckets(buckets);
        setCostPoolAssignments(assignments);
        
        // Set initial state for change tracking
        setInitialAppBuckets(JSON.parse(JSON.stringify(buckets)));
        setInitialCostPoolAssignments(JSON.parse(JSON.stringify(assignments)));
        setReviewConfirmed(false);
      }
    };
    
    loadAssignments();
  }, [selectedTower]);

  const appsForTower = useMemo(() => TECH_APPS_DATA.filter(app => app.tower === selectedTower), [selectedTower]);
  const appsByLocation = useMemo(() => {
    const map: Record<string, TechApp[]> = {};
    appsForTower.forEach(app => { if (!map[app.location]) map[app.location] = []; map[app.location].push(app); });
    return map;
  }, [appsForTower]);

  const uniqueAppsWithCosts = useMemo(() => {
    const appMap: Record<string, any> = {};
    appsForTower.forEach(app => {
      if (!appMap[app.application]) appMap[app.application] = { app: app.application, costsByLocation: {}, total: 0 };
      appMap[app.application].costsByLocation[app.location] = app.cost;
      appMap[app.application].total += app.cost;
    });
    return Object.values(appMap);
  }, [appsForTower]);

  const proRataApps = useMemo(() => uniqueAppsWithCosts.filter(a => appBuckets[a.app] === 'prorata'), [uniqueAppsWithCosts, appBuckets]);
  const specificApps = useMemo(() => uniqueAppsWithCosts.filter(a => appBuckets[a.app] === 'specific'), [uniqueAppsWithCosts, appBuckets]);
  const unassignedApps = useMemo(() => uniqueAppsWithCosts.filter(a => !appBuckets[a.app]), [uniqueAppsWithCosts, appBuckets]);
  
  // Get unique service names from database
  const towerServices = useMemo(() => {
    const uniqueNames = new Set<string>();
    return services.filter(s => {
      if (uniqueNames.has(s.name)) return false;
      uniqueNames.add(s.name);
      return true;
    });
  }, [services]);
  
  // Recalculate activity totals from current assignments and costs
  const recalculatedTotals = useMemo(() => {
    const totalsMap = new Map<string, Record<string, number>>();

    allocationData.forEach(allocation => {
      const poolId = allocation.cost_pool_id;
      const activities = allocation.activities || [];
      const allocationMatrix = allocation.allocation_matrix || {};
      
      const assignedOrgUnits = costPoolAssignmentsDetailed.filter(
        (a: any) => a.cost_pool_id === poolId
      );

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

      const activityTotals: Record<string, number> = {};
      
      activities.forEach((activity: any) => {
        const allocPerc = allocationMatrix[activity.id] || {};
        const staffPerc = allocPerc.Staff || 0;
        const nonStaffPerc = (allocPerc.Electricity || 0);
        
        const staffAlloc = totalStaff * staffPerc / 100;
        const nonStaffAlloc = totalNonStaff * nonStaffPerc / 100;
        
        activityTotals[activity.id] = Math.round(staffAlloc + nonStaffAlloc);
      });

      totalsMap.set(allocation.id, activityTotals);
    });

    return totalsMap;
  }, [allocationData, costPoolAssignmentsDetailed, orgUnitCostsDetailed]);

  // Calculate franchise totals (will be recalculated after serviceFranchiseData is computed)
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

    // This will be updated to use serviceFranchiseData after it's computed
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

  // Group allocations by service, cost pool, and source_le for breakdown (base percentages)
  const baseServiceFranchiseData = useMemo(() => {
    const dataArray: Array<{ service: any; costPool: any; sourceLE: string; franchises: Record<string, number> }> = [];
    
    allocationData.forEach((allocation) => {
      const costPool = costPools.find(cp => cp.id === allocation.cost_pool_id);
      if (!costPool) return;
      
      const service = services.find(s => s.name === allocation.service);
      if (!service) return;
      
      const sourceLe = costPool.source_le || 'UK';
      
      let data = dataArray.find(d => 
        d.service.name === service.name && 
        d.costPool.id === costPool.id && 
        d.sourceLE === sourceLe
      );
      
      if (!data) {
        data = {
          service,
          costPool,
          sourceLE: sourceLe,
          franchises: {
            "Franchise A": 0, "Franchise B": 0, "Franchise C": 0, "Franchise D": 0, "Franchise E": 0, "Franchise F": 0, "Franchise G": 0
          }
        };
        dataArray.push(data);
      }
      
      const activities = allocation.activities || [];
      const activityTotals = recalculatedTotals.get(allocation.id) || {};
      
      activities.forEach((activity: any) => {
        const total = activityTotals[activity.id] || 0;
        if (total === 0) return;

        const metric = metrics.find(m => m.metric_id === activity.metricId);
        if (!metric) return;
        
        const franchisePerc = metric?.franchise_percentages || {};
        
        data!.franchises["Franchise A"] += total * (franchisePerc["Franchise A"] || 0) / 100;
        data!.franchises["Franchise B"] += total * (franchisePerc["Franchise B"] || 0) / 100;
        data!.franchises["Franchise C"] += total * (franchisePerc["Franchise C"] || 0) / 100;
        data!.franchises["Franchise D"] += total * (franchisePerc["Franchise D"] || 0) / 100;
        data!.franchises["Franchise E"] += total * (franchisePerc["Franchise E"] || 0) / 100;
        data!.franchises["Franchise F"] += total * (franchisePerc["Franchise F"] || 0) / 100;
        data!.franchises["Franchise G"] += total * (franchisePerc["Franchise G"] || 0) / 100;
      });
    });
    
    // Filter out entries where all franchise values are 0
    return dataArray
      .filter(entry => {
        const total = Object.values(entry.franchises).reduce((sum, val) => sum + val, 0);
        return total > 0;
      })
      .sort((a, b) => {
        const leCompare = a.sourceLE.localeCompare(b.sourceLE);
        if (leCompare !== 0) return leCompare;
        const serviceCompare = a.service.name.localeCompare(b.service.name);
        if (serviceCompare !== 0) return serviceCompare;
        return a.costPool.name.localeCompare(b.costPool.name);
      });
  }, [allocationData, recalculatedTotals, costPools, services, metrics]);

  // Calculate LE totals for percentage calculation (from base data)
  const baseLeTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    
    baseServiceFranchiseData.forEach(data => {
      const le = data.sourceLE;
      if (!totals[le]) totals[le] = 0;
      Object.values(data.franchises).forEach(val => {
        totals[le] += val;
      });
    });
    
    return totals;
  }, [baseServiceFranchiseData]);

  // Calculate percentages for each row by LE
  const rowPercentages = useMemo(() => {
    const percentages: Record<string, number> = {};
    
    baseServiceFranchiseData.forEach(data => {
      const key = `${data.sourceLE}_${data.service.name}_${data.costPool.id}`;
      const leTotal = baseLeTotals[data.sourceLE] || 0;
      const rowTotal = Object.values(data.franchises).reduce((sum, val) => sum + val, 0);
      percentages[key] = leTotal > 0 ? rowTotal / leTotal : 0;
    });
    
    return percentages;
  }, [baseServiceFranchiseData, baseLeTotals]);

  // Calculate service-level percentages (sum of all cost pool percentages for a service in an LE)
  const servicePercentages = useMemo(() => {
    const percentages: Record<string, number> = {};
    
    baseServiceFranchiseData.forEach(data => {
      const serviceKey = `${data.sourceLE}_${data.service.name}`;
      const rowKey = `${data.sourceLE}_${data.service.name}_${data.costPool.id}`;
      const rowPerc = rowPercentages[rowKey] || 0;
      
      if (!percentages[serviceKey]) percentages[serviceKey] = 0;
      percentages[serviceKey] += rowPerc;
    });
    
    return percentages;
  }, [baseServiceFranchiseData, rowPercentages]);

  // Calculate tech app allocations based on bucket type - start from zero, only show tech app costs
  const serviceFranchiseData = useMemo(() => {
    // Create data array with zeroed franchises (only tech app costs will be added)
    const dataArray = baseServiceFranchiseData.map(d => ({
      ...d,
      franchises: {
        "Franchise A": 0, "Franchise B": 0, "Franchise C": 0, "Franchise D": 0, 
        "Franchise E": 0, "Franchise F": 0, "Franchise G": 0
      }
    }));

    // Process each app with an allocation method
    uniqueAppsWithCosts.forEach(appData => {
      const appId = appData.app;
      const bucketType = appBuckets[appId];
      
      if (!bucketType) return; // Skip unassigned apps
      
      // Get cost by location (LE)
      const costsByLE = appData.costsByLocation as Record<string, number>;
      
      if (bucketType === 'prorata') {
        // Pro rata: spread each location's cost across all matching LE rows using percentages
        Object.entries(costsByLE).forEach(([location, cost]) => {
          if (!cost) return;
          
          // Map location to LE (UK stays UK, India stays India)
          const targetLE = location;
          
          // Distribute to each row matching this LE
          dataArray.forEach(data => {
            if (data.sourceLE !== targetLE) return;
            
            const rowKey = `${data.sourceLE}_${data.service.name}_${data.costPool.id}`;
            const rowPerc = rowPercentages[rowKey] || 0;
            
            // Calculate the amount to add to this row
            const allocatedAmount = cost * rowPerc;
            
            // Get base franchise distribution from baseServiceFranchiseData
            const baseData = baseServiceFranchiseData.find(bd => 
              bd.service.name === data.service.name && 
              bd.costPool.id === data.costPool.id && 
              bd.sourceLE === data.sourceLE
            );
            
            if (baseData) {
              const totalFranchiseValue = Object.values(baseData.franchises).reduce((sum, val) => sum + val, 0);
              if (totalFranchiseValue > 0) {
                Object.keys(data.franchises).forEach(franchise => {
                  const franchisePerc = baseData.franchises[franchise] / totalFranchiseValue;
                  data.franchises[franchise] += allocatedAmount * franchisePerc;
                });
              }
            }
          });
        });
      } else if (bucketType === 'specific') {
        const specificType = appSpecificType[appId];
        const selectedItems = costPoolAssignments[appId] || [];
        
        if (!specificType || selectedItems.length === 0) return;
        
        Object.entries(costsByLE).forEach(([location, cost]) => {
          if (!cost) return;
          
          const targetLE = location;
          
          if (specificType === 'service') {
            // Get matching service rows for this LE
            const matchingRows = dataArray.filter(data => {
              const serviceKey = `${data.sourceLE}_${data.service.name}`;
              return data.sourceLE === targetLE && selectedItems.includes(serviceKey);
            });
            
            if (matchingRows.length === 0) return;
            
            // Calculate total percentage for matching rows
            const totalPerc = matchingRows.reduce((sum, data) => {
              const rowKey = `${data.sourceLE}_${data.service.name}_${data.costPool.id}`;
              return sum + (rowPercentages[rowKey] || 0);
            }, 0);
            
            if (totalPerc === 0) return;
            
            // Distribute cost proportionally
            matchingRows.forEach(data => {
              const rowKey = `${data.sourceLE}_${data.service.name}_${data.costPool.id}`;
              const rowPerc = rowPercentages[rowKey] || 0;
              const allocatedAmount = cost * (rowPerc / totalPerc);
              
              // Get base franchise distribution
              const baseData = baseServiceFranchiseData.find(bd => 
                bd.service.name === data.service.name && 
                bd.costPool.id === data.costPool.id && 
                bd.sourceLE === data.sourceLE
              );
              
              if (baseData) {
                const totalFranchiseValue = Object.values(baseData.franchises).reduce((sum, val) => sum + val, 0);
                if (totalFranchiseValue > 0) {
                  Object.keys(data.franchises).forEach(franchise => {
                    const franchisePerc = baseData.franchises[franchise] / totalFranchiseValue;
                    data.franchises[franchise] += allocatedAmount * franchisePerc;
                  });
                }
              }
            });
          } else if (specificType === 'costpool') {
            // Get matching cost pool rows for this LE
            const matchingRows = dataArray.filter(data => {
              const cpKey = `${data.sourceLE}_${data.service.name}_${data.costPool.id}`;
              return data.sourceLE === targetLE && selectedItems.includes(cpKey);
            });
            
            if (matchingRows.length === 0) return;
            
            // Calculate total percentage for matching rows
            const totalPerc = matchingRows.reduce((sum, data) => {
              const rowKey = `${data.sourceLE}_${data.service.name}_${data.costPool.id}`;
              return sum + (rowPercentages[rowKey] || 0);
            }, 0);
            
            if (totalPerc === 0) return;
            
            // Distribute cost proportionally
            matchingRows.forEach(data => {
              const rowKey = `${data.sourceLE}_${data.service.name}_${data.costPool.id}`;
              const rowPerc = rowPercentages[rowKey] || 0;
              const allocatedAmount = cost * (rowPerc / totalPerc);
              
              // Get base franchise distribution
              const baseData = baseServiceFranchiseData.find(bd => 
                bd.service.name === data.service.name && 
                bd.costPool.id === data.costPool.id && 
                bd.sourceLE === data.sourceLE
              );
              
              if (baseData) {
                const totalFranchiseValue = Object.values(baseData.franchises).reduce((sum, val) => sum + val, 0);
                if (totalFranchiseValue > 0) {
                  Object.keys(data.franchises).forEach(franchise => {
                    const franchisePerc = baseData.franchises[franchise] / totalFranchiseValue;
                    data.franchises[franchise] += allocatedAmount * franchisePerc;
                  });
                }
              }
            });
          }
        });
      }
    });
    
    return dataArray;
  }, [baseServiceFranchiseData, uniqueAppsWithCosts, appBuckets, appSpecificType, costPoolAssignments, rowPercentages]);

  // Calculate grand total by LE (source_le) - includes tech app costs
  const leTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    
    serviceFranchiseData.forEach(data => {
      const le = data.sourceLE;
      if (!totals[le]) totals[le] = 0;
      Object.values(data.franchises).forEach(val => {
        totals[le] += val;
      });
    });
    
    return totals;
  }, [serviceFranchiseData]);

  // Recalculate franchise totals from serviceFranchiseData (includes tech app costs)
  const updatedFranchiseTotals = useMemo(() => {
    const totals = {
      "Franchise A": 0,
      "Franchise B": 0,
      "Franchise C": 0,
      "Franchise D": 0,
      "Franchise E": 0,
      "Franchise F": 0,
      "Franchise G": 0,
    };

    serviceFranchiseData.forEach(data => {
      Object.entries(data.franchises).forEach(([franchise, value]) => {
        totals[franchise as keyof typeof totals] += value;
      });
    });

    return totals;
  }, [serviceFranchiseData]);

  // Get cost pools that have allocated costs
  const costPoolsWithCosts = useMemo(() => {
    const costPoolIds = new Set<string>();
    serviceFranchiseData.forEach(data => {
      const total = Object.values(data.franchises).reduce((sum, val) => sum + val, 0);
      if (total > 0) {
        costPoolIds.add(data.costPool.id);
      }
    });
    return costPools.filter(cp => costPoolIds.has(cp.id));
  }, [serviceFranchiseData, costPools]);

  // Get distinct Service options (Source LE - Service) - use base data for options
  const serviceOptions = useMemo(() => {
    const uniqueKeys = new Set<string>();
    return baseServiceFranchiseData
      .filter(data => {
        const key = `${data.sourceLE} - ${data.service.name}`;
        if (uniqueKeys.has(key)) return false;
        uniqueKeys.add(key);
        return true;
      })
      .map(data => ({
        id: `${data.sourceLE}_${data.service.name}`,
        label: `${data.sourceLE} - ${data.service.name}`
      }));
  }, [baseServiceFranchiseData]);

  // Get Cost Pool options (Source LE - Service - Cost Pool) - use base data for options
  const costPoolOptions = useMemo(() => {
    return baseServiceFranchiseData.map(data => ({
      id: `${data.sourceLE}_${data.service.name}_${data.costPool.id}`,
      label: `${data.sourceLE} - ${data.service.name} - ${data.costPool.name}`
    }));
  }, [baseServiceFranchiseData]);

  const saveAssignments = async (buckets: Record<string, 'prorata' | 'specific'>, assignments: Record<string, string[]>) => {
    if (!selectedTower) return;
    
    // Delete existing assignments for this tower
    await supabase
      .from('tech_app_assignments')
      .delete()
      .eq('department', selectedTower);
    
    // Insert new assignments
    const records = Object.entries(buckets).map(([app, bucket_type]) => ({
      department: selectedTower,
      app,
      bucket_type,
      assigned_services: assignments[app] || []
    }));
    
    if (records.length > 0) {
      await supabase.from('tech_app_assignments').insert(records);
    }
    
    // Also save to localStorage as backup
    localStorage.setItem(`techAppBuckets_${selectedTower}`, JSON.stringify(buckets));
    localStorage.setItem(`techAppCostPools_${selectedTower}`, JSON.stringify(assignments));
  };

  const moveAppToBucket = (appId: string, bucket: 'prorata' | 'specific') => {
    const newBuckets = { ...appBuckets, [appId]: bucket };
    setAppBuckets(newBuckets);
    
    // Clear specific type and options when switching to prorata
    if (bucket === 'prorata') {
      setAppSpecificType(prev => {
        const newState = { ...prev };
        delete newState[appId];
        return newState;
      });
      const newAssignments = { ...costPoolAssignments };
      delete newAssignments[appId];
      setCostPoolAssignments(newAssignments);
      saveAssignments(newBuckets, newAssignments);
    } else {
      saveAssignments(newBuckets, costPoolAssignments);
    }
  };

  const removeAppFromBucket = (appId: string) => {
    const newBuckets = { ...appBuckets }; 
    delete newBuckets[appId]; 
    setAppBuckets(newBuckets);
    
    // Clear specific type
    setAppSpecificType(prev => {
      const newState = { ...prev };
      delete newState[appId];
      return newState;
    });
    
    const newAssignments = { ...costPoolAssignments }; 
    delete newAssignments[appId]; 
    setCostPoolAssignments(newAssignments);
    
    saveAssignments(newBuckets, newAssignments);
  };

  const toggleCostPoolForApp = (appId: string, costPoolId: string) => {
    const current = costPoolAssignments[appId] || [];
    const newAssignments = { ...costPoolAssignments };
    if (current.includes(costPoolId)) {
      newAssignments[appId] = current.filter(s => s !== costPoolId);
      if (newAssignments[appId].length === 0) delete newAssignments[appId];
    } else {
      newAssignments[appId] = [...current, costPoolId];
    }
    setCostPoolAssignments(newAssignments);
    saveAssignments(appBuckets, newAssignments);
  };

  // Check if there are any changes from initial state
  const hasChanges = useMemo(() => {
    const bucketsChanged = JSON.stringify(appBuckets) !== JSON.stringify(initialAppBuckets);
    const typesChanged = JSON.stringify(appSpecificType) !== JSON.stringify(initialAppSpecificType);
    const assignmentsChanged = JSON.stringify(costPoolAssignments) !== JSON.stringify(initialCostPoolAssignments);
    return bucketsChanged || typesChanged || assignmentsChanged;
  }, [appBuckets, appSpecificType, costPoolAssignments, initialAppBuckets, initialAppSpecificType, initialCostPoolAssignments]);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Department Breakdown</h2>
          <div className="flex gap-2">
            <button 
              className="px-4 py-2 rounded-xl bg-warning text-warning-foreground font-semibold shadow-sm hover:opacity-90 transition-opacity text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setReviewDialogOpen(true)}
              disabled={!hasChanges}
            >
              Review
            </button>
            <button 
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold shadow-sm hover:opacity-90 transition-opacity text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={async () => {
                await saveAssignments(appBuckets, costPoolAssignments);
                setInitialAppBuckets(JSON.parse(JSON.stringify(appBuckets)));
                setInitialAppSpecificType(JSON.parse(JSON.stringify(appSpecificType)));
                setInitialCostPoolAssignments(JSON.parse(JSON.stringify(costPoolAssignments)));
                setReviewConfirmed(false);
                toast.success("Tech app assignments saved successfully");
              }}
              disabled={!reviewConfirmed}
            >
              Submit
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1.5 px-1.5 font-semibold text-muted-foreground">Source LE</th>
                    <th className="text-left py-1.5 px-1.5 font-semibold text-muted-foreground">Service</th>
                    <th className="text-left py-1.5 px-1.5 font-semibold text-muted-foreground">Cost Pool</th>
                    <th className="text-right py-1.5 px-1.5 font-semibold text-muted-foreground">Total</th>
                    <th className="text-right py-1.5 px-1.5 font-semibold text-muted-foreground">Franchise A</th>
                    <th className="text-right py-1.5 px-1.5 font-semibold text-muted-foreground">Franchise B</th>
                    <th className="text-right py-1.5 px-1.5 font-semibold text-muted-foreground">Franchise C</th>
                    <th className="text-right py-1.5 px-1.5 font-semibold text-muted-foreground">Franchise D</th>
                    <th className="text-right py-1.5 px-1.5 font-semibold text-muted-foreground">Franchise E</th>
                    <th className="text-right py-1.5 px-1.5 font-semibold text-muted-foreground">Franchise F</th>
                    <th className="text-right py-1.5 px-1.5 font-semibold text-muted-foreground">Franchise G</th>
                  </tr>
              <tr className="border-b-2 border-border bg-muted/50">
                <th colSpan={3} className="text-left py-1.5 px-1.5 font-semibold text-[10px]">Total</th>
                <th className="text-right py-1.5 px-1.5 font-semibold text-[10px]">{gbp(Object.values(updatedFranchiseTotals).reduce((sum, val) => sum + val, 0))}</th>
                <th className="text-right py-1.5 px-1.5 font-semibold text-[9px]">{gbp(updatedFranchiseTotals["Franchise A"])}</th>
                <th className="text-right py-1.5 px-1.5 font-semibold text-[9px]">{gbp(updatedFranchiseTotals["Franchise B"])}</th>
                <th className="text-right py-1.5 px-1.5 font-semibold text-[9px]">{gbp(updatedFranchiseTotals["Franchise C"])}</th>
                <th className="text-right py-1.5 px-1.5 font-semibold text-[9px]">{gbp(updatedFranchiseTotals["Franchise D"])}</th>
                <th className="text-right py-1.5 px-1.5 font-semibold text-[9px]">{gbp(updatedFranchiseTotals["Franchise E"])}</th>
                <th className="text-right py-1.5 px-1.5 font-semibold text-[9px]">{gbp(updatedFranchiseTotals["Franchise F"])}</th>
                <th className="text-right py-1.5 px-1.5 font-semibold text-[9px]">{gbp(updatedFranchiseTotals["Franchise G"])}</th>
              </tr>
            </thead>
            <tbody>
              {serviceFranchiseData.map((data) => {
                // Get base data for percentage calculation
                const baseData = baseServiceFranchiseData.find(bd => 
                  bd.service.name === data.service.name && 
                  bd.costPool.id === data.costPool.id && 
                  bd.sourceLE === data.sourceLE
                );
                const baseLeTotal = baseLeTotals[data.sourceLE] || 0;
                const rowTotal = Object.values(data.franchises).reduce((sum, val) => sum + val, 0);
                const baseRowTotal = baseData ? Object.values(baseData.franchises).reduce((sum, val) => sum + val, 0) : 0;
                const rowPercentage = baseLeTotal > 0 ? (baseRowTotal / baseLeTotal) * 100 : 0;
                
                return (
                  <tr key={`${data.service.id}-${data.costPool.id}-${data.sourceLE}`} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-1.5 px-1.5 font-medium">{data.sourceLE}</td>
                    <td className="py-1.5 px-1.5 text-muted-foreground font-medium">{data.service.name}</td>
                    <td className="py-1.5 px-1.5 text-muted-foreground font-medium">{data.costPool.name}</td>
                    <td className="py-1.5 px-1.5 text-right font-medium">
                      <div className="flex flex-col">
                        <span className="text-xs">{rowTotal !== 0 ? gbp(Math.round(rowTotal)) : '-'}</span>
                        <span className="text-[8px] text-muted-foreground/50 font-bold">{rowPercentage.toFixed(2)}%</span>
                      </div>
                    </td>
                    {Object.entries(data.franchises).map(([franchise, value]) => {
                      // Calculate percentage from base data
                      const baseValue = baseData?.franchises[franchise] || 0;
                      const percentage = baseLeTotal > 0 ? (baseValue / baseLeTotal) * 100 : 0;
                      return (
                        <td key={franchise} className="py-1.5 px-1.5 text-right">
                          <div className="flex flex-col">
                            <span className="text-[10px]">{value !== 0 ? gbp(Math.round(value)) : '-'}</span>
                            <span className="text-[8px] text-muted-foreground/50 font-bold">{percentage.toFixed(2)}%</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {serviceFranchiseData.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-muted-foreground">
                    No service data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Available Applications</h2>
          <Badge variant="secondary">{uniqueAppsWithCosts.length}</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">
              <th className="text-left py-2 px-2">App</th>
              <th className="text-center py-2 px-2">Total</th>
              {Object.keys(appsByLocation).map(loc => <th key={loc} className="text-center py-2 px-2">{loc}</th>)}
              <th className="text-center py-2 px-2">Allocation Method</th>
              <th className="text-center py-2 px-2">Assignment</th>
              <th className="text-center py-2 px-2">Assignment Options</th>
            </tr></thead>
            <tbody>
              {uniqueAppsWithCosts.map((item) => (
                <tr key={item.app} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-2 font-medium">{item.app}</td>
                  <td className="py-2 px-2 text-center font-semibold">{gbp(item.total)}</td>
                  {Object.keys(appsByLocation).map(loc => <td key={loc} className="py-2 px-2 text-center">{item.costsByLocation[loc] ? gbp(item.costsByLocation[loc]) : "-"}</td>)}
                  <td className="py-2 px-2 text-center">
                    <ToggleGroup 
                      type="single" 
                      value={appBuckets[item.app] || ""} 
                      onValueChange={(value) => {
                        if (value) {
                          moveAppToBucket(item.app, value as 'prorata' | 'specific');
                        } else {
                          removeAppFromBucket(item.app);
                        }
                      }}
                      className="justify-center"
                    >
                      <ToggleGroupItem 
                        value="prorata" 
                        aria-label="Pro Rata"
                        className="text-[10px] px-2 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                      >
                        Pro Rata
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="specific" 
                        aria-label="Specific"
                        className="text-[10px] px-2 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                      >
                        Specific
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <ToggleGroup 
                      type="single" 
                      value={appSpecificType[item.app] || ""} 
                      onValueChange={(value) => {
                        if (value) {
                          setAppSpecificType(prev => ({ ...prev, [item.app]: value as 'service' | 'costpool' }));
                        } else {
                          setAppSpecificType(prev => {
                            const newState = { ...prev };
                            delete newState[item.app];
                            return newState;
                          });
                        }
                      }}
                      className="justify-center"
                      disabled={appBuckets[item.app] !== 'specific'}
                    >
                      <ToggleGroupItem 
                        value="service" 
                        aria-label="Service"
                        className="text-[10px] px-2 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground disabled:opacity-50"
                        disabled={appBuckets[item.app] !== 'specific'}
                      >
                        Service
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="costpool" 
                        aria-label="Cost Pool"
                        className="text-[10px] px-2 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground disabled:opacity-50"
                        disabled={appBuckets[item.app] !== 'specific'}
                      >
                        Cost Pool
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-[10px] h-7 px-2"
                          disabled={appBuckets[item.app] !== 'specific' || !appSpecificType[item.app]}
                        >
                          {costPoolAssignments[item.app]?.length ? `${costPoolAssignments[item.app].length} selected` : "Select"}
                          <ChevronDown className="w-3 h-3 ml-1" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-2 max-h-64 overflow-y-auto">
                        {appSpecificType[item.app] === 'service' ? (
                          serviceOptions.map(opt => (
                            <div key={opt.id} className="flex items-center gap-2 p-2 hover:bg-muted rounded">
                              <Checkbox 
                                checked={costPoolAssignments[item.app]?.includes(opt.id) || false} 
                                onCheckedChange={() => toggleCostPoolForApp(item.app, opt.id)} 
                              />
                              <span className="text-xs">{opt.label}</span>
                            </div>
                          ))
                        ) : appSpecificType[item.app] === 'costpool' ? (
                          costPoolOptions.map(opt => (
                            <div key={opt.id} className="flex items-center gap-2 p-2 hover:bg-muted rounded">
                              <Checkbox 
                                checked={costPoolAssignments[item.app]?.includes(opt.id) || false} 
                                onCheckedChange={() => toggleCostPoolForApp(item.app, opt.id)} 
                              />
                              <span className="text-xs">{opt.label}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-muted-foreground p-2">Select a type first</div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <TechAppReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        appBuckets={appBuckets}
        appSpecificType={appSpecificType}
        costPoolAssignments={costPoolAssignments}
        initialAppBuckets={initialAppBuckets}
        initialAppSpecificType={initialAppSpecificType}
        initialCostPoolAssignments={initialCostPoolAssignments}
        selectedTower={selectedTower}
        uniqueAppsWithCosts={uniqueAppsWithCosts}
        serviceOptions={serviceOptions}
        costPoolOptions={costPoolOptions}
        confirmed={reviewConfirmed}
        onConfirmChange={setReviewConfirmed}
        onSubmit={async () => {
          // Save to database
          await saveAssignments(appBuckets, costPoolAssignments);
          
          // Update initial states to reflect saved state
          setInitialAppBuckets(JSON.parse(JSON.stringify(appBuckets)));
          setInitialAppSpecificType(JSON.parse(JSON.stringify(appSpecificType)));
          setInitialCostPoolAssignments(JSON.parse(JSON.stringify(costPoolAssignments)));
          
          setReviewDialogOpen(false);
          setReviewConfirmed(false);
          toast.success("Tech app assignments saved successfully");
        }}
      />
    </div>
  );
}
