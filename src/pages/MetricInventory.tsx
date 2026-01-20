import { useEffect, useState, useRef, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import { X, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFilter } from "@/contexts/FilterContext";
import { MetricInventoryReviewDialog } from "@/components/MetricInventoryReviewDialog";
import { Toggle } from "@/components/ui/toggle";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

const SAMPLE_LES = ["UK", "India"];

const FISCAL_YEARS = ["FY26", "FY27", "FY28", "FY29", "FY30"];

const SAMPLE_HEADINGS = [
  { type: "heading", name: "Franchise A" },
  { type: "heading", name: "Franchise B" },
  { type: "heading", name: "Franchise C" },
  { type: "heading", name: "Franchise D" },
  { type: "heading", name: "Franchise E" },
  { type: "heading", name: "Franchise F" },
  { type: "heading", name: "Franchise G" },
];

const FRANCHISE_LE_MAP: Record<string, string[]> = {
  "Franchise A": ["A", "B"],
  "Franchise B": ["A", "B"],
  "Franchise C": ["Y", "D", "E"],
  "Franchise D": ["C", "V", "N", "M"],
  "Franchise E": ["K", "L"],
  "Franchise F": ["A", "T"],
  "Franchise G": ["A", "Q"],
};

// Additional available LEs for specific franchises (shown in inactive dropdown)
const AVAILABLE_INACTIVE_LES: Record<string, string[]> = {
  "Franchise D": ["F", "G", "H"],
  "Franchise C": ["I", "J", "O"],
  "Franchise E": ["P", "R", "S"],
};

interface Metric {
  id: string;
  service: string;
  sourceLE: string;
  name: string;
}

export default function MetricInventory() {
  const location = useLocation();
  const [selectedTower, setSelectedTower] = useState<string | undefined>();
  const { selectedService, setSelectedService, selectedFilters } = useFilter();
  const [tempService, setTempService] = useState("");
  const [newMetricLE, setNewMetricLE] = useState("");
  const [newMetricName, setNewMetricName] = useState("");
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [initialMetrics, setInitialMetrics] = useState<Metric[]>([]);
  const [deletedMetrics, setDeletedMetrics] = useState<Metric[]>([]);
  const [percentages, setPercentages] = useState<Record<string, Record<string, number>>>({});
  const [selectedYears, setSelectedYears] = useState<Record<string, string[]>>({});
  const [leAllocDialogOpen, setLeAllocDialogOpen] = useState(false);
  const [selectedHeading, setSelectedHeading] = useState<string>("");
  const [leAllocPercentages, setLeAllocPercentages] = useState<Record<string, Record<string, Record<string, number>>>>({});
  const [addLEDialogOpen, setAddLEDialogOpen] = useState(false);
  const [customLEOptions, setCustomLEOptions] = useState<Record<string, string[]>>({});
  const [selectedNewLEs, setSelectedNewLEs] = useState<string[]>([]);
  const [leCommentary, setLeCommentary] = useState("");
  const [addMetricDialogOpen, setAddMetricDialogOpen] = useState(false);
  const [editingMetricId, setEditingMetricId] = useState<string | null>(null);
  const [editingMetricName, setEditingMetricName] = useState("");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [initialPercentages, setInitialPercentages] = useState<Record<string, Record<string, number>>>({});
  const [initialLEAllocPercentages, setInitialLEAllocPercentages] = useState<Record<string, Record<string, Record<string, number>>>>({});
  const [activityImpacts, setActivityImpacts] = useState<Record<string, any[]>>({});
  const [catalogueDialogOpen, setCatalogueDialogOpen] = useState(false);
  const [selectedCatalogueFranchise, setSelectedCatalogueFranchise] = useState<string>("");
  const [activeLEMap, setActiveLEMap] = useState<Record<string, string[]>>(FRANCHISE_LE_MAP);
  const [initialActiveLEMap, setInitialActiveLEMap] = useState<Record<string, string[]>>(FRANCHISE_LE_MAP);
  const [leChangeDialogOpen, setLeChangeDialogOpen] = useState(false);
  const [leChangeAction, setLeChangeAction] = useState<{type: 'activate' | 'deactivate', franchise: string, les: string[]} | null>(null);
  const [leChangeCommentary, setLeChangeCommentary] = useState("");
  const [leChangeLogs, setLeChangeLogs] = useState<Array<{franchise: string, le: string, action: string, commentary: string, timestamp: string}>>([]);
  const [pendingLEChangeLogs, setPendingLEChangeLogs] = useState<Array<{franchise: string, le: string, action: string, commentary: string, timestamp: string}>>([]);
  const [selectedLEsForChange, setSelectedLEsForChange] = useState<Record<string, {active: string[], inactive: string[]}>>({});
  const [deleteLEDialogOpen, setDeleteLEDialogOpen] = useState(false);
  const [leToDelete, setLeToDelete] = useState<{franchise: string, le: string} | null>(null);
  const [deleteLECommentary, setDeleteLECommentary] = useState("");

  useEffect(() => {
    document.title = "Metric Inventory | Cost Allocation Tool";
    const stored = localStorage.getItem("selectedTower");
    if (stored) setSelectedTower(stored);
    setTempService(selectedService);
  }, [selectedService]);

  // Fetch available services filtered by tower (department), area, and scenario
  const { data: servicesForTower = [] } = useQuery({
    queryKey: ["tower-services", selectedTower, selectedFilters],
    queryFn: async () => {
      if (!selectedTower) return [];

      let serviceQuery = supabase
        .from("services")
        .select("id, name, area, scenario")
        .eq("tower_id", selectedTower);

      if (selectedFilters.area) {
        serviceQuery = serviceQuery.ilike("area", selectedFilters.area);
      }
      if (selectedFilters.scenario) {
        serviceQuery = serviceQuery.ilike("scenario", selectedFilters.scenario);
      }

      const { data: services, error: serviceError } = await serviceQuery;
      if (serviceError) throw serviceError;

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

  useEffect(() => {
    if (!selectedTower || !selectedService) {
      setMetrics([]);
      setPercentages({});
      setSelectedYears({});
      return;
    }

    const loadMetrics = async () => {
      console.log('[MetricInventory] Loading metrics from database for:', selectedTower, selectedService);
      
      // Try to load from database first
      const { data: dbMetrics, error } = await supabase
        .from('metrics')
        .select('*')
        .eq('tower_id', selectedTower)
        .eq('service_id', selectedService);
      
      if (error) {
        console.error('[MetricInventory] Error loading metrics from database:', error);
      }
      
      if (dbMetrics && dbMetrics.length > 0) {
        console.log('[MetricInventory] Loaded', dbMetrics.length, 'metrics from database');
        
        // Convert database metrics to our format
        const loadedMetrics: Metric[] = dbMetrics.map(m => ({
          id: m.metric_id,
          service: m.service,
          sourceLE: m.source_le,
          name: m.name
        }));
        
        const loadedPercentages: Record<string, Record<string, number>> = {};
        const loadedYears: Record<string, string[]> = {};
        
        dbMetrics.forEach(m => {
          loadedPercentages[m.metric_id] = m.franchise_percentages as Record<string, number>;
          // Extract years for this specific metric from selected_years
          const yearsData = m.selected_years as any;
          loadedYears[m.metric_id] = yearsData?.[m.metric_id] || [];
        });
        
        setMetrics(loadedMetrics);
        setInitialMetrics(JSON.parse(JSON.stringify(loadedMetrics)));
        setPercentages(loadedPercentages);
        setSelectedYears(loadedYears);
        setInitialPercentages(JSON.parse(JSON.stringify(loadedPercentages)));
        
        // Load LE allocations from first metric (they're shared)
        if (dbMetrics[0].le_allocations) {
          const leAllocations = dbMetrics[0].le_allocations as Record<string, Record<string, Record<string, number>>>;
          setLeAllocPercentages(leAllocations);
          setInitialLEAllocPercentages(JSON.parse(JSON.stringify(leAllocations)));
        }
        
        // Load active LE map from first metric
        if (dbMetrics[0].active_le_map) {
          const activeMap = dbMetrics[0].active_le_map as Record<string, string[]>;
          setActiveLEMap(activeMap);
          setInitialActiveLEMap(JSON.parse(JSON.stringify(activeMap)));
        } else {
          setActiveLEMap(FRANCHISE_LE_MAP);
          setInitialActiveLEMap(JSON.parse(JSON.stringify(FRANCHISE_LE_MAP)));
        }
        
        setReviewConfirmed(false);
      } else {
        // No metrics found in database - initialize empty state
        console.log('[MetricInventory] No metrics found in database, initializing empty state');
        setMetrics([]);
        setInitialMetrics([]);
        setPercentages({});
        setSelectedYears({});
        setInitialPercentages({});
        setLeAllocPercentages({});
        setInitialLEAllocPercentages({});
        setActiveLEMap(FRANCHISE_LE_MAP);
        setInitialActiveLEMap(JSON.parse(JSON.stringify(FRANCHISE_LE_MAP)));
        setReviewConfirmed(false);
      }
    };
    
    loadMetrics();
  }, [selectedTower, selectedService]);

  // Don't auto-save metrics, percentages, or years - only save on submit
  // This useEffect is removed to prevent auto-saving

  // Detect changes in metrics, percentages, LE allocations, or active LE map
  const hasChanges = useMemo(() => {
    // Check if metrics changed (added or removed)
    const metricsChanged = JSON.stringify(metrics) !== JSON.stringify(initialMetrics);
    
    // Check if franchise percentages changed
    const percentagesChanged = JSON.stringify(percentages) !== JSON.stringify(initialPercentages);
    
    // Check if LE allocations changed
    const leAllocChanged = JSON.stringify(leAllocPercentages) !== JSON.stringify(initialLEAllocPercentages);
    
    // Check if active LE map changed
    const activeLEMapChanged = JSON.stringify(activeLEMap) !== JSON.stringify(initialActiveLEMap);
    
    return metricsChanged || percentagesChanged || leAllocChanged || activeLEMapChanged;
  }, [metrics, initialMetrics, percentages, initialPercentages, leAllocPercentages, initialLEAllocPercentages, activeLEMap, initialActiveLEMap]);

  const addMetric = () => {
    if (!newMetricName.trim() || !newMetricLE || !selectedService) return;
    
    const newMetric: Metric = {
      id: `metric-${Date.now()}`,
      service: selectedService,
      sourceLE: newMetricLE,
      name: newMetricName.trim(),
    };
    
    setMetrics([...metrics, newMetric]);
    
    // Initialize percentages for this metric
    const initialPercentages: Record<string, number> = {};
    SAMPLE_HEADINGS.forEach((h) => {
      initialPercentages[h.name] = 0;
    });
    setPercentages((prev) => ({ ...prev, [newMetric.id]: initialPercentages }));
    
    // Initialize years with FY26 selected by default
    setSelectedYears((prev) => ({ ...prev, [newMetric.id]: ["FY26"] }));
    
    // Reset form
    setNewMetricName("");
    setNewMetricLE("");
    setAddMetricDialogOpen(false);
  };

  const handleMetricNameDoubleClick = (metricId: string, currentName: string) => {
    setEditingMetricId(metricId);
    setEditingMetricName(currentName);
  };

  const saveMetricName = (metricId: string) => {
    if (editingMetricName.trim()) {
      setMetrics(metrics.map(m => 
        m.id === metricId ? { ...m, name: editingMetricName.trim() } : m
      ));
    }
    setEditingMetricId(null);
    setEditingMetricName("");
  };

  const deleteMetric = (id: string) => {
    // Track deleted metric if it was in initial metrics
    const metricToDelete = metrics.find(m => m.id === id);
    if (metricToDelete && initialMetrics.some(m => m.id === id)) {
      setDeletedMetrics(prev => [...prev, metricToDelete]);
    }
    
    setMetrics(metrics.filter((m) => m.id !== id));
    setPercentages((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSelectedYears((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updatePercentage = (metricId: string, subheading: string, value: number) => {
    setPercentages((prev) => ({
      ...prev,
      [metricId]: {
        ...(prev[metricId] || {}),
        [subheading]: value,
      },
    }));
  };

  const getTotalPercentage = (metricId: string) => {
    const metricPercentages = percentages[metricId] || {};
    return Object.values(metricPercentages).reduce((sum, val) => sum + (val || 0), 0);
  };

  const toggleYear = (metricId: string, year: string) => {
    setSelectedYears((prev) => {
      const currentYears = prev[metricId] || [];
      const newYears = currentYears.includes(year)
        ? currentYears.filter((y) => y !== year)
        : [...currentYears, year];
      return { ...prev, [metricId]: newYears };
    });
  };

  const formatYearDisplay = (years: string[]) => {
    if (!years || years.length === 0) return "None";
    
    // Sort years by their numeric value
    const sortedYears = [...years].sort((a, b) => {
      const numA = parseInt(a.replace("FY", ""));
      const numB = parseInt(b.replace("FY", ""));
      return numA - numB;
    });
    
    // Group consecutive years into ranges
    const ranges: string[] = [];
    let rangeStart = sortedYears[0];
    let rangeEnd = sortedYears[0];
    
    for (let i = 1; i < sortedYears.length; i++) {
      const currentNum = parseInt(sortedYears[i].replace("FY", ""));
      const prevNum = parseInt(rangeEnd.replace("FY", ""));
      
      if (currentNum === prevNum + 1) {
        rangeEnd = sortedYears[i];
      } else {
        // Push the current range
        if (rangeStart === rangeEnd) {
          ranges.push(rangeStart.replace("FY", ""));
        } else {
          ranges.push(`${rangeStart.replace("FY", "")}-${rangeEnd.replace("FY", "")}`);
        }
        rangeStart = sortedYears[i];
        rangeEnd = sortedYears[i];
      }
    }
    
    // Push the last range
    if (rangeStart === rangeEnd) {
      ranges.push(rangeStart.replace("FY", ""));
    } else {
      ranges.push(`${rangeStart.replace("FY", "")}-${rangeEnd.replace("FY", "")}`);
    }
    
    return ranges.join(", ");
  };

  const handleLEAllocClick = (headingName: string) => {
    setSelectedHeading(headingName);
    setLeAllocDialogOpen(true);
  };

  const handleCatalogueClick = (franchiseName: string) => {
    setSelectedCatalogueFranchise(franchiseName);
    setCatalogueDialogOpen(true);
  };

  const updateLEAllocPercentage = (option: string, metricId: string, value: number) => {
    setLeAllocPercentages((prev) => ({
      ...prev,
      [selectedHeading]: {
        ...(prev[selectedHeading] || {}),
        [option]: {
          ...((prev[selectedHeading] || {})[option] || {}),
          [metricId]: value,
        },
      },
    }));
  };

  // Calculate total LE allocation for a specific heading and metric
  const getLEAllocTotal = (headingName: string, metricId: string) => {
    const options = activeLEMap[headingName] || [];
    return options.reduce((sum, option) => {
      const value = leAllocPercentages[headingName]?.[option]?.[metricId] || 0;
      return sum + value;
    }, 0);
  };

  const handleAddLEs = () => {
    if (selectedNewLEs.length > 0) {
      const currentOptions = customLEOptions[selectedHeading] || FRANCHISE_LE_MAP[selectedHeading] || [];
      const newOptions = [...new Set([...currentOptions, ...selectedNewLEs])];
      setCustomLEOptions(prev => ({
        ...prev,
        [selectedHeading]: newOptions
      }));
      
      // Log the commentary if provided
      if (leCommentary.trim()) {
        console.log(`Added LEs [${selectedNewLEs.join(", ")}] to ${selectedHeading}: ${leCommentary}`);
      }
      
      setSelectedNewLEs([]);
      setLeCommentary("");
      setAddLEDialogOpen(false);
    }
  };

  const handleDeleteLE = (le: string) => {
    const commentary = prompt(`Please provide a reason for deleting "${le.toUpperCase()}" from ${selectedHeading}:`);
    
    if (commentary !== null) { // User clicked OK (even if empty)
      const currentOptions = customLEOptions[selectedHeading] || FRANCHISE_LE_MAP[selectedHeading] || [];
      const updatedOptions = currentOptions.filter(option => option !== le);
      setCustomLEOptions(prev => ({
        ...prev,
        [selectedHeading]: updatedOptions
      }));
      
      if (commentary.trim()) {
        console.log(`Deleted LE "${le.toUpperCase()}" from ${selectedHeading}: ${commentary}`);
      }
    }
  };

  const toggleNewLE = (le: string) => {
    setSelectedNewLEs((prev) =>
      prev.includes(le) ? prev.filter((l) => l !== le) : [...prev, le]
    );
  };

  const handleActivateLE = (franchise: string, le: string) => {
    setLeChangeAction({ type: 'activate', franchise, les: [le] });
    setLeChangeDialogOpen(true);
  };

  const handleDeactivateLE = (franchise: string, le: string) => {
    setLeChangeAction({ type: 'deactivate', franchise, les: [le] });
    setLeChangeDialogOpen(true);
  };

  const toggleLESelection = (franchise: string, le: string, type: 'active' | 'inactive') => {
    setSelectedLEsForChange(prev => {
      const current = prev[franchise] || { active: [], inactive: [] };
      const list = current[type];
      const newList = list.includes(le) 
        ? list.filter(l => l !== le)
        : [...list, le];
      return {
        ...prev,
        [franchise]: {
          ...current,
          [type]: newList
        }
      };
    });
  };

  const handleBulkActivate = (franchise: string) => {
    const selected = selectedLEsForChange[franchise]?.inactive || [];
    if (selected.length === 0) return;
    setLeChangeAction({ type: 'activate', franchise, les: selected });
    setLeChangeDialogOpen(true);
  };

  const handleBulkDeactivate = (franchise: string) => {
    const selected = selectedLEsForChange[franchise]?.active || [];
    if (selected.length === 0) return;
    setLeChangeAction({ type: 'deactivate', franchise, les: selected });
    setLeChangeDialogOpen(true);
  };

  const confirmLEChange = () => {
    if (!leChangeAction || !leChangeCommentary.trim()) return;

    const { type, franchise, les } = leChangeAction;
    const timestamp = new Date().toISOString();

    // Update active LE map
    setActiveLEMap(prev => {
      const current = prev[franchise] || [];
      if (type === 'activate') {
        return { ...prev, [franchise]: [...current, ...les].sort() };
      } else {
        return { ...prev, [franchise]: current.filter(l => !les.includes(l)) };
      }
    });

    // Log each change
    les.forEach(le => {
      setLeChangeLogs(prev => [...prev, {
        franchise,
        le,
        action: type === 'activate' ? 'Activated' : 'Deactivated',
        commentary: leChangeCommentary.trim(),
        timestamp
      }]);

      // Store in localStorage
      const storageKey = `leLogs_${selectedTower}`;
      const existingLogs = JSON.parse(localStorage.getItem(storageKey) || '[]');
      localStorage.setItem(storageKey, JSON.stringify([...existingLogs, {
        franchise,
        le,
        action: type === 'activate' ? 'Activated' : 'Deactivated',
        commentary: leChangeCommentary.trim(),
        timestamp
      }]));
    });

    // Clear selections for this franchise
    setSelectedLEsForChange(prev => ({
      ...prev,
      [franchise]: { active: [], inactive: [] }
    }));

    // Reset
    setLeChangeDialogOpen(false);
    setLeChangeAction(null);
    setLeChangeCommentary("");
  };

  const AVAILABLE_NEW_LES = ["j", "h", "i", "k"];

  // Check if there are any inactive LEs available to add for a franchise
  const hasInactiveLEsToAdd = (franchise: string): boolean => {
    const activeLEs = activeLEMap[franchise] || [];
    const additionalLEs = AVAILABLE_INACTIVE_LES[franchise] || [];
    const completeLEPopulation = Array.from(new Set([...FRANCHISE_LE_MAP[franchise] || [], ...additionalLEs])).sort();
    const inactiveLEs = completeLEPopulation.filter(le => !activeLEs.includes(le));
    return inactiveLEs.length > 0;
  };

  // Determine button color based on whether there's a franchise percentage and if LE alloc totals 100
  const getLEAllocButtonClass = (headingName: string) => {
    // Check if any metric has a percentage for this heading
    const hasPercentages = filteredMetrics.some(metric => {
      const percentage = percentages[metric.id]?.[headingName] || 0;
      return percentage > 0;
    });

    if (!hasPercentages) return "border-border bg-card hover:bg-muted";

    // Check if all metrics with percentages have 100% LE allocation
    const allMetricsValid = filteredMetrics.every(metric => {
      const percentage = percentages[metric.id]?.[headingName] || 0;
      
      // If no percentage, ignore this metric
      if (percentage === 0) return true;
      
      // If has percentage, check LE allocation
      const leTotal = getLEAllocTotal(headingName, metric.id);
      return leTotal === 100;
    });

    if (allMetricsValid) {
      return "border-green-600 bg-green-50 text-green-700 hover:bg-green-100";
    } else {
      return "border-destructive bg-destructive/10 text-destructive hover:bg-destructive/20";
    }
  };

  // Check if a metric has a percentage for the current selected heading
  const metricHasFranchisePercentage = (metricId: string) => {
    const percentage = percentages[metricId]?.[selectedHeading] || 0;
    return percentage > 0;
  };

  // Filter metrics based on selected service
  const filteredMetrics = selectedService 
    ? metrics.filter(m => m.service === selectedService)
    : metrics;


  // Validate that all metrics are properly allocated
  const allMetricsValid = useMemo(() => {
    return filteredMetrics.every(metric => {
      // Check franchise percentages add to 100
      const franchiseTotal = getTotalPercentage(metric.id);
      if (franchiseTotal !== 100) return false;
      
      // For each franchise with a percentage, check LE allocations add to 100
      const metricsValid = SAMPLE_HEADINGS.every(heading => {
        const franchisePerc = percentages[metric.id]?.[heading.name] || 0;
        if (franchisePerc === 0) return true; // No allocation needed
        
        const leTotal = getLEAllocTotal(heading.name, metric.id);
        return leTotal === 100;
      });
      
      return metricsValid;
    });
  }, [filteredMetrics, percentages, leAllocPercentages, activeLEMap]);

  // Get only changed metrics for review dialog
  const changedMetrics = useMemo(() => {
    if (!hasChanges) return [];
    
    return filteredMetrics.filter(metric => {
      // Check if this metric's percentages changed
      const currentPerc = percentages[metric.id] || {};
      const initialPerc = initialPercentages[metric.id] || {};
      const percChanged = JSON.stringify(currentPerc) !== JSON.stringify(initialPerc);
      
      // Check if this metric's LE allocations changed
      let leChanged = false;
      Object.keys(leAllocPercentages).forEach(heading => {
        Object.keys(leAllocPercentages[heading] || {}).forEach(option => {
          const currentLE = leAllocPercentages[heading]?.[option]?.[metric.id] || 0;
          const initialLE = initialLEAllocPercentages[heading]?.[option]?.[metric.id] || 0;
          if (currentLE !== initialLE) {
            leChanged = true;
          }
        });
      });
      
      return percChanged || leChanged;
    });
  }, [filteredMetrics, percentages, initialPercentages, leAllocPercentages, initialLEAllocPercentages, hasChanges]);

  // Calculate impact of deleted metrics on activities
  const calculateDeletedMetricImpacts = async (deletedMetricsToCheck: Metric[]) => {
    console.log('[calculateDeletedMetricImpacts] Starting calculation for deleted metrics:', deletedMetricsToCheck);
    const impacts: Record<string, any[]> = {};
    
    if (!selectedTower || !selectedService || deletedMetricsToCheck.length === 0) {
      console.log('[calculateDeletedMetricImpacts] No tower, service, or no deleted metrics');
      return impacts;
    }
    
    try {
      // Load cost pools from database for the SELECTED service
      const costPoolMap = new Map<string, string>();
      
      const { data: costPools, error: costPoolError } = await supabase
        .from('cost_pools')
        .select('*')
        .eq('service_id', selectedService);
      
      if (costPoolError) {
        console.error('[calculateDeletedMetricImpacts] Error loading cost pools:', costPoolError);
      } else if (costPools) {
        costPools.forEach((pool: any) => {
          costPoolMap.set(pool.id, pool.name);
        });
      }
      
      // Query activities from Supabase - filter by tower AND service
      const { data: activityAllocations, error } = await supabase
        .from('activity_allocations')
        .select('*')
        .eq('tower', selectedTower)
        .eq('service', selectedService);
      
      if (error) {
        console.error('[calculateDeletedMetricImpacts] Error fetching activities:', error);
        return impacts;
      }
      
      console.log('[calculateDeletedMetricImpacts] Found activity allocations:', activityAllocations);
      
      // For each deleted metric, find activities that use it
      deletedMetricsToCheck.forEach(deletedMetric => {
        const affectedActivities: any[] = [];
        
        activityAllocations?.forEach(allocation => {
          const costPoolId = allocation.cost_pool_id;
          
          // Skip allocations with cost pools that don't exist in the current service
          if (!costPoolMap.has(costPoolId)) {
            console.log('[calculateDeletedMetricImpacts] Skipping allocation - cost pool', costPoolId, 'not found in', selectedService);
            return;
          }
          
          const activities = allocation.activities as any[];
          if (Array.isArray(activities)) {
            activities.forEach((activity: any) => {
              if (activity.metricId === deletedMetric.id) {
                affectedActivities.push({
                  costPoolId: allocation.cost_pool_id,
                  activityName: activity.name,
                  currentTotal: allocation.activity_totals?.[activity.id] || 0,
                  metricId: deletedMetric.id
                });
              }
            });
          }
        });
        
        if (affectedActivities.length > 0) {
          // Group activities by cost pool
          const costPoolGroups: Record<string, any[]> = {};
          
          affectedActivities.forEach(act => {
            const costPoolName = costPoolMap.get(act.costPoolId) || act.costPoolId;
            // Extract just the cost pool name (after " - ") if it exists
            const displayName = costPoolName.includes(' - ') ? costPoolName.split(' - ')[1] : costPoolName;
            
            if (!costPoolGroups[displayName]) {
              costPoolGroups[displayName] = [];
            }
            
            costPoolGroups[displayName].push({
              activityName: act.activityName,
              currentTotal: act.currentTotal,
              totalImpact: -act.currentTotal,
              franchiseImpacts: []
            });
          });
          
          // Convert groups to impact format
          impacts[deletedMetric.id] = Object.entries(costPoolGroups).map(([costPoolName, activities]) => ({
            costPoolId: costPoolName,
            activities,
            totalPoolImpact: -activities.reduce((sum: number, act: any) => sum + act.currentTotal, 0),
            isDeleted: true
          }));
        }
      });
      
      console.log('[calculateDeletedMetricImpacts] Calculated impacts:', impacts);
      return impacts;
    } catch (error) {
      console.error('[calculateDeletedMetricImpacts] Error:', error);
      return impacts;
    }
  };

  // Calculate financial impact on activities
  const calculateActivityImpacts = async (metricsToCheck: Metric[]) => {
    console.log('[calculateActivityImpacts] Starting calculation for metrics:', metricsToCheck);
    const impacts: Record<string, any[]> = {};
    
    if (!selectedTower || !selectedService) {
      console.log('[calculateActivityImpacts] No tower or service selected');
      return impacts;
    }
    
    // Load cost pools from database
    const costPoolMap = new Map<string, string>(); // ID -> Name
    
    console.log('[calculateActivityImpacts] Loading cost pools from database for:', selectedTower, selectedService);
    
    try {
      const { data: costPools, error } = await supabase
        .from('cost_pools')
        .select('*')
        .eq('service_id', selectedService);
      
      if (error) {
        console.error('[calculateActivityImpacts] Error loading cost pools:', error);
      } else if (costPools) {
        console.log('[calculateActivityImpacts] Loaded cost pools:', costPools);
        costPools.forEach((pool: any) => {
          costPoolMap.set(pool.id, pool.name);
          console.log('[calculateActivityImpacts] Mapped:', pool.id, '->', pool.name);
        });
      }
    } catch (e) {
      console.error('[calculateActivityImpacts] Error fetching cost pools:', e);
    }
    
    console.log('[calculateActivityImpacts] Final cost pool map:', Array.from(costPoolMap.entries()));
    
    for (const metric of metricsToCheck) {
      console.log('[calculateActivityImpacts] Processing metric:', metric.id, metric.name);
      const costPoolGroups: Record<string, any[]> = {}; // Group by cost pool
      
      try {
        // Query the database for activity allocations that use this metric - filter by tower AND service
        const { data: allocations, error } = await supabase
          .from('activity_allocations')
          .select('*')
          .eq('tower', selectedTower)
          .eq('service', selectedService);
        
        if (error) {
          console.error('[calculateActivityImpacts] Error fetching allocations:', error);
          continue;
        }
        
        console.log('[calculateActivityImpacts] Found allocations:', allocations?.length || 0);
        
        if (!allocations) continue;
        
        // Process each allocation - only process if cost pool exists in current service
        allocations.forEach((allocation) => {
          const costPoolId = allocation.cost_pool_id || 'Unassigned';
          
          // Skip allocations with cost pools that don't exist in the current service
          if (!costPoolMap.has(costPoolId)) {
            console.log('[calculateActivityImpacts] Skipping allocation - cost pool', costPoolId, 'not found in', selectedService);
            return;
          }
          
          const activities = (allocation.activities as any[]) || [];
          const service = allocation.service || 'Unknown Service';
          const costPoolName = costPoolMap.get(costPoolId)!;
          // Extract just the cost pool name (after " - ") if it exists
          const displayName = costPoolName.includes(' - ') ? costPoolName.split(' - ')[1] : costPoolName;
          const costPoolKey = displayName;
          console.log('[calculateActivityImpacts] Processing allocation with', activities.length, 'activities, service:', service, 'cost pool:', costPoolName);
          
          // Find activities that use this metric
          activities.forEach((activity: any) => {
            console.log('[calculateActivityImpacts] Checking activity:', activity.name, 'metricId:', activity.metricId, 'looking for:', metric.id);
            if (activity.metricId === metric.id) {
              console.log('[calculateActivityImpacts] MATCH! Activity uses this metric');
              
              // Calculate impact per franchise
              const franchiseImpacts: any[] = [];
              const activityTotals = allocation.activity_totals as Record<string, number> | null;
              const activityTotal = activityTotals?.[activity.id] || 0;
              console.log('[calculateActivityImpacts] Activity total:', activityTotal);
              
              let totalImpact = 0;
              
              SAMPLE_HEADINGS.forEach((heading: any) => {
                const franchise = heading.name;
                const initialPerc = (initialPercentages[metric.id]?.[franchise] || 0) / 100;
                const currentPerc = (percentages[metric.id]?.[franchise] || 0) / 100;
                
                const initialAmount = activityTotal * initialPerc;
                const currentAmount = activityTotal * currentPerc;
                const change = currentAmount - initialAmount;
                const changePercent = initialAmount > 0 ? ((change / initialAmount) * 100) : 0;
                
                totalImpact += change;
                
                // Include all franchise changes, not just those above threshold
                franchiseImpacts.push({
                  franchise,
                  currentAmount: initialAmount,
                  newAmount: currentAmount,
                  change,
                  changePercent
                });
              });
              
              // Always include activities that use this metric, even if impact is zero
              if (!costPoolGroups[costPoolKey]) {
                costPoolGroups[costPoolKey] = [];
              }
              
              costPoolGroups[costPoolKey].push({
                activityName: activity.name,
                currentTotal: activityTotal,
                totalImpact,
                franchiseImpacts: franchiseImpacts.filter(f => Math.abs(f.change) > 0.01) // Only show non-zero franchise changes
              });
            }
          });
        });
      } catch (e) {
        console.error('[calculateActivityImpacts] Error processing metric:', e);
      }
      
      // Convert cost pool groups to array format
      const impactsByPool = Object.entries(costPoolGroups).map(([costPoolId, activities]) => ({
        costPoolId,
        activities,
        totalPoolImpact: activities.reduce((sum: number, act: any) => sum + Math.abs(act.totalImpact), 0)
      }));
      
      impacts[metric.id] = impactsByPool;
      console.log('[calculateActivityImpacts] Total cost pools for metric', metric.id, ':', impactsByPool.length);
    }
    
    console.log('[calculateActivityImpacts] Final impacts:', impacts);
    return impacts;
  };

  return (
    <PageLayout>
      <main className="p-6">
        <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex gap-4">
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
            <div className="flex gap-4 px-1">
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
                    <option key={svc.name} value={svc.name}>{svc.name}</option>
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


        {!selectedTower && (
          <section className="rounded-2xl border border-border bg-card shadow-lg p-6 w-full">
            <div className="text-center text-muted-foreground py-12">
              Select a department above to begin
            </div>
          </section>
        )}

        {selectedTower && !selectedService && (
          <section className="rounded-2xl border border-border bg-card shadow-lg p-6 w-full">
            <div className="text-center text-muted-foreground py-12">
              Select a Service to begin reviewing your metrics.
            </div>
          </section>
        )}


        {/* Metrics Table */}
        {selectedTower && selectedService && (
          <section className="rounded-2xl border border-border bg-card shadow-lg p-6 w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <button 
                  className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors font-semibold shadow-md text-sm"
                  onClick={() => setAddMetricDialogOpen(true)}
                >
                  Add Metric
                </button>
              </div>
              <div className="flex gap-2">
                <button 
                  className="px-4 py-2 rounded-xl bg-warning text-warning-foreground font-semibold shadow-sm hover:opacity-90 transition-opacity text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={async () => {
                    console.log('[Review Button] Calculating impacts for changed metrics:', changedMetrics);
                    const impacts = await calculateActivityImpacts(changedMetrics);
                    console.log('[Review Button] Calculated impacts:', impacts);
                    const deletedImpacts = await calculateDeletedMetricImpacts(deletedMetrics);
                    console.log('[Review Button] Deleted impacts:', deletedImpacts);
                    const combinedImpacts = { ...impacts, ...deletedImpacts };
                    console.log('[Review Button] Combined activity impacts:', combinedImpacts);
                    setActivityImpacts(combinedImpacts);
                    setReviewDialogOpen(true);
                  }}
                  disabled={!hasChanges || !allMetricsValid}
                  title={!allMetricsValid ? "All metrics must have franchise percentages totaling 100% and LE allocations totaling 100%" : ""}
                >
                  Review
                </button>
                <button 
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold shadow-sm hover:opacity-90 transition-opacity text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={async () => {
                    if (!selectedTower || !selectedService) return;
                    
                    try {
                      // Save all metrics to database
                      for (const metric of metrics) {
                        await supabase
                          .from('metrics')
                          .upsert({
                            tower_id: selectedTower,
                            service_id: selectedService,
                            metric_id: metric.id,
                            service: metric.service,
                            source_le: metric.sourceLE,
                            name: metric.name,
                            franchise_percentages: percentages[metric.id] || {},
                            selected_years: { [metric.id]: selectedYears[metric.id] || [] },
                            le_allocations: leAllocPercentages,
                            active_le_map: activeLEMap
                          }, {
                            onConflict: 'tower_id,service_id,metric_id'
                          });
                      }
                      
                      // Delete metrics that were removed
                      for (const deletedMetric of deletedMetrics) {
                        await supabase
                          .from('metrics')
                          .delete()
                          .eq('tower_id', selectedTower)
                          .eq('service_id', selectedService)
                          .eq('metric_id', deletedMetric.id);
                      }
                      
                      // Save pending LE change logs
                      if (pendingLEChangeLogs.length > 0) {
                        const storageKey = `leLogs_${selectedTower}`;
                        const existingLogs = JSON.parse(localStorage.getItem(storageKey) || '[]');
                        localStorage.setItem(storageKey, JSON.stringify([...existingLogs, ...pendingLEChangeLogs]));
                        setLeChangeLogs(prev => [...prev, ...pendingLEChangeLogs]);
                        setPendingLEChangeLogs([]);
                      }
                      
                      toast.success('Metrics saved successfully!');
                      
                      // Reset initial state after submission
                      setInitialMetrics(JSON.parse(JSON.stringify(metrics)));
                      setInitialPercentages(JSON.parse(JSON.stringify(percentages)));
                      setInitialLEAllocPercentages(JSON.parse(JSON.stringify(leAllocPercentages)));
                      setInitialActiveLEMap(JSON.parse(JSON.stringify(activeLEMap)));
                      setDeletedMetrics([]);
                      setReviewConfirmed(false);
                    } catch (error) {
                      console.error('Error saving metrics:', error);
                      toast.error('Failed to save metrics to database');
                    }
                  }}
                  disabled={!hasChanges || !reviewConfirmed || !allMetricsValid}
                  title={!allMetricsValid ? "All metrics must have franchise percentages totaling 100% and LE allocations totaling 100%" : ""}
                >
                  Submit
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-background">
                  <tr className="text-left text-muted-foreground border-b-2 border-border">
                    <th className="px-4 py-3 font-semibold" style={{ width: '25ch', minWidth: '25ch', maxWidth: '25ch' }}>{selectedService || "Service"}</th>
                    {filteredMetrics.map((metric) => (
                      <th key={metric.id} className="px-4 py-3 font-semibold" style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col gap-1.5">
                            {editingMetricId === metric.id ? (
                              <input
                                type="text"
                                value={editingMetricName}
                                onChange={(e) => setEditingMetricName(e.target.value)}
                                onBlur={() => saveMetricName(metric.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveMetricName(metric.id);
                                  if (e.key === 'Escape') setEditingMetricId(null);
                                }}
                                className="text-xs font-semibold border border-input rounded px-1 py-0.5 focus:ring-2 focus:ring-ring focus:outline-none"
                                autoFocus
                              />
                            ) : (
                              <div 
                                className="text-xs font-semibold cursor-pointer hover:text-primary transition-colors"
                                onDoubleClick={() => handleMetricNameDoubleClick(metric.id, metric.name)}
                                title="Double-click to edit"
                              >
                                {metric.name}
                              </div>
                            )}
                            <div className="text-[0.65rem] text-muted-foreground">{metric.sourceLE}</div>
                            
                            {/* Year Dropdown */}
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="flex items-center gap-1 text-[0.65rem] text-foreground hover:text-primary transition-colors">
                                  <span className="font-medium">Year: {formatYearDisplay(selectedYears[metric.id])}</span>
                                  <ChevronDown className="h-3 w-3" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-40 p-2 bg-background" align="start">
                                <div className="space-y-2">
                                  {FISCAL_YEARS.map((year) => (
                                    <label key={year} className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded">
                                      <Checkbox
                                        checked={selectedYears[metric.id]?.includes(year) || false}
                                        onCheckedChange={() => toggleYear(metric.id, year)}
                                      />
                                      <span className="text-xs">{year}</span>
                                    </label>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>

                            <div className={`text-xs font-bold ${getTotalPercentage(metric.id) === 100 ? 'text-green-600' : 'text-destructive'}`}>
                              {getTotalPercentage(metric.id).toFixed(2)}% {getTotalPercentage(metric.id) === 100 && <span>✓</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteMetric(metric.id)}
                            className="inline-flex items-center justify-center h-6 w-6 rounded-md border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors flex-shrink-0"
                            aria-label="Delete metric"
                            title="Delete metric"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_HEADINGS.map((item, idx) => (
                    <tr 
                      key={idx} 
                      className="border-b border-border/50 bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{item.name}</span>
                          <button 
                            onClick={() => handleLEAllocClick(item.name)}
                            className={`px-2 py-1 text-xs rounded-md border transition-colors font-medium ${getLEAllocButtonClass(item.name)}`}
                          >
                            LE's
                          </button>
                        </div>
                      </td>
                      {filteredMetrics.map((metric) => (
                        <td key={`${metric.id}-${idx}`} className="px-4 py-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={percentages[metric.id]?.[item.name] || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
                                const numVal = val === "" ? 0 : parseFloat(val);
                                if (numVal <= 100) {
                                  updatePercentage(metric.id, item.name, numVal);
                                }
                              }
                            }}
                            className="w-20 rounded-md border border-input bg-background px-2 py-1 text-xs text-center focus:ring-2 focus:ring-ring focus:outline-none transition-shadow"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* LE Allocation Dialog */}
        <Dialog open={leAllocDialogOpen} onOpenChange={setLeAllocDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedHeading}</DialogTitle>
            </DialogHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="px-4 py-3 text-left font-semibold">LE</th>
                    {filteredMetrics.map((metric) => (
                      <th key={metric.id} className="px-4 py-3 text-left font-semibold">
                        <div className="flex flex-col gap-1">
                          <div className="text-xs font-semibold">{metric.name}</div>
                          <div className="text-[0.65rem] text-muted-foreground font-normal">Source LE: {metric.sourceLE}</div>
                          <div className="text-[0.65rem] text-muted-foreground font-normal">Year: {formatYearDisplay(selectedYears[metric.id] || [])}</div>
                        </div>
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b border-border bg-muted/20">
                    <td className="px-4 py-3">
                      <button 
                        onClick={() => {
                          setSelectedCatalogueFranchise(selectedHeading);
                          setCatalogueDialogOpen(true);
                        }}
                        disabled={!hasInactiveLEsToAdd(selectedHeading)}
                        className="px-3 py-1.5 text-xs rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add LE
                      </button>
                    </td>
                    {filteredMetrics.map((metric) => (
                      <td key={`net-${metric.id}`} className="px-4 py-3">
                        <div className={`text-xs font-bold ${getLEAllocTotal(selectedHeading, metric.id) === 100 ? 'text-green-600' : 'text-destructive'}`}>
                          {getLEAllocTotal(selectedHeading, metric.id).toFixed(2)}% {getLEAllocTotal(selectedHeading, metric.id) === 100 && <span>✓</span>}
                        </div>
                      </td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(activeLEMap[selectedHeading] || []).map((option) => (
                    <tr key={option} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium uppercase">{option}</span>
                          <button
                            onClick={() => {
                              setLeToDelete({ franchise: selectedHeading, le: option });
                              setDeleteLEDialogOpen(true);
                            }}
                            className="inline-flex items-center justify-center h-5 w-5 rounded-md text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                            aria-label="Delete legal entity"
                            title="Delete legal entity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      {filteredMetrics.map((metric) => (
                        <td key={`${option}-${metric.id}`} className="px-4 py-3">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={leAllocPercentages[selectedHeading]?.[option]?.[metric.id] || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
                                const numVal = val === "" ? 0 : parseFloat(val);
                                if (numVal <= 100) {
                                  updateLEAllocPercentage(option, metric.id, numVal);
                                }
                              }
                            }}
                            disabled={!metricHasFranchisePercentage(metric.id)}
                            className="w-20 rounded-md border border-input bg-background px-2 py-1 text-xs text-center focus:ring-2 focus:ring-ring focus:outline-none transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add LE Dialog */}
        <Dialog open={addLEDialogOpen} onOpenChange={setAddLEDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Legal Entities</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Select legal entities to add to the population:
              </div>
              <div className="space-y-2">
                {AVAILABLE_NEW_LES.map((le) => {
                  const currentOptions = customLEOptions[selectedHeading] || FRANCHISE_LE_MAP[selectedHeading] || [];
                  const isAlreadyAdded = currentOptions.includes(le);
                  return (
                    <label 
                      key={le} 
                      className="flex items-center gap-2 cursor-pointer hover:bg-muted p-2 rounded transition-colors"
                    >
                      <Checkbox
                        checked={selectedNewLEs.includes(le)}
                        onCheckedChange={() => toggleNewLE(le)}
                        disabled={isAlreadyAdded}
                      />
                      <span className="text-sm font-medium uppercase">{le}</span>
                      {isAlreadyAdded && (
                        <span className="text-xs text-muted-foreground ml-auto">(Already added)</span>
                      )}
                    </label>
                  );
                })}
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-2">
                  Commentary (Optional)
                </label>
                <textarea
                  value={leCommentary}
                  onChange={(e) => setLeCommentary(e.target.value)}
                  placeholder="Add notes about why you're adding these legal entities..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] focus:ring-2 focus:ring-ring focus:outline-none transition-shadow resize-none"
                  maxLength={500}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {leCommentary.length}/500 characters
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <button
                  onClick={() => {
                    setAddLEDialogOpen(false);
                    setSelectedNewLEs([]);
                    setLeCommentary("");
                  }}
                  className="px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLEs}
                  disabled={selectedNewLEs.length === 0}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Selected
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Metric Dialog */}
        <Dialog open={addMetricDialogOpen} onOpenChange={setAddMetricDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Metric</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Source LE</label>
                <select 
                  className="w-full rounded-xl border border-input bg-card p-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none transition-shadow" 
                  value={newMetricLE} 
                  onChange={(e) => setNewMetricLE(e.target.value)}
                >
                  <option value="">Choose LE</option>
                  {SAMPLE_LES.map((le) => (
                    <option key={le} value={le}>{le}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Metric Name</label>
                <input
                  type="text" 
                  value={newMetricName}
                  onChange={(e) => setNewMetricName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="e.g. Customer Satisfaction"
                  onKeyDown={(e) => e.key === 'Enter' && newMetricLE && newMetricName.trim() && addMetric()}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button 
                  className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors font-medium text-sm"
                  onClick={() => setAddMetricDialogOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 font-semibold shadow-md text-sm" 
                  disabled={!newMetricLE || !newMetricName.trim()} 
                  onClick={addMetric}
                >
                  Add Metric
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>

        {/* Catalogue Dialog */}
        <Dialog open={catalogueDialogOpen} onOpenChange={setCatalogueDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Legal Entities</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-6">
              {selectedCatalogueFranchise && (() => {
                const activeLEs = activeLEMap[selectedCatalogueFranchise] || [];
                const additionalLEs = AVAILABLE_INACTIVE_LES[selectedCatalogueFranchise] || [];
                const completeLEPopulation = Array.from(new Set([...FRANCHISE_LE_MAP[selectedCatalogueFranchise] || [], ...additionalLEs])).sort();
                const inactiveLEs = completeLEPopulation.filter(le => !activeLEs.includes(le));
                const selectedInactive = selectedLEsForChange[selectedCatalogueFranchise]?.inactive || [];
                
                return (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Select legal entities to add to the population:
                      </p>
                      {inactiveLEs.length > 0 ? (
                        <div className="space-y-2">
                          {inactiveLEs.map((le) => (
                            <label key={le} className="flex items-center gap-3 cursor-pointer hover:bg-muted/30 p-2 rounded-lg transition-colors">
                              <Checkbox
                                checked={selectedInactive.includes(le)}
                                onCheckedChange={() => toggleLESelection(selectedCatalogueFranchise, le, 'inactive')}
                              />
                              <span className="text-sm font-medium uppercase">{le}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-sm p-4 bg-muted/20 rounded-lg text-center">
                          None available to add
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-foreground mb-2 block">
                        Commentary <span className="text-destructive">*</span>
                      </label>
                      <textarea
                        value={leChangeCommentary}
                        onChange={(e) => setLeChangeCommentary(e.target.value)}
                        placeholder="Add notes about why you're adding these legal entities..."
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px] focus:ring-2 focus:ring-ring focus:outline-none transition-shadow resize-none"
                        maxLength={500}
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        {leChangeCommentary.length}/500 characters
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          setCatalogueDialogOpen(false);
                          setSelectedLEsForChange(prev => ({
                            ...prev,
                            [selectedCatalogueFranchise]: { active: [], inactive: [] }
                          }));
                          setLeChangeCommentary("");
                        }}
                        className="px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors font-medium text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (selectedInactive.length === 0 || !leChangeCommentary.trim()) return;

                          const timestamp = new Date().toISOString();

                          // Update active LE map (add at the bottom, don't sort)
                          setActiveLEMap(prev => {
                            const current = prev[selectedCatalogueFranchise] || [];
                            return { ...prev, [selectedCatalogueFranchise]: [...current, ...selectedInactive] };
                          });

                          // Track the change in pending logs (will be saved on submit)
                          selectedInactive.forEach(le => {
                            setPendingLEChangeLogs(prev => [...prev, {
                              franchise: selectedCatalogueFranchise,
                              le,
                              action: 'Activated',
                              commentary: leChangeCommentary.trim(),
                              timestamp
                            }]);
                          });

                          // Clear selections and close
                          setSelectedLEsForChange(prev => ({
                            ...prev,
                            [selectedCatalogueFranchise]: { active: [], inactive: [] }
                          }));
                          setLeChangeCommentary("");
                          setCatalogueDialogOpen(false);
                        }}
                        disabled={selectedInactive.length === 0 || !leChangeCommentary.trim()}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md text-sm"
                      >
                        Add Selected
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>

        {/* LE Change Commentary Dialog */}
        <Dialog open={leChangeDialogOpen} onOpenChange={setLeChangeDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {leChangeAction?.type === 'activate' ? 'Activate' : 'Deactivate'} Legal {leChangeAction?.les && leChangeAction.les.length > 1 ? 'Entities' : 'Entity'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm">
                  <span className="font-semibold">Franchise:</span> {leChangeAction?.franchise}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Legal {leChangeAction?.les && leChangeAction.les.length > 1 ? 'Entities' : 'Entity'}:</span>{' '}
                  {leChangeAction?.les?.join(', ')}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Action:</span>{' '}
                  <span className={leChangeAction?.type === 'activate' ? 'text-green-600 font-semibold' : 'text-destructive font-semibold'}>
                    {leChangeAction?.type === 'activate' ? 'Activate' : 'Deactivate'}
                  </span>
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Commentary <span className="text-destructive">*</span>
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Please explain why you are {leChangeAction?.type === 'activate' ? 'activating' : 'deactivating'} this legal entity.
                </p>
                <textarea
                  value={leChangeCommentary}
                  onChange={(e) => setLeChangeCommentary(e.target.value)}
                  placeholder="Enter your reasoning here..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px] focus:ring-2 focus:ring-ring focus:outline-none transition-shadow resize-none"
                  maxLength={500}
                  required
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {leChangeCommentary.length}/500 characters
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => {
                    setLeChangeDialogOpen(false);
                    setLeChangeAction(null);
                    setLeChangeCommentary("");
                  }}
                  className="px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLEChange}
                  disabled={!leChangeCommentary.trim()}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md text-sm"
                >
                  Confirm
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete LE Dialog */}
        <Dialog open={deleteLEDialogOpen} onOpenChange={setDeleteLEDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Legal Entity</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm">
                  <span className="font-semibold">Franchise:</span> {leToDelete?.franchise}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Legal Entity:</span> {leToDelete?.le}
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Commentary <span className="text-destructive">*</span>
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Please explain why you are deleting this legal entity.
                </p>
                <textarea
                  value={deleteLECommentary}
                  onChange={(e) => setDeleteLECommentary(e.target.value)}
                  placeholder="Enter your reasoning here..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px] focus:ring-2 focus:ring-ring focus:outline-none transition-shadow resize-none"
                  maxLength={500}
                  required
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {deleteLECommentary.length}/500 characters
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => {
                    setDeleteLEDialogOpen(false);
                    setLeToDelete(null);
                    setDeleteLECommentary("");
                  }}
                  className="px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!leToDelete || !deleteLECommentary.trim()) return;

                    const { franchise, le } = leToDelete;
                    const timestamp = new Date().toISOString();

                    // Remove from active LE map
                    setActiveLEMap(prev => {
                      const current = prev[franchise] || [];
                      return { ...prev, [franchise]: current.filter(l => l !== le) };
                    });

                    // Clear LE percentages for this LE
                    setLeAllocPercentages(prev => {
                      const updated = { ...prev };
                      if (updated[franchise] && updated[franchise][le]) {
                        const franchiseData = { ...updated[franchise] };
                        delete franchiseData[le];
                        updated[franchise] = franchiseData;
                      }
                      return updated;
                    });

                    // Track the change in pending logs (will be saved on submit)
                    setPendingLEChangeLogs(prev => [...prev, {
                      franchise,
                      le,
                      action: 'Deactivated',
                      commentary: deleteLECommentary.trim(),
                      timestamp
                    }]);

                    // Reset and close
                    setDeleteLEDialogOpen(false);
                    setLeToDelete(null);
                    setDeleteLECommentary("");
                  }}
                  disabled={!deleteLECommentary.trim()}
                  className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>

      <MetricInventoryReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        metrics={changedMetrics}
        deletedMetrics={deletedMetrics}
        percentages={percentages}
        selectedYears={selectedYears}
        selectedService={selectedService}
        selectedTower={selectedTower}
        confirmed={reviewConfirmed}
        onConfirmReview={setReviewConfirmed}
        onSubmit={() => setReviewDialogOpen(false)}
        initialPercentages={initialPercentages}
        activityImpacts={activityImpacts}
      />
    </PageLayout>
  );
}
