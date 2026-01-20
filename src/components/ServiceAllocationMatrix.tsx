import React, { useEffect, useMemo, useState, useRef } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Pencil } from "lucide-react";
import { useFilter } from "@/contexts/FilterContext";
import { AllocationReviewDialog } from "@/components/AllocationReviewDialog";
import { CostPoolReviewDialog } from "@/components/CostPoolReviewDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// -----------------------------------------------------------------------------
// Types & Constants
// -----------------------------------------------------------------------------
export type ServicesShape = {
  services: Record<string, string[]>; // service -> orgUnits
  towers: Record<string, string>; // service -> tower
  costs: Record<string, {
    staff: number;
    non_staff: number;
    fte: number;
    providerLE?: string;
  }>; // ou -> costs
};
type Activity = {
  id: string;
  name: string;
  metricId?: string;
};
type Metric = {
  id: string;
  service: string;
  sourceLE: string;
  name: string;
};
const NON_STAFF_TYPES = ["Electricity", "Stationary", "Maintenance", "Travel"] as const;
export type NonStaffKey = typeof NON_STAFF_TYPES[number];
export type ExpenseKey = "Staff" | NonStaffKey;
export type Matrix = Record<string, Record<ExpenseKey, number>>; // activityId -> expense -> %

const EXPENSES: ExpenseKey[] = ["Staff", ...NON_STAFF_TYPES];

// -----------------------------------------------------------------------------
// Sample Data
// -----------------------------------------------------------------------------
const SAMPLE_DATA: ServicesShape = {
  services: {
    SERVICE01: ["123456789", "123456788", "123456799", "234567890", "345678901", "456789012"],
    SERVICE012: [],
    SERVICE02: ["389126987", "415220334", "709384112"],
    SERVICE022: [],
    SERVICE03: ["386016793", "523440019", "975130406"],
    SERVICE032: [],
    SERVICE04: ["143220765", "960501277", "331907642"],
    SERVICE042: []
  },
  towers: {
    SERVICE01: "DEP01",
    SERVICE012: "DEP01",
    SERVICE02: "DEP02",
    SERVICE022: "DEP02",
    SERVICE03: "DEP03",
    SERVICE032: "DEP03",
    SERVICE04: "DEP04",
    SERVICE042: "DEP04"
  },
  costs: {
    "123456789": {
      staff: 420000,
      non_staff: 180000,
      fte: 8.5,
      providerLE: "UK"
    },
    "123456788": {
      staff: 315000,
      non_staff: 210000,
      fte: 6.3,
      providerLE: "UK"
    },
    "123456799": {
      staff: 250000,
      non_staff: 260000,
      fte: 10.2,
      providerLE: "India"
    },
    "234567890": {
      staff: 385000,
      non_staff: 195000,
      fte: 7.7,
      providerLE: "UK"
    },
    "345678901": {
      staff: 290000,
      non_staff: 145000,
      fte: 5.8,
      providerLE: "UK"
    },
    "456789012": {
      staff: 215000,
      non_staff: 185000,
      fte: 8.8,
      providerLE: "India"
    },
    "389126987": {
      staff: 198000,
      non_staff: 120000,
      fte: 4.0,
      providerLE: "UK"
    },
    "415220334": {
      staff: 155000,
      non_staff: 90000,
      fte: 3.1,
      providerLE: "UK"
    },
    "709384112": {
      staff: 230000,
      non_staff: 175000,
      fte: 9.4,
      providerLE: "India"
    },
    "386016793": {
      staff: 171000,
      non_staff: 143000,
      fte: 3.4,
      providerLE: "UK"
    },
    "523440019": {
      staff: 205000,
      non_staff: 110000,
      fte: 4.1,
      providerLE: "UK"
    },
    "975130406": {
      staff: 260000,
      non_staff: 195000,
      fte: 10.6,
      providerLE: "India"
    },
    "143220765": {
      staff: 145000,
      non_staff: 80000,
      fte: 2.9,
      providerLE: "UK"
    },
    "960501277": {
      staff: 310000,
      non_staff: 120000,
      fte: 6.2,
      providerLE: "UK"
    },
    "331907642": {
      staff: 275000,
      non_staff: 160000,
      fte: 11.3,
      providerLE: "India"
    }
  }
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
const clampPct = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
const gbp = (n: number) => new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0
}).format(n);
const NON_STAFF_WEIGHTS: Record<NonStaffKey, number> = {
  Electricity: 0.4,
  Stationary: 0.2,
  Maintenance: 0.25,
  Travel: 0.15
};
const splitNonStaff = (amount: number): Record<NonStaffKey, number> => {
  const totalW = Object.values(NON_STAFF_WEIGHTS).reduce((s, v) => s + v, 0) || 1;
  const out: Partial<Record<NonStaffKey, number>> = {};
  let acc = 0;
  const keys = Object.keys(NON_STAFF_WEIGHTS) as NonStaffKey[];
  keys.forEach((k, i) => {
    const part = i < keys.length - 1 ? Math.round(amount * (NON_STAFF_WEIGHTS[k] / totalW)) : Math.max(0, amount - acc);
    out[k] = part;
    acc += part;
  });
  return out as Record<NonStaffKey, number>;
};

