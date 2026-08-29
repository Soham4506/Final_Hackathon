import { CivicIssue, AllocationPlanItem, MunicipalResource } from '../types';

export interface ComparisonFactor {
  factor: string;
  issueAValue: string | number;
  issueBValue: string | number;
  winner: 'A' | 'B' | 'TIE';
  impactDescription: string;
}

export interface ComparativeExplanation {
  higherRankedTicket: string;
  lowerRankedTicket: string;
  scoreDifference: number;
  primaryReasons: string[];
  factors: ComparisonFactor[];
  summary: string;
}

export class ExplainabilityService {
  /**
   * Generates a side-by-side comparative justification between two civic issues
   */
  public static compareIssues(
    issueA: CivicIssue,
    issueB: CivicIssue
  ): ComparativeExplanation {
    const scoreA = issueA.priorityScore?.finalScore ?? 0;
    const scoreB = issueB.priorityScore?.finalScore ?? 0;
    const isHigherA = scoreA >= scoreB;

    const top = isHigherA ? issueA : issueB;
    const bottom = isHigherA ? issueB : issueA;
    const scoreDiff = Math.abs(Math.round((scoreA - scoreB) * 10) / 10);

    const factors: ComparisonFactor[] = [];
    const primaryReasons: string[] = [];

    // 1. Severity Comparison
    const sevA = issueA.priorityScore?.breakdown.rawSeverity ?? 50;
    const sevB = issueB.priorityScore?.breakdown.rawSeverity ?? 50;
    if (sevA !== sevB) {
      const win = sevA > sevB ? 'A' : 'B';
      factors.push({
        factor: 'Severity / Public Safety Hazard',
        issueAValue: `${sevA}/100`,
        issueBValue: `${sevB}/100`,
        winner: win,
        impactDescription: `${win === 'A' ? issueA.title : issueB.title} carries higher health or infrastructure risk.`,
      });
      if ((isHigherA && win === 'A') || (!isHigherA && win === 'B')) {
        primaryReasons.push(`Higher public risk level (${Math.max(sevA, sevB)} vs ${Math.min(sevA, sevB)})`);
      }
    }

    // 2. Urgency & SLA
    const urgA = issueA.priorityScore?.breakdown.rawUrgency ?? 50;
    const urgB = issueB.priorityScore?.breakdown.rawUrgency ?? 50;
    if (urgA !== urgB) {
      const win = urgA > urgB ? 'A' : 'B';
      factors.push({
        factor: 'SLA Elapsed Urgency',
        issueAValue: `${urgA}% SLA used`,
        issueBValue: `${urgB}% SLA used`,
        winner: win,
        impactDescription: `${win === 'A' ? issueA.ticketNumber : issueB.ticketNumber} is closer to or past its departmental SLA deadline.`,
      });
      if ((isHigherA && win === 'A') || (!isHigherA && win === 'B')) {
        primaryReasons.push(`Closer to SLA breach deadline (${Math.max(urgA, urgB)}% elapsed)`);
      }
    }

    // 3. Population Impact
    const popA = issueA.affectedPopulationEstimate;
    const popB = issueB.affectedPopulationEstimate;
    if (popA !== popB) {
      const win = popA > popB ? 'A' : 'B';
      factors.push({
        factor: 'Affected Population Scale',
        issueAValue: `${popA.toLocaleString()} people`,
        issueBValue: `${popB.toLocaleString()} people`,
        winner: win,
        impactDescription: `Directly impacts ${Math.max(popA, popB).toLocaleString()} residents compared to ${Math.min(popA, popB).toLocaleString()}.`,
      });
      if ((isHigherA && win === 'A') || (!isHigherA && win === 'B')) {
        primaryReasons.push(`Greater population impact (${Math.max(popA, popB).toLocaleString()} citizens affected)`);
      }
    }

    // 4. Repeat Complaints / Escalation
    const escA = issueA.escalationCount;
    const escB = issueB.escalationCount;
    if (escA !== escB) {
      const win = escA > escB ? 'A' : 'B';
      factors.push({
        factor: 'Repeat Escalations',
        issueAValue: `${escA} reports`,
        issueBValue: `${escB} reports`,
        winner: win,
        impactDescription: `Multiple independent citizen reports received in this geographic cluster.`,
      });
    }

    // 5. Confidence Score
    const confA = issueA.confidenceScore;
    const confB = issueB.confidenceScore;
    if (confA !== confB) {
      const win = confA > confB ? 'A' : 'B';
      factors.push({
        factor: 'Information Confidence',
        issueAValue: `${Math.round(confA * 100)}% verified`,
        issueBValue: `${Math.round(confB * 100)}% verified`,
        winner: win,
        impactDescription: `${win === 'A' ? issueA.ticketNumber : issueB.ticketNumber} has complete photo/location evidence, avoiding uncertainty penalties.`,
      });
    }

    const summary = `${top.ticketNumber} (${top.title}) is prioritized +${scoreDiff} points above ${bottom.ticketNumber} primarily due to: ${primaryReasons.join(', ') || 'overall composite priority weighting'}.`;

    return {
      higherRankedTicket: top.ticketNumber,
      lowerRankedTicket: bottom.ticketNumber,
      scoreDifference: scoreDiff,
      primaryReasons,
      factors,
      summary,
    };
  }

