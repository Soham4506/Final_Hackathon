import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  CivicIssue, 
  Zone, 
  Department, 
  IssueCategory, 
  PriorityWeightConfig, 
  MunicipalResource, 
  AllocationPlan, 
  UserProfile, 
  UserRole, 
  AuditLog, 
  NotificationItem,
  IssueStatus,
  TreatmentPlant,
  WasteStreamSource,
  AgriculturalCommandZone,
  WastewaterBatch,
  QualityCheckSample,
  FarmerBooking,
  WaterReusePlan,
  CircularEconomyMetrics,
  WastewaterWorkflowStage,
  WaterQualityParameters,
  DistributionMethod,
  UpstreamDamTelemetry,
  ZoneFloodProfile,
  EmergencyResourceInventory,
  FloodDispatchOrder,
  ZoneDispatchPlanItem,
  DamDischargeAlertLevel,
  SolverMode,
} from '../types';
import { 
  INITIAL_ZONES, 
  INITIAL_DEPARTMENTS, 
  INITIAL_CATEGORIES, 
  INITIAL_WEIGHT_CONFIG, 
  INITIAL_RESOURCES, 
  INITIAL_ISSUES, 
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS
} from '../data/mockData';
import {
  INITIAL_TREATMENT_PLANTS,
  INITIAL_WASTE_SOURCES,
  INITIAL_COMMAND_ZONES,
  INITIAL_WASTEWATER_BATCHES,
  INITIAL_QUALITY_SAMPLES,
  INITIAL_FARMER_BOOKINGS,
  INITIAL_WATER_REUSE_PLANS,
  INITIAL_CIRCULAR_METRICS,
} from '../data/wastewaterMockData';
import {
  INITIAL_DAM_TELEMETRY,
  INITIAL_ZONE_FLOOD_PROFILES,
  INITIAL_EMERGENCY_RESOURCES,
} from '../data/floodMockData';
import { PriorityEngine } from '../services/priorityEngine';
import { AllocationEngine, ResourceDeficitReport } from '../services/allocationEngine';
import { AIIntakeParser } from '../services/aiIntakeParser';
import { MultiStrategyEngine, AllocationStrategy, StrategyComparisonMetric } from '../services/multiStrategyEngine';
import { WaterQualityEngine } from '../services/waterQualityEngine';
import { ReuseAllocationEngine } from '../services/reuseAllocationEngine';
import { FloodPriorityEngine } from '../services/floodPriorityEngine';
import { Language, DICTIONARY, Translations } from '../services/localizationService';
import { SMSAlertService } from '../services/smsAlertService';
import { EventLogService } from '../services/eventLogService';
import { IntegrityCheckService } from '../services/integrityCheckService';
import { RecoveryService } from '../services/recoveryService';
import { PrimaryStoreService } from '../services/primaryStoreService';
import { RecoveryLedgerService } from '../services/recoveryLedgerService';
import { RecoveryReport, LedgerEvent, LedgerEventType, VerifiedClarification } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CoordinationDetectionService } from '../services/coordinationDetectionService';


const DEFAULT_GUEST_USER: UserProfile = {
  id: 'usr-guest',
  role: 'citizen',
  fullName: 'Citizen User',
  phone: '',
  isVerified: false,
};

interface CivicContextType {
  // Localization & Language
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;

  // Authentication & RBAC
  isAuthenticated: boolean;
  userRole: UserRole;
  currentUser: UserProfile;
  login: (role: UserRole, userProfile: UserProfile) => void;
  logout: () => void;
  setUserRole: (role: UserRole) => void;
  setCurrentUser: (user: UserProfile) => void;

  // Supabase Live Status
  isSupabaseLive: boolean;

  // Circular Wastewater-to-Agriculture State
  treatmentPlants: TreatmentPlant[];
  wasteSources: WasteStreamSource[];
  commandZones: AgriculturalCommandZone[];
  wastewaterBatches: WastewaterBatch[];
  qualitySamples: QualityCheckSample[];
  farmerBookings: FarmerBooking[];
  waterReusePlans: WaterReusePlan[];
  circularMetrics: CircularEconomyMetrics;

  // Circular Wastewater Actions
  advanceWastewaterStage: (batchId: string, nextStage?: WastewaterWorkflowStage) => void;
  recordQualityCheck: (batchId: string, customParams?: Partial<WaterQualityParameters>) => QualityCheckSample;
  generateWaterReusePlan: (batchId: string, preferredDistribution?: DistributionMethod) => WaterReusePlan;
  approveWaterReusePlan: (planId: string, officerNotes?: string) => void;
  submitFarmerBooking: (booking: Omit<FarmerBooking, 'id' | 'bookingNumber' | 'status' | 'submittedAt'>) => FarmerBooking;
  reprocessBatch: (batchId: string) => void;
  createWastewaterBatch: (wardIds: string[], volumeKLD: number, plantId: string) => WastewaterBatch;

  // Flood Alert & Emergency Resource Dispatch State
  damTelemetry: UpstreamDamTelemetry;
  zoneFloodProfiles: ZoneFloodProfile[];
  emergencyInventory: EmergencyResourceInventory;
  floodDispatchOrders: FloodDispatchOrder[];

  // Flood Dispatch Actions
  updateDamDischarge: (dischargeCusecs: number, rainfallMmHr?: number) => void;
  generateFloodDispatchPlan: (officerNotes?: string) => FloodDispatchOrder;
  approveFloodDispatchOrder: (orderId: string) => void;

  // Master Data
  zones: Zone[];
  departments: Department[];
  categories: IssueCategory[];
  weightConfig: PriorityWeightConfig;
  setWeightConfig: (config: PriorityWeightConfig) => void;

  // Operational State
  issues: CivicIssue[];
  resources: MunicipalResource[];
  activePlans: AllocationPlan[];
  auditLogs: AuditLog[];
  notifications: NotificationItem[];

  // Action Methods
  submitIssue: (data: {
    title: string;
    description: string;
    address: string;
    zoneId: string;
    categoryId?: string;
    latitude?: number;
    longitude?: number;
    photoUrls?: string[];
    affectedPopulation?: number;
    citizenPhone?: string;
    citizenName?: string;
    verificationMethod?: 'digital_evidence' | 'field_verification_requested' | 'phone_intake' | 'unverified';
  }) => Promise<CivicIssue>;

  updateIssueStatus: (issueId: string, newStatus: IssueStatus, officerNotes?: string) => void;
  
  verifyIssueOnSite: (issueId: string, officerNotes?: string) => void;

  overridePriority: (
    issueId: string, 
    overriddenScore: number, 
    overrideReason: string, 
    officerNotes?: string
  ) => void;

  generateAllocationPlan: (
    departmentId: string, 
    budgetCap?: number, 
    availableStaff?: number,
    strategy?: AllocationStrategy,
    solverMode?: SolverMode
  ) => { plan: AllocationPlan; deficitReport: ResourceDeficitReport };

  getStrategyComparisons: (
    departmentId: string,
    budgetCap: number,
    availableStaff: number
  ) => StrategyComparisonMetric[];

  approveAllocationPlan: (planId: string, officerNotes?: string) => void;

  updateResource: (resourceId: string, updates: Partial<MunicipalResource>) => void;

  recalculateAllPriorities: () => void;

  markNotificationAsRead: (notificationId: string) => void;

  resetAllDataToDefaults: () => void;

  // Blackout Resilience & Disaster Recovery (P0 Upgrade)
  recoveryReport: RecoveryReport | null;
  isRecoveryModeActive: boolean;
  isBlackoutSimulating: boolean;
  acknowledgeRecoveryReport: () => void;
  simulateBlackoutChaos: () => Promise<RecoveryReport>;
  confirmUnconfirmedInFlightIssue: (issueId: string, notes?: string) => void;
  resetJudgeDemo: () => Promise<void>;
  triggerPrimaryStoreFailure: () => { destroyedAt: string; priorRecordCount: number };
  executeIndependentRecovery: () => Promise<RecoveryReport>;

  // Challenge 2: Trust, Coordination & Integrity Gate ("The Bad Reading")
  clarifications: VerifiedClarification[];
  addVerifiedClarification: (data: Omit<VerifiedClarification, 'id' | 'referenceNumber' | 'publishedAt' | 'viewCount'>) => VerifiedClarification;
  clearIntegrityReview: (issueId: string, officerNotes?: string) => void;
  rejectFabricatedIssue: (issueId: string, officerReason: string) => void;
  simulateCoordinatedSmearAttack: (targetAddress?: string) => void;
}

const CivicContext = createContext<CivicContextType | undefined>(undefined);

// Helper for local storage retrieval
const getStored = <T,>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(`civicpulse_${key}`);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};

