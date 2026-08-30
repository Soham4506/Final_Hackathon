/**
 * ===========================================================================
 * KoparNiti (कोपरनीती) - Counterfactual Decision Simulator Engine
 *
 * Implements P1 Tasks 11, 12, 13, 14, 15, 16:
 *  - Sandboxed what-if simulations across budget, staff, machinery, & policy weights
 *  - Granular Decision Diff (Newly Executable vs Newly Deferred vs Rank Shifts)
 *  - 100% Isolated: Zero mutations to production policy or active plan state
 * ===========================================================================
 */

import {
  CivicIssue,
  Department,
  MunicipalResource,
  PriorityWeightConfig,
  IssueCategory,
  Zone,
  ResourceType,
  CounterfactualSimulationInput,
  CounterfactualSimulationResult,
  DecisionDiffItem,
} from '../types';
import { AllocationEngine } from './allocationEngine';
import { PriorityEngine } from './priorityEngine';

export class CounterfactualEngine {
  /**
   * Safely normalizes weight vector so sum equals 1.0 (100%)
   */
  public static normalizeWeights(weights: {
    weightSeverity: number;
    weightUrgency: number;
    weightPopulation: number;
    weightLocation: number;
    weightEscalation: number;
    missingDataPenaltyMax: number;
  }): PriorityWeightConfig {
    const sum =
      weights.weightSeverity +
      weights.weightUrgency +
      weights.weightPopulation +
      weights.weightLocation +
      weights.weightEscalation;

    const factor = sum > 0 ? 1.0 / sum : 1.0;

    return {
      id: `sim-config-${Date.now()}`,
      configName: 'Counterfactual Simulation Policy',
      weightSeverity: Math.round(weights.weightSeverity * factor * 100) / 100,
      weightUrgency: Math.round(weights.weightUrgency * factor * 100) / 100,
      weightPopulation: Math.round(weights.weightPopulation * factor * 100) / 100,
      weightLocation: Math.round(weights.weightLocation * factor * 100) / 100,
      weightEscalation: Math.round(weights.weightEscalation * factor * 100) / 100,
      missingDataPenaltyMax: weights.missingDataPenaltyMax,
      isCurrent: false,
    };
  }

