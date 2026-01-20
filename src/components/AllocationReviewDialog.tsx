import React, { useMemo, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResponsiveContainer, Sankey, Tooltip as RechartsTooltip, Rectangle } from "recharts";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
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
type Matrix = Record<string, Record<string, number>>;
interface AllocationReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: Activity[];
  metrics: Metric[];
  matrix: Matrix;
  activityMoneyTotals: Record<string, number>;
  selectedService?: string;
  selectedTower?: string;
  confirmed: boolean;
  onConfirmReview: (confirmed: boolean) => void;
}

// Franchise names
const FRANCHISES = ["Franchise A", "Franchise B", "Franchise C", "Franchise D", "Franchise E", "Franchise F", "Franchise G"];

// Colors for franchises
const FRANCHISE_COLORS: Record<string, string> = {
  "Franchise A": "#3b82f6",
  "Franchise B": "#10b981",
  "Franchise C": "#f59e0b",
  "Franchise D": "#ef4444",
  "Franchise E": "#8b5cf6",
  "Franchise F": "#ec4899",
  "Franchise G": "#6366f1"
};

// Colors for legal entities
const LE_COLORS = ["#06b6d4",
// cyan
"#14b8a6",
// teal
"#84cc16",
// lime
"#eab308",
// yellow
"#f97316",
// orange
"#f43f5e",
// rose
"#a855f7",
// purple
"#6366f1",
// indigo
"#8b5cf6",
// violet
"#ec4899" // pink
];

