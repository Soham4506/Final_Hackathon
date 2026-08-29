import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
  PriorityDecision,
  IssueStatus,
  ResourceType,
} from '../types';
import { 
  INITIAL_ZONES, 
  INITIAL_DEPARTMENTS, 
  INITIAL_CATEGORIES, 
  INITIAL_WEIGHT_CONFIG, 
  INITIAL_RESOURCES, 
  INITIAL_ISSUES, 
  INITIAL_USERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS
} from '../data/mockData';
import { PriorityEngine } from '../services/priorityEngine';
import { AllocationEngine, ResourceDeficitReport } from '../services/allocationEngine';
import { AIIntakeParser } from '../services/aiIntakeParser';

interface CivicContextType {
  // Roles & Profiles
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  users: UserProfile[];

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
  }) => CivicIssue;

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
    availableStaff?: number
  ) => { plan: AllocationPlan; deficitReport: ResourceDeficitReport };

  approveAllocationPlan: (planId: string, officerNotes?: string) => void;

  updateResource: (resourceId: string, updates: Partial<MunicipalResource>) => void;

  recalculateAllPriorities: () => void;

  markNotificationAsRead: (notificationId: string) => void;

  loadDemoScenario: (scenario: 'monsoon' | 'market_outage' | 'deficit_showcase') => void;
}

const CivicContext = createContext<CivicContextType | undefined>(undefined);

