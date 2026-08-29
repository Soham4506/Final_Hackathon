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
   * Runs resource-aware multi-constraint allocation optimization
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

    // Filter active operational resources for this department
    const deptResources = resources.filter(
      (r) => r.departmentId === department.id && r.isOperational
    );

    // Track available resource pool
    let remainingBudget = budgetCap;
    let remainingStaff = availableStaff;
    let totalStaffHoursPool = availableStaff * shiftHours;
    let staffHoursUtilized = 0;
    let budgetUtilized = 0;

    // Available equipment map: ResourceType -> Available Resource objects
    const availableEquipmentPool = new Map<ResourceType, MunicipalResource[]>();
    for (const res of deptResources) {
      if (res.currentStatus === 'available') {
        const list = availableEquipmentPool.get(res.resourceType) || [];
        list.push(res);
        availableEquipmentPool.set(res.resourceType, list);
      }
    }

    // Sort issues by priority score descending (critical first)
    const sortedIssues = [...candidateIssues]
      .filter((iss) => iss.departmentId === department.id && iss.status !== 'resolved' && iss.status !== 'rejected')
      .sort((a, b) => {
        const scoreA = a.priorityScore?.finalScore ?? 0;
        const scoreB = b.priorityScore?.finalScore ?? 0;
        return scoreB - scoreA;
      });

    const planItems: AllocationPlanItem[] = [];
    const blockedEquipmentCounts = new Map<ResourceType, { countNeeded: number; blockedIssuesCount: number }>();
    let budgetShortfall = 0;
    let staffShortfall = 0;

    let scheduledOrder = 1;

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
          // Temporarily hold candidate resource
          assignedResource = availableMachinery[0];
        }
      }

      // 2. Check Budget Constraints
      if (canAllocate && estimatedCost > remainingBudget) {
        canAllocate = false;
        bottleneck = 'budget_funds';
        deferralReason = `Deferred: Estimated cost (₹${estimatedCost.toLocaleString()}) exceeds remaining daily budget (₹${remainingBudget.toLocaleString()}).`;
        budgetShortfall += (estimatedCost - remainingBudget);
      }

      // 3. Check Staff Constraints
      if (canAllocate && requiredStaff > remainingStaff) {
        canAllocate = false;
        bottleneck = 'staff_crew';
        deferralReason = `Deferred: Requires ${requiredStaff} crew members, but only ${remainingStaff} unassigned technicians available.`;
        staffShortfall += (requiredStaff - remainingStaff);
      }

      if (canAllocate) {
        // COMMIT ALLOCATION
        remainingBudget -= estimatedCost;
        budgetUtilized += estimatedCost;
        remainingStaff -= requiredStaff;
        staffHoursUtilized += (requiredStaff * estimatedHours);

        if (requiredEquipmentType && assignedResource) {
          // Remove assigned unit from available pool for this shift
          const pool = availableEquipmentPool.get(requiredEquipmentType) || [];
          availableEquipmentPool.set(
            requiredEquipmentType,
            pool.filter((r) => r.id !== assignedResource!.id)
          );
        }

        planItems.push({
          id: `item-${issue.id}-${Date.now()}`,
          planId: '',
          issueId: issue.id,
          issue,
          allocatedResourceId: assignedResource?.id,
          allocatedResource: assignedResource,
          itemStatus: 'approved',
          priorityAtAllocation: issue.priorityScore?.finalScore ?? 0,
          allocatedStaffCount: requiredStaff,
          allocatedHours: estimatedHours,
          allocatedCost: estimatedCost,
          scheduledOrder: scheduledOrder++,
        });
      } else {
        // RECORD DEFERRAL
        planItems.push({
          id: `item-${issue.id}-${Date.now()}`,
          planId: '',
          issueId: issue.id,
          issue,
          itemStatus: 'deferred',
          priorityAtAllocation: issue.priorityScore?.finalScore ?? 0,
          allocatedStaffCount: 0,
          allocatedHours: 0,
          allocatedCost: 0,
          deferralReason,
          bottleneckResource: bottleneck,
          scheduledOrder: scheduledOrder++,
        });
      }
    }

    const approvedCount = planItems.filter((i) => i.itemStatus === 'approved').length;
    const deferredCount = planItems.filter((i) => i.itemStatus === 'deferred').length;

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
      items: planItems,
      generatedBy,
      createdAt: new Date().toISOString(),
    };

    // Deficit Report
    const missingEquipmentTypes = Array.from(blockedEquipmentCounts.entries()).map(([type, stats]) => ({
      type,
      countNeeded: Math.min(stats.countNeeded, 2),
      blockedIssuesCount: stats.blockedIssuesCount,
    }));

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
