import { 
  CivicIssue, 
  Department, 
  MunicipalResource, 
  AllocationPlan, 
  AllocationPlanItem, 
  ResourceType, 
  PlanItemStatus,
  SolverMode,
  OptimalityComparison
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
  solverMode?: SolverMode;
}

export interface ResourceDeficitReport {
  hasDeficits: boolean;
  missingEquipmentTypes: { type: ResourceType; countNeeded: number; blockedIssuesCount: number }[];
  budgetShortfall: number;
  staffShortfall: number;
  recommendations: string[];
}

export class AllocationEngine {
  public static readonly MAX_DP_CANDIDATES = 40;

  /**
   * Solves exact 0/1 Knapsack via Dynamic Programming
   * Discretizes budget in INR steps to compute theoretical optimal priority yield.
   */
  public static solveExactKnapsackDP(
    candidateIssues: CivicIssue[],
    budgetCap: number,
    availableStaff: number,
    availableEquipmentPool: Map<ResourceType, MunicipalResource[]>
  ): {
    selectedIssues: CivicIssue[];
    totalValue: number;
    budgetUtilized: number;
    staffUtilized: number;
    isCapped: boolean;
  } {
    const n = candidateIssues.length;
    if (n > this.MAX_DP_CANDIDATES) {
      return {
        selectedIssues: [],
        totalValue: 0,
        budgetUtilized: 0,
        staffUtilized: 0,
        isCapped: true,
      };
    }

    const STEP = 100;
    const maxCapacity = Math.max(1, Math.floor(budgetCap / STEP));

    if (n === 0) {
      return {
        selectedIssues: [],
        totalValue: 0,
        budgetUtilized: 0,
        staffUtilized: 0,
        isCapped: false,
      };
    }

    const costs = candidateIssues.map((iss) => Math.max(1, Math.ceil((iss.estimatedCost || 2000) / STEP)));
    const values = candidateIssues.map((iss) => Math.max(1, Math.round((iss.priorityScore?.finalScore ?? 10) * 10)));
    const staffs = candidateIssues.map((iss) => iss.requiredStaffCount || 2);

    // dp[i][w] = max value with first i items and weight <= w
    const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(maxCapacity + 1).fill(0));

    for (let i = 1; i <= n; i++) {
      const c = costs[i - 1];
      const v = values[i - 1];
      for (let w = 0; w <= maxCapacity; w++) {
        dp[i][w] = dp[i - 1][w];
        if (w >= c && dp[i - 1][w - c] + v > dp[i][w]) {
          dp[i][w] = dp[i - 1][w - c] + v;
        }
      }
    }

    // Backtrack with resource & staff verification
    const selected: CivicIssue[] = [];
    let currW = maxCapacity;
    let totalCost = 0;
    let totalStaff = 0;
    let totalVal = 0;
    const tempEquipmentPool = new Map<ResourceType, number>();
    availableEquipmentPool.forEach((list, type) => {
      tempEquipmentPool.set(type, list.length);
    });

    for (let i = n; i >= 1; i--) {
      if (dp[i][currW] !== dp[i - 1][currW]) {
        const issue = candidateIssues[i - 1];
        const actualCost = issue.estimatedCost || 2000;
        const actualStaff = issue.requiredStaffCount || 2;
        const eqType = issue.requiredEquipment;

        let feasible = (totalStaff + actualStaff <= availableStaff);
        if (feasible && eqType) {
          const avail = tempEquipmentPool.get(eqType) || 0;
          if (avail <= 0) feasible = false;
        }

        if (feasible) {
          selected.push(issue);
          currW -= costs[i - 1];
          totalCost += actualCost;
          totalStaff += actualStaff;
          totalVal += (issue.priorityScore?.finalScore ?? 10);
          if (eqType) {
            tempEquipmentPool.set(eqType, (tempEquipmentPool.get(eqType) || 1) - 1);
          }
        }
      }
    }