// Simple id generator (avoids uuid) - using timestamp for uniqueness
const newId = () => `a_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------
export default function ServiceAllocationMatrix({
  initialTower,
  startAt
}: {
  initialTower?: string;
  startAt?: "tower" | "assign" | "pools" | "allocate";
}) {
  // Get global service selection from context
  const {
    selectedService: globalSelectedService,
    selectedFilters
  } = useFilter();

  // SEO: dynamic, concise
  useEffect(() => {
    const title = "Service Allocation Matrix | Cost Allocation Tool";
    const desc = "Allocate staff and non-staff costs by service, location and activity with pool-based workflows.";
    document.title = title;
    const setMeta = (name: string, content: string) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", name);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };
    setMeta("description", desc);

    // Canonical
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = window.location.origin + "/";
  }, []);

  // Data helpers
  const [data, setData] = useState<ServicesShape>(SAMPLE_DATA);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [hasDbAssignments, setHasDbAssignments] = useState(false);
  
  const getTotals = (ou: string) => data.costs[ou] || {
    staff: 0,
    non_staff: 0,
    fte: 0
  };
  const getProviderLE = (ou: string): string => data.costs[ou]?.providerLE ?? "UK";

  // Load real data from database
  useEffect(() => {
    if (!initialTower) return;
    
    const loadData = async () => {
      setIsLoadingData(true);
      try {
        // Fetch org unit assignments
        const { data: assignments, error: assignmentsError } = await supabase
          .from("org_unit_assignments")
          .select("tower_id, service_id, org_unit")
          .eq("tower_id", initialTower);

        if (assignmentsError) throw assignmentsError;

        // Fetch org unit costs for this tower and current filters
        let costsQuery = supabase
          .from("org_unit_costs")
          .select("*")
          .eq("tower_id", initialTower);

        if (selectedFilters.area) {
          costsQuery = costsQuery.eq("area", selectedFilters.area);
        }
        if (selectedFilters.scenario) {
          costsQuery = costsQuery.eq("scenario", selectedFilters.scenario);
        }

        const { data: costsData, error: costsError } = await costsQuery;
        if (costsError) throw costsError;

        // Build services map: service_id -> org_units[]
        const servicesMap: Record<string, string[]> = {};
        const towersMap: Record<string, string> = {};
        
        assignments?.forEach(a => {
          if (!servicesMap[a.service_id]) {
            servicesMap[a.service_id] = [];
          }
          servicesMap[a.service_id].push(a.org_unit);
          towersMap[a.service_id] = a.tower_id;
        });

        // Build costs map: org_unit -> {staff, non_staff, fte, providerLE}
        const costsMap: Record<string, { staff: number; non_staff: number; fte: number; providerLE?: string }> = {};
        
        costsData?.forEach(cost => {
          if (!costsMap[cost.org_unit]) {
            costsMap[cost.org_unit] = {
              staff: 0,
              non_staff: 0,
              fte: 0,
              providerLE: cost.source_le
            };
          }
          
          if (cost.expense_group === "Staff") {
            costsMap[cost.org_unit].staff += Number(cost.cost_value) || 0;
            costsMap[cost.org_unit].fte += Number(cost.fte_value) || 0;
          } else {
            costsMap[cost.org_unit].non_staff += Number(cost.cost_value) || 0;
          }
        });

        setData({
          services: servicesMap,
          towers: towersMap,
          costs: costsMap
        });
        setHasDbAssignments(true);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load data from database");
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [initialTower, selectedFilters]);

  // Page state
  const [currentPage, setCurrentPage] = useState<"tower" | "assign" | "pools" | "allocate">(initialTower ? startAt || "pools" : "tower");

  // Tower page state
  const [selectedTower, setSelectedTower] = useState<string | undefined>(initialTower);
  const [pendingTower, setPendingTower] = useState<string | undefined>();
  const [pendingScenario, setPendingScenario] = useState<string | undefined>();
  const [pendingArea, setPendingArea] = useState<string | undefined>();
  useEffect(() => {
    if (initialTower) {
      setSelectedTower(initialTower);
      setCurrentPage(startAt || "pools");
    }
  }, [initialTower, startAt]);

  // Load saved service assignments and reconstruct services data (fallback only)
  useEffect(() => {
    if (!selectedTower || hasDbAssignments) return; // prefer DB when available
    try {
      const saved = localStorage.getItem(`serviceAssignments_${selectedTower}`);
      if (saved) {
        const assignedServiceByOu: Record<string, string> = JSON.parse(saved);

        // Reconstruct services object from assignments
        const newServices: Record<string, string[]> = {};

        // Initialize all services for this tower with empty arrays
        Object.keys(SAMPLE_DATA.towers).forEach(svc => {
          if (SAMPLE_DATA.towers[svc] === selectedTower) {
            newServices[svc] = [];
          }
        });

        // Populate services based on assignments
        Object.entries(assignedServiceByOu).forEach(([ou, service]) => {
          if (newServices[service]) {
            newServices[service].push(ou);
          }
        });

        // Update data with new service assignments
        setData(prev => ({
          ...prev,
          services: {
            ...prev.services,
            ...newServices
          }
        }));
      }
    } catch (error) {
      console.error("Failed to load service assignments from local storage:", error);
    }
  }, [selectedTower, hasDbAssignments]);

  // Derived lists shared
  const locations = useMemo(() => {
    const set = new Set<string>();
    Object.keys(data.costs).forEach(ou => set.add(getProviderLE(ou)));
    return Array.from(set);
  }, [data]);
  const servicesForTower = useMemo(() => {
    if (!selectedTower) return [] as string[];
    return Object.keys(data.towers || {}).filter(svc => data.towers[svc] === selectedTower);
  }, [data, selectedTower]);
  const servicesContainingOu = useMemo(() => {
    const map: Record<string, string[]> = {};
    Object.entries(data.services).forEach(([svc, ous]) => {
      ous.forEach(ou => {
        map[ou] = map[ou] || [];
        map[ou].push(svc);
      });
    });
    return map;
  }, [data]);
  const orgUnitsForTower = useMemo(() => {
    if (!selectedTower) return [] as string[];
    const set = new Set<string>();
    Object.entries(data.towers).forEach(([svc, tw]) => {
      if (tw === selectedTower) {
        (data.services[svc] || []).forEach(ou => set.add(ou));
      }
    });
    return Array.from(set);
  }, [selectedTower, data]);

  // Assign page state
  const [assignedServiceByOu, setAssignedServiceByOu] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!selectedTower) {
      setAssignedServiceByOu({});
      return;
    }
    const next: Record<string, string> = {};
    orgUnitsForTower.forEach(ou => {
      const svcs = servicesContainingOu[ou] || servicesForTower;
      next[ou] = svcs[0] || "";
    });
    setAssignedServiceByOu(next);
  }, [selectedTower, orgUnitsForTower, servicesContainingOu, servicesForTower]);

  // --- Cost Pools -------------------------------------------------------------
  type CostPool = {
    id: string;
    name: string;
    sourceLE: string;
    ous: string[];
    serviceId?: string; // service this pool belongs to (optional for legacy)
  };
  const [costPools, setCostPools] = useState<CostPool[]>([]);
  const [originalCostPools, setOriginalCostPools] = useState<CostPool[]>([]);
  const [deletedPoolIds, setDeletedPoolIds] = useState<Set<string>>(new Set());
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [activityNameDrafts, setActivityNameDrafts] = useState<Record<string, string>>({});
  const newPoolNameRef = useRef<HTMLInputElement>(null);
  const [newPoolName, setNewPoolName] = useState<string>("");
  const [newPoolLE, setNewPoolLE] = useState<string>("");
  const [selectedOUs, setSelectedOUs] = useState<Set<string>>(new Set());
  const [dragOverPoolId, setDragOverPoolId] = useState<string | null>(null);
  const [selectedServiceForPool, setSelectedServiceForPool] = useState<string>("");
  const [showAddPoolDialog, setShowAddPoolDialog] = useState(false);
  const [assignedPoolByOu, setAssignedPoolByOu] = useState<Record<string, string>>({});
  const [originalPoolAssignments, setOriginalPoolAssignments] = useState<Record<string, string>>({});
  const [poolReviewConfirmed, setPoolReviewConfirmed] = useState(false);
  const [activityReviewConfirmed, setActivityReviewConfirmed] = useState(false);
  
  // Track initial state to detect changes
  const [initialActivities, setInitialActivities] = useState<Activity[]>([]);
  const [initialMatrix, setInitialMatrix] = useState<Matrix>({});
  const [renamePoolId, setRenamePoolId] = useState<string | null>(null);
  const [renamePoolName, setRenamePoolName] = useState<string>("");

  // Sync local service selection with global context
  useEffect(() => {
    if (globalSelectedService) {
      setSelectedServiceForPool(globalSelectedService);
      setSelectedService(globalSelectedService);
    }
  }, [globalSelectedService]);

  // Load assignedPoolByOu from database when service changes
  useEffect(() => {
    const loadPoolAssignments = async () => {
      if (!selectedTower || !selectedServiceForPool) {
        setAssignedPoolByOu({});
        setOriginalPoolAssignments({});
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('cost_pool_assignments')
          .select('*')
          .eq('tower_id', selectedTower)
          .eq('service_id', selectedServiceForPool);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const assignments: Record<string, string> = {};
          data.forEach(assignment => {
            assignments[assignment.org_unit] = assignment.cost_pool_id;
          });
          setAssignedPoolByOu(assignments);
          setOriginalPoolAssignments(assignments);
        } else {
          setAssignedPoolByOu({});
          setOriginalPoolAssignments({});
        }
      } catch (error) {
        console.error('Failed to load cost pool assignments:', error);
        setAssignedPoolByOu({});
        setOriginalPoolAssignments({});
      }
    };
    
    loadPoolAssignments();
    // Reset confirmation when service changes
    setPoolReviewConfirmed(false);
  }, [selectedTower, selectedServiceForPool]);

  // Reset pools UI when switching service to avoid stale OUs from previous service
  useEffect(() => {
    setSelectedPoolId(undefined);
    setSelectedOUs(new Set());
    setCostPools([]);
  }, [selectedServiceForPool]);

  // Reset confirmation toggle when any cost pool assignment changes
  useEffect(() => {
    if (poolReviewConfirmed) {
      setPoolReviewConfirmed(false);
    }
  }, [assignedPoolByOu]);

  // Keep services in sync with saved assignments when service changes or page switches (fallback only)
  useEffect(() => {
    if (!selectedTower || hasDbAssignments) return;
    try {
      const saved = localStorage.getItem(`serviceAssignments_${selectedTower}`);
      if (saved) {
        const assignedServiceByOu: Record<string, string> = JSON.parse(saved);
        const newServices: Record<string, string[]> = {};
        Object.keys(SAMPLE_DATA.towers).forEach(svc => {
          if (SAMPLE_DATA.towers[svc] === selectedTower) newServices[svc] = [];
        });
        Object.entries(assignedServiceByOu).forEach(([ou, svc]) => {
          if (!newServices[svc]) newServices[svc] = [];
          newServices[svc].push(ou);
        });
        setData(prev => ({
          ...prev,
          services: {
            ...prev.services,
            ...newServices
          }
        }));
      }
    } catch (err) {
      console.error("Failed to sync service assignments:", err);
    }
  }, [selectedTower, selectedServiceForPool, currentPage, hasDbAssignments]);
  const saveCostPools = async () => {
    // Use selectedServiceForPool for pools page, selectedService for allocate page  
    const activeService = selectedServiceForPool || selectedService;
    if (!selectedTower || !activeService) return;
    
    try {
      // 1. Handle deleted pools
      if (deletedPoolIds.size > 0) {
        const { error: deleteError } = await supabase
          .from('cost_pools')
          .delete()
          .in('id', Array.from(deletedPoolIds));
        
        if (deleteError) throw deleteError;
      }

      // 2. Handle new and updated pools
      const poolsToUpsert = costPools.map(pool => ({
        id: pool.id,
        service_id: activeService,
        name: pool.name,
        source_le: pool.sourceLE
      }));

      if (poolsToUpsert.length > 0) {
        const { error: upsertError } = await supabase
          .from('cost_pools')
          .upsert(poolsToUpsert, { onConflict: 'id' });
        
        if (upsertError) throw upsertError;
      }

      // 3. Handle cost pool assignments
      const assignments = Object.entries(assignedPoolByOu).map(([org_unit, cost_pool_id]) => ({
        tower_id: selectedTower,
        service_id: activeService,
        org_unit,
        cost_pool_id
      }));

      // Replace all assignments for this tower/service to ensure removed ones are gone
      const { error: clearError } = await supabase
        .from('cost_pool_assignments')
        .delete()
        .eq('tower_id', selectedTower)
        .eq('service_id', activeService);
      if (clearError) throw clearError;

      if (assignments.length > 0) {
        const { error: insertError } = await supabase
          .from('cost_pool_assignments')
          .insert(assignments);

        if (insertError) throw insertError;
      }

      // Update original state to match current
      setOriginalCostPools(costPools);
      setOriginalPoolAssignments(assignedPoolByOu);
      setDeletedPoolIds(new Set());
      setPoolReviewConfirmed(false);
      
      toast.success("Cost pools and assignments saved successfully!");
    } catch (error) {
      console.error("Failed to save cost pools:", error);
      toast.error("Failed to save cost pools");
    }
  };
  const ouByLE = useMemo(() => {
    const map: Record<string, string[]> = {};

    // Filter org units based on selected service
    let filteredOUs = orgUnitsForTower;
    if (selectedServiceForPool) {
      // Get OUs assigned to the selected service from data
      filteredOUs = data.services[selectedServiceForPool] || [];
    }
    filteredOUs.forEach(ou => {
      const le = getProviderLE(ou);
      map[le] = map[le] || [];
      map[le].push(ou);
    });
    return map;
  }, [orgUnitsForTower, selectedServiceForPool, data]);
  const availableOUsByLE = useMemo(() => {
    const copy: Record<string, Set<string>> = {};
    Object.entries(ouByLE).forEach(([le, list]) => copy[le] = new Set(list));
    costPools.forEach(p => p.ous.forEach(ou => copy[p.sourceLE]?.delete(ou)));
    const out: Record<string, string[]> = {};
    Object.entries(copy).forEach(([le, set]) => out[le] = Array.from(set));
    return out;
  }, [ouByLE, costPools]);
  const onDragStartOU = (e: React.DragEvent, ou: string, le: string) => {
    e.dataTransfer.setData("text/ou", ou);
    e.dataTransfer.setData("text/le", le);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDropToPool = (e: React.DragEvent, poolId: string) => {
    e.preventDefault();
    setDragOverPoolId(null);
    const ou = e.dataTransfer.getData("text/ou");
    const le = e.dataTransfer.getData("text/le");
    setCostPools(prev => prev.map(p => {
      if (p.id !== poolId) return p;
      if (p.sourceLE !== le) return p; // reject cross-LE drops
      if (p.ous.includes(ou)) return p;
      return {
        ...p,
        ous: [...p.ous, ou]
      };
    }));
  };
  const onDragOverPool = (e: React.DragEvent, poolId: string) => {
    e.preventDefault();
    const le = e.dataTransfer.getData("text/le");
    const pool = costPools.find(p => p.id === poolId);
    if (pool && pool.sourceLE === le) {
      e.dataTransfer.dropEffect = "move";
      setDragOverPoolId(poolId);
    } else {
      e.dataTransfer.dropEffect = "none";
      setDragOverPoolId(null);
    }
  };
  const onDragLeavePool = () => {
    setDragOverPoolId(null);
  };
  const removeFromPool = (poolId: string, ou: string) => {
    setCostPools(prev => prev.map(p => p.id === poolId ? {
      ...p,
      ous: p.ous.filter(x => x !== ou)
    } : p));
  };
  const createPool = () => {
    if (!newPoolLE || !selectedServiceForPool) return;
    const inputValue = newPoolNameRef.current?.value || "";
    const name = inputValue.trim() || `Cost Pool ${costPools.length + 1}`;
    
    // Create pool locally (will save to database on Submit)
    const newPoolId = `pool_${Date.now()}`;
    setCostPools(prev => [...prev, {
      id: newPoolId,
      name,
      sourceLE: newPoolLE,
      ous: [],
      serviceId: selectedServiceForPool,
    }]);
    
    if (newPoolNameRef.current) {
      newPoolNameRef.current.value = "";
    }
    setNewPoolLE("");
    setShowAddPoolDialog(false);
    
    toast.success('Cost pool created (click Submit to save)');
  };
  const deletePool = (id: string) => {
    // Mark for deletion (will delete from database on Submit)
    setDeletedPoolIds(prev => new Set(prev).add(id));
    
    // Update local state
    setCostPools(prev => prev.filter(p => p.id !== id));
    
    // Remove assignments for this pool
    setAssignedPoolByOu(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(ou => {
        if (next[ou] === id) delete next[ou];
      });
      return next;
    });
    
    toast.success('Cost pool marked for deletion (click Submit to save)');
  };
  const openRenameDialog = (poolId: string, currentName: string) => {
    setRenamePoolId(poolId);
    setRenamePoolName(currentName);
  };
  const renamePool = () => {
    if (!renamePoolId || !renamePoolName.trim()) return;
    setCostPools(prev => prev.map(p => p.id === renamePoolId ? {
      ...p,
      name: renamePoolName.trim()
    } : p));
    setRenamePoolId(null);
    setRenamePoolName("");
    toast.success('Cost pool renamed (click Submit to save)');
  };
  const autoCreatePoolsByService = () => {
    const newPools: CostPool[] = [];
    servicesForTower.forEach(svc => {
      const ous = data.services[svc] || [];
      const leGroups: Record<string, string[]> = {};
      ous.forEach(ou => {
        const le = getProviderLE(ou);
        leGroups[le] = leGroups[le] || [];
        leGroups[le].push(ou);
      });
      Object.entries(leGroups).forEach(([le, ouList]) => {
        newPools.push({
          id: newId(),
          name: `${svc} - ${le}`,
          sourceLE: le,
          ous: ouList
        });
      });
    });
    setCostPools(newPools);
  };
  const autoCreatePoolsByLE = () => {
    const newPools: CostPool[] = [];
    Object.entries(ouByLE).forEach(([le, ous]) => {
      if (ous.length > 0) {
        newPools.push({
          id: newId(),
          name: `${le} Pool`,
          sourceLE: le,
          ous: [...ous]
        });
      }
    });
    setCostPools(newPools);
  };
  const toggleOUSelection = (ou: string) => {
    setSelectedOUs(prev => {
      const next = new Set(prev);
      if (next.has(ou)) {
        next.delete(ou);
      } else {
        next.add(ou);
      }
      return next;
    });
  };
  const addSelectedOUsToPool = (poolId: string) => {
    const pool = costPools.find(p => p.id === poolId);
    if (!pool) return;
    const ousToAdd = Array.from(selectedOUs).filter(ou => getProviderLE(ou) === pool.sourceLE && availableOUsByLE[pool.sourceLE]?.includes(ou));
    if (ousToAdd.length === 0) return;
    setCostPools(prev => prev.map(p => {
      if (p.id !== poolId) return p;
      const newOus = [...new Set([...p.ous, ...ousToAdd])];
      return {
        ...p,
        ous: newOus
      };
    }));
    setSelectedOUs(new Set());
  };
  const getPoolCosts = (pool: CostPool) => {
    let staff = 0;
    let nonStaff = 0;
    let fte = 0;
    pool.ous.forEach(ou => {
      const c = data.costs[ou];
      if (c) {
        staff += c.staff || 0;
        nonStaff += c.non_staff || 0;
        fte += c.fte || 0;
      }
    });
    return {
      staff,
      nonStaff,
      fte,
      total: staff + nonStaff
    };
  };

  // Calculate pool costs based on current assignments (for live updates)
  const getPoolCostsFromAssignments = (poolId: string, serviceId?: string) => {
    let staff = 0;
    let nonStaff = 0;
    let fte = 0;
    const serviceOUs = serviceId ? new Set(data.services[serviceId] || []) : undefined;
    Object.entries(assignedPoolByOu).forEach(([ou, assignedPoolId]) => {
      if (assignedPoolId === poolId && (!serviceOUs || serviceOUs.has(ou))) {
        const c = data.costs[ou];
        if (c) {
          staff += c.staff || 0;
          nonStaff += c.non_staff || 0;
          fte += c.fte || 0;
        }
      }
    });
    return {
      staff,
      nonStaff,
      fte,
      total: staff + nonStaff
    };
  };
  const towerTotalCosts = useMemo(() => {
    let staff = 0;
    let nonStaff = 0;
    orgUnitsForTower.forEach(ou => {
      const c = data.costs[ou];
      if (c) {
        staff += c.staff || 0;
        nonStaff += c.non_staff || 0;
      }
    });
    return {
      staff,
      nonStaff,
      total: staff + nonStaff
    };
  }, [orgUnitsForTower, data]);

  // Total costs for the currently selected service (used for % of Service)
  const selectedServiceTotalCosts = useMemo(() => {
    if (!selectedServiceForPool) return {
      staff: 0,
      nonStaff: 0,
      total: 0
    };
    const ous = data.services[selectedServiceForPool] || [];
    let staff = 0;
    let nonStaff = 0;
    ous.forEach(ou => {
      const c = data.costs[ou];
      if (c) {
        staff += c.staff || 0;
        nonStaff += c.non_staff || 0;
      }
    });
    return {
      staff,
      nonStaff,
      total: staff + nonStaff
    };
  }, [selectedServiceForPool, data]);
  const visibleCostPools = useMemo(() => {
    if (!selectedServiceForPool) return [] as CostPool[];
    const serviceOUs = new Set(data.services[selectedServiceForPool] || []);
    return costPools.filter(p => {
      if (p.serviceId) return p.serviceId === selectedServiceForPool;
      // Legacy pools: show only if they contain OUs from this service
      return p.ous.some(ou => serviceOUs.has(ou));
    });
  }, [costPools, selectedServiceForPool, data.services]);
  const hasEmptyPools = visibleCostPools.some(p => p.ous.length === 0);
  const hasUnassignedOUs = useMemo(() => {
    return Object.values(availableOUsByLE).some(ous => ous.length > 0);
  }, [availableOUsByLE]);
  const hasOrgUnitsForSelectedService = useMemo(() => {
    if (!selectedServiceForPool) return false;
    return (data.services[selectedServiceForPool]?.length ?? 0) > 0;
  }, [selectedServiceForPool, data.services]);
  const canProceedFromPools = !hasEmptyPools && !hasUnassignedOUs;
  
  // Check if there are any pool assignment changes
  const hasPoolChanges = useMemo(() => {
    // Check if assignments changed
    const currentKeys = Object.keys(assignedPoolByOu);
    const originalKeys = Object.keys(originalPoolAssignments);
    
    if (currentKeys.length !== originalKeys.length) return true;
    const assignmentsChanged = currentKeys.some(ou => assignedPoolByOu[ou] !== originalPoolAssignments[ou]);
    
    // Check if pools changed (created, deleted, or renamed)
    const poolsChanged = JSON.stringify(costPools) !== JSON.stringify(originalCostPools) || deletedPoolIds.size > 0;
    
    return assignmentsChanged || poolsChanged;
  }, [assignedPoolByOu, originalPoolAssignments, costPools, originalCostPools, deletedPoolIds]);

  // --- Pools ↔ Allocate wiring -----------------------------------------------
  const [selectedPoolId, setSelectedPoolId] = useState<string | undefined>();
  const selectedPool = useMemo(() => costPools.find(p => p.id === selectedPoolId), [costPools, selectedPoolId]);
  useEffect(() => {
    if (selectedPool && selectedPool.sourceLE !== selectedLocation) {
      setSelectedLocation(selectedPool.sourceLE);
    }
  }, [selectedPool]);

  // --- Allocate ---------------------------------------------------------------
  const [selectedService, setSelectedService] = useState<string | undefined>();
  const [selectedLocation, setSelectedLocation] = useState<string | undefined>();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityOrgUnits, setActivityOrgUnits] = useState<Record<string, string[]>>({});
  const [matrix, setMatrix] = useState<Matrix>({});
  const [editMatrix, setEditMatrix] = useState<Record<string, Record<ExpenseKey, string>>>({});
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [costPoolReviewDialogOpen, setCostPoolReviewDialogOpen] = useState(false);

  // Load cost pools when tower or service changes (for both pools and allocate pages)
  useEffect(() => {
    // Use selectedServiceForPool for pools page, selectedService for allocate page
    const activeService = selectedServiceForPool || selectedService;
    if (!selectedTower || !activeService) {
      setCostPools([]);
      return;
    }
    
    const loadCostPools = async () => {
      try {
        const { data, error } = await supabase
          .from('cost_pools')
          .select('*')
          .eq('service_id', activeService);
        
        if (error) throw error;
        
        // Map database records to component format and populate OUs from assignments
        const poolsFromDb = (data || []).map(pool => {
          // Get OUs assigned to this pool
          const assignedOUs = Object.entries(assignedPoolByOu)
            .filter(([_, poolId]) => poolId === pool.id)
            .map(([ou, _]) => ou);
          
          return {
            id: pool.id,
            name: pool.name,
            sourceLE: pool.source_le || 'UK', // Load from database
            ous: assignedOUs,
            serviceId: pool.service_id
          };
        });
        
        // Preserve newly created pools not in DB (by ID), scoped to active service
        const existingPoolIds = new Set(poolsFromDb.map(p => p.id));
        const newPools = costPools.filter(p => !existingPoolIds.has(p.id) && p.serviceId === activeService);
        
        // Exclude pools pending deletion locally to prevent reappearing until persisted
        const filtered = [...poolsFromDb, ...newPools].filter(p => !deletedPoolIds.has(p.id));
        setCostPools(filtered);
        // Keep originalCostPools as full set from DB so we can detect deletions in review
        setOriginalCostPools(poolsFromDb);
      } catch (error) {
        console.error('Error loading cost pools:', error);
        setCostPools([]);
        setOriginalCostPools([]);
      }
    };
    
    loadCostPools();
  }, [selectedTower, selectedServiceForPool, selectedService, assignedPoolByOu, deletedPoolIds]);

  // Load metrics when tower and service change
  useEffect(() => {
    const loadMetrics = async () => {
      const activeService = selectedServiceForPool || selectedService;
      if (!selectedTower || !activeService) {
        setMetrics([]);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('metrics')
          .select('*')
          .eq('tower_id', selectedTower)
          .eq('service', activeService);
        
        if (error) {
          console.error('Error loading metrics:', error);
          setMetrics([]);
          return;
        }
        
        setMetrics((data || []).map(m => ({
          id: m.metric_id,
          name: m.name,
          service: m.service,
          sourceLE: m.source_le,
          franchisePercentages: m.franchise_percentages,
          selectedYears: m.selected_years,
          leAllocations: m.le_allocations,
          activeLeMap: m.active_le_map
        })));
      } catch (error) {
        console.error('Error loading metrics:', error);
        setMetrics([]);
      }
    };
    
    loadMetrics();
  }, [selectedTower, selectedServiceForPool, selectedService]);
  
  // Filter metrics by selected service and cost pool source LE
  const availableMetrics = useMemo(() => {
    if (!selectedService) return [];
    const serviceMetrics = metrics.filter(m => m.service === selectedService);
    // Further filter by cost pool's source LE if available
    if (selectedPool) {
      return serviceMetrics.filter(m => m.sourceLE === selectedPool.sourceLE);
    }
    return serviceMetrics;
  }, [metrics, selectedService, selectedPool]);

  const orgUnits = useMemo(() => {
    if (!selectedService || !selectedLocation) return [] as string[];
    const base = (data.services[selectedService] || []).filter(ou => getProviderLE(ou) === selectedLocation);
    if (selectedPool && selectedPool.sourceLE === selectedLocation) {
      const set = new Set(selectedPool.ous);
      return base.filter(ou => set.has(ou));
    }
    return base;
  }, [selectedService, selectedLocation, data, selectedPool]);
  useEffect(() => {
    setMatrix(m => {
      const next: Matrix = {
        ...m
      } as Matrix;
      const ids = activities.map(a => a.id);
      ids.forEach(id => {
        next[id] = next[id] || {} as Record<ExpenseKey, number>;
      });
      Object.keys(next).forEach(id => {
        if (!ids.includes(id)) delete next[id];
      });
      EXPENSES.forEach(exp => ids.forEach(id => {
        if (typeof next[id][exp] !== "number") next[id][exp] = 0;
      }));
      return next;
    });
  }, [activities]);
  useEffect(() => {
    setActivityOrgUnits(prev => {
      const next: Record<string, string[]> = {
        ...prev
      };
      const ids = activities.map(a => a.id);
      Object.keys(next).forEach(id => {
        if (!ids.includes(id)) delete next[id];
      });
      ids.forEach(id => {
        const existing = (next[id] || []).filter(ou => orgUnits.includes(ou));
        next[id] = existing.length > 0 ? existing : [...orgUnits];
      });
      return next;
    });
  }, [activities, orgUnits]);
  const expenseTotals = useMemo<Record<ExpenseKey, number>>(() => {
    const totals: Record<ExpenseKey, number> = {
      Staff: 0,
      Electricity: 0,
      Stationary: 0,
      Maintenance: 0,
      Travel: 0
    } as Record<ExpenseKey, number>;
    orgUnits.forEach(ou => {
      const c = data.costs[ou] || {
        staff: 0,
        non_staff: 0
      };
      totals.Staff += c.staff || 0;
      const ns = splitNonStaff(c.non_staff || 0);
      (NON_STAFF_TYPES as readonly NonStaffKey[]).forEach(k => {
        totals[k] += ns[k] || 0;
      });
    });
    return totals;
  }, [orgUnits, data]);
  const perActivityExpenseTotals = useMemo<Record<string, Record<ExpenseKey, number>>>(() => {
    const map: Record<string, Record<ExpenseKey, number>> = {};
    activities.forEach(a => {
      const base: Record<ExpenseKey, number> = {
        Staff: 0,
        Electricity: 0,
        Stationary: 0,
        Maintenance: 0,
        Travel: 0
      } as Record<ExpenseKey, number>;
      const sel = activityOrgUnits[a.id] && activityOrgUnits[a.id].length > 0 ? activityOrgUnits[a.id] : orgUnits;
      sel.forEach(ou => {
        if (!orgUnits.includes(ou)) return;
        const c = data.costs[ou] || {
          staff: 0,
          non_staff: 0
        };
        base.Staff += c.staff || 0;
        const ns = splitNonStaff(c.non_staff || 0);
        (NON_STAFF_TYPES as readonly NonStaffKey[]).forEach(k => {
          base[k] += ns[k] || 0;
        });
      });
      map[a.id] = base;
    });
    return map;
  }, [activities, activityOrgUnits, orgUnits, data]);
  const colTotal = (exp: ExpenseKey) => activities.reduce((s, a) => s + (matrix[a.id]?.[exp] ?? 0), 0);
  const activityMoneyTotals = useMemo(() => {
    const out: Record<string, number> = {};
    activities.forEach(a => {
      let sum = 0;
      EXPENSES.forEach(exp => {
        const pct = (matrix[a.id]?.[exp] ?? 0) / 100;
        const base = perActivityExpenseTotals[a.id]?.[exp] || 0;
        sum += base * pct;
      });
      out[a.id] = sum;
    });
    return out;
  }, [activities, matrix, perActivityExpenseTotals]);

  // Overlap-aware cap (keeps per-OU total <= 100% across activities)
  const allocatedPctByOuForExpense = useMemo(() => {
    const out: Record<ExpenseKey, Record<string, number>> = {} as any;
    EXPENSES.forEach(exp => {
      const perOu: Record<string, number> = {};
      activities.forEach(a => {
        const pct = matrix[a.id]?.[exp] ?? 0;
        const ous = activityOrgUnits[a.id] && activityOrgUnits[a.id].length > 0 ? activityOrgUnits[a.id] : orgUnits;
        ous.forEach(ou => {
          perOu[ou] = (perOu[ou] ?? 0) + pct;
        });
      });
      out[exp] = perOu;
    });
    return out;
  }, [activities, matrix, activityOrgUnits, orgUnits]);
  const getOverlapCapForActivityExpense = (aid: string, exp: ExpenseKey) => {
    const ous = activityOrgUnits[aid] && activityOrgUnits[aid].length > 0 ? activityOrgUnits[aid] : orgUnits;
    if (ous.length === 0) return 0;
    const currentVal = matrix[aid]?.[exp] ?? 0;
    let minRemaining = 100;
    ous.forEach(ou => {
      const totalForOu = allocatedPctByOuForExpense[exp]?.[ou] ?? 0;
      const remainingForOu = Math.max(0, 100 - Math.max(0, totalForOu - currentVal));
      if (remainingForOu < minRemaining) minRemaining = remainingForOu;
    });
    const remainingCol = Math.max(0, 100 - colTotal(exp) + currentVal);
    return Math.max(0, Math.min(minRemaining, remainingCol));
  };
  const updateCell = (aid: string, exp: ExpenseKey, v: string) => {
    // Allow empty while typing; only digits and optional single dot with up to 2 decimals
    if (v !== "" && !/^\d*\.?\d{0,2}$/.test(v)) return;
    setEditMatrix(prev => {
      const row = prev[aid] ? {
        ...prev[aid]
      } : {} as Record<ExpenseKey, string>;
      row[exp] = v;
      return {
        ...prev,
        [aid]: row
      };
    });
  };
  const validateCell = (aid: string, exp: ExpenseKey, rawOverride?: string) => {
    setMatrix(m => {
      const rawStr = rawOverride ?? editMatrix[aid]?.[exp];
      let parsed: number;
      if (rawStr === undefined || rawStr === "") {
        parsed = 0;
      } else {
        parsed = Number(rawStr);
        if (isNaN(parsed)) parsed = 0;
      }
      // Clamp to 0-100 per cell and round to 2 decimals, but allow column totals to exceed 100%
      parsed = Math.min(100, Math.max(0, parsed));
      parsed = Math.round(parsed * 100) / 100;
      const existingRow = m[aid] || {} as Record<ExpenseKey, number>;
      const newRow: Record<ExpenseKey, number> = {
        ...existingRow,
        [exp]: parsed
      };
      EXPENSES.forEach(e => {
        if (typeof newRow[e] !== "number") newRow[e] = 0;
      });
      return {
        ...m,
        [aid]: newRow
      };
    });

    // Clear the editing buffer for this cell after validating
    setEditMatrix(prev => {
      if (!prev[aid]) return prev;
      const nextRow = {
        ...prev[aid]
      };
      delete nextRow[exp];
      const next = {
        ...prev
      } as Record<string, Record<ExpenseKey, string>>;
      if (Object.keys(nextRow).length === 0) {
        delete next[aid];
      } else {
        next[aid] = nextRow;
      }
      return next;
    });
  };
  const allColsValid = activities.length === 0 || EXPENSES.every(exp => colTotal(exp) === 100);
  const allActivitiesHaveMetrics = activities.length > 0 && activities.every(activity => activity.metricId);
  
  // Detect if there are any changes
  const hasChanges = useMemo(() => {
    // Check if activities changed
    if (activities.length !== initialActivities.length) return true;
    
    const activitiesChanged = activities.some((activity, index) => {
      const initialActivity = initialActivities[index];
      return !initialActivity || 
             activity.name !== initialActivity.name || 
             activity.metricId !== initialActivity.metricId;
    });
    
    if (activitiesChanged) return true;
    
    // Check if matrix changed
    const activityIds = activities.map(a => a.id);
    for (const activityId of activityIds) {
      for (const expense of EXPENSES) {
        const currentVal = matrix[activityId]?.[expense] ?? 0;
        const initialVal = initialMatrix[activityId]?.[expense] ?? 0;
        if (currentVal !== initialVal) return true;
      }
    }
    
    return false;
  }, [activities, initialActivities, matrix, initialMatrix]);
  
  // Note: Confirmation is reset when loading/saving records or when switching context
  const locationForReview = selectedLocation || selectedPool?.sourceLE;
  const canReview = Boolean(selectedService) && Boolean(locationForReview) && activities.length > 0 && allColsValid && hasChanges;
  const canSave = canReview && allActivitiesHaveMetrics && activityReviewConfirmed;

  // Load allocation data from database
  useEffect(() => {
    const loadAllocation = async () => {
      if (!selectedTower || !selectedService || !selectedPoolId) {
        console.log('[Load Allocation] Missing required fields:', { selectedTower, selectedService, selectedPoolId });
        setActivities([]);
        setMatrix({});
        return;
      }

      console.log('[Load Allocation] Loading for:', { selectedTower, selectedService, selectedPoolId });

      try {
        // First load activities from activities table to get metric_id
        const { data: activitiesData, error: activitiesError } = await supabase
          .from('activities')
          .select('*')
          .eq('tower_id', selectedTower)
          .eq('service_id', selectedService)
          .eq('cost_pool_id', selectedPoolId);

        if (activitiesError) {
          console.error('[Load Allocation] Error loading activities:', activitiesError);
        }

        // Then load allocation data
        const { data, error } = await supabase
          .from('activity_allocations')
          .select('*')
          .eq('tower', selectedTower)
          .eq('service', selectedService)
          .eq('cost_pool_id', selectedPoolId)
          .maybeSingle();

        if (error) {
          console.error('[Load Allocation] Error loading allocation:', error);
          return;
        }

        if (data) {
          console.log('[Load Allocation] Data loaded:', data);
          console.log('[Load Allocation] Activities from DB:', activitiesData);
          
          // Merge activities from activity_allocations with metric_id from activities table
          let loadedActivities = (data.activities as Activity[]) || [];
          
          // Map metric_id from activities table to loaded activities
          if (activitiesData && activitiesData.length > 0) {
            loadedActivities = loadedActivities.map(activity => {
              const dbActivity = activitiesData.find(a => a.activity_id === activity.id);
              return {
                ...activity,
                metricId: dbActivity?.metric_id || activity.metricId
              };
            });
          }
          
          console.log('[Load Allocation] Merged activities with metrics:', loadedActivities);
          const loadedMatrix = (data.allocation_matrix as Matrix) || {};
          setActivities(loadedActivities);
          setMatrix(loadedMatrix);
          // Store initial state
          setInitialActivities(JSON.parse(JSON.stringify(loadedActivities)));
          setInitialMatrix(JSON.parse(JSON.stringify(loadedMatrix)));
          setActivityReviewConfirmed(false);
        } else {
          console.log('[Load Allocation] No saved data found');
          // No saved data, reset to empty
          setActivities([]);
          setMatrix({});
          setInitialActivities([]);
          setInitialMatrix({});
          setActivityReviewConfirmed(false);
        }
      } catch (error) {
        console.error('[Load Allocation] Unexpected error:', error);
      }
    };

    loadAllocation();
  }, [selectedTower, selectedService, selectedPoolId]);

  // Save allocation to database
  const handleSaveAllocation = async () => {
    if (!selectedTower || !selectedService || !selectedPoolId || !canSave) return;

    try {
      // Persist any pending cost pool deletions (in case user deleted pools in the Pools tab but didn't press its Submit)
      if (deletedPoolIds.size > 0) {
        const { error: deletePoolsErr } = await supabase
          .from('cost_pools')
          .delete()
          .in('id', Array.from(deletedPoolIds));
        if (deletePoolsErr) {
          console.error('Error deleting pending cost pools:', deletePoolsErr);
          toast.error('Failed to remove deleted cost pools');
        } else {
          setDeletedPoolIds(new Set());
        }
      }

      // Save/update activities in the activities table with metric_id
      for (const activity of activities) {
        const activityData = {
          tower_id: selectedTower,
          service_id: selectedService,
          cost_pool_id: selectedPoolId,
          activity_id: activity.id,
          name: activity.name,
          metric_id: activity.metricId || null,
        };

        // Check if activity exists
        const { data: existingActivity } = await supabase
          .from('activities')
          .select('id')
          .eq('tower_id', selectedTower)
          .eq('service_id', selectedService)
          .eq('cost_pool_id', selectedPoolId)
          .eq('activity_id', activity.id)
          .maybeSingle();

        if (existingActivity) {
          // Update existing activity
          await supabase
            .from('activities')
            .update(activityData)
            .eq('id', existingActivity.id);
        } else {
          // Insert new activity
          await supabase
            .from('activities')
            .insert(activityData);
        }
      }

      // Check if an allocation already exists for this tower/service/pool
      const { data: existing, error: fetchError } = await supabase
        .from('activity_allocations')
        .select('id')
        .eq('tower', selectedTower)
        .eq('service', selectedService)
        .eq('cost_pool_id', selectedPoolId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking existing allocation:', fetchError);
        toast.error('Failed to check existing allocation');
        return;
      }

      const allocationData = {
        tower: selectedTower,
        service: selectedService,
        cost_pool_id: selectedPoolId,
        activities: activities,
        allocation_matrix: matrix,
        activity_totals: activityMoneyTotals,
      };

      if (existing) {
        // Update existing allocation
        const { error: updateError } = await supabase
          .from('activity_allocations')
          .update(allocationData)
          .eq('id', existing.id);

        if (updateError) {
          console.error('Error updating allocation:', updateError);
          toast.error('Failed to update allocation');
          return;
        }

        toast.success('Allocation updated successfully!');
        // Reset initial state after successful save
        setInitialActivities(JSON.parse(JSON.stringify(activities)));
        setInitialMatrix(JSON.parse(JSON.stringify(matrix)));
        setActivityReviewConfirmed(false);
      } else {
        // Insert new allocation
        const { error: insertError } = await supabase
          .from('activity_allocations')
          .insert(allocationData);

        if (insertError) {
          console.error('Error saving allocation:', insertError);
          toast.error('Failed to save allocation');
          return;
        }

        toast.success('Allocation saved successfully!');
        // Reset initial state after successful save
        setInitialActivities(JSON.parse(JSON.stringify(activities)));
        setInitialMatrix(JSON.parse(JSON.stringify(matrix)));
        setActivityReviewConfirmed(false);
      }
    } catch (error) {
      console.error('Unexpected error saving allocation:', error);
      toast.error('An unexpected error occurred');
    }
  };

  // Single Section component (avoid duplicates)
  const Section = ({
    title,
    children
  }: {
    title?: string;
    children: React.ReactNode;
  }) => <section className="rounded-2xl border border-border bg-card shadow-lg p-6 w-full">
      {title && <div className="mb-3 text-base font-semibold text-foreground">{title}</div>}
      {children}
    </section>;

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return <TooltipProvider>
      <div className="w-full">
        {/* Container: no extra padding to match page spacing */}

      {/* Add Cost Pool Dialog */}
      <Dialog open={showAddPoolDialog} onOpenChange={setShowAddPoolDialog}>
        <DialogContent className="bg-card z-50">
          <DialogHeader>
            <DialogTitle>Add New Cost Pool</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs font-semibold text-foreground">Source LE</label>
              <select className="mt-1 w-full rounded-xl border border-input bg-card p-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none transition-shadow" value={newPoolLE} onChange={e => setNewPoolLE(e.target.value)}>
                <option value="">Choose LE</option>
                {Object.keys(ouByLE).map(le => <option key={le} value={le}>{le}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Cost Pool Name</label>
              <input ref={newPoolNameRef} type="text" className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed" placeholder="e.g. UK Finance Ops" disabled={!newPoolLE} onKeyDown={e => e.key === 'Enter' && newPoolLE && createPool()} />
            </div>
          </div>
          <DialogFooter>
            <button className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors font-medium text-sm" onClick={() => setShowAddPoolDialog(false)}>
              Cancel
            </button>
            <button className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 font-semibold shadow-md text-sm" disabled={!newPoolLE} onClick={createPool}>
              Add Pool
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Cost Pool Dialog */}
      <Dialog open={!!renamePoolId} onOpenChange={open => !open && setRenamePoolId(null)}>
        <DialogContent className="bg-card z-50">
          <DialogHeader>
            <DialogTitle>Rename Cost Pool</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-xs font-semibold text-foreground">Cost Pool Name</label>
            <input type="text" className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" placeholder="Enter new name" value={renamePoolName} onChange={e => setRenamePoolName(e.target.value)} onKeyDown={e => e.key === 'Enter' && renamePoolName.trim() && renamePool()} />
          </div>
          <DialogFooter>
            <button className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors font-medium text-sm" onClick={() => setRenamePoolId(null)}>
              Cancel
            </button>
            <button className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 font-semibold shadow-md text-sm" disabled={!renamePoolName.trim()} onClick={renamePool}>
              Rename
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mx-auto max-w-7xl space-y-6">
        {currentPage === "tower" && <Section>
            <div className="mb-4 text-xs font-bold text-primary">Choose a Department</div>
            <div className="grid gap-4 md:grid-cols-4 items-end">
              <div>
                <label className="text-sm font-semibold text-foreground">Area</label>
                <select className="mt-2 w-full rounded-xl border border-input bg-card text-foreground p-3 focus:ring-2 focus:ring-ring focus:outline-none transition-shadow" value={pendingArea || ""} onChange={e => setPendingArea(e.target.value || undefined)}>
                  <option value="" disabled>Select an area</option>
                  <option value="RTB">RTB</option>
                  <option value="CTB">CTB</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground">Department</label>
                <select className="mt-2 w-full rounded-xl border border-input bg-card text-foreground p-3 focus:ring-2 focus:ring-ring focus:outline-none transition-shadow" value={pendingTower || ""} onChange={e => setPendingTower(e.target.value || undefined)}>
                  <option value="" disabled>Select a department</option>
                  {Array.from(new Set(Object.values(data.towers))).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground">Scenario</label>
                <select className="mt-2 w-full rounded-xl border border-input bg-card text-foreground p-3 focus:ring-2 focus:ring-ring focus:outline-none transition-shadow" value={pendingScenario || ""} onChange={e => setPendingScenario(e.target.value || undefined)}>
                  <option value="" disabled>Select a scenario</option>
                  <option value="Actuals">Actuals</option>
                  <option value="Forecast">Forecast</option>
                </select>
              </div>
              <div className="flex items-end">
                <button className="rounded-xl bg-primary text-primary-foreground px-6 py-3 font-semibold hover:opacity-90 transition-opacity shadow-md" onClick={() => {
                if (!pendingTower) return;
                setSelectedTower(pendingTower);
                setCurrentPage("assign");
              }}>Search</button>
              </div>
            </div>
          </Section>}

        {currentPage === "assign" && selectedTower && <Section>
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold text-primary">Assign Services to Org Units</div>
              <div className="flex gap-3">
                <button className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors font-medium" onClick={() => {
                setCurrentPage("tower");
                setSelectedTower(undefined);
              }}>Back</button>
                <button className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-semibold shadow-md" onClick={() => {
                try {
                  if (selectedTower) {
                    // Reconstruct services map from current assignments for this tower
                    const newServices: Record<string, string[]> = {};
                    Object.keys(SAMPLE_DATA.towers).forEach(svc => {
                      if (SAMPLE_DATA.towers[svc] === selectedTower) newServices[svc] = [];
                    });
                    Object.entries(assignedServiceByOu).forEach(([ou, svc]) => {
                      if (!newServices[svc]) newServices[svc] = [];
                      newServices[svc].push(ou);
                    });
                    setData(prev => ({
                      ...prev,
                      services: {
                        ...prev.services,
                        ...newServices
                      }
                    }));
                  }
                } catch (e) {
                  console.error('Failed to persist assignments', e);
                }
                setCurrentPage("pools");
              }}>Continue</button>
              </div>
            </div>
            {locations.map(loc => <div key={loc} className="mt-6 first:mt-0">
                <div className="mb-3 text-xs font-bold text-primary">Source LE: {loc}</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[0.7rem] table-fixed min-w-[800px]">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-border">
                        <th className="px-4 py-3 w-48 font-semibold">Org Unit</th>
                        <th className="px-4 py-3 w-28 font-semibold">FTE</th>
                        <th className="px-4 py-3 w-36 font-semibold">Staff</th>
                        <th className="px-4 py-3 w-36 font-semibold">Non-staff</th>
                        <th className="px-4 py-3 w-56 font-semibold">Choose Service</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orgUnitsForTower.filter(ou => getProviderLE(ou) === loc).map(ou => {
                    const totals = getTotals(ou);
                    const nonStaffBreakdown = splitNonStaff(totals.non_staff);
                    return <tr key={`${loc}-${ou}`} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                            <td className="px-4 py-3 font-mono font-medium">{ou}</td>
                            <td className="px-4 py-3 font-semibold">
                              {totals.fte.toFixed(1)}
                            </td>
                            <td className="px-4 py-3 font-semibold">
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
                            </td>
                            <td className="px-4 py-3 font-semibold">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help underline decoration-dotted">{gbp(totals.non_staff)}</span>
                                </TooltipTrigger>
                                <TooltipContent className="bg-card border border-border p-3 shadow-lg">
                                  <div className="text-sm space-y-1">
                                    <div className="font-bold mb-2 text-primary border-b border-border pb-1">Non-Staff Breakdown</div>
                                    {NON_STAFF_TYPES.map(type => <div key={type} className="flex justify-between gap-4">
                                        <span className="text-muted-foreground">{type}:</span>
                                        <span className="font-medium text-foreground">{gbp(nonStaffBreakdown[type])}</span>
                                      </div>)}
                                    <div className="flex justify-between gap-4 border-t border-border pt-1 mt-1 font-bold">
                                      <span className="text-primary">Total:</span>
                                      <span className="text-primary">{gbp(totals.non_staff)}</span>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </td>
                            <td className="px-4 py-3">
                              <select className="w-full rounded-xl border border-input bg-card p-2 focus:ring-2 focus:ring-ring focus:outline-none transition-shadow" value={assignedServiceByOu[ou] || ""} onChange={e => setAssignedServiceByOu(m => ({
                          ...m,
                          [ou]: e.target.value
                        }))}>
                                <option value="" disabled>Select service</option>
                                {(servicesContainingOu[ou] && servicesContainingOu[ou].length ? servicesContainingOu[ou] : servicesForTower).map(svc => <option key={`${ou}-${svc}`} value={svc}>{svc}</option>)}
                              </select>
                            </td>
                          </tr>;
                  })}
                      {orgUnitsForTower.filter(ou => getProviderLE(ou) === loc).length === 0 && <tr><td className="px-4 py-6 text-muted-foreground text-center" colSpan={4}>No org units in this location for the selected tower.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>)}
          </Section>}

        {currentPage === "pools" && selectedTower && <Section>
            {/* Top bar with Add Cost Pool and Submit buttons */}
            <div className="flex items-center justify-between mb-6">
              <button className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors font-semibold shadow-md text-sm" onClick={() => setShowAddPoolDialog(true)}>
                Add Cost Pool
              </button>
              <div className="flex gap-2">
                <button 
                  className="px-4 py-2 rounded-xl bg-warning text-warning-foreground font-semibold shadow-sm hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
                  onClick={() => setCostPoolReviewDialogOpen(true)}
                  disabled={!hasPoolChanges}
                >
                  Review
                </button>
                <button 
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold shadow-sm hover:opacity-90 transition-opacity text-sm disabled:opacity-50" 
                  disabled={!hasPoolChanges || !poolReviewConfirmed} 
                  onClick={saveCostPools}
                >
                  Submit
                </button>
              </div>
            </div>

            {/* All Cost Pool Cards */}
            {selectedServiceForPool ? <div className="space-y-6">
                {/* Cost Pool Cards - All Together */}
                <div className="flex gap-3 mb-6 flex-wrap">
                  {visibleCostPools.map(pool => {
                    const poolCosts = getPoolCostsFromAssignments(pool.id, selectedServiceForPool || undefined);
                    const poolPct = selectedServiceTotalCosts.total > 0 ? (poolCosts.total / selectedServiceTotalCosts.total * 100).toFixed(1) : '0.0';
                    return <div key={pool.id} className="rounded-xl border border-border bg-card/50 p-4 min-w-[200px] relative">
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button onClick={() => openRenameDialog(pool.id, pool.name)} className="p-1 hover:bg-muted rounded transition-colors" title="Rename pool">
                          <Pencil className="w-3 h-3 text-muted-foreground" />
                        </button>
                        <button onClick={() => deletePool(pool.id)} className="p-1 hover:bg-destructive/10 rounded transition-colors" title="Delete pool">
                          <X className="w-3 h-3 text-destructive" />
                        </button>
                      </div>
                      <div className="text-xs font-bold text-primary mb-1 pr-12">{pool.name}</div>
                      <div className="text-[0.65rem] text-muted-foreground mb-2">Source LE: {pool.sourceLE}</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Staff:</span>
                          <span className="font-semibold">{gbp(poolCosts.staff)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Non-staff:</span>
                          <span className="font-semibold">{gbp(poolCosts.nonStaff)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">FTE:</span>
                          <span className="font-semibold">{poolCosts.fte.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-1 mt-1">
                          <span className="text-foreground font-semibold">Total:</span>
                          <span className="font-bold">{gbp(poolCosts.total)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">% of Service:</span>
                          <span className="font-bold text-primary">{poolPct}%</span>
                        </div>
                      </div>
                    </div>;
                  })}
                </div>

                {/* Org Units by Source LE */}
                {locations.map((loc, index) => <div key={loc}>
                    <div className="mb-3 text-xs font-bold text-primary">Source LE: {loc}</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[0.7rem] table-fixed min-w-[800px]">
                        <thead>
                          <tr className="text-left text-muted-foreground border-b border-border">
                            <th className="px-4 py-3 w-48 font-semibold">Org Unit</th>
                            <th className="px-4 py-3 w-28 font-semibold">FTE</th>
                            <th className="px-4 py-3 w-36 font-semibold">Staff</th>
                            <th className="px-4 py-3 w-36 font-semibold">Non-staff</th>
                            <th className="px-4 py-3 w-56 font-semibold">Select Cost Pool</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(ouByLE[loc] || [])
                            .sort((a, b) => {
                              const aAssigned = assignedPoolByOu[a];
                              const bAssigned = assignedPoolByOu[b];
                              
                              // Unassigned first
                              if (!aAssigned && bAssigned) return -1;
                              if (aAssigned && !bAssigned) return 1;
                              if (!aAssigned && !bAssigned) return 0;
                              
                              // Then sort by cost pool name
                              const aPool = visibleCostPools.find(p => p.id === aAssigned);
                              const bPool = visibleCostPools.find(p => p.id === bAssigned);
                              const aName = aPool?.name || '';
                              const bName = bPool?.name || '';
                              return aName.localeCompare(bName);
                            })
                            .map(ou => {
                      const totals = getTotals(ou);
                      const nonStaffBreakdown = splitNonStaff(totals.non_staff);
                      return <tr key={`${loc}-${ou}`} className={`border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${!assignedPoolByOu[ou] ? 'bg-warning/10' : ''}`}>
                                <td className="px-4 py-3 font-mono font-medium">{ou}</td>
                                <td className="px-4 py-3 font-semibold">
                                  {totals.fte.toFixed(1)}
                                </td>
                                <td className="px-4 py-3 font-semibold">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="cursor-help underline decoration-dotted">{gbp(totals.staff)}</span>
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-card border border-border p-3 shadow-lg z-50">
                                        <div className="text-sm">
                                          <div className="font-bold mb-1 text-primary">Staff Costs</div>
                                          <div className="text-foreground">{gbp(totals.staff)}</div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </td>
                                <td className="px-4 py-3 font-semibold">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="cursor-help underline decoration-dotted">{gbp(totals.non_staff)}</span>
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-card border border-border p-3 shadow-lg z-50">
                                        <div className="text-sm space-y-1">
                                          <div className="font-bold mb-2 text-primary border-b border-border pb-1">Non-Staff Breakdown</div>
                                          {NON_STAFF_TYPES.map(type => <div key={type} className="flex justify-between gap-4">
                                              <span className="text-muted-foreground">{type}:</span>
                                              <span className="font-medium text-foreground">{gbp(nonStaffBreakdown[type])}</span>
                                            </div>)}
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
                                  <select className="w-full rounded-xl border border-input bg-card p-2 focus:ring-2 focus:ring-ring focus:outline-none transition-shadow" value={assignedPoolByOu[ou] || ""} onChange={e => setAssignedPoolByOu(m => ({
                            ...m,
                            [ou]: e.target.value
                          }))}>
                                    <option value="">Select cost pool</option>
                                    {visibleCostPools.filter(p => p.sourceLE === loc).map(pool => <option key={pool.id} value={pool.id}>{pool.name}</option>)}
                                  </select>
                                </td>
                              </tr>;
                    })}
                          {(!ouByLE[loc] || ouByLE[loc].length === 0) && <tr><td className="px-4 py-6 text-muted-foreground text-center" colSpan={4}>No org units in this location for the selected service.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>)}
              </div> : <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                Select a Service to begin assigning org units to cost pools.
              </div>}
          </Section>}

        {currentPage === "allocate" && selectedTower && <div className="rounded-2xl border border-border bg-card shadow-lg p-6 w-full">
            {/* Top bar with cost pool and submit button */}
            <div className="flex items-end justify-between gap-4 mb-6">
              <div className="flex-1 max-w-xs">
                
                <select className="mt-1 w-full rounded-xl border border-input bg-background text-foreground p-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none transition-shadow" value={selectedPoolId || ""} onChange={e => setSelectedPoolId(e.target.value || undefined)}>
                  <option value="" disabled>Choose a cost pool</option>
                  {visibleCostPools.map(p => <option key={p.id} value={p.id}>{p.name} · {p.sourceLE}</option>)}
                </select>
              </div>
              
              {/* Review and Submit Buttons */}
              <div className="flex gap-2">
                <button 
                  className="px-4 py-2 rounded-xl bg-warning text-warning-foreground font-semibold shadow-sm hover:opacity-90 transition-opacity text-sm disabled:opacity-50" 
                  disabled={!canReview}
                  onClick={() => setReviewDialogOpen(true)}
                >
                  Review
                </button>
                <button className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold shadow-sm hover:opacity-90 transition-opacity text-sm disabled:opacity-50" disabled={!canSave} onClick={handleSaveAllocation}>
                  Submit
                </button>
              </div>
            </div>


            {!selectedService || !selectedPoolId ? <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                Select a service and cost pool to create your Activities.
              </div> : <div className="overflow-x-auto">
                    <table className="w-full text-[0.7rem] table-fixed min-w-[950px]">
                      <thead className="sticky top-0 bg-background z-10">
                        <tr className="text-left text-muted-foreground border-b-2 border-border">
                          <th className="px-3 py-3 w-48 font-semibold sticky left-0 bg-background"></th>
                          {EXPENSES.map(exp => <th key={`exp-h-${exp}`} className="px-3 py-3 w-32 font-semibold">
                              <div className="flex flex-col items-start gap-1">
                                <div className="text-xs font-semibold text-muted-foreground">{exp}</div>
                                <div className={`text-xs font-bold ${colTotal(exp) === 100 ? 'text-green-600' : 'text-primary'}`}>{gbp(expenseTotals[exp] || 0)}</div>
                                <div className={`flex items-center gap-1 text-xs font-bold ${colTotal(exp) === 100 ? 'text-green-600' : 'text-destructive'}`}>{colTotal(exp).toFixed(2)}% {colTotal(exp) === 100 && <span>✓</span>}</div>
                              </div>
                            </th>)}
                          <th className="px-3 py-3 text-right w-32 font-semibold">
                            <button className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors font-semibold text-xs shadow-sm" onClick={() => {
                      setMatrix(m => {
                        const next = {
                          ...m
                        };
                        activities.forEach(a => {
                          const staffPct = m[a.id]?.Staff ?? 0;
                          const row = next[a.id] || {} as Record<ExpenseKey, number>;
                          EXPENSES.forEach(exp => {
                            if (exp !== "Staff") {
                              row[exp] = staffPct;
                            }
                          });
                          next[a.id] = row;
                        });
                        return next;
                      });
                    }}>
                              Mirror Staff Cost
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Expense Breakdown Rows */}
                        <tr className="border-b-2 border-primary/20 bg-muted/30">
                          <td colSpan={EXPENSES.length + 2} className="px-4 py-2 sticky left-0">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-primary text-sm">Expense Breakdown by Org Unit</span>
                              <span className="font-semibold text-muted-foreground text-sm">Total (£)</span>
                            </div>
                          </td>
                        </tr>
                        {orgUnits.length > 0 ? orgUnits.map(ou => {
                  const ns = splitNonStaff(data.costs[ou]?.non_staff || 0);
                  const ouTotal = (data.costs[ou]?.staff || 0) + (data.costs[ou]?.non_staff || 0);
                  return <tr key={`exp-${ou}`} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                                <td className="px-3 py-2 font-mono text-xs font-medium sticky left-0 bg-background">{ou}</td>
                                <td className="px-3 py-2 text-xs font-semibold">{gbp(data.costs[ou]?.staff || 0)}</td>
                                {NON_STAFF_TYPES.map(k => <td key={`${ou}-${k}`} className="px-3 py-2 text-xs font-semibold">{gbp(ns[k])}</td>)}
                                <td className="px-3 py-2 text-right text-xs font-bold text-primary">{gbp(ouTotal)}</td>
                              </tr>;
                }) : <tr><td className="px-3 py-4 text-muted-foreground text-center text-xs" colSpan={EXPENSES.length + 2}>Select a service and location to see expense breakdown.</td></tr>}

                        {/* Activity Allocation Rows */}
                        <tr className="border-b-2 border-primary/20 bg-muted/30">
                          <td colSpan={EXPENSES.length + 2} className="px-4 py-2 sticky left-0">
                            <div className="flex items-center justify-start">
                              <button className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 transition-colors font-semibold shadow-md text-xs" onClick={() => setActivities(a => [...a, {
                        id: newId(),
                        name: ""
                      }])}>Add Activity</button>
                            </div>
                          </td>
                        </tr>
                        {activities.length > 0 ? activities.map(a => <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="px-3 py-3 sticky left-0 bg-background align-middle">
                                <div className="flex flex-col gap-2 w-full justify-center">
                                  <div className="flex items-center gap-2">
                                    <button className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors" aria-label="Delete activity" title="Delete activity" onClick={() => setActivities(as => as.filter(x => x.id !== a.id))}>
                                      <X className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                    {activityNameDrafts[a.id] !== undefined ? <input type="text" value={activityNameDrafts[a.id]} placeholder="Add Activity Name" onChange={e => setActivityNameDrafts(prev => ({
                        ...prev,
                        [a.id]: e.target.value
                      }))} onBlur={() => {
                        setActivities(as => as.map(x => x.id === a.id ? {
                          ...x,
                          name: activityNameDrafts[a.id]
                        } : x));
                        setActivityNameDrafts(prev => {
                          const next = {
                            ...prev
                          };
                          delete next[a.id];
                          return next;
                        });
                      }} onKeyDown={e => {
                        if (e.key === 'Enter') {
                          setActivities(as => as.map(x => x.id === a.id ? {
                            ...x,
                            name: activityNameDrafts[a.id]
                          } : x));
                          setActivityNameDrafts(prev => {
                            const next = {
                              ...prev
                            };
                            delete next[a.id];
                            return next;
                          });
                        }
                        if (e.key === 'Escape') {
                          setActivityNameDrafts(prev => {
                            const next = {
                              ...prev
                            };
                            delete next[a.id];
                            return next;
                          });
                        }
                      }} className="rounded-xl border border-input bg-card px-3 py-2 w-full focus:ring-2 focus:ring-ring focus:outline-none transition-shadow font-medium" autoFocus /> : <div className="rounded-xl border border-input bg-card px-3 py-2 w-full font-medium cursor-pointer hover:bg-muted transition-colors" onClick={() => setActivityNameDrafts(prev => ({
                        ...prev,
                        [a.id]: a.name
                      }))}>
                                        {a.name || <span className="text-muted-foreground">Add Activity Name</span>}
                                      </div>}
                                  </div>
                                  {availableMetrics.length > 0 && (
                                    <Select
                                      value={a.metricId || ""}
                                      onValueChange={(value) => {
                                        setActivities(as => as.map(x => x.id === a.id ? {
                                          ...x,
                                          metricId: value
                                        } : x));
                                      }}
                                    >
                                      <SelectTrigger className="w-full h-8 text-xs bg-card">
                                        <SelectValue placeholder="Select metric" />
                                      </SelectTrigger>
                                      <SelectContent className="z-50 bg-background">
                                        {availableMetrics.map(metric => (
                                          <SelectItem key={metric.id} value={metric.id} className="text-xs">
                                            {metric.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </td>
                               {EXPENSES.map(exp => {
                    const currentVal = matrix[a.id]?.[exp] ?? 0;
                    const disabled = (perActivityExpenseTotals[a.id]?.[exp] ?? 0) === 0;
                    return <td key={`cell-${a.id}-${exp}`} className="px-3 py-3 align-middle">
                                    <input 
                                      key={`input-${a.id}-${exp}`}
                                      type="text" 
                                      inputMode="decimal" 
                                      placeholder="0" 
                                      disabled={disabled} 
                                      value={editMatrix[a.id]?.[exp] ?? (currentVal === 0 ? "" : String(currentVal))} 
                                      onChange={e => {
                        const val = e.target.value;
                        // Only allow numbers and one decimal point with max 2 decimal places
                        if (val !== "" && !/^\d*\.?\d{0,2}$/.test(val)) {
                          return;
                        }
                        // Prevent values over 100
                        const num = Number(val);
                        if (!isNaN(num) && num > 100) {
                          return;
                        }
                        updateCell(a.id, exp, val);
                      }} 
                                      onBlur={e => validateCell(a.id, exp, e.currentTarget.value)} 
                                      className="w-16 rounded-xl border border-input bg-card h-10 px-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none transition-shadow disabled:opacity-50 font-medium placeholder:text-muted-foreground" 
                                    />
                                  </td>;
                  })}
                              <td className="px-3 py-3 text-right font-bold text-primary align-middle">{gbp(activityMoneyTotals[a.id] || 0)}</td>
                            </tr>) : <tr><td className="px-3 py-8 text-muted-foreground text-center" colSpan={EXPENSES.length + 2}>Add an activity to begin.</td></tr>}
                      </tbody>
                    </table>
                  </div>}
                {selectedService && selectedPoolId && <div className="mt-4 text-xs text-muted-foreground bg-muted/50 p-4 rounded-lg">Each <span className="font-bold">expense column</span> must sum to 100% across activities. Amounts are based on the filtered Cost Pool for the chosen Service and Location.</div>}
          </div>}
      </div>
    </div>
    
    <AllocationReviewDialog
      open={reviewDialogOpen}
      onOpenChange={setReviewDialogOpen}
      activities={activities}
      metrics={metrics}
      matrix={matrix}
      activityMoneyTotals={activityMoneyTotals}
      selectedService={selectedService}
      selectedTower={selectedTower}
      confirmed={activityReviewConfirmed}
      onConfirmReview={setActivityReviewConfirmed}
    />
    
    <CostPoolReviewDialog
      open={costPoolReviewDialogOpen}
      onOpenChange={setCostPoolReviewDialogOpen}
      assignedPoolByOu={assignedPoolByOu}
      originalAssignments={originalPoolAssignments}
      costPools={costPools}
      selectedService={selectedServiceForPool}
      costs={data.costs}
      deletedPools={originalCostPools.filter(p => deletedPoolIds.has(p.id))}
      renamedActivities={activities
        .map((activity, index) => {
          const initial = initialActivities[index];
          if (initial && activity.name !== initial.name) {
            return {
              id: activity.id,
              oldName: initial.name,
              newName: activity.name
            };
          }
          return null;
        })
        .filter((a): a is NonNullable<typeof a> => a !== null)}
      confirmed={poolReviewConfirmed}
      onConfirmReview={setPoolReviewConfirmed}
    />
    </TooltipProvider>;
}