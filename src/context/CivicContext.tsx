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
import { PriorityEngine } from '../services/priorityEngine';
import { AllocationEngine, ResourceDeficitReport } from '../services/allocationEngine';
import { AIIntakeParser } from '../services/aiIntakeParser';
import { MultiStrategyEngine, AllocationStrategy, StrategyComparisonMetric } from '../services/multiStrategyEngine';
import { WaterQualityEngine } from '../services/waterQualityEngine';
import { ReuseAllocationEngine } from '../services/reuseAllocationEngine';
import { Language, DICTIONARY, Translations } from '../services/localizationService';
import { SMSAlertService } from '../services/smsAlertService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';


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
  }) => Promise<CivicIssue>;

  updateIssueStatus: (issueId: string, newStatus: IssueStatus, officerNotes?: string) => void;
  
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
    strategy?: AllocationStrategy
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

  // Issues start clean
  const [issues, setIssues] = useState<CivicIssue[]>(() => {
    const stored = getStored<CivicIssue[] | null>('issues', null);
    const baseIssues = stored || INITIAL_ISSUES;
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

  // Login method: Sets actual user profile immediately and persists session
  const login = (role: UserRole, userProfile: UserProfile) => {
    setUserRole(role);
    setCurrentUser(userProfile);
    setIsAuthenticated(true);
    localStorage.setItem('civicpulse_is_auth', JSON.stringify(true));
    localStorage.setItem('civicpulse_user_role', JSON.stringify(role));
    localStorage.setItem('civicpulse_current_user', JSON.stringify(userProfile));
  };

  // Logout method: Clears authentication gate
  const logout = () => {
    setIsAuthenticated(false);
    localStorage.setItem('civicpulse_is_auth', JSON.stringify(false));
    localStorage.removeItem('civicpulse_current_user');
    setCurrentUser(DEFAULT_GUEST_USER);
  };

  // Hydrate from Supabase on load if configured
  useEffect(() => {
    if (isSupabaseConfigured) {
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
    }
  }, []);

  // Sync state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('civicpulse_lang', JSON.stringify(language));
      localStorage.setItem('civicpulse_is_auth', JSON.stringify(isAuthenticated));
      localStorage.setItem('civicpulse_user_role', JSON.stringify(userRole));
      localStorage.setItem('civicpulse_current_user', JSON.stringify(currentUser));
      localStorage.setItem('civicpulse_issues', JSON.stringify(issues));
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
      localStorage.setItem('civicpulse_farmer_bookings', JSON.stringify(farmerBookings));
      localStorage.setItem('civicpulse_water_reuse_plans', JSON.stringify(waterReusePlans));
      localStorage.setItem('civicpulse_circular_metrics', JSON.stringify(circularMetrics));
    } catch {
      // ignore
    }
  }, [
    language,
    isAuthenticated,
    userRole,
    currentUser,
    issues,
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
  ]);

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
    const effectivePhone = data.citizenPhone || currentUser.phone || '+91 98224 11204';
    const effectiveName = data.citizenName || currentUser.fullName || 'Citizen User';

    const newIssue: CivicIssue = {
      id: `iss-${Date.now()}`,
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

    setIssues((prev) => [newIssue, ...prev]);

    const log: AuditLog = {
      id: `log-${Date.now()}`,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'ISSUE_SUBMITTED_AND_PRIORITIZED',
      entityType: 'issue',
      entityId: newIssue.id,
      details: {
        ticketNumber: newIssue.ticketNumber,
        category: cat.name,
        intakeSource: parsed.intakeSource,
        deterministicScore: score.finalScore,
        confidence: parsed.confidenceScore,
        missingAttributes: parsed.missingAttributes,
      },
      createdAt: now.toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);

    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      recipientId: currentUser.id,
      issueId: newIssue.id,
      ticketNumber: newIssue.ticketNumber,
      title: `Civic Report Registered (${newIssue.ticketNumber})`,
      message: `Your report has been evaluated. Deterministic Priority Score: ${score.finalScore}/100. Target SLA: ${cat.defaultSlaHours} hours. (Intake: ${parsed.intakeSource})`,
      channel: 'app',
      isRead: false,
      createdAt: now.toISOString(),
    };
    setNotifications((prev) => [notif, ...prev]);

    // Send Automated Lifecycle SMS Alert upon Registration
    SMSAlertService.sendLifecycleSms(
      newIssue,
      'submitted',
      effectivePhone,
      language
    );

    if (isSupabaseConfigured) {
      supabase.from('issues').insert([{
        ticket_number: newIssue.ticketNumber,
        citizen_id: currentUser.id,
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
      }]).then();
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
      supabase.from('issues').update({ status: newStatus }).eq('id', issueId).then();
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

  // Run Allocation Engine
  const generateAllocationPlan = (
    departmentId: string,
    budgetCap?: number,
    availableStaff?: number,
    strategy: AllocationStrategy = 'max_risk'
  ) => {
    const dept = departments.find((d) => d.id === departmentId) || departments[0];
    const { plan, deficitReport } = AllocationEngine.generatePlan({
      department: dept,
      candidateIssues: issues,
      resources,
      budgetCap,
      availableStaff,
      generatedBy: currentUser.fullName,
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
        submitIssue,
        updateIssueStatus,
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
        resetAllDataToDefaults,
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
