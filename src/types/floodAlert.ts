// ==============================================================================
// FLOOD ALERT & EMERGENCY RESOURCE DISPATCH PRIORITY DOMAIN TYPES
// Kopargaon Municipal Council (कोपरगाव नगरपरिषद) - Godavari River Basin
// ==============================================================================

export type FloodRiskTier = 'p0_critical' | 'p1_high' | 'p2_moderate' | 'p3_safe';

export type DamDischargeAlertLevel = 'normal' | 'advisory_green' | 'alert_orange' | 'danger_red' | 'catastrophic';

export interface UpstreamDamTelemetry {
  damName: string;
  riverName: string; // 'Godavari River'
  currentDischargeCusecs: number; // in Cusecs (e.g. 5,000 to 75,000)
  totalInflowCusecs: number;
  waterLevelMeters: number; // Current gauge level at Kopargaon Weir
  dangerWaterLevelMeters: number; // e.g. 498.5 m
  alertLevel: DamDischargeAlertLevel;
  rainfallMmPerHour: number;
  timeToPeakArrivalHours: number;
  lastUpdated: string;
}

export interface ZoneFloodProfile {
  id: string;
  zoneId: string;
  zoneCode: string; // e.g. 'Z-01'
  zoneName: string;
  wardNumber: number; // 1 to 8
  elevationAboveDatumMeters: number; // Low lying (492m) vs upland (510m)
  distanceToGodavariRiverMeters: number; // 40m to 2500m
  vulnerablePopulation: number; // High density riverbank slums / elderly
  totalPopulation: number;
  criticalInfrastructureCount: number; // Hospitals, substations, water treatment
  criticalInfrastructureNames: string[];
  drainageCongestionIndex: number; // 1 (good drainage) to 5 (severe waterlogging)
  historicalInundationDepthMeters: number; // Peak flood level in 2019/2022 floods
  designatedShelterSite: string;
  evacuationDistanceKm: number;
  coordinates: [number, number];
}

export interface FloodRiskScoreDecomposition {
  elevationScore: number; // 0 to 100
  riverProximityScore: number; // 0 to 100
  damDischargeImpactScore: number; // 0 to 100
  vulnerablePopulationScore: number; // 0 to 100
  criticalInfrastructureScore: number; // 0 to 100
  drainageCongestionScore: number; // 0 to 100
  finalRiskScore: number; // Weighted combination 0 to 100
  riskTier: FloodRiskTier;
  estimatedTimeToInundationHours: number;
  primaryRiskReason: string;
  primaryRiskReasonMr: string;
}

export interface EmergencyResourceInventory {
  dewateringPumps: { total: number; available: number; capacityLPM: number };
  rescueBoats: { total: number; available: number; capacityPersons: number };
  sandbagTrucks: { total: number; available: number; sandbagsPerTruck: number };
  evacuationBuses: { total: number; available: number; seatingCapacity: number };
  medicalReliefVans: { total: number; available: number };
}

export interface AllocatedEmergencyPackage {
  dewateringPumps: number;
  rescueBoats: number;
  sandbagTrucks: number;
  evacuationBuses: number;
  medicalReliefVans: number;
}

export interface ZoneDispatchPlanItem {
  rank: number; // 1 to 8
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  wardNumber: number;
  riskScore: number;
  riskTier: FloodRiskTier;
  timeToInundationHours: number;
  allocatedResources: AllocatedEmergencyPackage;
  dispatchStatus: 'immediate_dispatch' | 'standby_precaution' | 'monitoring_safe';
  dispatchEtaMinutes: number;
  evacuationRoute: string;
  designatedShelterSite: string;
  rationale: string;
}

export interface FloodDispatchOrder {
  id: string;
  orderNumber: string; // e.g. 'KMC-FLOOD-DISPATCH-2026-0829'
  createdAt: string;
  damDischargeCusecs: number;
  riverLevelMeters: number;
  alertLevel: DamDischargeAlertLevel;
  disasterOfficerName: string;
  totalZonesAtRisk: number;
  totalVulnerableCitizensCovered: number;
  items: ZoneDispatchPlanItem[];
  unmetDemandDiagnostics: {
    resourceType: string;
    deficitCount: number;
    affectedZones: string[];
    recommendation: string;
  }[];
  isApproved: boolean;
  approvedAt?: string;
  approvedBy?: string;
}
