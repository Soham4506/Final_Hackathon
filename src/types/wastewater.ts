// ==============================================================================
// CIRCULAR WASTEWATER-TO-AGRICULTURE REUSE DOMAIN TYPES
// Kopargaon Municipal Council (कोपरगाव नगरपरिषद)
// ==============================================================================

export type WastewaterWorkflowStage = 
  | 'municipal_waste'
  | 'wastewater_intake'
  | 'treatment'
  | 'quality_check'
  | 'reuse_plan'
  | 'agriculture';

export type QualityGrade = 'grade_a' | 'grade_b' | 'grade_c' | 'failed';

export type TreatmentTechnology = 'MBBR' | 'SBR' | 'Activated_Sludge' | 'Dual_Media_Filtration' | 'Phytorid_Wetland';

export type DistributionMethod = 'gravity_canal' | 'underground_pipeline' | 'municipal_tanker';

export type CropCategory = 'sugarcane' | 'onion' | 'wheat' | 'cotton' | 'pomegranate' | 'vegetables' | 'fodder';

export type WaterFlowDestination =
  | 'edible_agriculture'
  | 'commercial_agriculture'
  | 'big_trees_agroforestry'
  | 'industrial_construction'
  | 'groundwater_recharge'
  | 'retreatment_required';

export interface DestinationSuitability {
  destination: WaterFlowDestination;
  title: string;
  titleMr: string;
  category: 'agriculture' | 'forestry' | 'infrastructure' | 'ecological' | 'safety';
  suitabilityScore: number; // 0 to 100
  isEligible: boolean;
  qualifyingReasons: string[];
  disqualifyingViolations: string[];
  recommendedVolumePercent: number;
  recommendedSites: string[];
  suitableSpeciesOrUses: string[];
  safetyNotes: string;
  iconName: string;
}

export interface WaterRoutingAssessment {
  primaryDestination: WaterFlowDestination;
  secondaryDestination?: WaterFlowDestination;
  allDestinations: DestinationSuitability[];
  explanationRationale: string;
  flowSplits: {
    destination: WaterFlowDestination;
    destinationName: string;
    volumeKLD: number;
    percentage: number;
    distributionChannel: DistributionMethod;
    targetLocation: string;
  }[];
}

// ------------------------------------------------------------------------------
// 1. Municipal Waste & Wastewater Intake Entities
// ------------------------------------------------------------------------------

export interface WasteStreamSource {
  id: string;
  wardId: string;
  wardName: string;
  sourceType: 'residential_drainage' | 'commercial_discharge' | 'stormwater_runoff' | 'market_sludge';
  dailyVolumeKLD: number; // Kilo-liters per day (1 MLD = 1000 KLD)
  initialTurbidityNTU: number;
  initialBOD: number; // mg/L
  initialCOD: number; // mg/L
  lastUpdated: string;
}

export interface WastewaterBatch {
  id: string;
  batchNumber: string; // e.g. 'WW-KMC-2026-B042'
  sourceWardIds: string[];
  intakeVolumeKLD: number; // Volume in Kilo Liters (KLD)
  currentStage: WastewaterWorkflowStage;
  intakeTimestamp: string;
  treatmentPlantId: string;
  status: 'active' | 'completed' | 'rejected_for_retreatment';
  initialParameters: {
    bod: number;
    cod: number;
    tss: number;
    turbidity: number;
    ph: number;
  };
  currentProgressPercent: number; // 0 to 100%
  qualityGrade?: QualityGrade;
  qualitySampleId?: string;
  reusePlanId?: string;
  notes?: string;
}

// ------------------------------------------------------------------------------
// 2. Treatment Plant Entities
// ------------------------------------------------------------------------------

export interface TreatmentStageDetail {
  stageName: 'Primary Screening & Grit' | 'Secondary Biological (MBBR)' | 'Tertiary Sand & Carbon' | 'UV Disinfection & Polishing';
  status: 'pending' | 'in_progress' | 'completed';
  retentionHours: number;
  efficiencyRating: number; // 0 - 100%
  monitoredParameters: {
    dissolvedOxygen?: number; // mg/L
    sludgeVolumeIndex?: number;
    uvDosage?: number; // mJ/cm2
    turbidityReduction?: number; // %
  };
}

export interface TreatmentPlant {
  id: string;
  name: string;
  code: string; // e.g. 'KMC-STP-01'
  location: string;
  coordinates: [number, number];
  capacityMLD: number; // Million Liters per Day
  technology: TreatmentTechnology;
  operationalStatus: 'optimal' | 'maintenance' | 'peak_load';
  dailyIntakeKLD: number;
  dailyTreatedKLD: number;
  stages: TreatmentStageDetail[];
  energyEfficiencyKWhPerKL: number;
}