  /**
   * Generates a precise, transparent deferral explanation for issues that could not fit today's shift
   */
  public static generateDeferralExplanation(
    item: AllocationPlanItem,
    availableBudget: number,
    availableStaff: number,
    availableEquipment: MunicipalResource[]
  ): string {
    const issue = item.issue;
    if (!issue) return 'Deferred due to resource constraints.';

    if (item.bottleneckResource) {
      return `Deferred: Required equipment (${item.bottleneckResource.replace('_', ' ')}) is fully allocated to higher-priority emergency work orders in this shift.`;
    }

    if (issue.estimatedCost > availableBudget) {
      return `Deferred: Estimated cost (₹${issue.estimatedCost.toLocaleString()}) exceeds remaining shift budget (₹${availableBudget.toLocaleString()}).`;
    }

    if (issue.requiredStaffCount > availableStaff) {
      return `Deferred: Required crew size (${issue.requiredStaffCount} technicians) exceeds available unassigned staff (${availableStaff}).`;
    }

    return `Deferred: Scheduled for next shift queue based on rank #${item.scheduledOrder}.`;
  }

  /**
   * Generates reassuring, clear citizen-facing status update
   */
  public static generateCitizenExplanation(issue: CivicIssue): {
    statusHeadline: string;
    detail: string;
    expectedAction: string;
  } {
    const score = issue.priorityScore?.finalScore ?? 50;

    switch (issue.status) {
      case 'submitted':
        return {
          statusHeadline: 'Issue Awaiting Automatic Verification',
          detail: 'Your report has been received by Kopargaon Municipal Council. Our intake engine is validating the location coordinates and category parameters.',
          expectedAction: 'Triaged within 30 minutes.',
        };
      case 'prioritized':
        return {
          statusHeadline: `Prioritized (Score: ${score}/100)`,
          detail: score >= 80 
            ? 'Classified as Critical Civic Emergency. High priority assigned due to public health/safety impact.'
            : 'Classified in active municipal queue. Evaluated against current departmental resources and scheduled shift plans.',
          expectedAction: `Department SLA target: ${new Date(issue.slaDueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}`,
        };
      case 'scheduled':
        return {
          statusHeadline: 'Work Order Dispatched for Current Shift',
          detail: `Approved in Daily Municipal Action Plan. Work crew (${issue.requiredStaffCount} staff + ${issue.requiredEquipment?.replace('_', ' ') || 'standard kit'}) assigned for execution.`,
          expectedAction: 'Field crew en route to location.',
        };
      case 'in_progress':
        return {
          statusHeadline: 'Work In Progress on Site',
          detail: 'Municipal technical staff is actively carrying out rectification work at the location.',
          expectedAction: 'Completion and inspection within scheduled work window.',
        };
      case 'resolved':
        return {
          statusHeadline: 'Issue Resolved & Inspected',
          detail: 'Rectification work completed and verified by the Ward Officer.',
          expectedAction: 'Closed. Thank you for contributing to Kopargaon.',
        };
      default:
        return {
          statusHeadline: 'In Active Queue',
          detail: 'Municipal council is monitoring and queueing resources.',
          expectedAction: 'Awaiting shift dispatch.',
        };
    }
  }
}
