import { describe, it, expect, beforeEach } from 'vitest';
import {
  CivicIssue,
  Department,
  MunicipalResource,
  PriorityWeightConfig,
  IssueCategory,
  Zone,
} from '../src/types';
import { CoordinationDetectionService } from '../src/services/coordinationDetectionService';
import { ClaimVerificationService, SEED_EVIDENCE, SEED_CLAIMS } from '../src/services/claimVerificationService';
import { AllocationEngine, ACTIVE_POLICY_VERSION } from '../src/services/allocationEngine';
import { CounterfactualEngine } from '../src/services/counterfactualEngine';
import { RecoveryLedgerService } from '../src/services/recoveryLedgerService';

const MOCK_DEPARTMENT: Department = {
  id: 'dept-wss-01',
  name: 'Water Supply & Sanitation',
  code: 'WSS',
  icon: 'Droplets',
  color: 'blue',
  dailyBudgetLimit: 30000,
  defaultShiftHours: 8,
  slaComplianceTargetPct: 95,
  slaWarningHours: 12,
  operationalHeadName: 'Er. S. B. Deshmukh',
  operationalHeadPhone: '+91-98220-11111',
};

const MOCK_CATEGORY: IssueCategory = {
  id: 'cat-water-contam',
  name: 'Water Contamination / Sewer Leak',
  departmentId: 'dept-wss-01',
  defaultSeverity: 95,
  defaultSlaHours: 12,
  color: 'red',
  suggestedEquipment: 'jetting_machine',
  description: 'Contamination in drinking water pipeline',
  baseCost: 18500,
  defaultStaffCount: 4,
};

const MOCK_ZONE: Zone = {
  id: 'zone-ward-4',
  name: 'Ward 4 - Civil Hospital Area',
  code: 'WARD-04',
  criticalWardRiskFactor: 1.45,
  wardOfficerName: 'R. K. Patil',
  wardOfficerPhone: '+91-98220-22222',
  wardOfficeAddress: 'Station Road, Kopargaon',
  totalVoters: 8400,
  historicalIssueCount: 142,
};

const BASELINE_WEIGHTS: PriorityWeightConfig = {
  id: 'weight-v3',
  configName: 'Standard Municipal Policy V3',
  weightSeverity: 0.35,
  weightUrgency: 0.25,
  weightPopulation: 0.20,
  weightLocation: 0.10,
  weightEscalation: 0.10,
  missingDataPenaltyMax: 20,
  updatedAt: '2026-08-30T00:00:00.000Z',
};

