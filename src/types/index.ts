// ==============================================================================
// CIVICPULSE DOMAIN TYPES
// Kopargaon Municipal Council Decision Support System
// ==============================================================================

export type UserRole = 'citizen' | 'officer' | 'admin';

export type IssueStatus =
  | 'submitted'
  | 'triaged'
  | 'prioritized'
  | 'scheduled'
  | 'in_progress'
  | 'resolved'
  | 'rejected'
  | 'escalated'
  | 'pending_integrity_review'
  | 'rejected_fabricated';

export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

export type ResourceType =
  | 'staff_crew'
  | 'jetting_machine'
  | 'tipper_truck'
  | 'road_roller'
  | 'hydraulic_bucket_truck'
  | 'water_tanker'
  | 'fogging_machine'
  | 'budget_funds';

export type PlanStatus = 'draft' | 'recommended' | 'approved' | 'executed' | 'archived';

export type PlanItemStatus = 'approved' | 'deferred' | 'overridden' | 'emergency_injected';

export type NotificationChannel = 'app' | 'sms' | 'email';

export type PopulationDensity = 'very_high' | 'high' | 'medium' | 'low';

// --- Entities ---

export interface Zone {
  id: string;
  code: string; // e.g. 'WARD-01'
  name: string; // e.g. 'Godavari Ghat & Temple Area'
  wardNumber: number;
  populationDensity: PopulationDensity;
  riskFactor: number; // 1.0 to 1.5 multiplier
  coordinates?: [number, number]; // [lat, lng]
}

export interface Department {
  id: string;
  code: string; // 'WSS', 'PWD', 'SWM', 'ELEC', 'PHD'
  name: string;
  headOfficerName: string;
  contactEmail: string;
  dailyBudgetLimit: number; // INR ₹
  defaultSlaHours: number;
  isActive: boolean;
}

export interface UserProfile {
  id: string;
  role: UserRole;
  fullName: string;
  email?: string;
  phone: string;
  address?: string;
  wardId?: string;
  departmentId?: string;
  employeeId?: string;
  designation?: string;
  status?: 'active' | 'pending' | 'inactive';
  isVerified: boolean;
  avatarUrl?: string;
  lastLogin?: string;
  createdAt?: string;
}

export interface IssueCategory {
  id: string;
  departmentId: string;
  code: string;
  name: string;
  description: string;
  baseSeverityScore: number; // 0 - 100
  defaultSlaHours: number;
  estimatedCostBase: number;
  estimatedHoursBase: number;
  defaultStaffRequired: number;
  defaultEquipmentRequired?: ResourceType;
  isActive: boolean;
}

export interface PriorityWeightConfig {
  id: string;
  configName: string;
  weightSeverity: number; // e.g. 0.35
  weightUrgency: number; // e.g. 0.25
  weightPopulation: number; // e.g. 0.20
  weightLocation: number; // e.g. 0.10
  weightEscalation: number; // e.g. 0.10
  missingDataPenaltyMax: number; // e.g. 20.0
  isCurrent: boolean;
}

export interface StructuredIssueData {
  waterContaminationSuspected?: boolean;
  nearHospitalOrSchool?: boolean;
  mainRoadBlockage?: boolean;
  healthHazardRisk?: 'extreme' | 'high' | 'moderate' | 'low';
  floodRisk?: boolean;
  isPublicTransitRoute?: boolean;
  keywordsExtracted?: string[];
  extractedSummary?: string;
  intakeSource?: 'ai_llm' | 'rule_fallback';
  aiRationale?: string;
}

export interface PriorityScoreBreakdown {
  rawSeverity: number; // 0 - 100
  weightedSeverity: number;
  
  rawUrgency: number; // 0 - 100 (elapsed / SLA)
  weightedUrgency: number;
  
  rawPopulation: number; // 0 - 100
  weightedPopulation: number;
  
  rawLocationMultiplier: number; // 1.0 - 1.5
  weightedLocation: number;
  
  rawEscalationScore: number; // 0 - 100
  weightedEscalation: number;
  
  confidenceScore: number; // 0.0 - 1.0
  confidencePenaltyDeduction: number; // 0 - 20 pts deducted
  