// Custom node component
const SankeyNode = ({
  x,
  y,
  width,
  height,
  index,
  payload,
  containerWidth
}: any) => {
  const isOut = x + width + 6 > containerWidth;
  const fill = payload.color || "#94a3b8";
  return <g>
      <Rectangle x={x} y={y} width={width} height={height} fill={fill} fillOpacity="1" stroke="hsl(var(--border))" strokeWidth={1} />
      <text textAnchor={isOut ? "end" : "start"} x={isOut ? x - 6 : x + width + 6} y={y + height / 2} fontSize="14" fill="hsl(var(--foreground))" dominantBaseline="middle">
        {payload.name}
      </text>
    </g>;
};
export function AllocationReviewDialog({
  open,
  onOpenChange,
  activities,
  metrics,
  matrix,
  activityMoneyTotals,
  selectedService,
  selectedTower,
  confirmed,
  onConfirmReview
}: AllocationReviewDialogProps) {
  const [franchisePercentages, setFranchisePercentages] = useState<Record<string, Record<string, number>>>({});
  const [leAllocations, setLeAllocations] = useState<Record<string, Record<string, Record<string, number>>>>({});

  // Load franchise percentages and LE allocations from database
  useEffect(() => {
    const loadMetricAllocations = async () => {
      if (!selectedTower || !selectedService || !open) return;
      try {
        const { data, error } = await supabase
          .from('metrics')
          .select('metric_id, franchise_percentages, le_allocations')
          .eq('tower_id', selectedTower)
          .eq('service', selectedService);
        
        if (error) {
          console.error("Error loading metric allocations:", error);
          return;
        }
        
        if (data && data.length > 0) {
          // Build mapping: metricId -> { franchise: percentage }
          const fpByMetric: Record<string, Record<string, number>> = {};
          data.forEach(m => {
            if (m.metric_id && m.franchise_percentages) {
              fpByMetric[m.metric_id as string] = m.franchise_percentages as Record<string, number>;
            }
          });
          setFranchisePercentages(fpByMetric);
          
          // Use first metric's LE allocations (shared across metrics)
          const first = data.find(m => m.le_allocations);
          if (first?.le_allocations) {
            setLeAllocations(first.le_allocations as Record<string, Record<string, Record<string, number>>>);
          }
        }
      } catch (error) {
        console.error("Error loading metric allocations:", error);
      }
    };
    
    loadMetricAllocations();
  }, [selectedTower, selectedService, open]);
  const sankeyData = useMemo(() => {
    const nodes: Array<{
      name: string;
      color?: string;
      activityBreakdown?: Record<string, number>;
    }> = [];
    const links: Array<{
      source: number;
      target: number;
      value: number;
    }> = [];
    const nodeIndexMap = new Map<string, number>();
    const leColorMap = new Map<string, string>();
    let leColorIndex = 0;
    
    // Track activity contributions to each franchise and LE
    const franchiseActivityContributions = new Map<string, Map<string, number>>();
    const leActivityContributions = new Map<string, Map<string, number>>();

    // Helper to get or create node index
    const getNodeIndex = (name: string, color?: string) => {
      if (nodeIndexMap.has(name)) {
        return nodeIndexMap.get(name)!;
      }
      const index = nodes.length;
      nodes.push({
        name,
        color
      });
      nodeIndexMap.set(name, index);
      return index;
    };

    // Helper to get color for LE
    const getLEColor = (leName: string) => {
      if (leColorMap.has(leName)) {
        return leColorMap.get(leName)!;
      }
      const color = LE_COLORS[leColorIndex % LE_COLORS.length];
      leColorMap.set(leName, color);
      leColorIndex++;
      return color;
    };
    console.log("Building Sankey - Activities:", activities);
    console.log("Franchise Percentages:", franchisePercentages);
    console.log("LE Allocations:", leAllocations);

    // Calculate totals
    let totalActivityAmount = 0;
    const franchiseTotals = new Map<string, number>();
    const franchiseToLE = new Map<string, Map<string, number>>();
    activities.forEach(activity => {
      const total = activityMoneyTotals[activity.id] || 0;
      if (total === 0 || !activity.metricId) return;
      const metric = metrics.find(m => m.id === activity.metricId);
      if (!metric) return;
      totalActivityAmount += total;
      console.log(`Processing activity: ${activity.name}, metric: ${metric.name}, total: ${total}`);
      const metricFranchisePerc = franchisePercentages[metric.id] || {};

      // Calculate franchise amounts for this activity
      FRANCHISES.forEach(franchise => {
        const franchisePerc = metricFranchisePerc[franchise] || 0;
        if (franchisePerc === 0) return;
        const franchiseAmount = total * franchisePerc / 100;
        console.log(`  ${franchise}: ${franchisePerc}% = £${franchiseAmount}`);
        franchiseTotals.set(franchise, (franchiseTotals.get(franchise) || 0) + franchiseAmount);
        
        // Track activity contribution to franchise
        if (!franchiseActivityContributions.has(franchise)) {
          franchiseActivityContributions.set(franchise, new Map());
        }
        const franchiseActivities = franchiseActivityContributions.get(franchise)!;
        franchiseActivities.set(activity.name, (franchiseActivities.get(activity.name) || 0) + franchiseAmount);

        // Franchise → LE (split based on LE allocations)
        const franchiseLEAlloc = leAllocations[franchise] || {};
        const leOptions = Object.keys(franchiseLEAlloc);
        console.log(`    LE options for ${franchise}:`, leOptions);
        leOptions.forEach(leOption => {
          const leMetricPerc = franchiseLEAlloc[leOption]?.[metric.id] || 0;
          if (leMetricPerc === 0) return;
          const leAmount = franchiseAmount * leMetricPerc / 100;
          console.log(`      LE ${leOption}: ${leMetricPerc}% = £${leAmount}`);
          if (!franchiseToLE.has(franchise)) {
            franchiseToLE.set(franchise, new Map());
          }
          const leMap = franchiseToLE.get(franchise)!;
          const leName = `LE: ${leOption.toUpperCase()}`;
          leMap.set(leName, (leMap.get(leName) || 0) + leAmount);
          
          // Track activity contribution to LE
          if (!leActivityContributions.has(leName)) {
            leActivityContributions.set(leName, new Map());
          }
          const leActivities = leActivityContributions.get(leName)!;
          leActivities.set(activity.name, (leActivities.get(activity.name) || 0) + leAmount);
        });
      });
    });

    // Layer 1: Individual Activities → Combined Activities
    const combinedActivitiesIndex = getNodeIndex("Combined Activities", "#64748b");
    activities.forEach(activity => {
      const total = activityMoneyTotals[activity.id] || 0;
      if (total === 0 || !activity.metricId) return;
      const activityIndex = getNodeIndex(activity.name, "#94a3b8");
      links.push({
        source: activityIndex,
        target: combinedActivitiesIndex,
        value: Math.round(total)
      });
    });

    // Layer 2: Combined Activities → Franchises
    franchiseTotals.forEach((value, franchise) => {
      if (value > 0) {
        const franchiseIndex = getNodeIndex(franchise, FRANCHISE_COLORS[franchise] || "#64748b");
        // Add activity breakdown to franchise node
        const activityBreakdown: Record<string, number> = {};
        const contributions = franchiseActivityContributions.get(franchise);
        if (contributions) {
          contributions.forEach((amount, activityName) => {
            activityBreakdown[activityName] = amount;
          });
        }
        nodes[franchiseIndex].activityBreakdown = activityBreakdown;
        
        links.push({
          source: combinedActivitiesIndex,
          target: franchiseIndex,
          value: Math.round(value)
        });
      }
    });

    // Layer 3: Franchises → Legal Entities
    franchiseToLE.forEach((leMap, franchise) => {
      const franchiseIndex = getNodeIndex(franchise, FRANCHISE_COLORS[franchise] || "#64748b");
      leMap.forEach((value, le) => {
        if (value > 0) {
          const leIndex = getNodeIndex(le, getLEColor(le));
          // Add activity breakdown to LE node
          const activityBreakdown: Record<string, number> = {};
          const contributions = leActivityContributions.get(le);
          if (contributions) {
            contributions.forEach((amount, activityName) => {
              activityBreakdown[activityName] = amount;
            });
          }
          nodes[leIndex].activityBreakdown = activityBreakdown;
          
          links.push({
            source: franchiseIndex,
            target: leIndex,
            value: Math.round(value)
          });
        }
      });
    });
    console.log("Sankey nodes:", nodes);
    console.log("Sankey links:", links);
    return {
      nodes,
      links
    };
  }, [activities, metrics, activityMoneyTotals, franchisePercentages, leAllocations]);
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Activity Allocation Review</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">This diagram shows how activities flow through franchises and legal entities.</p>
          
          {sankeyData.nodes.length > 0 ? <div className="w-full h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <Sankey data={sankeyData} node={<SankeyNode />} link={{
              stroke: "#94a3b8",
              strokeOpacity: 0.3
            }} nodePadding={15} margin={{
              top: 10,
              right: 150,
              bottom: 10,
              left: 10
            }}>
                  <RechartsTooltip content={({
                payload
              }: any) => {
                if (!payload || payload.length === 0) return null;
                const data = payload[0];
                if (data.payload?.source !== undefined) {
                  // This is a link
                  return <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                            <p className="font-semibold text-sm">
                              {data.payload.source?.name} → {data.payload.target?.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              £{data.payload.value?.toLocaleString()}
                            </p>
                          </div>;
                }

                // This is a node
                const nodePayload = data.payload ?? {};
                const activityBreakdown = nodePayload.activityBreakdown || nodePayload.payload?.activityBreakdown;
                const nodeName = data.name ?? nodePayload.name ?? nodePayload.payload?.name;
                const nodeValue = data.value ?? nodePayload.value ?? nodePayload.payload?.value;
                return <div className="bg-popover border border-border rounded-lg p-3 shadow-lg max-w-xs">
                          <p className="font-semibold text-sm">{nodeName}</p>
                          <p className="text-xs text-muted-foreground">
                            Total: £{Number(nodeValue ?? 0).toLocaleString()}
                          </p>
                          {activityBreakdown && Object.keys(activityBreakdown).length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border">
                              <p className="text-xs font-medium mb-1">Activity Breakdown:</p>
                              {Object.entries(activityBreakdown)
                                .sort(([, a], [, b]) => (b as number) - (a as number))
                                .map(([activityName, amount]) => (
                                  <div key={activityName} className="flex justify-between text-xs">
                                    <span className="text-muted-foreground truncate mr-2">{activityName}</span>
                                    <span className="font-medium">£{Number(amount as number).toLocaleString()}</span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>;
              }} />
                </Sankey>
              </ResponsiveContainer>
            </div> : <div className="flex items-center justify-center h-64 text-muted-foreground">
              No allocation data to display. Please allocate activities and select metrics.
            </div>}
          
          <div className="flex gap-2 flex-wrap">
            {Object.entries(FRANCHISE_COLORS).map(([franchise, color]) => <div key={franchise} className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded" style={{
              backgroundColor: color
            }} />
                <span>{franchise}</span>
              </div>)}
          </div>
          
          {/* Confirmation Toggle */}
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="confirm-review" className="text-sm font-medium cursor-pointer">
                I confirm that I have reviewed these changes
              </Label>
              <Switch
                id="confirm-review"
                checked={confirmed}
                onCheckedChange={onConfirmReview}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
}