const isValidUuid = (val?: string): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export const CivicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => getStored('lang', 'en'));
  const t = DICTIONARY[language];

  const [isSupabaseLive, setIsSupabaseLive] = useState<boolean>(isSupabaseConfigured);

  // Authentication State: ALWAYS DEFAULT TO FALSE IF NO ACTIVE SESSION
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return getStored<boolean>('is_auth', false);
  });

  const [userRole, setUserRole] = useState<UserRole>(() => {
    return getStored<UserRole>('user_role', 'citizen');
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    return getStored<UserProfile>('current_user', DEFAULT_GUEST_USER);
  });

  const [zones] = useState<Zone[]>(INITIAL_ZONES);
  const [departments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [categories] = useState<IssueCategory[]>(INITIAL_CATEGORIES);
  const [weightConfig, setWeightConfig] = useState<PriorityWeightConfig>(() =>
    getStored('weight_config', INITIAL_WEIGHT_CONFIG)
  );

  const [resources, setResources] = useState<MunicipalResource[]>(() =>
    getStored('resources', INITIAL_RESOURCES)
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() =>
    getStored('audit_logs', INITIAL_AUDIT_LOGS)
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    getStored('notifications', INITIAL_NOTIFICATIONS)
  );
  const [activePlans, setActivePlans] = useState<AllocationPlan[]>(() =>
    getStored('active_plans', [])
  );

  // Circular Wastewater State
  const [treatmentPlants, setTreatmentPlants] = useState<TreatmentPlant[]>(() =>
    getStored('treatment_plants', INITIAL_TREATMENT_PLANTS)
  );
  const [wasteSources, setWasteSources] = useState<WasteStreamSource[]>(() =>
    getStored('waste_sources', INITIAL_WASTE_SOURCES)
  );
  const [commandZones, setCommandZones] = useState<AgriculturalCommandZone[]>(() =>
    getStored('command_zones', INITIAL_COMMAND_ZONES)
  );
  const [wastewaterBatches, setWastewaterBatches] = useState<WastewaterBatch[]>(() =>
    getStored('wastewater_batches', INITIAL_WASTEWATER_BATCHES)
  );
  const [qualitySamples, setQualitySamples] = useState<QualityCheckSample[]>(() =>
    getStored('quality_samples', INITIAL_QUALITY_SAMPLES)
  );
  const [farmerBookings, setFarmerBookings] = useState<FarmerBooking[]>(() =>
    getStored('farmer_bookings', INITIAL_FARMER_BOOKINGS)
  );
  const [waterReusePlans, setWaterReusePlans] = useState<WaterReusePlan[]>(() =>
    getStored('water_reuse_plans', INITIAL_WATER_REUSE_PLANS)
  );
  const [circularMetrics, setCircularMetrics] = useState<CircularEconomyMetrics>(() =>
    getStored('circular_metrics', INITIAL_CIRCULAR_METRICS)
  );

  // Flood Alert & Emergency Resource Dispatch State
  const [damTelemetry, setDamTelemetry] = useState<UpstreamDamTelemetry>(() =>
    getStored('dam_telemetry', INITIAL_DAM_TELEMETRY)
  );
  const [zoneFloodProfiles, setZoneFloodProfiles] = useState<ZoneFloodProfile[]>(() =>
    getStored('zone_flood_profiles', INITIAL_ZONE_FLOOD_PROFILES)
  );
  const [emergencyInventory, setEmergencyInventory] = useState<EmergencyResourceInventory>(() =>
    getStored('emergency_inventory', INITIAL_EMERGENCY_RESOURCES)
  );
  const [floodDispatchOrders, setFloodDispatchOrders] = useState<FloodDispatchOrder[]>(() =>
    getStored('flood_dispatch_orders', [])
  );

  // Blackout Resilience & Disaster Recovery State
  const [recoveryReport, setRecoveryReport] = useState<RecoveryReport | null>(() =>
    getStored<RecoveryReport | null>('recovery_report', null)
  );
  const [isRecoveryModeActive, setIsRecoveryModeActive] = useState<boolean>(() =>
    getStored<boolean>('is_recovery_mode', false)
  );
  const [isBlackoutSimulating, setIsBlackoutSimulating] = useState<boolean>(false);

  // Challenge 2: Verified Clarifications Repository
  const [clarifications, setClarifications] = useState<VerifiedClarification[]>(() =>
    CoordinationDetectionService.getStoredClarifications()
  );

  // Issues initialization with primary store health inspection
  const [issues, setIssues] = useState<CivicIssue[]>(() => {
    const primaryRead = PrimaryStoreService.readPrimaryIssues();
    const baseIssues = (primaryRead.success && primaryRead.data && primaryRead.data.length > 0)
      ? primaryRead.data
      : INITIAL_ISSUES;
    return baseIssues.map((issue) => {
      const cat = INITIAL_CATEGORIES.find((c) => c.id === issue.categoryId) || INITIAL_CATEGORIES[0];
      const zone = INITIAL_ZONES.find((z) => z.id === issue.zoneId) || INITIAL_ZONES[0];
      const score = PriorityEngine.calculateScore(issue, cat, zone, INITIAL_WEIGHT_CONFIG);
      return {
        ...issue,
        priorityScore: issue.priorityScore || score,
      };
    });
  });

  const acknowledgeRecoveryReport = () => {
    setIsRecoveryModeActive(false);
    if (recoveryReport) {
      const updatedReport = {
        ...recoveryReport,
        acknowledgedByOfficer: true,
        acknowledgedAt: new Date().toISOString(),
      };
      setRecoveryReport(updatedReport);
      localStorage.setItem('civicpulse_recovery_report', JSON.stringify(updatedReport));
    }
    localStorage.setItem('civicpulse_is_recovery_mode', JSON.stringify(false));
  };

  const resetJudgeDemo = async () => {
    PrimaryStoreService.restorePrimaryStore(INITIAL_ISSUES);
    await RecoveryLedgerService.seedDemoLedger(INITIAL_ISSUES);
    setIssues(INITIAL_ISSUES);
    setRecoveryReport(null);
    setIsRecoveryModeActive(false);
    localStorage.removeItem('civicpulse_recovery_report');
    localStorage.removeItem('civicpulse_is_recovery_mode');
    console.log('🔄 [CivicContext] Judge Demo state deterministically reset.');
  };

  const triggerPrimaryStoreFailure = () => {
    const res = PrimaryStoreService.triggerDestructivePrimaryFailure();
    setIssues([]); // Live in-memory reflection of destroyed primary store
    return res;
  };

  const executeIndependentRecovery = async (): Promise<RecoveryReport> => {
    setIsBlackoutSimulating(true);
    try {
      const { report, recoveredIssues } = await RecoveryService.executeRecovery(
        'manual_simulation',
        categories,
        zones,
        weightConfig
      );

      setIssues(recoveredIssues);
      setRecoveryReport(report);
      setIsRecoveryModeActive(true);
      localStorage.setItem('civicpulse_recovery_report', JSON.stringify(report));
      localStorage.setItem('civicpulse_is_recovery_mode', JSON.stringify(true));

      const log: AuditLog = {
        id: `log-recovery-${Date.now()}`,
        actorName: currentUser.fullName,
        actorRole: currentUser.role,
        action: 'CHAOS_BLACKOUT_RECOVERY_EXECUTED',
        entityType: 'decision',
        details: {
          recoveredCount: report.recoveredIssuesCount,
          uncertainCount: report.uncertainCount,
          unrecoverableCount: report.unrecoverableCount,
          timestamp: report.recoveryTimestamp,
        },
        createdAt: new Date().toISOString(),
      };
      setAuditLogs((prev) => [log, ...prev]);

      return report;
    } finally {
      setIsBlackoutSimulating(false);
    }
  };

  const confirmUnconfirmedInFlightIssue = async (issueId: string, notes: string = 'Re-verified by Municipal Officer') => {
    setIssues((prev) =>
      prev.map((iss) => {
        if (iss.id === issueId) {
          return {
            ...iss,
            recoveryStatus: 'recovered',
            recoveryNote: `Re-verified and confirmed: ${notes}`,
          };
        }
        return iss;
      })
    );

    // Append authoritative completion events to RecoveryLedgerService (P0 Task 5 & 8)
    await RecoveryLedgerService.appendEvent(
      'DISPATCH_ACKNOWLEDGED',
      issueId,
      { notes, confirmedAt: new Date().toISOString() },
      {
        operationId: 'OP-8841',
        actorId: currentUser.fullName,
        operationStatus: 'ACKNOWLEDGED',
      }
    );

    await RecoveryLedgerService.appendEvent(
      'OFFICER_CONFIRMED_OPERATION',
      issueId,
      { notes, officerName: currentUser.fullName },
      { actorId: currentUser.fullName }
    );

    if (recoveryReport) {
      const updated = {
        ...recoveryReport,
        unconfirmedInFlightTickets: recoveryReport.unconfirmedInFlightTickets.filter((t) => t.issueId !== issueId),
        uncertainCount: Math.max(0, (recoveryReport.uncertainCount || 1) - 1),
      };
      setRecoveryReport(updated);
      localStorage.setItem('civicpulse_recovery_report', JSON.stringify(updated));
    }
  };

  const simulateBlackoutChaos = async (): Promise<RecoveryReport> => {
    triggerPrimaryStoreFailure();
    await new Promise((r) => setTimeout(r, 600));
    return executeIndependentRecovery();
  };

  // Login method: Sets actual user profile immediately and persists session
  const login = (role: UserRole, userProfile: UserProfile) => {
    setUserRole(role);
    setCurrentUser(userProfile);
    setIsAuthenticated(true);
    localStorage.setItem('civicpulse_is_auth', JSON.stringify(true));
    localStorage.setItem('civicpulse_user_role', JSON.stringify(role));
    localStorage.setItem('civicpulse_current_user', JSON.stringify(userProfile));
  };

  // Logout method: Clears authentication gate and Supabase session
  const logout = async () => {
    // Sign out from Supabase to invalidate the session token
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut error:', err);
      }
    }
    setIsAuthenticated(false);
    setUserRole('citizen');
    setCurrentUser(DEFAULT_GUEST_USER);
    localStorage.setItem('civicpulse_is_auth', JSON.stringify(false));
    localStorage.removeItem('civicpulse_current_user');
    localStorage.removeItem('civicpulse_user_role');
  };

  // Hydrate auth session and data from Supabase on load if configured
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // 1. Map and fetch profile helper matching SDDS architecture
    const fetchUserProfile = async (userId: string, authUser?: any): Promise<UserProfile | null> => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        const rawRole = profile?.role || authUser?.user_metadata?.role || 'citizen';
        const role = (rawRole as UserRole);

        return {
          id: userId,
          role,
          fullName: profile?.full_name || authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'Citizen User',
          email: profile?.email || authUser?.email,
          phone: profile?.phone || authUser?.user_metadata?.phone || '',
          address: profile?.address || 'Kopargaon',
          wardId: profile?.ward_id || authUser?.user_metadata?.ward_id,
          departmentId: profile?.department_id || authUser?.user_metadata?.department_id,
          employeeId: profile?.employee_id || authUser?.user_metadata?.employee_id,
          designation: profile?.designation,
          status: profile?.status || 'active',
          isVerified: profile?.is_verified ?? true,
          avatarUrl: profile?.avatar_url,
          createdAt: profile?.created_at,
          lastLogin: profile?.last_login,
        };
      } catch (err) {
        console.warn('fetchUserProfile error:', err);
        return null;
      }
    };

    // 2. Restore session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const userObj = await fetchUserProfile(session.user.id, session.user);
        if (userObj) {
          if (userObj.status === 'inactive') {
            await supabase.auth.signOut();
            return;
          }
          setUserRole(userObj.role);
          setCurrentUser(userObj);
          setIsAuthenticated(true);
          localStorage.setItem('civicpulse_is_auth', JSON.stringify(true));
          localStorage.setItem('civicpulse_user_role', JSON.stringify(userObj.role));
          localStorage.setItem('civicpulse_current_user', JSON.stringify(userObj));
        }
      }
    });

    // 3. Listen for Auth State Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setIsAuthenticated(false);
          setUserRole('citizen');
          setCurrentUser(DEFAULT_GUEST_USER);
          localStorage.setItem('civicpulse_is_auth', JSON.stringify(false));
          localStorage.removeItem('civicpulse_current_user');
          localStorage.removeItem('civicpulse_user_role');
        } else if (session?.user) {
          const userObj = await fetchUserProfile(session.user.id, session.user);
          if (userObj) {
            setUserRole(userObj.role);
            setCurrentUser(userObj);
            setIsAuthenticated(true);
            localStorage.setItem('civicpulse_is_auth', JSON.stringify(true));
            localStorage.setItem('civicpulse_user_role', JSON.stringify(userObj.role));
            localStorage.setItem('civicpulse_current_user', JSON.stringify(userObj));
          }
        }
      }
    );

    // 4. Real-time Profile Updates (SDDS RBAC Real-time sync)
    let profileChannel: any = null;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user?.id) return;
      profileChannel = supabase
        .channel(`koparniti-profile-watch-${session.user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${session.user.id}`,
          },
          async (payload: any) => {
            const updated = payload.new;
            if (updated?.status === 'inactive') {
              await supabase.auth.signOut();
              setIsAuthenticated(false);
              setCurrentUser(DEFAULT_GUEST_USER);
            } else if (updated) {
              const freshUser = await fetchUserProfile(updated.id, session.user);
              if (freshUser) {
                setUserRole(freshUser.role);
                setCurrentUser(freshUser);
                localStorage.setItem('civicpulse_user_role', JSON.stringify(freshUser.role));
                localStorage.setItem('civicpulse_current_user', JSON.stringify(freshUser));
              }
            }
          }
        )
        .subscribe();
    });

    // 3. Load operational data from Supabase
    const loadSupabaseData = async () => {
      try {
        const { data: dbIssues, error: issuesErr } = await supabase.from('issues').select('*');
        if (!issuesErr && dbIssues && dbIssues.length > 0) {
          setIssues(
            dbIssues.map((dbIss: any) => {
              const cat = categories.find((c) => c.id === dbIss.category_id) || categories[0];
              const zone = zones.find((z) => z.id === dbIss.zone_id) || zones[0];
              const issueObj: CivicIssue = {
                id: dbIss.id,
                ticketNumber: dbIss.ticket_number,
                citizenId: dbIss.citizen_id,
                categoryId: dbIss.category_id,
                departmentId: dbIss.department_id,
                zoneId: dbIss.zone_id,
                title: dbIss.title,
                rawDescription: dbIss.raw_description,
                locationAddress: dbIss.location_address,
                latitude: Number(dbIss.latitude),
                longitude: Number(dbIss.longitude),
                photoUrls: dbIss.photo_urls || [],
                structuredData: dbIss.structured_data || {},
                affectedPopulationEstimate: dbIss.affected_population_estimate,
                confidenceScore: Number(dbIss.confidence_score),
                missingAttributes: dbIss.missing_attributes || [],
                status: dbIss.status,
                urgency: dbIss.urgency,
                estimatedCost: Number(dbIss.estimated_cost),
                estimatedHours: Number(dbIss.estimated_hours),
                requiredStaffCount: dbIss.required_staff_count,
                requiredEquipment: dbIss.required_equipment,
                reportedAt: dbIss.reported_at,
                slaDueAt: dbIss.sla_due_at,
                resolvedAt: dbIss.resolved_at,
                escalationCount: dbIss.escalation_count,
              };
              issueObj.priorityScore = PriorityEngine.calculateScore(issueObj, cat, zone, weightConfig);
              return issueObj;
            })
          );
          setIsSupabaseLive(true);
        }

        const { data: dbLogs } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
        if (dbLogs && dbLogs.length > 0) {
          setAuditLogs(
            dbLogs.map((l: any) => ({
              id: l.id,
              actorId: l.actor_id,
              actorName: l.actor_id || 'Officer',
              actorRole: l.actor_role || 'officer',
              action: l.action,
              entityType: l.entity_type,
              entityId: l.entity_id,
              details: l.details || {},
              createdAt: l.created_at,
            }))
          );
        }
      } catch (err) {
        console.warn('Supabase fetch failed, operating in local mode:', err);
        setIsSupabaseLive(false);
      }
    };

    loadSupabaseData();

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sync state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('civicpulse_lang', JSON.stringify(language));
      localStorage.setItem('civicpulse_is_auth', JSON.stringify(isAuthenticated));
      localStorage.setItem('civicpulse_user_role', JSON.stringify(userRole));
      localStorage.setItem('civicpulse_current_user', JSON.stringify(currentUser));
      localStorage.setItem('civicpulse_issues', JSON.stringify(issues));
      IntegrityCheckService.recordChecksum(issues);
      localStorage.setItem('civicpulse_recovery_report', JSON.stringify(recoveryReport));
      localStorage.setItem('civicpulse_is_recovery_mode', JSON.stringify(isRecoveryModeActive));
      localStorage.setItem('civicpulse_resources', JSON.stringify(resources));
      localStorage.setItem('civicpulse_audit_logs', JSON.stringify(auditLogs));
      localStorage.setItem('civicpulse_notifications', JSON.stringify(notifications));
      localStorage.setItem('civicpulse_active_plans', JSON.stringify(activePlans));
      localStorage.setItem('civicpulse_weight_config', JSON.stringify(weightConfig));
      localStorage.setItem('civicpulse_treatment_plants', JSON.stringify(treatmentPlants));
      localStorage.setItem('civicpulse_waste_sources', JSON.stringify(wasteSources));
      localStorage.setItem('civicpulse_command_zones', JSON.stringify(commandZones));
      localStorage.setItem('civicpulse_wastewater_batches', JSON.stringify(wastewaterBatches));
      localStorage.setItem('civicpulse_quality_samples', JSON.stringify(qualitySamples));
      localStorage.setItem('civicpulse_water_reuse_plans', JSON.stringify(waterReusePlans));
      localStorage.setItem('civicpulse_circular_metrics', JSON.stringify(circularMetrics));
      localStorage.setItem('civicpulse_dam_telemetry', JSON.stringify(damTelemetry));
      localStorage.setItem('civicpulse_zone_flood_profiles', JSON.stringify(zoneFloodProfiles));
      localStorage.setItem('civicpulse_emergency_inventory', JSON.stringify(emergencyInventory));
      localStorage.setItem('civicpulse_flood_dispatch_orders', JSON.stringify(floodDispatchOrders));
    } catch {
      // ignore
    }
  }, [
    language,
    isAuthenticated,
    userRole,
    currentUser,
    issues,
    recoveryReport,
    isRecoveryModeActive,
    resources,
    auditLogs,
    notifications,
    activePlans,
    weightConfig,
    treatmentPlants,
    wasteSources,
    commandZones,
    wastewaterBatches,
    qualitySamples,
    farmerBookings,
    waterReusePlans,
    circularMetrics,
    damTelemetry,
    zoneFloodProfiles,
    emergencyInventory,
    floodDispatchOrders,
  ]);

  // Liveness Storage Integrity Monitor (polled every 3.5s + storage event)
  useEffect(() => {
    const checkIntegrity = async () => {
      if (isBlackoutSimulating) return;
      const health = PrimaryStoreService.checkHealth();
      if (!health.isHealthy) {
        console.warn('⚠️ Runtime storage integrity violation detected! Reconstructing from independent ledger...');
        const { report, recoveredIssues } = await RecoveryService.executeRecovery(
          'automatic_detection',
          categories,
          zones,
          weightConfig
        );
        setIssues(recoveredIssues);
        setRecoveryReport(report);
        setIsRecoveryModeActive(true);
      }
    };

    const interval = setInterval(checkIntegrity, 3500);
    window.addEventListener('storage', checkIntegrity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkIntegrity);
    };
  }, [isBlackoutSimulating, categories, zones, weightConfig]);

  // Recalculate all scores
  const recalculateAllPriorities = () => {
    setIssues((prev) =>
      prev.map((issue) => {
        const cat = categories.find((c) => c.id === issue.categoryId) || categories[0];
        const zone = zones.find((z) => z.id === issue.zoneId) || zones[0];
        const score = PriorityEngine.calculateScore(issue, cat, zone, weightConfig);
        return {
          ...issue,
          priorityScore: score,
        };
      })
    );

    const log: AuditLog = {
      id: `log-${Date.now()}`,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'RECALCULATED_ALL_PRIORITIES',
      entityType: 'weight_config',
      details: { configName: weightConfig.configName, weights: weightConfig },
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);

    if (isSupabaseConfigured) {
      supabase.from('audit_logs').insert([{
        action: 'RECALCULATED_ALL_PRIORITIES',
        entity_type: 'weight_config',
        actor_role: currentUser.role,
        details: { weights: weightConfig },
      }]).then();
    }
  };

  // Submit issue with AI extraction & Duplicate Clustering
  const submitIssue = async (data: {
    title: string;
    description: string;
    address: string;
    zoneId: string;
    categoryId?: string;
    latitude?: number;
    longitude?: number;
    photoUrls?: string[];
    affectedPopulation?: number;
    citizenPhone?: string;
    citizenName?: string;
  }): Promise<CivicIssue> => {
    const hasPhotos = Boolean(data.photoUrls && data.photoUrls.length > 0);
    const hasPreciseLocation = Boolean(data.latitude && data.longitude);

    const parsed = await AIIntakeParser.parseComplaintAsync(
      data.title,
      data.description,
      hasPhotos,
      hasPreciseLocation
    );

    const chosenCatId = data.categoryId || parsed.categoryIdSuggested;
    const cat = categories.find((c) => c.id === chosenCatId) || categories[0];
    const dept = departments.find((d) => d.id === cat.departmentId) || departments[0];
    const zone = zones.find((z) => z.id === data.zoneId) || zones[0];

    const targetLat = data.latitude || zone.coordinates?.[0] || 19.8900;
    const targetLng = data.longitude || zone.coordinates?.[1] || 74.4800;
    const now = new Date();
    const seventyTwoHoursAgo = now.getTime() - 72 * 3600 * 1000;

    // -------------------------------------------------------------
    // DUPLICATE CLUSTERING PASS (150m radius + same category + 72h window)
    // -------------------------------------------------------------
    const existingDuplicate = issues.find((iss) => {
      if (iss.categoryId !== cat.id) return false;
      if (iss.status === 'resolved' || iss.status === 'rejected') return false;

      const reportedTime = new Date(iss.reportedAt).getTime();
      if (reportedTime < seventyTwoHoursAgo) return false;

      const distMeters = calculateDistanceMeters(targetLat, targetLng, iss.latitude, iss.longitude);
      return distMeters <= 150;
    });

    if (existingDuplicate) {
      const updatedEscalation = existingDuplicate.escalationCount + 1;
      const mergedPhotos = Array.from(new Set([...existingDuplicate.photoUrls, ...(data.photoUrls || [])]));
      const newMergedCount = (existingDuplicate.mergedTicketCount || 1) + 1;
      const updatedEvidenceNotes = [
        ...(existingDuplicate.mergedEvidenceNotes || []),
        `[${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] Citizen Report: "${data.description.slice(0, 100)}..."`,
      ];

      const mergedIssue: CivicIssue = {
        ...existingDuplicate,
        escalationCount: updatedEscalation,
        mergedTicketCount: newMergedCount,
        photoUrls: mergedPhotos,
        mergedEvidenceNotes: updatedEvidenceNotes,
      };

      const recomputedScore = PriorityEngine.calculateScore(mergedIssue, cat, zone, weightConfig, now);
      mergedIssue.priorityScore = recomputedScore;

      setIssues((prev) => prev.map((iss) => (iss.id === existingDuplicate.id ? mergedIssue : iss)));

      const mergeLog: AuditLog = {
        id: `log-merge-${Date.now()}`,
        actorName: currentUser.fullName,
        actorRole: currentUser.role,
        action: 'ISSUE_MERGED_DUPLICATE',
        entityType: 'issue',
        entityId: existingDuplicate.id,
        details: {
          ticketNumber: existingDuplicate.ticketNumber,
          escalationCount: updatedEscalation,
          mergedReportTitle: data.title,
          clusterRadiusMeters: 150,
          newPriorityScore: recomputedScore.finalScore,
        },
        createdAt: now.toISOString(),
      };
      setAuditLogs((prev) => [mergeLog, ...prev]);

      // Independent Append-Only Event Ledger
      EventLogService.appendEvent(
        'ISSUE_UPDATED',
        existingDuplicate.id,
        mergedIssue,
        `merge-${existingDuplicate.id}-${updatedEscalation}`,
        currentUser.fullName,
        currentUser.role
      );

      const notif: NotificationItem = {
        id: `notif-merge-${Date.now()}`,
        recipientId: currentUser.id,
        issueId: existingDuplicate.id,
        ticketNumber: existingDuplicate.ticketNumber,
        title: `Merged with Existing Issue (${existingDuplicate.ticketNumber})`,
        message: `Your report was merged with an existing municipal ticket (${existingDuplicate.ticketNumber}) — ${updatedEscalation} total reports for this cluster. Priority updated to ${recomputedScore.finalScore}/100.`,
        channel: 'app',
        isRead: false,
        createdAt: now.toISOString(),
      };
      setNotifications((prev) => [notif, ...prev]);

      // Automated SMS Alert for Merged Issue
      SMSAlertService.sendLifecycleSms(
        mergedIssue,
        'submitted',
        data.citizenPhone || currentUser.phone,
        language
      );

      if (isSupabaseConfigured) {
        supabase
          .from('issues')
          .update({
            escalation_count: updatedEscalation,
            photo_urls: mergedPhotos,
          })
          .eq('id', existingDuplicate.id)
          .then();
      }

      return mergedIssue;
    }

    // -------------------------------------------------------------
    // CREATE NEW TICKET
    // -------------------------------------------------------------
    const ticketNumber = `KMC-2026-${String(Math.floor(10000 + Math.random() * 90000)).slice(0, 5)}`;
    const slaDueAt = new Date(now.getTime() + cat.defaultSlaHours * 3600 * 1000).toISOString();
    const effectivePhone = data.citizenPhone || currentUser.phone || '';
    const effectiveName = data.citizenName || currentUser.fullName || 'Citizen User';

    const newIssueId = generateUUID();
    const newIssue: CivicIssue = {
      id: newIssueId,
      ticketNumber,
      citizenId: currentUser.id,
      citizenName: effectiveName,
      citizenPhone: effectivePhone,
      categoryId: cat.id,
      departmentId: dept.id,
      zoneId: zone.id,
      title: data.title,
      rawDescription: data.description,
      locationAddress: data.address,
      latitude: targetLat,
      longitude: targetLng,
      photoUrls: data.photoUrls || [],
      structuredData: parsed.structuredData,
      affectedPopulationEstimate: data.affectedPopulation || parsed.affectedPopulationEstimate,
      confidenceScore: parsed.confidenceScore,
      missingAttributes: parsed.missingAttributes,
      intakeSource: parsed.intakeSource,
      aiRationale: parsed.aiRationale,
      mergedTicketCount: 1,
      mergedEvidenceNotes: [],
      status: 'prioritized',
      urgency: parsed.suggestedUrgency,
      estimatedCost: parsed.estimatedCost,
      estimatedHours: parsed.estimatedHours,
      requiredStaffCount: parsed.requiredStaffCount,
      requiredEquipment: parsed.requiredEquipment,
      reportedAt: now.toISOString(),
      slaDueAt,
      escalationCount: 1,
    };

    const score = PriorityEngine.calculateScore(newIssue, cat, zone, weightConfig, now);
    newIssue.priorityScore = score;

    // Challenge 2: Coordination & Sybil Smear Gate ("The Bad Reading")
    const integrityAssessment = CoordinationDetectionService.evaluateIssueIntegrity(newIssue, issues);
    newIssue.integrityAssessment = integrityAssessment;
    newIssue.perceptualPhotoHash = integrityAssessment.perceptualPhotoHash;
    newIssue.decisionEligibility = integrityAssessment.isQuarantined ? 'QUARANTINED' : 'ELIGIBLE';
    newIssue.trustState = integrityAssessment.isQuarantined ? 'HIGH_COORDINATION_RISK' : 'CLEAN';

    if (integrityAssessment.isQuarantined) {
      newIssue.status = 'pending_integrity_review';
    }

    setIssues((prev) => [newIssue, ...prev]);

    const log: AuditLog = {
      id: `log-${Date.now()}`,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: integrityAssessment.isQuarantined ? 'ISSUE_QUARANTINED_FOR_INTEGRITY_REVIEW' : 'ISSUE_SUBMITTED_AND_PRIORITIZED',
      entityType: 'issue',
      entityId: newIssue.id,
      details: {
        ticketNumber: newIssue.ticketNumber,
        category: cat.name,
        intakeSource: parsed.intakeSource,
        deterministicScore: score.finalScore,
        confidence: parsed.confidenceScore,
        missingAttributes: parsed.missingAttributes,
        isQuarantined: integrityAssessment.isQuarantined,
        flags: integrityAssessment.flags.map((f) => f.title),
      },
      createdAt: now.toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);

    // Independent Append-Only Event Ledger Record
    EventLogService.appendEvent(
      'ISSUE_CREATED',
      newIssue.id,
      newIssue,
      `create-${newIssue.id}`,
      currentUser.fullName,
      currentUser.role
    );

    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      recipientId: currentUser.id,
      issueId: newIssue.id,
      ticketNumber: newIssue.ticketNumber,
      title: integrityAssessment.isQuarantined
        ? `Report Received & Under Verification (${newIssue.ticketNumber})`
        : `Civic Report Registered (${newIssue.ticketNumber})`,
      message: integrityAssessment.isQuarantined
        ? `Your report has been received and routed for municipal officer verification. (Status: Verification in Progress)`
        : `Your report has been evaluated. Deterministic Priority Score: ${score.finalScore}/100. Target SLA: ${cat.defaultSlaHours} hours. (Intake: ${parsed.intakeSource})`,
      channel: 'app',
      isRead: false,
      createdAt: now.toISOString(),
    };
    setNotifications((prev) => [notif, ...prev]);

    // Send Automated Lifecycle SMS Alert upon Registration (withheld if under quarantine)
    if (!integrityAssessment.isQuarantined) {
      SMSAlertService.sendLifecycleSms(
        newIssue,
        'submitted',
        effectivePhone,
        language
      );
    }

    if (isSupabaseConfigured) {
      supabase.from('issues').insert([{
        id: newIssue.id,
        ticket_number: newIssue.ticketNumber,
        citizen_id: isValidUuid(currentUser.id) ? currentUser.id : null,
        category_id: cat.id,
        department_id: dept.id,
        zone_id: zone.id,
        title: newIssue.title,
        raw_description: newIssue.rawDescription,
        location_address: newIssue.locationAddress,
        latitude: newIssue.latitude,
        longitude: newIssue.longitude,
        photo_urls: newIssue.photoUrls,
        structured_data: newIssue.structuredData,
        affected_population_estimate: newIssue.affectedPopulationEstimate,
        confidence_score: newIssue.confidenceScore,
        missing_attributes: newIssue.missingAttributes,
        status: newIssue.status,
        urgency: newIssue.urgency,
        estimated_cost: newIssue.estimatedCost,
        estimated_hours: newIssue.estimatedHours,
        required_staff_count: newIssue.requiredStaffCount,
        required_equipment: newIssue.requiredEquipment,
        reported_at: newIssue.reportedAt,
        sla_due_at: newIssue.slaDueAt,
      }]).then(({ error }) => {
        if (error) console.warn('Supabase issue insert note:', error.message);
      });
    }

    return newIssue;
  };

  // Update issue status
  const updateIssueStatus = (issueId: string, newStatus: IssueStatus, officerNotes?: string) => {
    setIssues((prev) =>
      prev.map((iss) => {
        if (iss.id === issueId) {
          const updated = { ...iss, status: newStatus };
          if (newStatus === 'resolved') {
            updated.resolvedAt = new Date().toISOString();
          }
          return updated;
        }
        return iss;
      })
    );

    const targetIssue = issues.find((i) => i.id === issueId);

    const log: AuditLog = {
      id: `log-${Date.now()}`,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'STATUS_CHANGED',
      entityType: 'issue',
      entityId: issueId,
      details: {
        ticketNumber: targetIssue?.ticketNumber,
        oldStatus: targetIssue?.status,
        newStatus,
        notes: officerNotes || 'Status updated by Municipal Officer',
      },
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);

    // Independent Append-Only Event Ledger
    EventLogService.appendEvent(
      'STATUS_CHANGED',
      issueId,
      { newStatus, notes: officerNotes, ticketNumber: targetIssue?.ticketNumber },
      `status-${issueId}-${newStatus}-${Date.now()}`,
      currentUser.fullName,
      currentUser.role
    );

    if (targetIssue) {
      const notif: NotificationItem = {
        id: `notif-${Date.now()}`,
        recipientId: targetIssue.citizenId || 'citizen-public',
        issueId: targetIssue.id,
        ticketNumber: targetIssue.ticketNumber,
        title: `Status Updated: ${newStatus.toUpperCase()}`,
        message: `Your issue ${targetIssue.ticketNumber} is now marked as "${newStatus}". Officer note: ${officerNotes || 'In municipal execution pipeline'}.`,
        channel: 'app',
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [notif, ...prev]);

      // Automated Lifecycle SMS Notification to Citizen Handset
      SMSAlertService.sendLifecycleSms(
        { ...targetIssue, status: newStatus },
        newStatus,
        targetIssue.citizenPhone,
        language
      );
    }

    if (isSupabaseConfigured) {
      if (isValidUuid(issueId)) {
        supabase.from('issues').update({ status: newStatus }).eq('id', issueId).then();
      } else if (targetIssue?.ticketNumber) {
        supabase.from('issues').update({ status: newStatus }).eq('ticket_number', targetIssue.ticketNumber).then();
      }
    }
  };

  // Officer Override
  const overridePriority = (
    issueId: string,
    overriddenScore: number,
    overrideReason: string,
    officerNotes?: string
  ) => {
    setIssues((prev) =>
      prev.map((iss) => {
        if (iss.id === issueId && iss.priorityScore) {
          const boundedScore = Math.min(100, Math.max(0, overriddenScore));
          return {
            ...iss,
            priorityScore: {
              ...iss.priorityScore,
              finalScore: boundedScore,
              explanationSummary: `OFFICER OVERRIDE (${boundedScore}/100): ${overrideReason}. (Deterministic Base was ${iss.priorityScore.finalScore})`,
            },
          };
        }
        return iss;
      })
    );

    const targetIssue = issues.find((i) => i.id === issueId);

    const log: AuditLog = {
      id: `log-${Date.now()}`,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'PRIORITY_OFFICER_OVERRIDE',
      entityType: 'issue',
      entityId: issueId,
      details: {
        ticketNumber: targetIssue?.ticketNumber,
        previousScore: targetIssue?.priorityScore?.finalScore,
        overriddenScore,
        mandatoryReason: overrideReason,
        notes: officerNotes,
      },
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);

    // Independent Append-Only Event Ledger
    EventLogService.appendEvent(
      'OFFICER_OVERRIDDEN',
      issueId,
      { overrideScore: overriddenScore, reason: overrideReason, notes: officerNotes },
      `override-${issueId}-${Date.now()}`,
      currentUser.fullName,
      currentUser.role
    );

    if (isSupabaseConfigured) {
      supabase.from('priority_decisions').insert([{
        issue_id: issueId,
        officer_id: currentUser.id,
        action_type: 'priority_override',
        previous_score: targetIssue?.priorityScore?.finalScore,
        overridden_score: overriddenScore,
        override_reason: overrideReason,
        officer_notes: officerNotes,
      }]).then();
    }
  };

  // Field Verification Loop: One-tap on-site physical verification by municipal field inspector
  const verifyIssueOnSite = (issueId: string, officerNotes: string = 'Field inspector on-site physical inspection confirmed.') => {
    const targetIssue = issues.find((i) => i.id === issueId);
    if (!targetIssue) return;

    const category = categories.find((c) => c.id === targetIssue.categoryId) || categories[0];
    const zone = zones.find((z) => z.id === targetIssue.zoneId) || zones[0];
    
    const verifiedIss: CivicIssue = {
      ...targetIssue,
      fieldVerificationStatus: 'verified',
      fieldVerifiedBy: currentUser.fullName,
      fieldVerifiedAt: new Date().toISOString(),
      fieldVerificationNotes: officerNotes,
      confidenceScore: 1.0,
    };

    const newScore = PriorityEngine.calculateScore(verifiedIss, category, zone, weightConfig);
    verifiedIss.priorityScore = newScore;

    setIssues((prev) => prev.map((iss) => (iss.id === issueId ? verifiedIss : iss)));

    const log: AuditLog = {
      id: `log-${Date.now()}`,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'FIELD_VERIFICATION_CONFIRMED',
      entityType: 'issue',
      entityId: issueId,
      details: {
        ticketNumber: verifiedIss.ticketNumber,
        notes: officerNotes,
        restoredConfidence: 1.0,
        recomputedScore: newScore.finalScore,
      },
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);

    // Independent Append-Only Event Ledger
    EventLogService.appendEvent(
      'FIELD_VERIFIED',
      issueId,
      {
        fieldVerifiedBy: currentUser.fullName,
        fieldVerifiedAt: verifiedIss.fieldVerifiedAt,
        notes: officerNotes,
        ticketNumber: verifiedIss.ticketNumber,
      },
      `verify-${issueId}-${Date.now()}`,
      currentUser.fullName,
      currentUser.role
    );

    if (isSupabaseConfigured) {
      supabase.from('issues').update({
        field_verification_status: 'verified',
        field_verified_by: currentUser.fullName,
        field_verified_at: new Date().toISOString(),
        confidence_score: 1.0,
      }).eq('id', issueId).then();
    }
  };

  // ============================================================================
  // CHALLENGE 2: TRUST, COORDINATION & INTEGRITY GATE ("THE BAD READING")
  // ============================================================================

  const clearIntegrityReview = (issueId: string, officerNotes?: string) => {
    const target = issues.find((i) => i.id === issueId);
    if (!target) return;

    const now = new Date();
    const updatedAssessment = {
      ...target.integrityAssessment,
      isQuarantined: false,
      flagCount: target.integrityAssessment?.flags.length || 0,
      riskLevel: target.integrityAssessment?.riskLevel || 'clean',
      flags: target.integrityAssessment?.flags || [],
      assessedAt: target.integrityAssessment?.assessedAt || now.toISOString(),
      reviewDecision: 'cleared' as const,
      reviewedBy: currentUser.fullName,
      reviewedAt: now.toISOString(),
      reviewNotes: officerNotes || 'Cleared after officer evaluation of on-site evidence.',
    };

    const updatedIssue: CivicIssue = {
      ...target,
      status: 'prioritized',
      decisionEligibility: 'ELIGIBLE',
      trustState: 'OFFICER_REVIEWED',
      integrityAssessment: updatedAssessment,
    };

    setIssues((prev) => prev.map((i) => (i.id === issueId ? updatedIssue : i)));

    const auditLog: AuditLog = {
      id: `log-clear-${Date.now()}`,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'INTEGRITY_REVIEW_CLEARED',
      entityType: 'issue',
      entityId: target.id,
      details: {
        ticketNumber: target.ticketNumber,
        officerNotes,
        reinstatedStatus: 'prioritized',
        flagsPreservedCount: target.integrityAssessment?.flags.length || 0,
      },
      createdAt: now.toISOString(),
    };
    setAuditLogs((prev) => [auditLog, ...prev]);

    EventLogService.appendEvent(
      'OFFICER_OVERRIDDEN',
      target.id,
      updatedIssue,
      `clear-integrity-${target.id}`,
      currentUser.fullName,
      currentUser.role
    );
  };

  const rejectFabricatedIssue = (issueId: string, officerReason: string) => {
    const target = issues.find((i) => i.id === issueId);
    if (!target) return;

    const now = new Date();
    const updatedAssessment = {
      ...target.integrityAssessment,
      isQuarantined: false,
      flagCount: target.integrityAssessment?.flags.length || 0,
      riskLevel: target.integrityAssessment?.riskLevel || 'quarantined',
      flags: target.integrityAssessment?.flags || [],
      assessedAt: target.integrityAssessment?.assessedAt || now.toISOString(),
      reviewDecision: 'rejected_fabricated' as const,
      reviewedBy: currentUser.fullName,
      reviewedAt: now.toISOString(),
      reviewNotes: officerReason || 'Confirmed coordinated/fabricated submission cluster.',
    };

    const updatedIssue: CivicIssue = {
      ...target,
      status: 'rejected_fabricated',
      decisionEligibility: 'REJECTED',
      trustState: 'FABRICATED',
      integrityAssessment: updatedAssessment,
    };

    setIssues((prev) => prev.map((i) => (i.id === issueId ? updatedIssue : i)));

    const auditLog: AuditLog = {
      id: `log-reject-fab-${Date.now()}`,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'ISSUE_REJECTED_AS_FABRICATED',
      entityType: 'issue',
      entityId: target.id,
      details: {
        ticketNumber: target.ticketNumber,
        officerReason,
        flagsDetected: target.integrityAssessment?.flags.map((f) => f.title) || [],
      },
      createdAt: now.toISOString(),
    };
    setAuditLogs((prev) => [auditLog, ...prev]);

    EventLogService.appendEvent(
      'STATUS_CHANGED',
      target.id,
      updatedIssue,
      `reject-fab-${target.id}`,
      currentUser.fullName,
      currentUser.role
    );
  };

  const simulateCoordinatedSmearAttack = (targetAddress = 'Sai Snacks Stall, Shivaji Chowk') => {
    const now = new Date();
    const zone = zones.find((z) => z.code === 'WARD-02') || zones[0];
    const cat = categories.find((c) => c.code === 'COMMUNITY_GARBAGE_DUMP') || categories[0];
    const dept = departments.find((d) => d.id === cat.departmentId) || departments[0];

    const fakeReporters = [
      { name: 'Kailas Shinde', phone: '9822088111', id: 'usr-fake-kailas' },
      { name: 'Nitin Sonawane', phone: '9822088222', id: 'usr-fake-nitin' },
      { name: 'Ganesh More', phone: '9822088333', id: 'usr-fake-ganesh' },
      { name: 'Rohit Jadhav', phone: '9822088444', id: 'usr-fake-rohit' },
    ];

    const fakeDescriptions = [
      `Severe rotten food waste and bio-hazard disposal at ${targetAddress}. Immediate municipal inspection and heavy closure fine required!`,
      `Extreme bio-hazard and rotten food disposal creating disease hazard at ${targetAddress}. Immediate heavy fine and closure required!`,
      `Hazardous rotten food waste dumped openly near ${targetAddress}. Urgent municipal action and cancellation of food license needed!`,
      `Severe bio-hazard and rotten food disposal creating health hazard at ${targetAddress}. Urgent municipal inspection and penalty required!`,
    ];

    const sharedPhotoHash = 'a1b2c3d4e5f60011';
    const newFakeIssues: CivicIssue[] = [];

    fakeReporters.forEach((rep, idx) => {
      const tNum = `KMC-2026-${String(90100 + idx)}`;
      const newIss: CivicIssue = {
        id: `iss-smear-${Date.now()}-${idx}`,
        ticketNumber: tNum,
        citizenId: rep.id,
        citizenName: rep.name,
        citizenPhone: rep.phone,
        categoryId: cat.id,
        departmentId: dept.id,
        zoneId: zone.id,
        title: `Sanitation & rotten food dump: ${targetAddress}`,
        rawDescription: fakeDescriptions[idx],
        locationAddress: `${targetAddress}, Ward 2, Kopargaon`,
        latitude: 19.8995 + idx * 0.0001,
        longitude: 74.4845 + idx * 0.0001,
        photoUrls: ['seed://smear-photo-01'],
        perceptualPhotoHash: sharedPhotoHash,
        structuredData: {
          healthHazardRisk: 'high',
          extractedSummary: 'Sanitation complaint targeted at food stall.',
        },
        affectedPopulationEstimate: 6000 + idx * 400,
        confidenceScore: 0.88,
        missingAttributes: [],
        status: 'pending_integrity_review',
        urgency: 'critical',
        estimatedCost: 7500,
        estimatedHours: 4,
        requiredStaffCount: 4,
        requiredEquipment: 'tipper_truck',
        reportedAt: new Date(now.getTime() - (idx * 4) * 60000).toISOString(),
        slaDueAt: new Date(now.getTime() + 24 * 3600000).toISOString(),
        escalationCount: 1,
        integrityAssessment: {
          isQuarantined: true,
          flagCount: 3,
          riskLevel: 'quarantined',
          perceptualPhotoHash: sharedPhotoHash,
          assessedAt: now.toISOString(),
          flags: [
            {
              flagType: 'duplicate_text_cluster',
              severity: 'high',
              title: 'Near-Identical Narrative Text Cluster',
              description: `Found 3 other recent reports with 92% vocabulary & phrase overlap targeting ${targetAddress}.`,
              matchedTicketNumbers: fakeReporters.filter((_, i) => i !== idx).map((_, i) => `KMC-2026-${String(90100 + i)}`),
              similarityScore: 0.92,
              reportersInvolved: fakeReporters.filter((_, i) => i !== idx).map((r) => r.name),
            },
            {
              flagType: 'reused_photo_across_reporters',
              severity: 'critical',
              title: 'Perceptual Photo Reuse Across Independent Reporters',
              description: `Perceptual photo hash (${sharedPhotoHash}) matches images submitted by ${fakeReporters.length - 1} other citizen accounts (0 bits Hamming distance).`,
              matchedTicketNumbers: fakeReporters.filter((_, i) => i !== idx).map((_, i) => `KMC-2026-${String(90100 + i)}`),
              photoHashMatch: true,
              reportersInvolved: fakeReporters.filter((_, i) => i !== idx).map((r) => r.name),
            },
            {
              flagType: 'coordinated_burst',
              severity: 'high',
              title: 'Spatiotemporal Submission Burst',
              description: `4 tickets filed against ${targetAddress} within a 16-minute window.`,
              matchedTicketNumbers: fakeReporters.filter((_, i) => i !== idx).map((_, i) => `KMC-2026-${String(90100 + i)}`),
              burstCount: 4,
              timeWindowMinutes: 16,
              clusterCenterLocation: targetAddress,
            },
            {
              flagType: 'unverified_new_reporter_burst',
              severity: 'medium',
              title: 'Sybil Reporter Pattern: Zero Prior History',
              description: '4 clustered complaints originated from newly created citizen accounts with zero verified municipal history.',
              matchedTicketNumbers: fakeReporters.filter((_, i) => i !== idx).map((_, i) => `KMC-2026-${String(90100 + i)}`),
            },
          ],
        },
      };

      newFakeIssues.push(newIss);
    });

    setIssues((prev) => [...newFakeIssues, ...prev]);

    const auditLog: AuditLog = {
      id: `log-attack-sim-${Date.now()}`,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'COORDINATED_SMEAR_ATTACK_SIMULATED',
      entityType: 'issue_cluster',
      entityId: `cluster-smear-${Date.now()}`,
      details: {
        targetAddress,
        injectedTicketsCount: 4,
        quarantineStatus: 'ALL_QUARANTINED_PENDING_REVIEW',
        protectionEffect: 'Withheld from allocationEngine and resource consumption',
      },
      createdAt: now.toISOString(),
    };
    setAuditLogs((prev) => [auditLog, ...prev]);
  };

  const addVerifiedClarification = (data: Omit<VerifiedClarification, 'id' | 'referenceNumber' | 'publishedAt' | 'viewCount'>): VerifiedClarification => {
    const item = CoordinationDetectionService.addClarification(data);
    setClarifications((prev) => [item, ...prev]);

    const auditLog: AuditLog = {
      id: `log-clarify-${Date.now()}`,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'VERIFIED_CLARIFICATION_PUBLISHED',
      entityType: 'clarification',
      entityId: item.id,
      details: {
        referenceNumber: item.referenceNumber,
        title: item.title,
        topic: item.topic,
        category: item.category,
        authorDepartment: item.authorDepartment,
      },
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [auditLog, ...prev]);
    return item;
  };

  // Run Allocation Engine with optional exact DP Knapsack or Greedy mode
  const generateAllocationPlan = (
    departmentId: string,
    budgetCap?: number,
    availableStaff?: number,
    strategy: AllocationStrategy = 'max_risk',
    solverMode: SolverMode = 'greedy'
  ) => {
    const dept = departments.find((d) => d.id === departmentId) || departments[0];
    const { plan, deficitReport } = AllocationEngine.generatePlan({
      department: dept,
      candidateIssues: issues,
      resources,
      budgetCap,
      availableStaff,
      generatedBy: currentUser.fullName,
      solverMode,
    });

    if (strategy !== 'max_risk') {
      const specializedPlan = MultiStrategyEngine.optimizePlan(
        dept,
        issues,
        resources,
        strategy,
        budgetCap || dept.dailyBudgetLimit,
        availableStaff || 8
      );
      specializedPlan.solverMode = solverMode;
      specializedPlan.optimalityComparison = plan.optimalityComparison;
      setActivePlans((prev) => [specializedPlan, ...prev.filter((p) => p.departmentId !== departmentId)]);
      return { plan: specializedPlan, deficitReport };
    }

    setActivePlans((prev) => [plan, ...prev.filter((p) => p.departmentId !== departmentId)]);

    const log: AuditLog = {
      id: `log-${Date.now()}`,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'ALLOCATION_PLAN_GENERATED',
      entityType: 'plan',
      entityId: plan.id,
      details: {
        planCode: plan.planCode,
        department: dept.code,
        strategy,
        approvedIssues: plan.issuesApprovedCount,
        deferredIssues: plan.issuesDeferredCount,
        budgetUtilized: plan.budgetUtilized,
        budgetCap: plan.totalBudgetCap,
      },
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);

    return { plan, deficitReport };
  };

  const getStrategyComparisons = (
    departmentId: string,
    budgetCap: number,
    availableStaff: number
  ) => {
    const dept = departments.find((d) => d.id === departmentId) || departments[0];
    return MultiStrategyEngine.compareStrategies(
      dept,
      issues,
      resources,
      budgetCap,
      availableStaff
    );
  };

  // Approve Allocation Plan
  const approveAllocationPlan = (planId: string, officerNotes?: string) => {
    setActivePlans((prev) =>
      prev.map((plan) => {
        if (plan.id === planId) {
          return {
            ...plan,
            status: 'approved',
            approvedBy: currentUser.fullName,
            approvedAt: new Date().toISOString(),
            notes: officerNotes,
          };
        }
        return plan;
      })
    );

    const targetPlan = activePlans.find((p) => p.id === planId);
    if (!targetPlan) return;

    const approvedIssueIds = targetPlan.items
      .filter((item) => item.itemStatus === 'approved')
      .map((item) => item.issueId);

    const allocatedResourceIds = targetPlan.items
      .filter((item) => item.itemStatus === 'approved' && item.allocatedResourceId)
      .map((item) => item.allocatedResourceId as string);

    setIssues((prev) =>
      prev.map((iss) => {
        if (approvedIssueIds.includes(iss.id) && iss.status === 'prioritized') {
          return { ...iss, status: 'scheduled' };
        }
        return iss;
      })
    );

    setResources((prev) =>
      prev.map((r) => {
        if (allocatedResourceIds.includes(r.id)) {
          return { ...r, currentStatus: 'allocated' };
        }
        return r;
      })
    );

    const log: AuditLog = {
      id: `log-${Date.now()}`,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'ALLOCATION_PLAN_APPROVED',
      entityType: 'plan',
      entityId: planId,
      details: {
        planCode: targetPlan.planCode,
        approvedIssuesCount: approvedIssueIds.length,
        allocatedResources: allocatedResourceIds,
        notes: officerNotes || 'Plan approved for daily execution',
      },
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);

    targetPlan.items
      .filter((item) => item.itemStatus === 'approved')
      .forEach((item) => {
        if (item.issue?.citizenId) {
          const notif: NotificationItem = {
            id: `notif-${Date.now()}-${item.issueId}`,
            recipientId: item.issue.citizenId,
            issueId: item.issueId,
            ticketNumber: item.issue.ticketNumber,
            title: 'Work Order Scheduled in Action Plan',
            message: `Your issue ${item.issue.ticketNumber} is approved in Daily Plan ${targetPlan.planCode}. Work crew and machinery dispatched.`,
            channel: 'app',
            isRead: false,
            createdAt: new Date().toISOString(),
          };
          setNotifications((prev) => [notif, ...prev]);
        }
      });
  };

  // Update resource status
  const updateResource = (resourceId: string, updates: Partial<MunicipalResource>) => {
    setResources((prev) =>
      prev.map((r) => (r.id === resourceId ? { ...r, ...updates } : r))
    );

    const log: AuditLog = {
      id: `log-${Date.now()}`,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'RESOURCE_UPDATED',
      entityType: 'resource',
      entityId: resourceId,
      details: updates,
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);
  };

  // ---------------------------------------------------------------------------
  // CIRCULAR WASTEWATER-TO-AGRICULTURE ACTIONS
  // ---------------------------------------------------------------------------

  const advanceWastewaterStage = (batchId: string, nextStage?: WastewaterWorkflowStage) => {
    const stageSequence: WastewaterWorkflowStage[] = [
      'municipal_waste',
      'wastewater_intake',
      'treatment',
      'quality_check',
      'reuse_plan',
      'agriculture',
    ];

    const progressMap: Record<WastewaterWorkflowStage, number> = {
      municipal_waste: 15,
      wastewater_intake: 35,
      treatment: 60,
      quality_check: 80,
      reuse_plan: 90,
      agriculture: 100,
    };

    setWastewaterBatches((prev) =>
      prev.map((batch) => {
        if (batch.id !== batchId) return batch;

        let targetStage = nextStage;
        if (!targetStage) {
          const currentIndex = stageSequence.indexOf(batch.currentStage);
          if (currentIndex < stageSequence.length - 1) {
            targetStage = stageSequence[currentIndex + 1];
          } else {
            targetStage = 'agriculture';
          }
        }

        const isCompleted = targetStage === 'agriculture';
        return {
          ...batch,
          currentStage: targetStage,
          currentProgressPercent: progressMap[targetStage],
          status: isCompleted ? 'completed' : 'active',
          notes: `Batch advanced to ${targetStage.replace('_', ' ').toUpperCase()} stage by ${currentUser.fullName}`,
        };
      })
    );

    const targetBatch = wastewaterBatches.find((b) => b.id === batchId);
    const log: AuditLog = {
      id: `log-ww-${Date.now()}`,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'WASTEWATER_STAGE_ADVANCED',
      entityType: 'wastewater_batch',
      entityId: batchId,
      details: {
        batchNumber: targetBatch?.batchNumber,
        newStage: nextStage,
      },
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);
  };

  const recordQualityCheck = (
    batchId: string,
    customParams?: Partial<WaterQualityParameters>
  ): QualityCheckSample => {
    const targetBatch = wastewaterBatches.find((b) => b.id === batchId) || wastewaterBatches[0];
    const defaultParams: WaterQualityParameters = {
      ph: 7.4,
      electricalConductivity: 1.1,
      sodiumAdsorptionRatio: 3.5,
      bod: 8.5,
      cod: 42.0,
      tss: 7.0,
      fecalColiforms: 60,
      heavyMetalsPpb: {
        lead: 5.0,
        cadmium: 0.9,
        arsenic: 1.2,
      },
      nutrientsMgL: {
        nitrogen: 24.0,
        phosphorus: 9.5,
        potassium: 18.0,
      },
    };

    const finalParams: WaterQualityParameters = {
      ...defaultParams,
      ...(customParams || {}),
      heavyMetalsPpb: {
        ...defaultParams.heavyMetalsPpb,
        ...(customParams?.heavyMetalsPpb || {}),
      },
      nutrientsMgL: {
        ...defaultParams.nutrientsMgL,
        ...(customParams?.nutrientsMgL || {}),
      },
    };

    const evalResult = WaterQualityEngine.evaluateWaterQuality(finalParams);
    const sampleId = `sample-${Date.now()}`;
    const now = new Date().toISOString();
    const qrHash = WaterQualityEngine.generateVerificationHash(
      targetBatch.batchNumber,
      now.slice(0, 10),
      evalResult.grade
    );

    const sample: QualityCheckSample = {
      id: sampleId,
      batchId,
      batchNumber: targetBatch.batchNumber,
      testedAt: now,
      labTechnicianName: `${currentUser.fullName} (Govt Certified Chemist)`,
      certifiedOfficerName: 'Er. Rahul Deshmukh (WSS Head)',
      parameters: finalParams,
      grade: evalResult.grade,
      cpcbCompliance: evalResult.cpcbCompliance,
      waterQualityIndex: evalResult.waterQualityIndex,
      suitableCrops: evalResult.suitableCrops,
      restrictionNotes: evalResult.restrictionNotes,
      qrVerificationHash: qrHash,
      isRetreatmentRecommended: evalResult.isRetreatmentRecommended,
      routingAssessment: evalResult.routingAssessment,
    };

    setQualitySamples((prev) => [sample, ...prev]);

    setWastewaterBatches((prev) =>
      prev.map((b) => {
        if (b.id !== batchId) return b;
        return {
          ...b,
          qualityGrade: evalResult.grade,
          qualitySampleId: sampleId,
          status: evalResult.isRetreatmentRecommended ? 'rejected_for_retreatment' : 'active',
          currentStage: evalResult.isRetreatmentRecommended ? 'treatment' : 'quality_check',
          currentProgressPercent: evalResult.isRetreatmentRecommended ? 35 : 80,
          notes: evalResult.restrictionNotes,
        };
      })
    );

    const log: AuditLog = {
      id: `log-qc-${Date.now()}`,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'QUALITY_CHECK_COMPLETED',
      entityType: 'quality_sample',
      entityId: sampleId,
      details: {
        batchNumber: targetBatch.batchNumber,
        grade: evalResult.grade,
        cpcbCompliance: evalResult.cpcbCompliance,
        wqi: evalResult.waterQualityIndex,
      },
      createdAt: now,
    };
    setAuditLogs((prev) => [log, ...prev]);

    const notif: NotificationItem = {
      id: `notif-qc-${Date.now()}`,
      recipientId: currentUser.id,
      title: `Water Quality Certificate Issued (${sample.batchNumber})`,
      message: `Batch ${sample.batchNumber} tested: ${evalResult.grade.toUpperCase()} (WQI: ${evalResult.waterQualityIndex}/100). CPCB Compliant: ${evalResult.cpcbCompliance ? 'YES' : 'NO'}.`,
      channel: 'app',
      isRead: false,
      createdAt: now,
    };
    setNotifications((prev) => [notif, ...prev]);

    return sample;
  };

  const generateWaterReusePlan = (
    batchId: string,
    preferredDistribution: DistributionMethod = 'gravity_canal'
  ): WaterReusePlan => {
    const targetBatch = wastewaterBatches.find((b) => b.id === batchId) || wastewaterBatches[0];
    const plan = ReuseAllocationEngine.generatePlan({
      batch: targetBatch,
      commandZones,
      pendingBookings: farmerBookings,
      preferredDistribution,
      officerName: currentUser.fullName,
    });

    setWaterReusePlans((prev) => [plan, ...prev.filter((p) => p.batchId !== batchId)]);

    setWastewaterBatches((prev) =>
      prev.map((b) => {
        if (b.id !== batchId) return b;
        return {
          ...b,
          reusePlanId: plan.id,
          currentStage: 'reuse_plan',
          currentProgressPercent: 90,
        };
      })
    );

    const log: AuditLog = {
      id: `log-wrp-${Date.now()}`,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'WATER_REUSE_PLAN_GENERATED',
      entityType: 'reuse_plan',
      entityId: plan.id,
      details: {
        planCode: plan.planCode,
        batchNumber: targetBatch.batchNumber,
        beneficiaries: plan.totalFarmerBeneficiaries,
        allocatedKLD: plan.totalVolumeAllocatedKLD,
      },
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);

    return plan;
  };

  const approveWaterReusePlan = (planId: string, officerNotes?: string) => {
    const targetPlan = waterReusePlans.find((p) => p.id === planId);
    if (!targetPlan) return;

    setWaterReusePlans((prev) =>
      prev.map((p) => {
        if (p.id !== planId) return p;
        return {
          ...p,
          status: 'approved',
          approvedBy: currentUser.fullName,
          approvedAt: new Date().toISOString(),
          items: p.items.map((item) => ({ ...item, deliveredStatus: 'dispatched' })),
        };
      })
    );

    // Update farmer bookings
    const allocatedBookingIds = targetPlan.items
      .map((item) => item.bookingId)
      .filter(Boolean) as string[];

    setFarmerBookings((prev) =>
      prev.map((b) => {
        if (allocatedBookingIds.includes(b.id)) {
          return { ...b, status: 'allocated', allocatedPlanId: planId };
        }
        return b;
      })
    );

    // Update batch to agriculture stage & completed
    setWastewaterBatches((prev) =>
      prev.map((b) => {
        if (b.id !== targetPlan.batchId) return b;
        return {
          ...b,
          currentStage: 'agriculture',
          status: 'completed',
          currentProgressPercent: 100,
          notes: `Batch approved and dispatched for agricultural irrigation. Plan: ${targetPlan.planCode}. Notes: ${officerNotes || 'Canal/Pipeline released'}`,
        };
      })
    );

    // Update Circular Economy metrics
    setCircularMetrics((prev) => ({
      ...prev,
      totalWastewaterTreatedMLD: Number((prev.totalWastewaterTreatedMLD + (targetPlan.totalVolumeAllocatedKLD / 1000)).toFixed(2)),
      totalAgriculturalReuseKLD: prev.totalAgriculturalReuseKLD + targetPlan.totalVolumeAllocatedKLD,
      totalGroundwaterSavedLiters: prev.totalGroundwaterSavedLiters + (targetPlan.totalVolumeAllocatedKLD * 1000),
      totalFarmerFertilizerSavingsInr: prev.totalFarmerFertilizerSavingsInr + Math.round(targetPlan.totalVolumeAllocatedKLD * 28),
      totalFarmersBenefited: prev.totalFarmersBenefited + targetPlan.totalFarmerBeneficiaries,
    }));

    const log: AuditLog = {
      id: `log-wrp-appr-${Date.now()}`,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'WATER_REUSE_PLAN_APPROVED',
      entityType: 'reuse_plan',
      entityId: planId,
      details: {
        planCode: targetPlan.planCode,
        allocatedKLD: targetPlan.totalVolumeAllocatedKLD,
        farmersCount: targetPlan.totalFarmerBeneficiaries,
      },
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);

    targetPlan.items.forEach((item) => {
      const notif: NotificationItem = {
        id: `notif-wrp-${Date.now()}-${item.id}`,
        recipientId: 'farmer-recipient',
        title: `Irrigation Water Dispatched (${item.cropType.toUpperCase()})`,
        message: `Treated Water Allocation Approved: ${item.allocatedVolumeKLD} KL dispatched to ${item.farmerName} (${item.commandZoneName}) via ${item.distributionMethod.replace('_', ' ')}. Subsidized Savings: ₹${item.commercialSavingsInr.toLocaleString()}.`,
        channel: 'app',
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [notif, ...prev]);
    });
  };

  const submitFarmerBooking = (
    bookingData: Omit<FarmerBooking, 'id' | 'bookingNumber' | 'status' | 'submittedAt'>
  ): FarmerBooking => {
    const bookingNumber = `AGR-BK-2026-${String(Math.floor(100 + Math.random() * 900))}`;
    const newBooking: FarmerBooking = {
      ...bookingData,
      id: `bk-${Date.now()}`,
      bookingNumber,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };

    setFarmerBookings((prev) => [newBooking, ...prev]);

    const log: AuditLog = {
      id: `log-fbk-${Date.now()}`,
      actorName: bookingData.farmerName,
      actorRole: 'citizen',
      action: 'FARMER_WATER_QUOTA_BOOKED',
      entityType: 'issue',
      details: {
        bookingNumber,
        crop: bookingData.cropType,
        acreage: bookingData.farmAcreage,
        requestedKLD: bookingData.requestedVolumeKLD,
      },
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);

    const notif: NotificationItem = {
      id: `notif-fbk-${Date.now()}`,
      recipientId: currentUser.id,
      title: `Water Quota Request Registered (${bookingNumber})`,
      message: `Your request for ${bookingData.requestedVolumeKLD} KL treated water for ${bookingData.farmAcreage} acres of ${bookingData.cropType} has been placed in the municipal allocation queue.`,
      channel: 'app',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [notif, ...prev]);

    return newBooking;
  };

  const reprocessBatch = (batchId: string) => {
    setWastewaterBatches((prev) =>
      prev.map((b) => {
        if (b.id !== batchId) return b;
        return {
          ...b,
          currentStage: 'treatment',
          status: 'active',
          currentProgressPercent: 40,
          qualityGrade: undefined,
          qualitySampleId: undefined,
          notes: 'Batch returned to Secondary Biological MBBR Reactor tank for intensive aeration and carbon polishing.',
        };
      })
    );

    const log: AuditLog = {
      id: `log-repr-${Date.now()}`,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'WASTEWATER_BATCH_REPROCESSED',
      entityType: 'wastewater_batch',
      entityId: batchId,
      details: { batchId },
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);
  };

  const createWastewaterBatch = (
    wardIds: string[],
    volumeKLD: number,
    plantId: string
  ): WastewaterBatch => {
    const batchNumber = `WW-KMC-2026-B${String(Math.floor(100 + Math.random() * 900))}`;
    const newBatch: WastewaterBatch = {
      id: `ww-batch-${Date.now()}`,
      batchNumber,
      sourceWardIds: wardIds,
      intakeVolumeKLD: volumeKLD,
      currentStage: 'municipal_waste',
      intakeTimestamp: new Date().toISOString(),
      treatmentPlantId: plantId,
      status: 'active',
      initialParameters: {
        bod: 350,
        cod: 720,
        tss: 230,
        turbidity: 260,
        ph: 7.2,
      },
      currentProgressPercent: 15,
      notes: `Raw waste collected from ${wardIds.length} municipal wards. Ready for screening.`,
    };

    setWastewaterBatches((prev) => [newBatch, ...prev]);

    const log: AuditLog = {
      id: `log-wwc-${Date.now()}`,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'WASTEWATER_BATCH_INTAKE_CREATED',
      entityType: 'wastewater_batch',
      entityId: newBatch.id,
      details: {
        batchNumber,
        volumeKLD,
        plantId,
      },
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);

    return newBatch;
  };

  // -------------------------------------------------------------
  // FLOOD ALERT & EMERGENCY RESOURCE DISPATCH ACTIONS
  // -------------------------------------------------------------
  const updateDamDischarge = (dischargeCusecs: number, rainfallMmHr?: number) => {
    let alertLevel: DamDischargeAlertLevel = 'normal';
    if (dischargeCusecs >= 60000) alertLevel = 'catastrophic';
    else if (dischargeCusecs >= 45000) alertLevel = 'danger_red';
    else if (dischargeCusecs >= 25000) alertLevel = 'alert_orange';
    else if (dischargeCusecs >= 15000) alertLevel = 'advisory_green';

    // Gauge level model: datum 492m base + proportional surge
    const newGaugeLevel = Number((493.2 + (dischargeCusecs / 65000) * 5.8).toFixed(2));

    setDamTelemetry((prev) => {
      const updated: UpstreamDamTelemetry = {
        ...prev,
        currentDischargeCusecs: dischargeCusecs,
        waterLevelMeters: newGaugeLevel,
        alertLevel,
        rainfallMmPerHour: rainfallMmHr !== undefined ? rainfallMmHr : prev.rainfallMmPerHour,
        lastUpdated: new Date().toISOString(),
      };
      return updated;
    });

    if (dischargeCusecs >= 25000) {
      const notif: NotificationItem = {
        id: `notif-flood-${Date.now()}`,
        recipientId: currentUser.id,
        title: `🚨 Godavari Flood Alert (${dischargeCusecs.toLocaleString()} Cusecs)`,
        message: `Upstream dam discharge elevated to ${dischargeCusecs.toLocaleString()} cusecs. Godavari water level at ${newGaugeLevel}m. Riverbank wards (Ward 1 & Ward 8) placed on critical dispatch priority.`,
        channel: 'app',
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [notif, ...prev]);
    }
  };

  const generateFloodDispatchPlan = (officerNotes?: string): FloodDispatchOrder => {
    const plan = FloodPriorityEngine.generateEmergencyDispatchPlan(
      zoneFloodProfiles,
      damTelemetry,
      emergencyInventory,
      currentUser.fullName
    );

    setFloodDispatchOrders((prev) => [plan, ...prev]);

    const log: AuditLog = {
      id: `log-flood-plan-${Date.now()}`,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'FLOOD_DISPATCH_PLAN_GENERATED',
      entityType: 'flood_dispatch',
      entityId: plan.id,
      details: {
        orderNumber: plan.orderNumber,
        dischargeCusecs: plan.damDischargeCusecs,
        zonesAtRisk: plan.totalZonesAtRisk,
        citizensCovered: plan.totalVulnerableCitizensCovered,
        notes: officerNotes || 'Automated greedy knapsack allocation',
      },
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);

    return plan;
  };

  const approveFloodDispatchOrder = (orderId: string) => {
    const target = floodDispatchOrders.find((o) => o.id === orderId);
    if (!target) return;

    setFloodDispatchOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          isApproved: true,
          approvedAt: new Date().toISOString(),
          approvedBy: currentUser.fullName,
        };
      })
    );

    const log: AuditLog = {
      id: `log-flood-appr-${Date.now()}`,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'FLOOD_DISPATCH_PLAN_APPROVED',
      entityType: 'flood_dispatch',
      entityId: orderId,
      details: {
        orderNumber: target.orderNumber,
        officer: currentUser.fullName,
      },
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);

    const notif: NotificationItem = {
      id: `notif-flood-appr-${Date.now()}`,
      recipientId: currentUser.id,
      title: `Flood Resource Dispatch Order Committed (${target.orderNumber})`,
      message: `Disaster response fleet dispatched to ${target.totalZonesAtRisk} critical zones along Godavari River. Shelter evacuation buses mobilized.`,
      channel: 'app',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
  };

  // Reset all to clean defaults
  const resetAllDataToDefaults = () => {
    localStorage.clear();
    setIssues([]);
    setResources(INITIAL_RESOURCES);
    setAuditLogs([]);
    setNotifications([]);
    setActivePlans([]);
    setWeightConfig(INITIAL_WEIGHT_CONFIG);
    setTreatmentPlants(INITIAL_TREATMENT_PLANTS);
    setWasteSources(INITIAL_WASTE_SOURCES);
    setCommandZones(INITIAL_COMMAND_ZONES);
    setWastewaterBatches(INITIAL_WASTEWATER_BATCHES);
    setQualitySamples(INITIAL_QUALITY_SAMPLES);
    setFarmerBookings(INITIAL_FARMER_BOOKINGS);
    setWaterReusePlans(INITIAL_WATER_REUSE_PLANS);
    setCircularMetrics(INITIAL_CIRCULAR_METRICS);
    setDamTelemetry(INITIAL_DAM_TELEMETRY);
    setZoneFloodProfiles(INITIAL_ZONE_FLOOD_PROFILES);
    setEmergencyInventory(INITIAL_EMERGENCY_RESOURCES);
    setFloodDispatchOrders([]);
    setIsAuthenticated(false);
    setUserRole('citizen');
    setCurrentUser(DEFAULT_GUEST_USER);
  };

  return (
    <CivicContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isAuthenticated,
        userRole,
        currentUser,
        login,
        logout,
        setUserRole,
        setCurrentUser,
        isSupabaseLive,
        zones,
        departments,
        categories,
        weightConfig,
        setWeightConfig,
        issues,
        resources,
        activePlans,
        auditLogs,
        notifications,
        treatmentPlants,
        wasteSources,
        commandZones,
        wastewaterBatches,
        qualitySamples,
        farmerBookings,
        waterReusePlans,
        circularMetrics,
        damTelemetry,
        zoneFloodProfiles,
        emergencyInventory,
        floodDispatchOrders,
        submitIssue,
        updateIssueStatus,
        verifyIssueOnSite,
        overridePriority,
        generateAllocationPlan,
        getStrategyComparisons,
        approveAllocationPlan,
        updateResource,
        recalculateAllPriorities,
        markNotificationAsRead,
        advanceWastewaterStage,
        recordQualityCheck,
        generateWaterReusePlan,
        approveWaterReusePlan,
        submitFarmerBooking,
        reprocessBatch,
        createWastewaterBatch,
        updateDamDischarge,
        generateFloodDispatchPlan,
        approveFloodDispatchOrder,
        resetAllDataToDefaults,
        recoveryReport,
        isRecoveryModeActive,
        isBlackoutSimulating,
        acknowledgeRecoveryReport,
        simulateBlackoutChaos,
        confirmUnconfirmedInFlightIssue,
        resetJudgeDemo,
        triggerPrimaryStoreFailure,
        executeIndependentRecovery,
        clarifications,
        addVerifiedClarification,
        clearIntegrityReview,
        rejectFabricatedIssue,
        simulateCoordinatedSmearAttack,
      }}
    >
      {children}
    </CivicContext.Provider>
  );
};

export const useCivic = () => {
  const context = useContext(CivicContext);
  if (!context) {
    throw new Error('useCivic must be used within a CivicProvider');
  }
  return context;
};
