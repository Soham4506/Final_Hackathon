import { 
  CivicIssue, 
  Department, 
  MunicipalResource, 
  AllocationPlan, 
  AllocationPlanItem, 
  ResourceType, 
  PlanItemStatus 
} from '../types';

export interface AllocationEngineInput {
  department: Department;
  candidateIssues: CivicIssue[];
  resources: MunicipalResource[];
  budgetCap?: number;
  availableStaff?: number;
  shiftHours?: number;
  shiftNumber?: number;
  targetDate?: string;
  generatedBy?: string;
}

export interface ResourceDeficitReport {
  hasDeficits: boolean;
  missingEquipmentTypes: { type: ResourceType; countNeeded: number; blockedIssuesCount: number }[];
  budgetShortfall: number;
  staffShortfall: number;
  recommendations: string[];
}

export class AllocationEngine {
  /**
   * Runs resource-aware multi-constraint allocation optimization with two passes:
   * Pass 1: Priority-Ordered Knapsack Pass (Strict S_priority ranking)
   * Pass 2: Capacity Backfill Pass (Greedy fill of remaining budget/staff slack with smaller deferred items)
   */
  public static generatePlan(input: AllocationEngineInput): {
    plan: AllocationPlan;
    deficitReport: ResourceDeficitReport;
  } {
    const {
      department,
      candidateIssues,
      resources,
      budgetCap = department.dailyBudgetLimit,
      availableStaff = 8,
      shiftHours = 8.0,
      shiftNumber = 1,
      targetDate = new Date().toISOString().split('T')[0],
      generatedBy = 'System Optimization Engine',
    } = input;

    const deptResources = resources.filter(
      (r) => r.departmentId === department.id && r.isOperational
    );

    let remainingBudget = budgetCap;
    let remainingStaff = availableStaff;
    let staffHoursUtilized = 0;
    let budgetUtilized = 0;

    const availableEquipmentPool = new Map<ResourceType, MunicipalResource[]>();
    for (const res of deptResources) {
      if (res.currentStatus === 'available') {
        const list = availableEquipmentPool.get(res.resourceType) || [];
        list.push(res);
        availableEquipmentPool.set(res.resourceType, list);
      }
    }

    const sortedIssues = [...candidateIssues]
      .filter((iss) => iss.departmentId === department.id && iss.status !== 'resolved' && iss.status !== 'rejected')
      .sort((a, b) => {
        const scoreA = a.priorityScore?.finalScore ?? 0;
        const scoreB = b.priorityScore?.finalScore ?? 0;
        return scoreB - scoreA;
      });

    const approvedItems: AllocationPlanItem[] = [];
    const initiallyDeferredItems: { issue: CivicIssue; bottleneck?: ResourceType; deferralReason?: string }[] = [];
    const blockedEquipmentCounts = new Map<ResourceType, { countNeeded: number; blockedIssuesCount: number }>();
    let scheduledOrder = 1;

    // -------------------------------------------------------------
    // PASS 1: Strict Priority-Ordered Allocation Pass
    // -------------------------------------------------------------
    for (const issue of sortedIssues) {
      const estimatedCost = issue.estimatedCost || 2000;
      const requiredStaff = issue.requiredStaffCount || 2;
      const estimatedHours = issue.estimatedHours || 4.0;
      const requiredEquipmentType = issue.requiredEquipment;

      let canAllocate = true;
      let bottleneck: ResourceType | undefined = undefined;
      let deferralReason: string | undefined = undefined;
      let assignedResource: MunicipalResource | undefined = undefined;

      // 1. Check Equipment Availability
      if (requiredEquipmentType) {
        const availableMachinery = availableEquipmentPool.get(requiredEquipmentType) || [];
        if (availableMachinery.length === 0) {
          canAllocate = false;
          bottleneck = requiredEquipmentType;
          deferralReason = `Deferred: All ${requiredEquipmentType.replace('_', ' ')} units are committed to higher-priority work orders.`;
          
          const current = blockedEquipmentCounts.get(requiredEquipmentType) || { countNeeded: 0, blockedIssuesCount: 0 };
          blockedEquipmentCounts.set(requiredEquipmentType, {
            countNeeded: current.countNeeded + 1,
            blockedIssuesCount: current.blockedIssuesCount + 1,
          });
        } else {
          assignedResource = availableMachinery[0];
        }
      }

      // 2. Check Budget Constraints
      if (canAllocate && estimatedCost > remainingBudget) {
        canAllocate = false;
        bottleneck = 'budget_funds';
        deferralReason = `Deferred: Estimated cost (₹${estimatedCost.toLocaleString()}) exceeds remaining daily budget (₹${remainingBudget.toLocaleString()}).`;
      }

      // 3. Check Staff Constraints
      if (canAllocate && requiredStaff > remainingStaff) {
        canAllocate = false;
        bottleneck = 'staff_crew';
        deferralReason = `Deferred: Requires ${requiredStaff} crew members, but only ${remainingStaff} unassigned technicians available.`;
      }

      if (canAllocate) {
        remainingBudget -= estimatedCost;
        budgetUtilized += estimatedCost;
        remainingStaff -= requiredStaff;
        staffHoursUtilized += (requiredStaff * estimatedHours);

        if (requiredEquipmentType && assignedResource) {
          const pool = availableEquipmentPool.get(requiredEquipmentType) || [];
          availableEquipmentPool.set(
            requiredEquipmentType,
            pool.filter((r) => r.id !== assignedResource!.id)
          );
        }

        approvedItems.push({
          id: `item-${issue.id}-${Date.now()}`,
          planId: '',
          issueId: issue.id,
          issue,
          allocatedResourceId: assignedResource?.id,
          allocatedResource: assignedResource,
          itemStatus: 'approved',
          allocationMethod: 'priority',
          priorityAtAllocation: issue.priorityScore?.finalScore ?? 0,
          allocatedStaffCount: requiredStaff,
          allocatedHours: estimatedHours,
          allocatedCost: estimatedCost,
          scheduledOrder: scheduledOrder++,
        });
      } else {
        initiallyDeferredItems.push({ issue, bottleneck, deferralReason });
      }
    }

    // -------------------------------------------------------------
    // PASS 2: Capacity Backfill Pass
    // Greedily allocate smaller deferred items into remaining slack
    // -------------------------------------------------------------
    const remainingDeferredItems: AllocationPlanItem[] = [];
    const sortedDeferred = [...initiallyDeferredItems].sort((a, b) => {
      const footprintA = (a.issue.estimatedCost || 2000) + (a.issue.requiredStaffCount || 2) * 1000;
      const footprintB = (b.issue.estimatedCost || 2000) + (b.issue.requiredStaffCount || 2) * 1000;
      return footprintA - footprintB; // smallest footprint first
    });

    for (const item of sortedDeferred) {
      const issue = item.issue;
      const cost = issue.estimatedCost || 2000;
      const staff = issue.requiredStaffCount || 2;
      const hours = issue.estimatedHours || 4.0;
      const eqType = issue.requiredEquipment;

      let canBackfill = true;
      let assignedResource: MunicipalResource | undefined = undefined;

      if (eqType) {
        const availableMachinery = availableEquipmentPool.get(eqType) || [];
        if (availableMachinery.length === 0) {
          canBackfill = false;
        } else {
          assignedResource = availableMachinery[0];
        }
      }

      if (canBackfill && cost <= remainingBudget && staff <= remainingStaff) {
        // Backfill committed
        remainingBudget -= cost;
        budgetUtilized += cost;
        remainingStaff -= staff;
        staffHoursUtilized += (staff * hours);

        if (eqType && assignedResource) {
          const pool = availableEquipmentPool.get(eqType) || [];
          availableEquipmentPool.set(
            eqType,
            pool.filter((r) => r.id !== assignedResource!.id)
          );
        }

        approvedItems.push({
          id: `item-backfill-${issue.id}-${Date.now()}`,
          planId: '',
          issueId: issue.id,
          issue,
          allocatedResourceId: assignedResource?.id,
          allocatedResource: assignedResource,
          itemStatus: 'approved',
          allocationMethod: 'backfill',
          priorityAtAllocation: issue.priorityScore?.finalScore ?? 0,
          allocatedStaffCount: staff,
          allocatedHours: hours,
          allocatedCost: cost,
          scheduledOrder: scheduledOrder++,
        });
      } else {
        remainingDeferredItems.push({
          id: `item-${issue.id}-${Date.now()}`,
          planId: '',
          issueId: issue.id,
          issue,
          itemStatus: 'deferred',
          allocationMethod: 'priority',
          priorityAtAllocation: issue.priorityScore?.finalScore ?? 0,
          allocatedStaffCount: 0,
          allocatedHours: 0,
          allocatedCost: 0,
          deferralReason: item.deferralReason,
          bottleneckResource: item.bottleneck,
          scheduledOrder: scheduledOrder++,
        });
      }
    }

    const allPlanItems = [...approvedItems, ...remainingDeferredItems];
    const approvedCount = approvedItems.length;
    const deferredCount = remainingDeferredItems.length;

    const planCode = `PLAN-${department.code}-${targetDate.replace(/-/g, '')}-S${shiftNumber}`;

    const plan: AllocationPlan = {
      id: `plan-${department.id}-${Date.now()}`,
      planCode,
      departmentId: department.id,
      targetDate,
      shiftNumber,
      status: 'recommended',
      totalBudgetCap: budgetCap,
      totalStaffAvailable: availableStaff,
      budgetUtilized: Math.round(budgetUtilized),
      staffHoursUtilized: Math.round(staffHoursUtilized * 10) / 10,
      totalIssuesEvaluated: sortedIssues.length,
      issuesApprovedCount: approvedCount,
      issuesDeferredCount: deferredCount,
      items: allPlanItems,
      generatedBy,
      createdAt: new Date().toISOString(),
    };

    // Deficit Report
    const missingEquipmentTypes = Array.from(blockedEquipmentCounts.entries()).map(([type, stats]) => ({
      type,
      countNeeded: Math.min(stats.countNeeded, 2),
      blockedIssuesCount: stats.blockedIssuesCount,
    }));

    const budgetShortfall = remainingDeferredItems.reduce((sum, item) => sum + (item.issue?.estimatedCost || 0), 0);
    const staffShortfall = remainingDeferredItems.reduce((sum, item) => sum + (item.issue?.requiredStaffCount || 0), 0);

    const recommendations: string[] = [];
    if (missingEquipmentTypes.length > 0) {
      missingEquipmentTypes.forEach((eq) => {
        recommendations.push(
          `Procuring or renting +1 ${eq.type.replace('_', ' ')} unit would unblock ${eq.blockedIssuesCount} urgent issue(s).`
        );
      });
    }
    if (budgetShortfall > 0) {
      recommendations.push(
        `Additional contingency budget of ₹${budgetShortfall.toLocaleString()} needed to resolve remaining backlog.`
      );
    }
    if (staffShortfall > 0) {
      recommendations.push(
        `Overtime authorization or contract deployment of +${staffShortfall} technicians recommended for Shift 2.`
      );
    }

    const deficitReport: ResourceDeficitReport = {
      hasDeficits: deferredCount > 0,
      missingEquipmentTypes,
      budgetShortfall,
      staffShortfall,
      recommendations,
    };

    return { plan, deficitReport };
  }
}