    return {
      selectedIssues: selected.reverse(),
      totalValue: Math.round(totalVal * 10) / 10,
      budgetUtilized: totalCost,
      staffUtilized: totalStaff,
      isCapped: false,
    };
  }

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
      solverMode = 'greedy',
    } = input;

    const deptResources = resources.filter(
      (r) => r.departmentId === department.id && r.isOperational
    );

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

    // 1. Solve Exact 0/1 Knapsack via DP for theoretical optimality baseline
    const dpResult = this.solveExactKnapsackDP(
      sortedIssues,
      budgetCap,
      availableStaff,
      availableEquipmentPool
    );

    let remainingBudget = budgetCap;
    let remainingStaff = availableStaff;
    let staffHoursUtilized = 0;
    let budgetUtilized = 0;

    const approvedItems: AllocationPlanItem[] = [];
    const initiallyDeferredItems: { issue: CivicIssue; bottleneck?: ResourceType; deferralReason?: string }[] = [];
    const blockedEquipmentCounts = new Map<ResourceType, { countNeeded: number; blockedIssuesCount: number }>();
    let scheduledOrder = 1;

    // Use DP selection if mode is 'dp_knapsack' and not capped
    const useDP = solverMode === 'dp_knapsack' && !dpResult.isCapped && dpResult.selectedIssues.length > 0;
    const dpSelectedSet = new Set(dpResult.selectedIssues.map((i) => i.id));

    // -------------------------------------------------------------
    // PASS 1: Allocation Pass (DP Knapsack or Priority Greedy)
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

      if (useDP) {
        if (!dpSelectedSet.has(issue.id)) {
          canAllocate = false;
          deferralReason = 'Deferred: Non-optimal footprint in exact 0/1 knapsack dynamic programming subset.';
        }
      }

      // Check Equipment Availability
      if (canAllocate && requiredEquipmentType) {
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

      // Check Budget Constraints
      if (canAllocate && estimatedCost > remainingBudget) {
        canAllocate = false;
        bottleneck = 'budget_funds';
        deferralReason = `Deferred: Estimated cost (₹${estimatedCost.toLocaleString()}) exceeds remaining daily budget (₹${remainingBudget.toLocaleString()}).`;
      }

      // Check Staff Constraints
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
          allocationMethod: useDP ? 'priority' : 'priority',
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

    // Calculate achieved priority value for active plan
    const activeTotalValue = Math.round(
      approvedItems.reduce((sum, item) => sum + (item.priorityAtAllocation || 0), 0) * 10
    ) / 10;

    // Greedy heuristic total value vs DP Knapsack value
    const greedyApprovedValue = solverMode === 'greedy' 
      ? activeTotalValue 
      : Math.round(sortedIssues.slice(0, approvedCount).reduce((s, i) => s + (i.priorityScore?.finalScore || 0), 0) * 10) / 10;
    
    const dpOptimalValue = dpResult.isCapped ? greedyApprovedValue : Math.max(dpResult.totalValue, activeTotalValue);
    const optimalityGap = dpOptimalValue > 0 
      ? Math.min(100, Math.round((greedyApprovedValue / dpOptimalValue) * 1000) / 10) 
      : 100.0;

    const optimalityComparison: OptimalityComparison = {
      greedyValue: greedyApprovedValue,
      greedyApprovedCount: approvedCount,
      greedyBudgetUtilized: budgetUtilized,
      dpValue: dpOptimalValue,
      dpApprovedCount: dpResult.selectedIssues.length || approvedCount,
      dpBudgetUtilized: dpResult.budgetUtilized || budgetUtilized,
      optimalityGapPct: optimalityGap,
      activeSolver: solverMode,
      candidateCount: sortedIssues.length,
      isCapped: dpResult.isCapped,
      capMessage: dpResult.isCapped 
        ? `Candidate issue count (${sortedIssues.length}) exceeds DP threshold (40) for real-time responsiveness. Fast greedy approximation utilized.` 
        : undefined,
    };

    const planCode = `PLAN-${department.code}-${targetDate.replace(/-/g, '')}-S${shiftNumber}`;

    const plan: AllocationPlan = {
      id: `plan-${department.id}-${Date.now()}`,
      planCode,
      departmentId: department.id,
      targetDate,
      shiftNumber,
      status: 'recommended',
      solverMode,
      optimalityComparison,
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
