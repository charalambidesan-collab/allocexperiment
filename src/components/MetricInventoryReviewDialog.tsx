import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
interface Metric {
  id: string;
  service: string;
  sourceLE: string;
  name: string;
}
interface ActivityImpact {
  costPoolId: string;
  activities: {
    activityName: string;
    currentTotal: number;
    totalImpact: number;
    franchiseImpacts: {
      franchise: string;
      currentAmount: number;
      newAmount: number;
      change: number;
      changePercent: number;
    }[];
  }[];
  totalPoolImpact: number;
}
interface MetricInventoryReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metrics: Metric[];
  deletedMetrics?: Metric[];
  percentages: Record<string, Record<string, number>>;
  selectedYears: Record<string, string[]>;
  selectedService?: string;
  selectedTower?: string;
  confirmed: boolean;
  onConfirmReview: (confirmed: boolean) => void;
  onSubmit?: () => void;
  initialPercentages: Record<string, Record<string, number>>;
  activityImpacts?: Record<string, ActivityImpact[]>; // metricId -> cost pools with activities
}
const FRANCHISES = ["Franchise A", "Franchise B", "Franchise C", "Franchise D", "Franchise E", "Franchise F", "Franchise G"];
const SAMPLE_HEADINGS = [{
  type: "heading",
  name: "Franchise A"
}, {
  type: "heading",
  name: "Franchise B"
}, {
  type: "heading",
  name: "Franchise C"
}, {
  type: "heading",
  name: "Franchise D"
}, {
  type: "heading",
  name: "Franchise E"
}, {
  type: "heading",
  name: "Franchise F"
}, {
  type: "heading",
  name: "Franchise G"
}];
export function MetricInventoryReviewDialog({
  open,
  onOpenChange,
  metrics,
  deletedMetrics = [],
  percentages,
  selectedYears,
  selectedService,
  selectedTower,
  confirmed,
  onConfirmReview,
  onSubmit,
  initialPercentages,
  activityImpacts = {}
}: MetricInventoryReviewDialogProps) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Metric Review - {selectedService}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Review your metric changes bellow.</p>
          
          <div className="space-y-6">
            {metrics.map(metric => {
            const metricPercentages = percentages[metric.id] || {};
            const initialMetricPercentages = initialPercentages[metric.id] || {};
            const years = selectedYears[metric.id] || [];

            // Get only franchises that changed
            const changedFranchises = FRANCHISES.filter(franchise => {
              const currentVal = metricPercentages[franchise] || 0;
              const initialVal = initialMetricPercentages[franchise] || 0;
              return currentVal !== initialVal;
            });
            const costPoolImpacts = activityImpacts[metric.id] || [];
            const overallTotalImpact = costPoolImpacts.reduce((sum, pool) => sum + pool.totalPoolImpact, 0);
            return <div key={metric.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-sm">{metric.name}</h3>
                    <span className="text-xs text-muted-foreground">
                      Source LE: {metric.sourceLE} | Years: {years.join(", ") || "None"}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-semibold mb-1.5 text-muted-foreground">Franchise Allocation Changes:</h4>
                      <div className="flex flex-wrap gap-2">
                        {changedFranchises.map(franchise => {
                      const currentValue = metricPercentages[franchise] || 0;
                      const initialValue = initialMetricPercentages[franchise] || 0;
                      const isIncrease = currentValue > initialValue;
                      const isDecrease = currentValue < initialValue;
                      return <div key={franchise} className="inline-flex items-center gap-1.5 text-xs bg-muted/50 px-2 py-1 rounded">
                              <span className="font-medium">{franchise}:</span>
                              <span className="text-muted-foreground">{initialValue.toFixed(1)}%</span>
                              <span className="text-muted-foreground">→</span>
                              <span className={`font-semibold ${isIncrease ? 'text-green-600' : isDecrease ? 'text-red-600' : 'text-muted-foreground'}`}>
                                {currentValue.toFixed(1)}%
                              </span>
                            </div>;
                    })}
                      </div>
                    </div>
                    
                    {costPoolImpacts.length > 0 && (() => {
                  // Flatten all activities from all cost pools into a single list
                  const allActivities = costPoolImpacts.flatMap(pool => pool.activities.map(activity => ({
                    ...activity,
                    costPoolId: pool.costPoolId
                  })));
                  return <div className="pt-3 border-t border-border">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-semibold text-muted-foreground">
                            Financial Impact on Activities:
                          </h4>
                        </div>
                        
                        <div className="bg-muted/30 rounded-lg p-3">
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-border">
                                  <th className="text-left py-2 px-3 font-semibold bg-muted/50">Cost Pool</th>
                                  <th className="text-left py-2 px-3 font-semibold bg-muted/50">Activity</th>
                                  <th className="text-right py-2 px-3 font-semibold bg-muted/50">Total Impact</th>
                                  {SAMPLE_HEADINGS.map(heading => <th key={heading.name} className="text-right py-2 px-3 font-semibold bg-muted/50">{heading.name}</th>)}
                                </tr>
                              </thead>
                              <tbody>
                                {allActivities.map((activityImpact, actIdx) => {
                              const franchiseMap = new Map(activityImpact.franchiseImpacts.map(f => [f.franchise, f]));
                              return <tr key={actIdx} className="border-b border-border/50 hover:bg-muted/20">
                                    <td className="py-2 px-3 font-medium text-muted-foreground">
                                      {activityImpact.costPoolId}
                                    </td>
                                    <td className="py-2 px-3 font-medium">
                                      <div>{activityImpact.activityName}</div>
                                      <div className="text-[0.65rem] text-muted-foreground">
                                        Total: £{activityImpact.currentTotal.toLocaleString(undefined, {
                                      maximumFractionDigits: 0
                                    })}
                                      </div>
                                    </td>
                                    <td className="py-2 px-3 text-right font-bold">
                                      <span className={activityImpact.totalImpact > 0 ? 'text-green-600' : activityImpact.totalImpact < 0 ? 'text-red-600' : 'text-muted-foreground'}>
                                        {activityImpact.totalImpact > 0 ? '+' : ''}£{activityImpact.totalImpact.toLocaleString(undefined, {
                                      maximumFractionDigits: 0
                                    })}
                                      </span>
                                    </td>
                                    {SAMPLE_HEADINGS.map(heading => {
                                  const franchiseImpact = franchiseMap.get(heading.name);
                                  if (!franchiseImpact || Math.abs(franchiseImpact.change) < 0.01) {
                                    return <td key={heading.name} className="py-2 px-3 text-right text-muted-foreground">
                                          -
                                        </td>;
                                  }
                                  return <td key={heading.name} className="py-2 px-3 text-right">
                                        <div className={franchiseImpact.change > 0 ? 'text-green-600' : 'text-red-600'}>
                                          {franchiseImpact.change > 0 ? '+' : ''}£{franchiseImpact.change.toLocaleString(undefined, {
                                        maximumFractionDigits: 0
                                      })}
                                        </div>
                                        <div className="text-[0.65rem] text-muted-foreground">
                                          ({franchiseImpact.changePercent > 0 ? '+' : ''}{franchiseImpact.changePercent.toFixed(1)}%)
                                        </div>
                                      </td>;
                                })}
                                  </tr>;
                            })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>;
                })()}
                  </div>
                </div>;
          })}
          
          {/* Deleted Metrics Section */}
          {deletedMetrics.length > 0 && <div className="space-y-4 pt-6 border-t-2 border-destructive/20">
              
              
              {deletedMetrics.map(metric => {
              const metricPercentages = percentages[metric.id] || {};
              const initialMetricPercentages = initialPercentages[metric.id] || {};

              // Get franchises that had allocations (now going to 0)
              const franchisesWithAllocations = FRANCHISES.filter(franchise => {
                const initialVal = initialMetricPercentages[franchise] || 0;
                return initialVal > 0;
              });
              const costPoolImpacts = activityImpacts[metric.id] || [];
              const affectedActivities = costPoolImpacts.flatMap(pool => pool.activities.map((activity: any) => ({
                ...activity,
                costPoolId: pool.costPoolId
              })));
              return <div key={metric.id} className="rounded-lg border-2 border-destructive/30 bg-destructive/5 p-4">
                    <div className="mb-3 flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-sm text-destructive">{metric.name}</h3>
                      <span className="text-xs text-muted-foreground">
                        Source LE: {metric.sourceLE} | Years: {selectedYears[metric.id]?.join(", ") || "None"}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      {franchisesWithAllocations.length > 0 && <div>
                          <h4 className="text-xs font-semibold mb-1.5 text-muted-foreground">Franchise Allocation Changes:</h4>
                          <div className="flex flex-wrap gap-2">
                            {franchisesWithAllocations.map(franchise => {
                        const initialValue = initialMetricPercentages[franchise] || 0;
                        return <div key={franchise} className="inline-flex items-center gap-1.5 text-xs bg-muted/50 px-2 py-1 rounded">
                                  <span className="font-medium">{franchise}:</span>
                                  <span className="text-muted-foreground">{initialValue.toFixed(1)}%</span>
                                  <span className="text-muted-foreground">→</span>
                                  <span className="font-semibold text-destructive">0.0%</span>
                                </div>;
                      })}
                          </div>
                        </div>}
                      
                      {affectedActivities.length > 0 && <div className="pt-3 border-t border-border">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-semibold text-muted-foreground">
                              Financial Impact on Activities:
                            </h4>
                          </div>
                          
                          <div className="bg-muted/30 rounded-lg p-3">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-border">
                                  <th className="text-left py-2 px-3 font-semibold bg-muted/50">Cost Pool</th>
                                  <th className="text-left py-2 px-3 font-semibold bg-muted/50">Activity</th>
                                  <th className="text-right py-2 px-3 font-semibold bg-destructive/10 text-destructive">Unassigned</th>
                                  {SAMPLE_HEADINGS.map(heading => <th key={heading.name} className="text-right py-2 px-3 font-semibold bg-muted/50">{heading.name}</th>)}
                                </tr>
                              </thead>
                                <tbody>
                                  {affectedActivities.map((activityImpact, actIdx) => {
                              return <tr key={actIdx} className="border-b border-border/50 hover:bg-muted/20">
                                        <td className="py-2 px-3 font-medium text-muted-foreground">
                                          {activityImpact.costPoolId}
                                        </td>
                                        <td className="py-2 px-3 font-medium">
                                          <div>{activityImpact.activityName}</div>
                                          <div className="text-[0.65rem] text-muted-foreground">
                                            Total: £{activityImpact.currentTotal.toLocaleString(undefined, {
                                      maximumFractionDigits: 0
                                    })}
                                          </div>
                                        </td>
                                        <td className="py-2 px-3 text-right font-bold">
                                          <span className="text-destructive">
                                            -£{activityImpact.currentTotal.toLocaleString(undefined, {
                                      maximumFractionDigits: 0
                                    })}
                                          </span>
                                        </td>
                                        {SAMPLE_HEADINGS.map(heading => <td key={heading.name} className="py-2 px-3 text-right text-muted-foreground">
                                            -
                                          </td>)}
                                      </tr>;
                            })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>}
                      
                      {affectedActivities.length === 0 && <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
                          No activities currently assigned to this metric
                        </div>}
                    </div>
                  </div>;
            })}
            </div>}
          </div>
          
          {metrics.length === 0 && deletedMetrics.length === 0 && <div className="flex items-center justify-center h-32 text-muted-foreground">
              No changes to display.
            </div>}
          
          {(metrics.length > 0 || deletedMetrics.length > 0) && <div className="flex items-center justify-between gap-3 pt-6 border-t border-border">
              <div className="flex items-center gap-3">
                <Switch id="review-confirm" checked={confirmed} onCheckedChange={onConfirmReview} />
                <Label htmlFor="review-confirm" className="text-sm font-medium cursor-pointer">
                  I confirm that I have reviewed these changes
                </Label>
              </div>
              <Button 
                onClick={onSubmit} 
                disabled={!confirmed}
              >
                Submit
              </Button>
            </div>}
        </div>
      </DialogContent>
    </Dialog>;
}