  /**
   * Executes a counterfactual what-if simulation comparing baseline vs simulated conditions.
   */
  public static simulate(params: {
    department: Department;
    candidateIssues: CivicIssue[];
    baseResources: MunicipalResource[];
    categories: IssueCategory[];
    zones: Zone[];
    baselineWeights: PriorityWeightConfig;
    simulationInput: CounterfactualSimulationInput;
  }): CounterfactualSimulationResult {
    const {
      department,
      candidateIssues,
      baseResources,
      categories,
      zones,
      baselineWeights,
      simulationInput,
    } = params;

    // 1. Generate Baseline Plan
    const baselineResult = AllocationEngine.generatePlan({
      department,
      candidateIssues,
      resources: baseResources,
      budgetCap: department.dailyBudgetLimit,
      availableStaff: 8,
      solverMode: 'greedy',
    });
    const baselinePlan = baselineResult.plan;

    // 2. Prepare Counterfactual Resource Pool
    const simulatedBudget = simulationInput.budgetCap !== undefined ? simulationInput.budgetCap : department.dailyBudgetLimit;
    const simulatedStaff = simulationInput.availableStaff !== undefined ? simulationInput.availableStaff : 8;

    const simulatedResources: MunicipalResource[] = JSON.parse(JSON.stringify(baseResources));

    // Inject simulated additional machinery
    if (simulationInput.additionalEquipment) {
      Object.entries(simulationInput.additionalEquipment).forEach(([type, count]) => {
        if (count && count > 0) {
          for (let i = 1; i <= count; i++) {
            simulatedResources.push({
              id: `res-sim-${type}-${i}-${Date.now()}`,
              departmentId: department.id,
              resourceType: type as ResourceType,
              identifierCode: `SIM-${type.toUpperCase().substring(0, 3)}-${i}`,
              name: `Simulated ${type.replace(/_/g, ' ')} (+${i})`,
              capacityDescription: 'Simulated counterfactual capacity addition',
              isOperational: true,
              dailyCostRate: 5000,
              currentStatus: 'available',
            });
          }
        }
      });
    }

    // 3. Prepare Counterfactual Issues with Recomputed Scores (if policy weights simulated)
    const effectiveWeights = simulationInput.policyWeights
      ? this.normalizeWeights(simulationInput.policyWeights)
      : baselineWeights;

    const simulatedIssues: CivicIssue[] = candidateIssues.map((issue) => {
      const cat = categories.find((c) => c.id === issue.categoryId) || categories[0];
      const zone = zones.find((z) => z.id === issue.zoneId) || zones[0];
      const simulatedScore = PriorityEngine.calculateScore(issue, cat, zone, effectiveWeights);
      return {
        ...issue,
        priorityScore: simulatedScore,
      };
    });

    // 4. Generate Simulated Counterfactual Plan
    const simulatedResult = AllocationEngine.generatePlan({
      department,
      candidateIssues: simulatedIssues,
      resources: simulatedResources,
      budgetCap: simulatedBudget,
      availableStaff: simulatedStaff,
      solverMode: simulationInput.solverMode || 'greedy',
    });
    const simulatedPlan = simulatedResult.plan;

    // 5. Compute Decision Diff
    const baselineItemMap = new Map(baselinePlan.items.map((item) => [item.issueId, item]));
    const simulatedItemMap = new Map(simulatedPlan.items.map((item) => [item.issueId, item]));

    const allIssueIds = Array.from(
      new Set([...Array.from(baselineItemMap.keys()), ...Array.from(simulatedItemMap.keys())])
    );

    let unblockedCount = 0;
    let displacedCount = 0;

    const decisionDiff: DecisionDiffItem[] = allIssueIds.map((issueId) => {
      const bItem = baselineItemMap.get(issueId);
      const sItem = simulatedItemMap.get(issueId);
      const issue = sItem?.issue || bItem?.issue || candidateIssues.find((i) => i.id === issueId)!;

      const baselineStatus = bItem?.itemStatus || 'deferred';
      const simulatedStatus = sItem?.itemStatus || 'deferred';
      const baselineRank = bItem?.scheduledOrder || 99;
      const simulatedRank = sItem?.scheduledOrder || 99;

      let changeType: DecisionDiffItem['changeType'] = 'UNCHANGED';
      let reason = 'Allocation status and priority remain unchanged under simulation.';

      if (baselineStatus === 'deferred' && simulatedStatus === 'approved') {
        changeType = 'NEWLY_EXECUTABLE';
        unblockedCount++;
        reason = bItem?.reproducibleExplanation?.bottleneckReason
          ? `Unblocked: ${bItem.reproducibleExplanation.bottleneckReason.replace('Deferred:', 'Resolved by')}`
          : 'Now executable due to expanded counterfactual resource capacity.';
      } else if (baselineStatus === 'approved' && simulatedStatus === 'deferred') {
        changeType = 'NEWLY_DEFERRED';
        displacedCount++;
        reason = sItem?.reproducibleExplanation?.bottleneckReason || 'Deferred under counterfactual resource or weight adjustments.';
      } else if (baselineRank !== simulatedRank) {
        changeType = 'RANK_SHIFT';
        reason = `Rank shifted from #${baselineRank} to #${simulatedRank} under simulated policy weights.`;
      }

      return {
        issueId,
        ticketNumber: issue.ticketNumber,
        title: issue.title,
        baselineStatus,
        simulatedStatus,
        baselineRank,
        simulatedRank,
        changeType,
        reason,
        actionableCounterfactual: bItem?.actionableCounterfactual || sItem?.actionableCounterfactual,
      };
    });

    // 6. Compute Resource Delta
    const budgetDelta = simulatedBudget - department.dailyBudgetLimit;
    const staffDelta = simulatedStaff - 8;
    const equipmentDelta: Record<string, number> = {};
    if (simulationInput.additionalEquipment) {
      Object.entries(simulationInput.additionalEquipment).forEach(([k, v]) => {
        if (v) equipmentDelta[k] = v;
      });
    }

    const policyDelta: Record<string, number> = {
      severityDelta: Math.round((effectiveWeights.weightSeverity - baselineWeights.weightSeverity) * 100),
      urgencyDelta: Math.round((effectiveWeights.weightUrgency - baselineWeights.weightUrgency) * 100),
      populationDelta: Math.round((effectiveWeights.weightPopulation - baselineWeights.weightPopulation) * 100),
      locationDelta: Math.round((effectiveWeights.weightLocation - baselineWeights.weightLocation) * 100),
      escalationDelta: Math.round((effectiveWeights.weightEscalation - baselineWeights.weightEscalation) * 100),
    };

    return {
      baselinePlan,
      simulatedPlan,
      decisionDiff: decisionDiff.sort((a, b) => {
        if (a.changeType === 'NEWLY_EXECUTABLE') return -1;
        if (b.changeType === 'NEWLY_EXECUTABLE') return 1;
        if (a.changeType === 'NEWLY_DEFERRED') return -1;
        if (b.changeType === 'NEWLY_DEFERRED') return 1;
        return a.simulatedRank - b.simulatedRank;
      }),
      resourceDelta: {
        budgetDelta,
        staffDelta,
        equipmentDelta,
      },
      policyDelta,
      unblockedIssuesCount: unblockedCount,
      newlyDeferredIssuesCount: displacedCount,
      simulatedAt: new Date().toISOString(),
    };
  }
}