export const CivicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userRole, setUserRole] = useState<UserRole>('officer');
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_USERS[0]);
  const [users] = useState<UserProfile[]>(INITIAL_USERS);

  const [zones] = useState<Zone[]>(INITIAL_ZONES);
  const [departments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [categories] = useState<IssueCategory[]>(INITIAL_CATEGORIES);
  const [weightConfig, setWeightConfig] = useState<PriorityWeightConfig>(INITIAL_WEIGHT_CONFIG);

  const [resources, setResources] = useState<MunicipalResource[]>(INITIAL_RESOURCES);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [activePlans, setActivePlans] = useState<AllocationPlan[]>([]);

  // Initialize and calculate scores for initial issues
  const [issues, setIssues] = useState<CivicIssue[]>(() => {
    return INITIAL_ISSUES.map((issue) => {
      const cat = INITIAL_CATEGORIES.find((c) => c.id === issue.categoryId) || INITIAL_CATEGORIES[0];
      const zone = INITIAL_ZONES.find((z) => z.id === issue.zoneId) || INITIAL_ZONES[0];
      const score = PriorityEngine.calculateScore(issue, cat, zone, INITIAL_WEIGHT_CONFIG);
      return {
        ...issue,
        priorityScore: score,
      };
    });
  });

  // Sync currentUser with role changes
  useEffect(() => {
    if (userRole === 'citizen') {
      setCurrentUser(INITIAL_USERS.find((u) => u.role === 'citizen') || INITIAL_USERS[1]);
    } else if (userRole === 'officer') {
      setCurrentUser(INITIAL_USERS.find((u) => u.role === 'officer') || INITIAL_USERS[0]);
    } else {
      setCurrentUser(INITIAL_USERS.find((u) => u.role === 'admin') || INITIAL_USERS[2]);
    }
  }, [userRole]);

  // Recalculate all scores when weight configuration changes
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

    // Audit log
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
  };

  // Submit a new issue (Citizen or Field Staff)
  const submitIssue = (data: {
    title: string;
    description: string;
    address: string;
    zoneId: string;
    categoryId?: string;
    latitude?: number;
    longitude?: number;
    photoUrls?: string[];
    affectedPopulation?: number;
  }): CivicIssue => {
    const hasPhotos = Boolean(data.photoUrls && data.photoUrls.length > 0);
    const hasPreciseLocation = Boolean(data.latitude && data.longitude);

    // 1. AI Intake structured extraction
    const parsed = AIIntakeParser.parseComplaint(
      data.title,
      data.description,
      hasPhotos,
      hasPreciseLocation
    );

    const chosenCatId = data.categoryId || parsed.categoryIdSuggested;
    const cat = categories.find((c) => c.id === chosenCatId) || categories[0];
    const dept = departments.find((d) => d.id === cat.departmentId) || departments[0];
    const zone = zones.find((z) => z.id === data.zoneId) || zones[0];

    const ticketNumber = `KMC-2026-${String(Math.floor(10000 + Math.random() * 90000)).slice(0, 5)}`;
    const now = new Date();
    const slaDueAt = new Date(now.getTime() + cat.defaultSlaHours * 3600 * 1000).toISOString();

    const newIssue: CivicIssue = {
      id: `iss-${Date.now()}`,
      ticketNumber,
      citizenId: currentUser.id,
      citizenName: currentUser.fullName,
      citizenPhone: currentUser.phone,
      categoryId: cat.id,
      departmentId: dept.id,
      zoneId: zone.id,
      title: data.title,
      rawDescription: data.description,
      locationAddress: data.address,
      latitude: data.latitude || zone.coordinates?.[0] || 19.8900,
      longitude: data.longitude || zone.coordinates?.[1] || 74.4800,
      photoUrls: data.photoUrls || [],
      structuredData: parsed.structuredData,
      affectedPopulationEstimate: data.affectedPopulation || parsed.affectedPopulationEstimate,
      confidenceScore: parsed.confidenceScore,
      missingAttributes: parsed.missingAttributes,
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

    // Calculate deterministic priority score
    const score = PriorityEngine.calculateScore(newIssue, cat, zone, weightConfig, now);
    newIssue.priorityScore = score;

    setIssues((prev) => [newIssue, ...prev]);

    // Create Audit Log
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
        deterministicScore: score.finalScore,
        confidence: parsed.confidenceScore,
        missingAttributes: parsed.missingAttributes,
      },
      createdAt: now.toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);

    // Create Notification
    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      recipientId: currentUser.id,
      issueId: newIssue.id,
      ticketNumber: newIssue.ticketNumber,
      title: `Civic Report Registered (${newIssue.ticketNumber})`,
      message: `Your report has been evaluated. Deterministic Priority Score: ${score.finalScore}/100. Target SLA: ${cat.defaultSlaHours} hours.`,
      channel: 'app',
      isRead: false,
      createdAt: now.toISOString(),
    };
    setNotifications((prev) => [notif, ...prev]);

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

    // Audit log
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

    // Notification for citizen
    if (targetIssue?.citizenId) {
      const notif: NotificationItem = {
        id: `notif-${Date.now()}`,
        recipientId: targetIssue.citizenId,
        issueId: targetIssue.id,
        ticketNumber: targetIssue.ticketNumber,
        title: `Status Updated: ${newStatus.toUpperCase()}`,
        message: `Your issue ${targetIssue.ticketNumber} is now marked as "${newStatus}". Officer note: ${officerNotes || 'In municipal execution pipeline'}.`,
        channel: 'app',
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [notif, ...prev]);
    }
  };

  // Officer Override with Mandatory Justification
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

    // Immutable Audit Log
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
  };

  // Run Allocation Engine
  const generateAllocationPlan = (
    departmentId: string,
    budgetCap?: number,
    availableStaff?: number
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

    setActivePlans((prev) => [plan, ...prev.filter((p) => p.departmentId !== departmentId)]);

    // Audit log
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

  // Approve Allocation Plan (Officer Action)
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

    // Transition approved issues to 'scheduled' and update resource statuses
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

    // Audit Log
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

    // Send notifications to affected citizens
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

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
  };

  // Load Hackathon Demo Presets
  const loadDemoScenario = (scenario: 'monsoon' | 'market_outage' | 'deficit_showcase') => {
    if (scenario === 'monsoon') {
      // Elevate water contamination and drainage issues
      setIssues((prev) =>
        prev.map((iss) => {
          if (iss.categoryId === 'cat-water-contam' || iss.categoryId === 'cat-sewer-overflow') {
            return {
              ...iss,
              escalationCount: iss.escalationCount + 3,
              status: 'prioritized',
              priorityScore: PriorityEngine.calculateScore(
                { ...iss, escalationCount: iss.escalationCount + 3 },
                categories.find((c) => c.id === iss.categoryId) || categories[0],
                zones.find((z) => z.id === iss.zoneId) || zones[0],
                weightConfig
              ),
            };
          }
          return iss;
        })
      );
    } else if (scenario === 'deficit_showcase') {
      // Simulate 1 jetting machine broken down in maintenance
      setResources((prev) =>
        prev.map((r) =>
          r.identifierCode === 'KMC-JET-02'
            ? { ...r, isOperational: false, currentStatus: 'maintenance' }
            : r
        )
      );
    }

    const log: AuditLog = {
      id: `log-${Date.now()}`,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'LOADED_DEMO_SCENARIO',
      entityType: 'issue',
      details: { scenarioName: scenario },
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);
  };

  return (
    <CivicContext.Provider
      value={{
        userRole,
        setUserRole,
        currentUser,
        setCurrentUser,
        users,
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
        submitIssue,
        updateIssueStatus,
        overridePriority,
        generateAllocationPlan,
        approveAllocationPlan,
        updateResource,
        recalculateAllPriorities,
        markNotificationAsRead,
        loadDemoScenario,
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
