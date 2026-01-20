import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface CostPool {
  id: string;
  name: string;
  sourceLE: string;
  ous: string[];
  serviceId?: string;
}

interface RenamedActivity {
  id: string;
  oldName: string;
  newName: string;
}

interface CostPoolReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignedPoolByOu: Record<string, string>;
  originalAssignments: Record<string, string>;
  costPools: CostPool[];
  selectedService?: string;
  costs: Record<string, {
    staff: number;
    non_staff: number;
    fte: number;
    providerLE?: string;
  }>;
  deletedPools?: CostPool[];
  renamedActivities?: RenamedActivity[];
  confirmed: boolean;
  onConfirmReview: (checked: boolean) => void;
}

const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(n);

export function CostPoolReviewDialog({
  open,
  onOpenChange,
  assignedPoolByOu,
  originalAssignments,
  costPools,
  selectedService,
  costs,
  deletedPools = [],
  renamedActivities = [],
  confirmed,
  onConfirmReview
}: CostPoolReviewDialogProps) {
  // Find changed org units and group by from->to pool
  const changes = Object.keys(assignedPoolByOu).map(ou => {
    const currentPoolId = assignedPoolByOu[ou];
    const originalPoolId = originalAssignments[ou];
    
    if (currentPoolId !== originalPoolId) {
      const currentPool = costPools.find(p => p.id === currentPoolId);
      const originalPool = costPools.find(p => p.id === originalPoolId);
      const ouCosts = costs[ou] || { staff: 0, non_staff: 0, fte: 0 };
      const totalCost = ouCosts.staff + ouCosts.non_staff;
      
      return {
        ou,
        fromPoolId: originalPoolId,
        toPoolId: currentPoolId,
        from: originalPool?.name || "Unassigned",
        to: currentPool?.name || "Unassigned",
        staffCost: ouCosts.staff,
        nonStaffCost: ouCosts.non_staff,
        fteValue: ouCosts.fte,
        totalCost
      };
    }
    return null;
  }).filter((change): change is NonNullable<typeof change> => change !== null);

  // Group changes by from->to pool
  const groupedChanges = changes.reduce((acc, change) => {
    const key = `${change.fromPoolId || 'unassigned'}→${change.toPoolId || 'unassigned'}`;
    if (!acc[key]) {
      acc[key] = {
        from: change.from,
        to: change.to,
        orgUnits: [],
        staffCost: 0,
        nonStaffCost: 0,
        fteValue: 0,
        totalCost: 0
      };
    }
    acc[key].orgUnits.push(change.ou);
    acc[key].staffCost += change.staffCost;
    acc[key].nonStaffCost += change.nonStaffCost;
    acc[key].fteValue += change.fteValue;
    acc[key].totalCost += change.totalCost;
    return acc;
  }, {} as Record<string, {
    from: string;
    to: string;
    orgUnits: string[];
    staffCost: number;
    nonStaffCost: number;
    fteValue: number;
    totalCost: number;
  }>);

  const groupedChangesList = Object.values(groupedChanges);

  // Calculate totals
  const totalMoved = changes.reduce((sum, change) => sum + change.totalCost, 0);
  const hasAnyChanges = changes.length > 0 || (deletedPools?.length ?? 0) > 0 || renamedActivities.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cost Pool Assignment Changes - {selectedService}</DialogTitle>
          <DialogDescription>
            Review org unit assignment changes and pending pool deletions before submitting.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {hasAnyChanges ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Review the updated cost pool assignments below.
                </p>
                <div className="text-sm font-semibold">
                  Total moved: <span className="text-primary">{gbp(totalMoved)}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                {groupedChangesList.map((group, idx) => (
                  <div key={idx} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm mb-2">
                          <span className="px-2 py-1 rounded bg-muted text-muted-foreground">
                            {group.from}
                          </span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="px-2 py-1 rounded bg-primary/10 text-primary font-semibold">
                            {group.to}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-muted-foreground">
                          {group.orgUnits.join(", ")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-foreground">{gbp(group.totalCost)}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Staff: {gbp(group.staffCost)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Non-staff: {gbp(group.nonStaffCost)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          FTE: {group.fteValue.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {deletedPools.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <div className="text-sm font-semibold text-destructive">Pools to be deleted ({deletedPools.length})</div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {deletedPools.map(p => p.name).join(', ')}
                  </div>
                </div>
              )}
              
              {renamedActivities.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="text-sm font-semibold">Activities renamed ({renamedActivities.length})</div>
                  <div className="mt-2 space-y-1">
                    {renamedActivities.map((activity) => (
                      <div key={activity.id} className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">{activity.oldName}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{activity.newName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-border space-y-4">
                <div className="text-sm text-muted-foreground">
                  {changes.length} organizational unit{changes.length !== 1 ? 's' : ''} changed
                </div>
                
                <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg">
                  <label htmlFor="confirm-review" className="text-sm font-medium cursor-pointer">
                    I confirm that I have reviewed these changes
                  </label>
                  <Switch
                    id="confirm-review"
                    checked={confirmed}
                    onCheckedChange={onConfirmReview}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No changes to review. All assignments remain the same.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
