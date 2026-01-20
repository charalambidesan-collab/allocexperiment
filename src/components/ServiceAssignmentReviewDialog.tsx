import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

interface OrgUnitCost {
  org_unit: string;
  source_le: string;
  staff_cost: number;
  non_staff_cost: number;
  fte_value: number;
}

interface ServiceAssignmentReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignments: Record<string, string>;
  originalAssignments: Record<string, string>;
  selectedTower?: string;
  orgUnits: string[];
  services: string[];
  availableServices: any[];
  orgUnitCosts: OrgUnitCost[];
  confirmed: boolean;
  onConfirmReview: (checked: boolean) => void;
}

const gbp = (n: number) => new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0
}).format(n);
export function ServiceAssignmentReviewDialog({
  open,
  onOpenChange,
  assignments,
  originalAssignments,
  selectedTower,
  orgUnits,
  services,
  availableServices,
  orgUnitCosts,
  confirmed,
  onConfirmReview
}: ServiceAssignmentReviewDialogProps) {
  // Helper to get service name from ID
  const getServiceName = (serviceId: string | undefined) => {
    if (!serviceId) return "Unassigned";
    const service = availableServices.find(s => s.id === serviceId);
    return service?.name || serviceId;
  };

  // Find changed org units
  const changes = orgUnits.map(ou => {
    const currentService = assignments[ou];
    const originalService = originalAssignments[ou];
    if (currentService !== originalService) {
      const orgUnit = orgUnitCosts.find(oc => oc.org_unit === ou);
      const ouCosts = orgUnit ? {
        staff: orgUnit.staff_cost,
        non_staff: orgUnit.non_staff_cost,
        fte: orgUnit.fte_value
      } : {
        staff: 0,
        non_staff: 0,
        fte: 0
      };
      const totalCost = ouCosts.staff + ouCosts.non_staff;
      return {
        ou,
        from: getServiceName(originalService),
        to: getServiceName(currentService),
        staffCost: ouCosts.staff,
        nonStaffCost: ouCosts.non_staff,
        fteValue: ouCosts.fte,
        totalCost
      };
    }
    return null;
  }).filter((change): change is NonNullable<typeof change> => change !== null);

  // Group changes by from->to service
  const groupedChanges = changes.reduce((acc, change) => {
    const key = `${change.from}→${change.to}`;
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
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Service Assignment Changes - {selectedTower}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {changes.length > 0 ? <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Review the updated service assignments below.
                </p>
                <div className="text-sm font-semibold">
                  Total moved: <span className="text-primary">{gbp(totalMoved)}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                {groupedChangesList.map((group, idx) => <div key={idx} className="rounded-lg border border-border bg-card p-4">
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
                  </div>)}
              </div>
              
              <div className="pt-4 border-t border-border space-y-4">
                <div className="text-sm text-muted-foreground">
                  {changes.length} organizational unit{changes.length !== 1 ? 's' : ''} changed
                </div>
                
                <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg">
                  <label htmlFor="confirm-review" className="text-sm font-medium cursor-pointer">
                    I confirm that I have reviewed these changes
                  </label>
                  <Switch id="confirm-review" checked={confirmed} onCheckedChange={onConfirmReview} />
                </div>
              </div>
            </> : <div className="flex items-center justify-center h-32 text-muted-foreground">
              No changes to review. All assignments remain the same.
            </div>}
        </div>
      </DialogContent>
    </Dialog>;
}