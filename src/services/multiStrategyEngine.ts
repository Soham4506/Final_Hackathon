import { 
  CivicIssue, 
  Department, 
  MunicipalResource, 
  AllocationPlan, 
  AllocationPlanItem, 
  ResourceType 
} from '../types';

export type AllocationStrategy = 'max_risk' | 'max_population' | 'cost_efficiency';

export interface StrategyComparisonMetric {
  strategy: AllocationStrategy;
  strategyName: string;
  description: string;
  approvedCount: number;
  deferredCount: number;
  totalPopulationServed: number;
  totalCost: number;
  totalStaffHours: number;
  budgetUtilizationPct: number;
  avgPriorityScore: number;
}

export class MultiStrategyEngine {
  /**
   * Generates plan based on selected municipal optimization objective with 2 passes:
   * Pass 1: Strategy-sorted knapsack pass
   * Pass 2: Capacity backfill pass for remaining shift slack
   */
  public static optimizePlan(
    department: Department,
    candidateIssues: CivicIssue[],
    resources: MunicipalResource[],
    strategy: AllocationStrategy = 'max_risk',
    budgetCap: number = department.dailyBudgetLimit,
    availableStaff: number = 8,
    shiftHours: number = 8.0,
    shiftNumber: number = 1
  ): AllocationPlan {
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

    const issuesToEvaluate = [...candidateIssues].filter(
      (iss) => iss.departmentId === department.id && iss.status !== 'resolved' && iss.status !== 'rejected'
    );

    issuesToEvaluate.sort((a, b) => {
      if (strategy === 'max_population') {
        const effA = (a.affectedPopulationEstimate || 10) / Math.max(500, a.estimatedCost || 1000);
        const effB = (b.affectedPopulationEstimate || 10) / Math.max(500, b.estimatedCost || 1000);
        return effB - effA;
      } else if (strategy === 'cost_efficiency') {
        return (a.estimatedCost || 1000) - (b.estimatedCost || 1000);
      } else {
        const scoreA = a.priorityScore?.finalScore ?? 0;
        const scoreB = b.priorityScore?.finalScore ?? 0;
        return scoreB - scoreA;
      }
    });

    const approvedItems: AllocationPlanItem[] = [];
    const initiallyDeferredItems: { issue: CivicIssue; bottleneck?: ResourceType; deferralReason?: string }[] = [];
    let scheduledOrder = 1;

    // PASS 1: Strategy-Ordered Allocation
    for (const issue of issuesToEvaluate) {
      const cost = issue.estimatedCost || 2000;
      const staff = issue.requiredStaffCount || 2;
      const hours = issue.estimatedHours || 4.0;
      const eqType = issue.requiredEquipment;

      let canAllocate = true;
      let bottleneck: ResourceType | undefined = undefined;
      let deferralReason: string | undefined = undefined;
      let assignedResource: MunicipalResource | undefined = undefined;

      if (eqType) {
        const pool = availableEquipmentPool.get(eqType) || [];
        if (pool.length === 0) {
          canAllocate = false;
          bottleneck = eqType;
          deferralReason = `Deferred: All ${eqType.replace('_', ' ')} units allocated to prior work orders.`;
        } else {
          assignedResource = pool[0];
        }
      }

      if (canAllocate && cost > remainingBudget) {
        canAllocate = false;
        bottleneck = 'budget_funds';
        deferralReason = `Deferred: Cost ₹${cost.toLocaleString()} exceeds remaining budget ₹${remainingBudget.toLocaleString()}.`;
      }

      if (canAllocate && staff > remainingStaff) {
        canAllocate = false;
        bottleneck = 'staff_crew';
        deferralReason = `Deferred: Crew size (${staff}) exceeds remaining staff (${remainingStaff}).`;
      }

      if (canAllocate) {
        remainingBudget -= cost;
        budgetUtilized += cost;
        remainingStaff -= staff;
        staffHoursUtilized += staff * hours;

        if (eqType && assignedResource) {
          const pool = availableEquipmentPool.get(eqType) || [];
          availableEquipmentPool.set(
            eqType,
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
          allocatedStaffCount: staff,
          allocatedHours: hours,
          allocatedCost: cost,
          scheduledOrder: scheduledOrder++,
        });
      } else {
        initiallyDeferredItems.push({ issue, bottleneck, deferralReason });
      }
    }

    // PASS 2: Capacity Backfill Pass
    const remainingDeferredItems: AllocationPlanItem[] = [];
    const sortedDeferred = [...initiallyDeferredItems].sort((a, b) => {
      const footprintA = (a.issue.estimatedCost || 2000) + (a.issue.requiredStaffCount || 2) * 1000;
      const footprintB = (b.issue.estimatedCost || 2000) + (b.issue.requiredStaffCount || 2) * 1000;
      return footprintA - footprintB;
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
    const targetDate = new Date().toISOString().split('T')[0];

    return {
      id: `plan-${department.id}-${Date.now()}`,
      planCode: `PLAN-${department.code}-${targetDate.replace(/-/g, '')}-S${shiftNumber}-${strategy.toUpperCase()}`,
      departmentId: department.id,
      targetDate,
      shiftNumber,
      status: 'recommended',
      totalBudgetCap: budgetCap,
      totalStaffAvailable: availableStaff,
      budgetUtilized: Math.round(budgetUtilized),
      staffHoursUtilized: Math.round(staffHoursUtilized * 10) / 10,
      totalIssuesEvaluated: issuesToEvaluate.length,
      issuesApprovedCount: approvedCount,
      issuesDeferredCount: deferredCount,
      items: allPlanItems,
      createdAt: new Date().toISOString(),
    };
  }

  public static compareStrategies(
    department: Department,
    candidateIssues: CivicIssue[],
    resources: MunicipalResource[],
    budgetCap: number,
    availableStaff: number
  ): StrategyComparisonMetric[] {
    const strategies: { key: AllocationStrategy; name: string; desc: string }[] = [
      {
        key: 'max_risk',
        name: 'Strategy A: Maximum Severity & Risk Mitigation',
        desc: 'Prioritizes immediate health, safety, and infrastructure threats.',
      },
      {
        key: 'max_population',
        name: 'Strategy B: Maximum Population Reach',
        desc: 'Maximizes the number of residents benefiting from available funds.',
      },
      {
        key: 'cost_efficiency',
        name: 'Strategy C: Balanced Volume & Cost Efficiency',
        desc: 'Clears the maximum number of tickets within the budget cap.',
      },
    ];

    return strategies.map((s) => {
      const plan = MultiStrategyEngine.optimizePlan(
        department,
        candidateIssues,
        resources,
        s.key,
        budgetCap,
        availableStaff
      );

      const approvedItems = plan.items.filter((i) => i.itemStatus === 'approved');
      const totalPop = approvedItems.reduce(
        (sum, i) => sum + (i.issue?.affectedPopulationEstimate || 0),
        0
      );
      const avgScore = approvedItems.length > 0
        ? Math.round(
            (approvedItems.reduce((sum, i) => sum + i.priorityAtAllocation, 0) /
              approvedItems.length) *
              10
          ) / 10
        : 0;

      return {
        strategy: s.key,
        strategyName: s.name,
        description: s.desc,
        approvedCount: plan.issuesApprovedCount,
        deferredCount: plan.issuesDeferredCount,
        totalPopulationServed: totalPop,
        totalCost: plan.budgetUtilized,
        totalStaffHours: plan.staffHoursUtilized,
        budgetUtilizationPct: Math.round((plan.budgetUtilized / plan.totalBudgetCap) * 100),
        avgPriorityScore: avgScore,
      };
    });
  }
}