  finalScore: number; // Final deterministic composite score (0 - 100)
}

export interface PriorityScore {
  id: string;
  issueId: string;
  configId: string;
  finalScore: number;
  priorityRank?: number;
  breakdown: PriorityScoreBreakdown;
  explanationSummary: string;
  calculatedAt: string;
}

export interface CivicIssue {
  id: string;
  ticketNumber: string; // e.g. 'KMC-2026-00104'
  citizenId?: string;
  citizenName?: string;
  citizenPhone?: string;
  categoryId: string;
  departmentId: string;
  zoneId: string;
  
  title: string;
  rawDescription: string;
  locationAddress: string;
  latitude: number;
  longitude: number;
  photoUrls: string[];
  
  structuredData: StructuredIssueData;
  affectedPopulationEstimate: number;
  confidenceScore: number; // 0.00 to 1.00
  missingAttributes: string[];
  intakeSource?: 'ai_llm' | 'rule_fallback';
  aiRationale?: string;
  mergedTicketCount?: number;
  mergedEvidenceNotes?: string[];
  
  // Field Verification Loop (Compensating action for non-smartphone/incomplete data)
  verificationMethod?: 'digital_evidence' | 'field_verification_requested' | 'phone_intake' | 'unverified';
  fieldVerificationStatus?: 'none' | 'pending' | 'verified';
  fieldVerifiedBy?: string;
  fieldVerifiedAt?: string;
  fieldVerificationNotes?: string;
  
  // Blackout Resilience & Recovery Metadata
  recoveryStatus?: 'normal' | 'recovered' | 'unconfirmed_in_flight' | 'unrecoverable_partial';
  recoveryClassification?: RecoveredRecordClassification;
  inFlightOperation?: InFlightOperation;
  recoveryNote?: string;
  lastKnownAuditTimestamp?: string;

  // Trust & Integrity Review Metadata (Challenge 2: The Bad Reading)
  integrityAssessment?: IssueIntegrityAssessment;
  perceptualPhotoHash?: string;
  decisionEligibility?: DecisionEligibility;
  trustState?: TrustState;
  
  status: IssueStatus;
  urgency: UrgencyLevel;
  
  estimatedCost: number; // INR ₹
  estimatedHours: number;
  requiredStaffCount: number;
  requiredEquipment?: ResourceType;
  
  reportedAt: string;
  slaDueAt: string;
  resolvedAt?: string;
  escalationCount: number;
  
  priorityScore?: PriorityScore;
}

export interface MunicipalResource {
  id: string;
  departmentId: string;
  resourceType: ResourceType;
  identifierCode: string; // e.g. 'KMC-JET-01'
  name: string;
  capacityDescription: string;
  isOperational: boolean;
  dailyCostRate: number;
  currentStatus: 'available' | 'allocated' | 'maintenance';
}

export interface AllocationPlanItem {
  id: string;
  planId: string;
  issueId: string;
  issue?: CivicIssue;
  allocatedResourceId?: string;
  allocatedResource?: MunicipalResource;
  itemStatus: PlanItemStatus;
  allocationMethod?: 'priority' | 'backfill' | 'override';
  priorityAtAllocation: number;
  allocatedStaffCount: number;
  allocatedHours: number;
  allocatedCost: number;
  deferralReason?: string;
  bottleneckResource?: ResourceType;
  scheduledOrder: number;
  officerOverridden?: boolean;
  officerOverrideReason?: string;
  policyVersion?: string;
  reproducibleExplanation?: ReproducibleExplanation;
  actionableCounterfactual?: ActionableCounterfactual;
}

export type SolverMode = 'greedy' | 'dp_knapsack';

export interface OptimalityComparison {
  greedyValue: number;
  greedyApprovedCount: number;
  greedyBudgetUtilized: number;
  dpValue: number;
  dpApprovedCount: number;
  dpBudgetUtilized: number;
  optimalityGapPct: number; // e.g. 98.4%
  activeSolver: SolverMode;
  candidateCount: number;
  isCapped: boolean;
  capMessage?: string;
}

export interface AllocationPlan {
  id: string;
  planCode: string; // e.g. 'PLAN-2026-08-29-SHIFT-1'
  departmentId: string;
  targetDate: string;
  shiftNumber: number;
  status: PlanStatus;
  solverMode?: SolverMode;
  optimalityComparison?: OptimalityComparison;
  
