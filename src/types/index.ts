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
  phone: string;
  address?: string;
  wardId?: string;
  departmentId?: string;
  employeeId?: string;
  isVerified: boolean;
  avatarUrl?: string;
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

export interface AllocationPlan {
  id: string;
  planCode: string; // e.g. 'PLAN-2026-08-29-SHIFT-1'
  departmentId: string;
  targetDate: string;
  shiftNumber: number;
  status: PlanStatus;
  
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
  entityType: 'issue' | 'plan' | 'resource' | 'weight_config' | 'decision';
  entityId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}