// ------------------------------------------------------------------------------
// 3. Water Quality & Standards Certification Entities
// ------------------------------------------------------------------------------

export interface WaterQualityParameters {
  ph: number; // Standard: 6.5 - 8.5
  electricalConductivity: number; // EC in dS/m (Salinity) - Safe < 1.5
  sodiumAdsorptionRatio: number; // SAR - Safe < 6.0
  bod: number; // Biochemical Oxygen Demand mg/L - Safe < 10 (Grade A), < 30 (Grade B)
  cod: number; // Chemical Oxygen Demand mg/L - Safe < 50 (Grade A), < 100 (Grade B)
  tss: number; // Total Suspended Solids mg/L - Safe < 10 (Grade A), < 20 (Grade B)
  fecalColiforms: number; // MPN/100ml - Safe < 100 (Grade A), < 1000 (Grade B)
  heavyMetalsPpb: {
    lead: number; // ppb, max 50
    cadmium: number; // ppb, max 10
    arsenic: number; // ppb, max 10
  };
  nutrientsMgL: {
    nitrogen: number; // N (Beneficial: 15-30 mg/L)
    phosphorus: number; // P (Beneficial: 5-15 mg/L)
    potassium: number; // K (Beneficial: 10-25 mg/L)
  };
}

export interface QualityCheckSample {
  id: string;
  batchId: string;
  batchNumber: string;
  testedAt: string;
  labTechnicianName: string;
  certifiedOfficerName: string;
  parameters: WaterQualityParameters;
  grade: QualityGrade;
  cpcbCompliance: boolean;
  waterQualityIndex: number; // 0 to 100 score
  suitableCrops: CropCategory[];
  restrictionNotes: string;
  qrVerificationHash: string;
  isRetreatmentRecommended: boolean;
  routingAssessment?: WaterRoutingAssessment;
}

// ------------------------------------------------------------------------------
// 4. Reuse Plan & Allocation Entities
// ------------------------------------------------------------------------------

export interface AgriculturalCommandZone {
  id: string;
  name: string;
  code: string; // e.g. 'AGRI-ZONE-NORTH'
  majorCrops: CropCategory[];
  totalAcreageHectares: number;
  dailyWaterRequirementKLD: number;
  distributionModeSupported: DistributionMethod[];
  canalDistanceKm: number;
  pipelineConnected: boolean;
  coordinates: [number, number];
}

export interface WaterAllocationItem {
  id: string;
  bookingId?: string;
  farmerName: string;
  farmerPhone: string;
  commandZoneId: string;
  commandZoneName: string;
  cropType: CropCategory;
  acreage: number;
  allocatedVolumeKLD: number;
  distributionMethod: DistributionMethod;
  assignedTankerCode?: string;
  dispatchTime: string;
  deliveredStatus: 'scheduled' | 'dispatched' | 'delivered';
  subsidizedRateInrPerKL: number; // e.g. ₹15 / KL
  commercialSavingsInr: number; // savings vs fresh groundwater tanker (₹180/KL)
}

export interface WaterReusePlan {
  id: string;
  planCode: string; // e.g. 'WRP-2026-08-29-01'
  batchId: string;
  batchNumber: string;
  qualityGrade: QualityGrade;
  primaryDestination?: WaterFlowDestination;
  targetCommandZoneId: string;
  totalVolumeAvailableKLD: number;
  totalVolumeAllocatedKLD: number;
  distributionMethod: DistributionMethod;
  status: 'draft' | 'approved' | 'dispatched' | 'completed';
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  items: WaterAllocationItem[];
  totalFarmerBeneficiaries: number;
  totalCommercialSavingsInr: number;
  createdAt: string;
  routingAssessment?: WaterRoutingAssessment;
}

// ------------------------------------------------------------------------------
// 5. Farmer Demand Bookings & Circular Impact Entities
// ------------------------------------------------------------------------------

export interface FarmerBooking {
  id: string;
  bookingNumber: string; // e.g. 'AGR-BK-2026-091'
  farmerName: string;
  farmerPhone: string;
  aadhaarOrKisanId: string;
  wardOrVillage: string;
  commandZoneId: string;
  cropType: CropCategory;
  farmAcreage: number; // in Acres
  requestedVolumeKLD: number;
  preferredDeliveryDate: string;
  preferredDistribution: DistributionMethod;
  status: 'pending' | 'allocated' | 'fulfilled' | 'cancelled';
  allocatedPlanId?: string;
  submittedAt: string;
  soilType?: string;
}

export interface CircularEconomyMetrics {
  totalWastewaterTreatedMLD: number;
  totalAgriculturalReuseKLD: number;
  totalGroundwaterSavedLiters: number;
  godavariRiverPollutionDivertedPercent: number;
  totalFarmerFertilizerSavingsInr: number;
  totalFarmersBenefited: number;
  carbonOffsetKgCO2: number;
}
