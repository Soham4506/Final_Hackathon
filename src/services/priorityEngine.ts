import { 
  CivicIssue, 
  IssueCategory, 
  Zone, 
  PriorityWeightConfig, 
  PriorityScore, 
  PriorityScoreBreakdown 
} from '../types';

/**
 * DETERMINISTIC PRIORITY ENGINE
 * 
 * Computes transparent, reproducible civic issue priority scores based on:
 * 1. Severity (Risk to human life, health, infrastructure)
 * 2. Urgency (Time elapsed relative to departmental SLA)
 * 3. Affected Population Scale (Logarithmic impact curve)
 * 4. Location & Critical Zone Multiplier (Hospital/School/Market/Transit corridors)
 * 5. Escalation Multiplier (Repeat citizen reports)
 * 6. Confidence Penalty (Missing data deduction to avoid false certainty)
 */
export class PriorityEngine {
  /**
   * Calculate deterministic priority score for a given issue
   */
  public static calculateScore(
    issue: CivicIssue,
    category: IssueCategory,
    zone: Zone,
    config: PriorityWeightConfig,
    currentTime: Date = new Date()
  ): PriorityScore {
    // 1. SEVERITY COMPONENT (0 - 100)
    let rawSeverity = category.baseSeverityScore;
    
    // Structured risk adjustments
    if (issue.structuredData.healthHazardRisk === 'extreme') rawSeverity += 10;
    else if (issue.structuredData.healthHazardRisk === 'high') rawSeverity += 5;
    
    if (issue.structuredData.waterContaminationSuspected) rawSeverity += 8;
    if (issue.structuredData.nearHospitalOrSchool) rawSeverity += 6;
    if (issue.structuredData.mainRoadBlockage) rawSeverity += 5;
    
    // Cap raw severity between 0 and 100
    rawSeverity = Math.min(100, Math.max(0, rawSeverity));
    const weightedSeverity = rawSeverity * config.weightSeverity;

    // 2. URGENCY COMPONENT (0 - 100, Time decay relative to SLA)
    const reportedTime = new Date(issue.reportedAt).getTime();
    const currentMillis = currentTime.getTime();
    const elapsedHours = Math.max(0, (currentMillis - reportedTime) / (1000 * 60 * 60));
    const slaHours = Math.max(1, category.defaultSlaHours);
    
    // Calculate urgency as elapsed percentage of SLA
    const slaRatio = elapsedHours / slaHours;
    const rawUrgency = Math.min(100, Math.round(slaRatio * 100));
    const weightedUrgency = rawUrgency * config.weightUrgency;

    // 3. AFFECTED POPULATION COMPONENT (0 - 100, Logarithmic scaling)
    // 1 person -> ~15, 100 people -> ~53, 1000 people -> ~80, 5000+ people -> 100
    const popCount = Math.max(1, issue.affectedPopulationEstimate || 50);
    const rawPopulation = Math.min(
      100,
      Math.max(10, Math.round((Math.log10(popCount + 1) / Math.log10(5000)) * 100))
    );
    const weightedPopulation = rawPopulation * config.weightPopulation;

    // 4. LOCATION & ZONE MULTIPLIER (0 - 100, Normalized from zone risk 1.0 - 1.5)
    // Risk factor 1.0 = 0 pts, 1.25 = 50 pts, 1.50 = 100 pts
    const riskFactor = zone.riskFactor || 1.0;
    const rawLocationMultiplier = Math.min(100, Math.max(0, Math.round(((riskFactor - 1.0) / 0.5) * 100)));
    const weightedLocation = rawLocationMultiplier * config.weightLocation;

    // 5. ESCALATION / REPEAT COMPONENT (0 - 100)
    // 1 report = 20 pts, 3 reports = 60 pts, 5+ reports = 100 pts
    const escCount = Math.max(1, issue.escalationCount || 1);
    const rawEscalationScore = Math.min(100, Math.round(Math.min(5, escCount) * 20));
    const weightedEscalation = rawEscalationScore * config.weightEscalation;

    // 6. CONFIDENCE PENALTY (Deduction of 0 to missingDataPenaltyMax)
    // If confidence is 0.7 (e.g. missing photo/location precision), deduct 30% of max penalty
    const confidence = Math.min(1.0, Math.max(0.1, issue.confidenceScore ?? 1.0));
    const missingRatio = 1.0 - confidence;
    const confidencePenaltyDeduction = Math.round(missingRatio * config.missingDataPenaltyMax * 10) / 10;

    // COMPOSITE DETERMINISTIC SCORE
    const sumWeightedComponents = 
      weightedSeverity + 
      weightedUrgency + 
      weightedPopulation + 
      weightedLocation + 
      weightedEscalation;

    const rawFinalScore = sumWeightedComponents - confidencePenaltyDeduction;
    const finalScore = Math.min(100, Math.max(0, Math.round(rawFinalScore * 10) / 10));

    // Explanation generation
    const explanationSummary = PriorityEngine.generateExplanationText(
      issue,
      category,
      zone,
      finalScore,
      rawSeverity,
      slaRatio,
      confidencePenaltyDeduction
    );

    const breakdown: PriorityScoreBreakdown = {
      rawSeverity,
      weightedSeverity: Math.round(weightedSeverity * 10) / 10,
      rawUrgency,
      weightedUrgency: Math.round(weightedUrgency * 10) / 10,
      rawPopulation,
      weightedPopulation: Math.round(weightedPopulation * 10) / 10,
      rawLocationMultiplier,
      weightedLocation: Math.round(weightedLocation * 10) / 10,
      rawEscalationScore,
      weightedEscalation: Math.round(weightedEscalation * 10) / 10,
      confidenceScore: confidence,
      confidencePenaltyDeduction,
      finalScore,
    };

    return {
      id: `score-${issue.id}`,
      issueId: issue.id,
      configId: config.id,
      finalScore,
      breakdown,
      explanationSummary,
      calculatedAt: currentTime.toISOString(),
    };
  }

  /**
   * Generates a clear, explainable summary for human municipal officers and citizens
   */
  private static generateExplanationText(
    issue: CivicIssue,
    category: IssueCategory,
    zone: Zone,
    finalScore: number,
    rawSeverity: number,
    slaRatio: number,
    penalty: number
  ): string {
    const drivers: string[] = [];

    if (rawSeverity >= 85) {
      drivers.push(`Critical severity risk (${category.name})`);
    }
    if (slaRatio >= 0.8) {
      drivers.push(`Urgent SLA window (${Math.round(slaRatio * 100)}% elapsed)`);
    }
    if (issue.affectedPopulationEstimate >= 1000) {
      drivers.push(`High population impact (~${issue.affectedPopulationEstimate.toLocaleString()} citizens)`);
    }
    if (zone.riskFactor >= 1.35) {
      drivers.push(`Critical zone infrastructure (${zone.name})`);
    }
    if (issue.escalationCount >= 3) {
      drivers.push(`Multiple citizen escalations (${issue.escalationCount} reports)`);
    }

    let summary = `Score ${finalScore}/100. Key priority drivers: ${drivers.slice(0, 3).join(', ') || 'Standard service request'}.`;
    
    if (penalty > 0) {
      summary += ` Note: Score adjusted with -${penalty} confidence penalty due to ${issue.missingAttributes?.join(', ') || 'incomplete field data'}.`;
    }

    return summary;
  }
}
