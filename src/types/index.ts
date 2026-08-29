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
  | 'escalated';

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
  recoveryNote?: string;
  lastKnownAuditTimestamp?: string;
  
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
  overrideReason?: string;
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
  entityType: 'issue' | 'plan' | 'resource' | 'weight_config' | 'decision' | 'wastewater_batch' | 'reuse_plan' | 'quality_sample' | 'flood_dispatch';
  entityId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

// ==============================================================================
// BLACKOUT RESILIENCE & INDEPENDENT EVENT LEDGER TYPES
// ==============================================================================

export type LedgerEventType =
  | 'ISSUE_CREATED'
  | 'ISSUE_UPDATED'
  | 'STATUS_CHANGED'
  | 'PRIORITY_RECALCULATED'
  | 'FIELD_VERIFIED'
  | 'OFFICER_OVERRIDDEN'
  | 'ALLOCATION_APPROVED'
  | 'ALLOCATION_DEFERRED'
  | 'SMS_DISPATCHED'
  | 'IN_FLIGHT_OPERATION_STARTED'
  | 'IN_FLIGHT_OPERATION_COMPLETED';

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
  details: string[];
  acknowledgedByOfficer?: boolean;
  acknowledgedAt?: string;
}

export * from './wastewater';
export * from './floodAlert';