describe('P1 Bad Reading & Counterfactual Upgrades', () => {
  beforeEach(() => {
    ClaimVerificationService.init();
  });

  // -------------------------------------------------------------------------
  // 1. Bad Reading & Coordination Detection
  // -------------------------------------------------------------------------
  it('1. Legitimate unique complaint remains ELIGIBLE', () => {
    const legitimateIssue: CivicIssue = {
      id: 'iss-legit-001',
      ticketNumber: 'KMC-2026-90001',
      citizenId: 'user-unique-citizen-1',
      citizenName: 'Sunil Jagtap',
      citizenPhone: '+91-94230-12345',
      categoryId: MOCK_CATEGORY.id,
      departmentId: MOCK_DEPARTMENT.id,
      zoneId: MOCK_ZONE.id,
      title: 'Individual tap leak in residential backyard',
      rawDescription: 'Small domestic valve leak behind our house on Tilak Road.',
      locationAddress: 'Plot 14, Tilak Road, Kopargaon',
      latitude: 19.885,
      longitude: 74.475,
      photoUrls: ['https://storage.civicpulse.org/unique-photo-901.jpg'],
      affectedPopulationEstimate: 6,
      confidenceScore: 1.0,
      status: 'reported',
      urgency: 'low',
      estimatedCost: 1500,
      estimatedHours: 2,
      requiredStaffCount: 1,
      reportedAt: new Date().toISOString(),
      slaDueAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      escalationCount: 1,
      decisionEligibility: 'ELIGIBLE',
      trustState: 'CLEAN',
    };

    const assessment = CoordinationDetectionService.evaluateIssueIntegrity(legitimateIssue, []);
    expect(assessment.isQuarantined).toBe(false);
    expect(assessment.riskLevel).toBe('clean');
    expect(assessment.flags.length).toBe(0);
  });

  it('2. Coordinated fake complaint cluster triggers HIGH_COORDINATION_RISK and QUARANTINED', () => {
    const clusterLocation = 'Opposite Rival Food Stall, Shivaji Chowk';
    const sharedPhoto = 'https://storage.civicpulse.org/reused-smear-photo.jpg';
    const sharedText = 'Severe garbage dumping and terrible foul smell outside the food stall. Health hazard urgent!';

    const baseExisting: CivicIssue = {
      id: 'iss-smear-1',
      ticketNumber: 'KMC-2026-80001',
      citizenId: 'sybil-account-1',
      citizenName: 'Anonymous 1',
      citizenPhone: '+91-98000-00001',
      categoryId: MOCK_CATEGORY.id,
      departmentId: MOCK_DEPARTMENT.id,
      zoneId: MOCK_ZONE.id,
      title: 'Foul smell at food stall',
      rawDescription: sharedText,
      locationAddress: clusterLocation,
      latitude: 19.891,
      longitude: 74.481,
      photoUrls: [sharedPhoto],
      perceptualPhotoHash: CoordinationDetectionService.computePerceptualHash(sharedPhoto),
      affectedPopulationEstimate: 200,
      confidenceScore: 1.0,
      status: 'reported',
      urgency: 'high',
      estimatedCost: 5000,
      estimatedHours: 4,
      requiredStaffCount: 2,
      reportedAt: new Date().toISOString(),
      slaDueAt: new Date().toISOString(),
      escalationCount: 1,
    };

    const incomingCandidate: CivicIssue = {
      id: 'iss-smear-2',
      ticketNumber: 'KMC-2026-80002',
      citizenId: 'sybil-account-2',
      citizenName: 'Anonymous 2',
      citizenPhone: '+91-98000-00002',
      categoryId: MOCK_CATEGORY.id,
      departmentId: MOCK_DEPARTMENT.id,
      zoneId: MOCK_ZONE.id,
      title: 'Foul smell at food stall competitor',
      rawDescription: sharedText,
      locationAddress: clusterLocation,
      latitude: 19.8911,
      longitude: 74.4811,
      photoUrls: [sharedPhoto],
      perceptualPhotoHash: CoordinationDetectionService.computePerceptualHash(sharedPhoto),
      affectedPopulationEstimate: 250,
      confidenceScore: 1.0,
      status: 'reported',
      urgency: 'high',
      estimatedCost: 5000,
      estimatedHours: 4,
      requiredStaffCount: 2,
      reportedAt: new Date().toISOString(),
      slaDueAt: new Date().toISOString(),
      escalationCount: 1,
    };

    const assessment = CoordinationDetectionService.evaluateIssueIntegrity(incomingCandidate, [baseExisting]);
    expect(assessment.isQuarantined).toBe(true);
    expect(assessment.riskLevel).toBe('quarantined');
    expect(assessment.flags.some((f) => f.flagType === 'duplicate_text_cluster')).toBe(true);
    expect(assessment.flags.some((f) => f.flagType === 'reused_photo_across_reporters')).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 2. Pre-Allocation Integrity Gating (P1 Tasks 7, 8, 17)
  // -------------------------------------------------------------------------
  it('3. High-priority issue marked QUARANTINED is strictly excluded from Knapsack Allocation', () => {
    const highPriorityQuarantinedIssue: CivicIssue = {
      id: 'iss-quarantined-99',
      ticketNumber: 'KMC-2026-99999',
      citizenId: 'sybil-user-99',
      citizenName: 'Sybil Bot',
      categoryId: MOCK_CATEGORY.id,
      departmentId: MOCK_DEPARTMENT.id,
      zoneId: MOCK_ZONE.id,
      title: 'Manipulated Urgent Sewer Burst',
      rawDescription: 'Fake severe burst to steal jetting machine from rival ward',
      locationAddress: 'Shivaji Chowk',
      latitude: 19.89,
      longitude: 74.48,
      photoUrls: [],
      affectedPopulationEstimate: 4000,
      confidenceScore: 1.0,
      status: 'pending_integrity_review',
      urgency: 'critical',
      estimatedCost: 15000,
      estimatedHours: 4,
      requiredStaffCount: 3,
      requiredEquipment: 'jetting_machine',
      reportedAt: new Date().toISOString(),
      slaDueAt: new Date().toISOString(),
      escalationCount: 1,
      priorityScore: {
        issueId: 'iss-quarantined-99',
        finalScore: 98.5,
        breakdown: {
          weightedSeverity: 35,
          weightedUrgency: 25,
          weightedPopulation: 20,
          weightedLocation: 10,
          weightedEscalation: 8.5,
          confidencePenaltyDeduction: 0,
        },
        calculatedAt: new Date().toISOString(),
      },
      decisionEligibility: 'QUARANTINED',
      trustState: 'HIGH_COORDINATION_RISK',
    };

    const legitimateIssue: CivicIssue = {
      id: 'iss-legit-002',
      ticketNumber: 'KMC-2026-00101',
      citizenId: 'real-citizen-1',
      citizenName: 'Dr. Deshmukh',
      categoryId: MOCK_CATEGORY.id,
      departmentId: MOCK_DEPARTMENT.id,
      zoneId: MOCK_ZONE.id,
      title: 'Civil Hospital Water Contamination',
      rawDescription: 'Contaminated pipeline near Civil Hospital OPD',
      locationAddress: 'Civil Hospital Road',
      latitude: 19.88,
      longitude: 74.47,
      photoUrls: [],
      affectedPopulationEstimate: 4200,
      confidenceScore: 1.0,
      status: 'prioritized',
      urgency: 'critical',
      estimatedCost: 18500,
      estimatedHours: 4,
      requiredStaffCount: 4,
      requiredEquipment: 'jetting_machine',
      reportedAt: new Date().toISOString(),
      slaDueAt: new Date().toISOString(),
      escalationCount: 1,
      priorityScore: {
        issueId: 'iss-legit-002',
        finalScore: 94.2,
        breakdown: {
          weightedSeverity: 35,
          weightedUrgency: 25,
          weightedPopulation: 20,
          weightedLocation: 10,
          weightedEscalation: 4.2,
          confidencePenaltyDeduction: 0,
        },
        calculatedAt: new Date().toISOString(),
      },
      decisionEligibility: 'ELIGIBLE',
      trustState: 'CLEAN',
    };

    const resources: MunicipalResource[] = [
      {
        id: 'res-jet-01',
        departmentId: MOCK_DEPARTMENT.id,
        resourceType: 'jetting_machine',
        identifierCode: 'KMC-JET-01',
        name: 'Jetting Suction Machine 01',
        capacityDescription: 'Primary High-Pressure Jetting Unit',
        isOperational: true,
        dailyCostRate: 6000,
        currentStatus: 'available',
      },
    ];

    // Run Knapsack Allocator
    const result = AllocationEngine.generatePlan({
      department: MOCK_DEPARTMENT,
      candidateIssues: [highPriorityQuarantinedIssue, legitimateIssue],
      resources,
      budgetCap: 30000,
      availableStaff: 8,
    });

    // The quarantined issue with 98.5 score MUST NOT be approved
    const approvedIds = result.plan.items.filter((i) => i.itemStatus === 'approved').map((i) => i.issueId);
    expect(approvedIds).toContain('iss-legit-002');
    expect(approvedIds).not.toContain('iss-quarantined-99');
  });

  // -------------------------------------------------------------------------
  // 3. Official Answers Provenance & Versioning (P1 Tasks 4 & 5)
  // -------------------------------------------------------------------------
  it('4. Official answers store full provenance and support versioned supersession', () => {
    // 1. Submit a false rumor claim
    const claim = ClaimVerificationService.submitClaim({
      title: 'WhatsApp Tanker Contamination Rumor in Ward 4',
      submittedText: 'Viral claim that municipal water tanker MH-17-AZ-1001 was filled from untreated canal water.',
      category: 'Water Supply',
    });

    // 2. Publish Official Answer V1 backed by lab test evidence
    const answerV1 = ClaimVerificationService.publishOfficialAnswer({
      claimId: claim.id,
      verdict: 'VERIFIED_FALSE',
      authority: 'KMC Water Supply & Sanitation Department',
      reviewedBy: 'Er. S. B. Deshmukh (Executive Engineer)',
      evidenceIds: ['EVID-WSS-002'],
      policyVersion: 'KMC-WSS-2026-V4',
      officialStatementEn: 'FALSE. Water tanker was loaded from certified Godavari WTP with 0.5 ppm residual chlorine.',
      officialStatementMr: 'खोटे. पाण्याचा टँकर प्रमाणित गोदावरी जलशुद्धीकरण केंद्रातून भरला गेला आहे.',
    });

    expect(answerV1.version).toBe(1);
    expect(answerV1.verdict).toBe('VERIFIED_FALSE');
    expect(answerV1.evidence.length).toBe(1);
    expect(answerV1.provenanceHash).toBeDefined();

    // 3. Supersede with Answer V2 when new operational details emerge
    const answerV2 = ClaimVerificationService.supersedeOfficialAnswer({
      existingAnswerId: answerV1.id,
      newVerdict: 'PARTIALLY_TRUE',
      newEvidenceIds: ['EVID-WSS-002', 'EVID-WSS-003'],
      reviewedBy: 'Dr. V. M. Shinde (Chief Microbiologist)',
      newPolicyVersion: 'KMC-WSS-2026-V4.1',
      newStatementEn: 'PARTIALLY TRUE: Tanker water was 100% clean, but hose nozzle had localized sediment. Replaced on 30 Aug.',
      newStatementMr: 'अंशतः सत्य: टँकरमधील पाणी स्वच्छ होते, मात्र नळीच्या नोझलमध्ये गाळ आढळल्याने ती बदलण्यात आली.',
      reason: 'Field inspection revealed defective discharge hose nozzle.',
    });

    expect(answerV2.version).toBe(2);
    expect(answerV2.supersedesId).toBe(answerV1.id);
    expect(answerV2.verdict).toBe('PARTIALLY_TRUE');

    // 4. Verify historical answer is marked superseded
    const allAnswers = ClaimVerificationService.getAllOfficialAnswers();
    const oldAns = allAnswers.find((a) => a.id === answerV1.id);
    expect(oldAns?.supersededByAnswerId).toBe(answerV2.id);
    expect(oldAns?.supersededAt).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // 4. Counterfactual Decision Simulator (P1 Tasks 11, 12, 13, 14, 15, 16)
  // -------------------------------------------------------------------------
  it('5. Counterfactual simulation unblocks bottlenecked issue when +1 Jetting Machine is added without mutating production state', () => {
    const issueA: CivicIssue = {
      id: 'iss-a-001',
      ticketNumber: 'KMC-2026-00101',
      citizenId: 'cit-1',
      citizenName: 'Citizen A',
      categoryId: MOCK_CATEGORY.id,
      departmentId: MOCK_DEPARTMENT.id,
      zoneId: MOCK_ZONE.id,
      title: 'Water Contamination Civil Hospital',
      rawDescription: 'Contamination',
      locationAddress: 'Hospital Road',
      latitude: 19.88,
      longitude: 74.47,
      photoUrls: [],
      affectedPopulationEstimate: 4200,
      confidenceScore: 1.0,
      status: 'prioritized',
      urgency: 'critical',
      estimatedCost: 18500,
      estimatedHours: 4,
      requiredStaffCount: 4,
      requiredEquipment: 'jetting_machine',
      reportedAt: new Date().toISOString(),
      slaDueAt: new Date().toISOString(),
      escalationCount: 1,
      priorityScore: {
        issueId: 'iss-a-001',
        finalScore: 94.2,
        breakdown: {
          weightedSeverity: 35,
          weightedUrgency: 25,
          weightedPopulation: 20,
          weightedLocation: 10,
          weightedEscalation: 4.2,
          confidencePenaltyDeduction: 0,
        },
        calculatedAt: new Date().toISOString(),
      },
      decisionEligibility: 'ELIGIBLE',
    };

    const issueB: CivicIssue = {
      id: 'iss-b-002',
      ticketNumber: 'KMC-2026-00102',
      citizenId: 'cit-2',
      citizenName: 'Citizen B',
      categoryId: MOCK_CATEGORY.id,
      departmentId: MOCK_DEPARTMENT.id,
      zoneId: MOCK_ZONE.id,
      title: 'Severe Sewer Overflow at Subhash Chowk',
      rawDescription: 'Sewer overflowing',
      locationAddress: 'Subhash Chowk',
      latitude: 19.89,
      longitude: 74.48,
      photoUrls: [],
      affectedPopulationEstimate: 1200,
      confidenceScore: 1.0,
      status: 'prioritized',
      urgency: 'high',
      estimatedCost: 12000,
      estimatedHours: 3,
      requiredStaffCount: 3,
      requiredEquipment: 'jetting_machine',
      reportedAt: new Date().toISOString(),
      slaDueAt: new Date().toISOString(),
      escalationCount: 1,
      priorityScore: {
        issueId: 'iss-b-002',
        finalScore: 78.5,
        breakdown: {
          weightedSeverity: 30,
          weightedUrgency: 20,
          weightedPopulation: 15,
          weightedLocation: 8,
          weightedEscalation: 5.5,
          confidencePenaltyDeduction: 0,
        },
        calculatedAt: new Date().toISOString(),
      },
      decisionEligibility: 'ELIGIBLE',
    };

    // Only 1 baseline Jetting Machine available
    const baseResources: MunicipalResource[] = [
      {
        id: 'res-jet-01',
        departmentId: MOCK_DEPARTMENT.id,
        resourceType: 'jetting_machine',
        identifierCode: 'KMC-JET-01',
        name: 'Jetting Machine 01',
        capacityDescription: 'Primary Jetting Unit',
        isOperational: true,
        dailyCostRate: 6000,
        currentStatus: 'available',
      },
    ];

    // Run Simulation with +1 Jetting Machine & +₹10,000 budget
    const simResult = CounterfactualEngine.simulate({
      department: MOCK_DEPARTMENT,
      candidateIssues: [issueA, issueB],
      baseResources,
      categories: [MOCK_CATEGORY],
      zones: [MOCK_ZONE],
      baselineWeights: BASELINE_WEIGHTS,
      simulationInput: {
        departmentId: MOCK_DEPARTMENT.id,
        budgetCap: 40000,
        availableStaff: 8,
        additionalEquipment: { jetting_machine: 1 },
      },
    });

    // In Baseline: Issue A is approved, Issue B is deferred
    expect(simResult.baselinePlan.items.find((i) => i.issueId === 'iss-a-001')?.itemStatus).toBe('approved');
    expect(simResult.baselinePlan.items.find((i) => i.issueId === 'iss-b-002')?.itemStatus).toBe('deferred');

    // In Simulation: Both Issue A and Issue B are approved!
    expect(simResult.simulatedPlan.items.find((i) => i.issueId === 'iss-b-002')?.itemStatus).toBe('approved');

    // Decision Diff should record Issue B as NEWLY_EXECUTABLE
    const diffB = simResult.decisionDiff.find((d) => d.issueId === 'iss-b-002');
    expect(diffB?.changeType).toBe('NEWLY_EXECUTABLE');
    expect(simResult.unblockedIssuesCount).toBe(1);

    // Actionable Counterfactual should correctly specify the bottleneck solution
    expect(diffB?.actionableCounterfactual?.bottleneckType).toBe('equipment');
  });

  it('6. Policy weight counterfactual simulation safely normalizes weights and identifies rank shifts without modifying production policy', () => {
    const rawSimWeights = {
      weightSeverity: 60,
      weightUrgency: 40,
      weightPopulation: 0,
      weightLocation: 0,
      weightEscalation: 0,
      missingDataPenaltyMax: 20,
    };

    const normalized = CounterfactualEngine.normalizeWeights(rawSimWeights);
    const sum =
      normalized.weightSeverity +
      normalized.weightUrgency +
      normalized.weightPopulation +
      normalized.weightLocation +
      normalized.weightEscalation;

    expect(Math.abs(sum - 1.0)).toBeLessThanOrEqual(0.01);
    expect(BASELINE_WEIGHTS.weightSeverity).toBe(0.35); // Production weights unchanged
  });
});