  totalBudgetCap: number;
  totalStaffAvailable: number;
  budgetUtilized: number;
  staffHoursUtilized: number;
  
  totalIssuesEvaluated: number;
  issuesApprovedCount: number;
  issuesDeferredCount: number;
  
  items: AllocationPlanItem[];
  generatedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface PriorityDecision {
  id: string;
  issueId: string;
  officerId: string;
  officerName: string;
  planId?: string;
  actionType: 'accepted_recommendation' | 'priority_override' | 'resource_reassigned' | 'status_changed' | 'emergency_injection';
  previousScore?: number;
  overriddenScore?: number;
  overrideReason: string;
  officerNotes?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  recipientId: string;
  issueId?: string;
  ticketNumber?: string;
  title: string;
  message: string;
  channel: NotificationChannel;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId?: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: 'issue' | 'plan' | 'resource' | 'weight_config' | 'decision' | 'wastewater_batch' | 'reuse_plan' | 'quality_sample' | 'flood_dispatch' | 'clarification' | 'issue_cluster';
  entityId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

// ==============================================================================
// BLACKOUT RESILIENCE & INDEPENDENT EVENT LEDGER TYPES (P0 UPGRADES)
// ==============================================================================

export type RecoveryLedgerEventType =
  | 'ISSUE_CREATED'
  | 'ISSUE_UPDATED'
  | 'PRIORITY_COMPUTED'
  | 'ALLOCATION_DECIDED'
  | 'STATUS_CHANGED'
  | 'FIELD_VERIFIED'
  | 'DISPATCH_STARTED'
  | 'DISPATCH_ACKNOWLEDGED'
  | 'NOTIFICATION_SENT'
  | 'OFFICER_OVERRIDE'
  | 'RECOVERY_STARTED'
  | 'LEDGER_VERIFIED'
  | 'PRIMARY_STORE_REBUILD_STARTED'
  | 'RECORD_RECONSTRUCTED'
  | 'RECORD_MARKED_UNCERTAIN'
  | 'OFFICER_CONFIRMED_OPERATION'
  | 'RECOVERY_COMPLETED';

export type LedgerEventType = RecoveryLedgerEventType | 'PRIORITY_RECALCULATED' | 'OFFICER_OVERRIDDEN' | 'ALLOCATION_APPROVED' | 'ALLOCATION_DEFERRED' | 'SMS_DISPATCHED' | 'IN_FLIGHT_OPERATION_STARTED' | 'IN_FLIGHT_OPERATION_COMPLETED';

export interface RecoveryLedgerEvent<T = any> {
  id: string;
  eventId: string;
  sequenceNo: number;
  issueId: string;
  operationId?: string;
  eventType: RecoveryLedgerEventType;
  payload: T;
  payloadHash: string;
  previousHash: string;
  occurredAt: string;
  actorId: string;
  operationStatus?: 'COMMITTED' | 'IN_FLIGHT' | 'ACKNOWLEDGED';
  schemaVersion: number;
}

export interface LedgerVerificationResult {
  valid: boolean;
  checkedEvents: number;
  firstBrokenSequence: number | null;
  reason: 'OK' | 'HASH_MISMATCH' | 'BROKEN_LINKAGE' | 'SEQUENCE_GAP' | 'DUPLICATE_SEQUENCE' | 'GENESIS_MISMATCH';
  brokenEventId?: string;
  details?: string;
}

export type RecoveredRecordClassification =
  | 'RECOVERED'
  | 'RECOVERED_FROM_LEDGER'
  | 'RECOVERED_BUT_UNCERTAIN'
  | 'NOT_RECOVERABLE';

export interface InFlightOperation {
  operationId: string;
  issueId: string;
  operationType: 'DISPATCH_CREW' | 'STATUS_UPDATE' | 'RESOURCE_ALLOCATION' | 'FIELD_INSPECTION';
  status: 'IN_FLIGHT' | 'CONFIRMED_COMPLETED' | 'RECOVERED_BUT_UNCERTAIN';
  startedAt: string;
  actorId: string;
  payload: any;
  ackReceived: boolean;
  uncertainReason?: string;
  officerConfirmedAt?: string;
  officerNotes?: string;
}

export interface PolicyConfig {
  policyVersion: string; // e.g. 'KMC-2026-08-30-V3'
  algorithmVersion: string; // e.g. 'ALLOCATOR-V2.1-HEURISTIC'
  weights: {
    severity: number;
    urgency: number;
    population: number;
    location: number;
    escalation: number;
  };
  normalizationVersion: string;
  createdAt: string;
}

export interface ReproducibleExplanation {
  policyVersion: string;
  algorithmVersion: string;
  scoreBreakdown: {
    severity: number;
    urgency: number;
    population: number;
    location: number;
    escalation: number;
    confidencePenalty?: number;
  };
  allocatedResources: {
    type: ResourceType;
    quantity: number;
    identifier?: string;
  }[];
  isDeferred: boolean;
  bottleneckConstraint?: 'budget' | 'staff' | 'equipment' | 'department_capacity' | 'none';
  bottleneckReason?: string;
  competingSelectedIssueIds?: string[];
  budgetConsumed?: number;
  staffConsumed?: number;
}

export interface LedgerEvent<T = any> {
  eventId: string;
  type: LedgerEventType;
  entityId: string;
  payload: T;
  timestamp: string;
  idempotencyKey: string;
  sequenceNumber: number;
  isInFlight?: boolean;
  isCorruptedOrTruncated?: boolean;
  actorName?: string;
  actorRole?: string;
}

export interface RecoveryReport {
  recoveryTimestamp: string;
  triggerSource: 'automatic_detection' | 'manual_simulation' | 'boot_integrity_check';
  totalEventsProcessed: number;
  successfulEventsReplayed: number;
  corruptedEventsCount: number;
  unrecoverableTickets: { ticketNumber?: string; eventId: string; reason: string; lastKnownDetails?: string }[];
  unconfirmedInFlightTickets: { ticketNumber: string; issueId: string; operation: string; timestamp: string }[];
  fullyRecoveredCount: number;
  recoveredIssuesCount: number;
  uncertainCount?: number;
  unrecoverableCount?: number;
  hashVerification?: LedgerVerificationResult;
  details: string[];
  acknowledgedByOfficer?: boolean;
  acknowledgedAt?: string;
}

// ==============================================================================
// CHALLENGE 2: TRUST, COORDINATION & INTEGRITY DEFENSE TYPES ("THE BAD READING")
// ==============================================================================

export type IntegrityFlagType =
  | 'duplicate_text_cluster'
  | 'reused_photo_across_reporters'
  | 'coordinated_burst'
  | 'unverified_new_reporter_burst'
  | 'inflated_population_anomaly';

export interface IntegrityEvidenceItem {
  flagType: IntegrityFlagType;
  severity: 'high' | 'critical' | 'medium';
  title: string;
  description: string;
  matchedTicketNumbers: string[];
  similarityScore?: number; // 0.0 to 1.0 (e.g. 0.94 = 94% text similarity)
  photoHashMatch?: boolean;
  burstCount?: number;
  timeWindowMinutes?: number;
  clusterCenterLocation?: string;
  reportersInvolved?: string[];
}

export interface IssueIntegrityAssessment {
  isQuarantined: boolean;
  flagCount: number;
  riskLevel: 'clean' | 'suspicious' | 'quarantined';
  flags: IntegrityEvidenceItem[];
  perceptualPhotoHash?: string;
  assessedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewDecision?: 'cleared' | 'rejected_fabricated';
  reviewNotes?: string;
}

export interface VerifiedClarification {
  id: string;
  referenceNumber: string; // e.g. 'KMC-AUTH-2026-012'
  title: string;
  category: string; // e.g. 'Water Supply', 'Sanitation', 'Public Health', 'Roads'
  wardId?: string;
  wardName?: string;
  topic: string; // e.g. 'WhatsApp Tanker Rotation Rumor'
  officialStatementEn: string;
  officialStatementMr: string;
  circulatingRumorSummary?: string;
  verifiedFactSummary: string;
  authorDepartment: string; // e.g. 'Water Supply & Sanitation Department'
  authorOfficerName: string; // e.g. 'Er. S. B. Deshmukh (Chief Engineer)'
  publishedAt: string;
  isPinned: boolean;
  viewCount: number;
  audioIvrScriptEn: string;
  audioIvrScriptMr: string;
}

export type DecisionEligibility =
  | 'ELIGIBLE'
  | 'ELIGIBLE_WITH_REVIEW'
  | 'QUARANTINED'
  | 'BLOCKED'
  | 'VERIFIED'
  | 'REJECTED';

export type TrustState =
  | 'CLEAN'
  | 'SUSPICIOUS'
  | 'HIGH_COORDINATION_RISK'
  | 'OFFICER_REVIEWED'
  | 'FABRICATED';

export type CivicClaimStatus =
  | 'UNVERIFIED'
  | 'UNDER_REVIEW'
  | 'VERIFIED_TRUE'
  | 'VERIFIED_FALSE'
  | 'PARTIALLY_TRUE'
  | 'INSUFFICIENT_EVIDENCE'
  | 'SUPERSEDED';

export interface CivicEvidence {
  id: string;
  type: 'OFFICIAL_DOCUMENT' | 'OFFICIAL_RECORD' | 'FIELD_VERIFICATION' | 'PHOTO' | 'SYSTEM_RECORD' | 'OFFICER_NOTE';
  title: string;
  source: string;
  sourceReference?: string;
  contentHash?: string;
  collectedAt?: string;
  verifiedBy?: string;
  verificationStatus: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED';
  description?: string;
  documentUrl?: string;
}

export interface CivicClaim {
  id: string;
  relatedIssueId?: string;
  title: string;
  submittedText: string;
  category: string;
  sourceType: 'CITIZEN' | 'OFFICER' | 'SYSTEM' | 'OFFICIAL_NOTICE';
  submittedBy?: string;
  status: CivicClaimStatus;
  riskScore: number;
  evidenceIds: string[];
  sourceAuthority?: string;
  sourceDocumentId?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  supersedesClaimId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfficialAnswer {
  id: string;
  version: number;
  claimId: string;
  claimSummary: string;
  verdict: CivicClaimStatus;
  authority: string;
  reviewedBy: string;
  reviewedAt: string;
  evidence: CivicEvidence[];
  policyVersion: string;
  validUntil: string;
  supersedesId?: string;
  officialStatementEn: string;
  officialStatementMr: string;
  isCitizenFacing: boolean;
  publishedAt: string;
  provenanceHash?: string;
  supersededAt?: string;
  supersededByAnswerId?: string;
}

export interface ActionableCounterfactual {
  bottleneckType: 'equipment' | 'budget' | 'staff' | 'trust_quarantine' | 'field_verification' | 'policy_rank';
  requiredChange: string;
  feasibility: 'HIGH' | 'MEDIUM' | 'POLICY_CHANGE_REQUIRED';
  simulatedOutcome: string;
}

export interface CounterfactualSimulationInput {
  departmentId: string;
  budgetCap?: number;
  availableStaff?: number;
  additionalEquipment?: Partial<Record<ResourceType, number>>;
  policyWeights?: PriorityWeightConfig;
  solverMode?: SolverMode;
}

export interface DecisionDiffItem {
  issueId: string;
  ticketNumber: string;
  title: string;
  baselineStatus: PlanItemStatus;
  simulatedStatus: PlanItemStatus;
  baselineRank: number;
  simulatedRank: number;
  changeType: 'NEWLY_EXECUTABLE' | 'NEWLY_DEFERRED' | 'RANK_SHIFT' | 'UNCHANGED';
  reason: string;
  actionableCounterfactual?: ActionableCounterfactual;
}

export interface CounterfactualSimulationResult {
  baselinePlan: AllocationPlan;
  simulatedPlan: AllocationPlan;
  decisionDiff: DecisionDiffItem[];
  resourceDelta: {
    budgetDelta: number;
    staffDelta: number;
    equipmentDelta: Record<string, number>;
  };
  policyDelta?: Record<string, number>;
  unblockedIssuesCount: number;
  newlyDeferredIssuesCount: number;
  simulatedAt: string;
}

export * from './wastewater';
export * from './floodAlert';


