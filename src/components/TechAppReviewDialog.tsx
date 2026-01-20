import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

interface TechAppData {
  app: string;
  costsByLocation: Record<string, number>;
  total: number;
}

interface TechAppReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appBuckets: Record<string, 'prorata' | 'specific'>;
  appSpecificType: Record<string, 'service' | 'costpool'>;
  costPoolAssignments: Record<string, string[]>;
  initialAppBuckets: Record<string, 'prorata' | 'specific'>;
  initialAppSpecificType: Record<string, 'service' | 'costpool'>;
  initialCostPoolAssignments: Record<string, string[]>;
  selectedTower?: string;
  uniqueAppsWithCosts: TechAppData[];
  serviceOptions: { id: string; label: string }[];
  costPoolOptions: { id: string; label: string }[];
  confirmed: boolean;
  onConfirmChange: (confirmed: boolean) => void;
  onSubmit: () => void;
}

const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(n);

export function TechAppReviewDialog({
  open,
  onOpenChange,
  appBuckets,
  appSpecificType,
  costPoolAssignments,
  initialAppBuckets,
  initialAppSpecificType,
  initialCostPoolAssignments,
  selectedTower,
  uniqueAppsWithCosts,
  serviceOptions,
  costPoolOptions,
  confirmed,
  onConfirmChange,
  onSubmit,
}: TechAppReviewDialogProps) {
  
  // Calculate changes
  const changes = useMemo(() => {
    const newAssignments: { app: string; bucket: string; type?: string; assignments: string[]; cost: number }[] = [];
    const modifiedAssignments: { app: string; oldBucket: string; newBucket: string; oldType?: string; newType?: string; oldAssignments: string[]; newAssignments: string[]; cost: number }[] = [];
    const removedAssignments: { app: string; oldBucket: string; oldType?: string; oldAssignments: string[]; cost: number }[] = [];
    
    const allApps = new Set([
      ...Object.keys(appBuckets),
      ...Object.keys(initialAppBuckets)
    ]);
    
    allApps.forEach(app => {
      const appData = uniqueAppsWithCosts.find(a => a.app === app);
      const cost = appData?.total || 0;
      
      const hadBucket = initialAppBuckets[app];
      const hasBucket = appBuckets[app];
      
      if (!hadBucket && hasBucket) {
        // New assignment
        newAssignments.push({
          app,
          bucket: hasBucket,
          type: appSpecificType[app],
          assignments: costPoolAssignments[app] || [],
          cost
        });
      } else if (hadBucket && !hasBucket) {
        // Removed assignment
        removedAssignments.push({
          app,
          oldBucket: hadBucket,
          oldType: initialAppSpecificType[app],
          oldAssignments: initialCostPoolAssignments[app] || [],
          cost
        });
      } else if (hadBucket && hasBucket) {
        // Check if modified
        const bucketChanged = hadBucket !== hasBucket;
        const typeChanged = initialAppSpecificType[app] !== appSpecificType[app];
        const oldAssigns = initialCostPoolAssignments[app] || [];
        const newAssigns = costPoolAssignments[app] || [];
        const assignmentsChanged = JSON.stringify(oldAssigns.sort()) !== JSON.stringify(newAssigns.sort());
        
        if (bucketChanged || typeChanged || assignmentsChanged) {
          modifiedAssignments.push({
            app,
            oldBucket: hadBucket,
            newBucket: hasBucket,
            oldType: initialAppSpecificType[app],
            newType: appSpecificType[app],
            oldAssignments: oldAssigns,
            newAssignments: newAssigns,
            cost
          });
        }
      }
    });
    
    return { newAssignments, modifiedAssignments, removedAssignments };
  }, [appBuckets, appSpecificType, costPoolAssignments, initialAppBuckets, initialAppSpecificType, initialCostPoolAssignments, uniqueAppsWithCosts]);

  const hasChanges = changes.newAssignments.length > 0 || changes.modifiedAssignments.length > 0 || changes.removedAssignments.length > 0;

  const getAssignmentLabel = (id: string, type?: string) => {
    if (type === 'service') {
      return serviceOptions.find(o => o.id === id)?.label || id;
    } else if (type === 'costpool') {
      return costPoolOptions.find(o => o.id === id)?.label || id;
    }
    return id;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tech App Assignment Review - {selectedTower}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Review your technology application assignment changes below.
          </p>
          
          {/* New Assignments */}
          {changes.newAssignments.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-green-600">New Assignments ({changes.newAssignments.length})</h3>
              <div className="space-y-2">
                {changes.newAssignments.map(({ app, bucket, type, assignments, cost }) => (
                  <div key={app} className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-mono text-sm font-semibold">{app}</div>
                        <div className="text-xs text-muted-foreground mt-1">Cost: {gbp(cost)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs">
                          <span className="font-medium">Method:</span>{' '}
                          <span className="text-green-600 font-semibold">{bucket === 'prorata' ? 'Pro Rata' : 'Specific'}</span>
                        </div>
                        {bucket === 'specific' && type && (
                          <div className="text-xs mt-1">
                            <span className="font-medium">Type:</span>{' '}
                            <span className="text-green-600">{type === 'service' ? 'Service' : 'Cost Pool'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {assignments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {assignments.map(id => (
                          <span key={id} className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                            {getAssignmentLabel(id, type)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modified Assignments */}
          {changes.modifiedAssignments.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-amber-600">Modified Assignments ({changes.modifiedAssignments.length})</h3>
              <div className="space-y-2">
                {changes.modifiedAssignments.map(({ app, oldBucket, newBucket, oldType, newType, oldAssignments, newAssignments, cost }) => (
                  <div key={app} className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-mono text-sm font-semibold">{app}</div>
                        <div className="text-xs text-muted-foreground mt-1">Cost: {gbp(cost)}</div>
                      </div>
                      <div className="text-right text-xs">
                        {oldBucket !== newBucket && (
                          <div>
                            <span className="font-medium">Method:</span>{' '}
                            <span className="text-muted-foreground">{oldBucket === 'prorata' ? 'Pro Rata' : 'Specific'}</span>
                            <span className="mx-1">→</span>
                            <span className="text-amber-600 font-semibold">{newBucket === 'prorata' ? 'Pro Rata' : 'Specific'}</span>
                          </div>
                        )}
                        {oldType !== newType && newBucket === 'specific' && (
                          <div className="mt-1">
                            <span className="font-medium">Type:</span>{' '}
                            <span className="text-muted-foreground">{oldType === 'service' ? 'Service' : oldType === 'costpool' ? 'Cost Pool' : 'None'}</span>
                            <span className="mx-1">→</span>
                            <span className="text-amber-600">{newType === 'service' ? 'Service' : 'Cost Pool'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {(oldAssignments.length > 0 || newAssignments.length > 0) && (
                      <div className="mt-3 space-y-2">
                        {oldAssignments.length > 0 && (
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className="text-[10px] text-muted-foreground">Removed:</span>
                            {oldAssignments.filter(id => !newAssignments.includes(id)).map(id => (
                              <span key={id} className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded line-through">
                                {getAssignmentLabel(id, oldType)}
                              </span>
                            ))}
                          </div>
                        )}
                        {newAssignments.length > 0 && (
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className="text-[10px] text-muted-foreground">Current:</span>
                            {newAssignments.map(id => (
                              <span key={id} className={`text-[10px] px-2 py-1 rounded ${
                                oldAssignments.includes(id) 
                                  ? 'bg-muted text-muted-foreground' 
                                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                              }`}>
                                {getAssignmentLabel(id, newType)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Removed Assignments */}
          {changes.removedAssignments.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-red-600">Removed Assignments ({changes.removedAssignments.length})</h3>
              <div className="space-y-2">
                {changes.removedAssignments.map(({ app, oldBucket, oldType, oldAssignments, cost }) => (
                  <div key={app} className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-mono text-sm font-semibold line-through text-red-600">{app}</div>
                        <div className="text-xs text-muted-foreground mt-1">Cost: {gbp(cost)}</div>
                      </div>
                      <div className="text-right text-xs">
                        <div>
                          <span className="font-medium">Was:</span>{' '}
                          <span className="text-red-600">{oldBucket === 'prorata' ? 'Pro Rata' : 'Specific'}</span>
                        </div>
                        {oldType && (
                          <div className="mt-1">
                            <span className="font-medium">Type:</span>{' '}
                            <span className="text-red-600">{oldType === 'service' ? 'Service' : 'Cost Pool'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {oldAssignments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {oldAssignments.map(id => (
                          <span key={id} className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded line-through">
                            {getAssignmentLabel(id, oldType)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasChanges && (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No changes to display.
            </div>
          )}
          
          {hasChanges && (
            <div className="flex items-center justify-between gap-3 pt-6 border-t border-border">
              <div className="flex items-center gap-3">
                <Switch 
                  id="review-confirm" 
                  checked={confirmed} 
                  onCheckedChange={onConfirmChange} 
                />
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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
