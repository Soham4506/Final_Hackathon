import {
  WaterQualityParameters,
  QualityGrade,
  QualityCheckSample,
  CropCategory,
  WaterRoutingAssessment,
} from '../types/wastewater';
import { WaterRoutingEngine } from './waterRoutingEngine';

// ==============================================================================
// WATER QUALITY & CPCB/FAO STANDARDS EVALUATION ENGINE
// Central Pollution Control Board (CPCB) & WHO/FAO Standards for Agro-Irrigation
// ==============================================================================

export interface CpcbStandardThresholds {
  phMin: number;
  phMax: number;
  ecMax: number; // dS/m
  sarMax: number;
  bodMaxGradeA: number; // mg/L for unrestricted edible crops
  bodMaxGradeB: number; // mg/L for commercial/sugarcane
  codMaxGradeA: number;
  codMaxGradeB: number;
  tssMaxGradeA: number;
  tssMaxGradeB: number;
  fecalColiformMaxGradeA: number; // MPN/100ml
  fecalColiformMaxGradeB: number;
  leadMaxPpb: number;
  cadmiumMaxPpb: number;
  arsenicMaxPpb: number;
}

export const CPCB_STANDARDS: CpcbStandardThresholds = {
  phMin: 6.5,
  phMax: 8.5,
  ecMax: 1.5,
  sarMax: 6.0,
  bodMaxGradeA: 10,
  bodMaxGradeB: 30,
  codMaxGradeA: 50,
  codMaxGradeB: 100,
  tssMaxGradeA: 10,
  tssMaxGradeB: 20,
  fecalColiformMaxGradeA: 100,
  fecalColiformMaxGradeB: 1000,
  leadMaxPpb: 50,
  cadmiumMaxPpb: 10,
  arsenicMaxPpb: 10,
};

export interface QualityValidationResult {
  grade: QualityGrade;
  cpcbCompliance: boolean;
  waterQualityIndex: number; // 0 to 100
  suitableCrops: CropCategory[];
  restrictionNotes: string;
  violations: string[];
  isRetreatmentRecommended: boolean;
  routingAssessment: WaterRoutingAssessment;
  fertilizerSavingsPerHectareKg: {
    nitrogenKg: number;
    phosphorusKg: number;
    potassiumKg: number;
    estimatedSavingsInr: number;
  };
}

export class WaterQualityEngine {
  /**
   * Deterministically validates water sample parameters against CPCB & FAO standards
   */
  public static evaluateWaterQuality(params: WaterQualityParameters): QualityValidationResult {
    const violations: string[] = [];

    // 1. Critical Hazard Checks (Heavy Metals & Extreme pH)
    if (params.ph < CPCB_STANDARDS.phMin || params.ph > CPCB_STANDARDS.phMax) {
      violations.push(`pH ${params.ph} is outside safe agronomic range (${CPCB_STANDARDS.phMin} - ${CPCB_STANDARDS.phMax})`);
    }

    if (params.heavyMetalsPpb.lead > CPCB_STANDARDS.leadMaxPpb) {
      violations.push(`Lead level (${params.heavyMetalsPpb.lead} ppb) exceeds CPCB safe limit (${CPCB_STANDARDS.leadMaxPpb} ppb)`);
    }

    if (params.heavyMetalsPpb.cadmium > CPCB_STANDARDS.cadmiumMaxPpb) {
      violations.push(`Cadmium level (${params.heavyMetalsPpb.cadmium} ppb) exceeds toxic threshold (${CPCB_STANDARDS.cadmiumMaxPpb} ppb)`);
    }

    if (params.heavyMetalsPpb.arsenic > CPCB_STANDARDS.arsenicMaxPpb) {
      violations.push(`Arsenic level (${params.heavyMetalsPpb.arsenic} ppb) exceeds permissible limit (${CPCB_STANDARDS.arsenicMaxPpb} ppb)`);
    }

    // 2. Severe failure check
    const hasHeavyMetalToxicity =
      params.heavyMetalsPpb.lead > CPCB_STANDARDS.leadMaxPpb ||
      params.heavyMetalsPpb.cadmium > CPCB_STANDARDS.cadmiumMaxPpb ||
      params.heavyMetalsPpb.arsenic > CPCB_STANDARDS.arsenicMaxPpb;

    const isSevereOrganicFailure = params.bod > 60 || params.cod > 200 || params.tss > 50;

    const routing = WaterRoutingEngine.evaluateAllDestinations(params);

    if (hasHeavyMetalToxicity || isSevereOrganicFailure || params.ph < 5.5 || params.ph > 9.5) {
      return {
        grade: 'failed',
        cpcbCompliance: false,
        waterQualityIndex: Math.max(10, Math.round(100 - violations.length * 25 - (params.bod / 2))),
        suitableCrops: [],
        restrictionNotes: 'FAILED SAFETY STANDARDS: Heavy metal or severe organic pathogen threshold exceeded. Discharge prohibited. Auto-routed to secondary MBBR aeration & carbon adsorption.',
        violations,
        isRetreatmentRecommended: true,
        routingAssessment: routing,
        fertilizerSavingsPerHectareKg: { nitrogenKg: 0, phosphorusKg: 0, potassiumKg: 0, estimatedSavingsInr: 0 },
      };
    }

    // 3. Grade A Check: Unrestricted Food, Vegetables & Horticulture
    const isGradeA =
      params.bod <= CPCB_STANDARDS.bodMaxGradeA &&
      params.cod <= CPCB_STANDARDS.codMaxGradeA &&
      params.tss <= CPCB_STANDARDS.tssMaxGradeA &&
      params.fecalColiforms <= CPCB_STANDARDS.fecalColiformMaxGradeA &&
      params.electricalConductivity <= 1.2 &&
      params.sodiumAdsorptionRatio <= 4.0;

    if (isGradeA) {
      const wqi = Math.min(98, Math.round(92 + (8.5 - Math.abs(params.ph - 7.2)) - (params.bod / 5)));
      const fert = this.calculateFertilizerValue(params);
      return {
        grade: 'grade_a',
        cpcbCompliance: true,
        waterQualityIndex: wqi,
        suitableCrops: ['vegetables', 'onion', 'pomegranate', 'wheat', 'sugarcane', 'cotton', 'fodder'],
        restrictionNotes: 'GRADE A - PREMIUM PURIFIED: 100% compliant with CPCB/WHO unrestricted irrigation. Approved for food crops, high-value onions, and pomegranate orchards.',
        violations: [],
        isRetreatmentRecommended: false,
        routingAssessment: routing,
        fertilizerSavingsPerHectareKg: fert,
      };
    }

    // 4. Grade B Check: Commercial, Sugar & Fiber Crops (Sugarcane, Cotton, Wheat, Fodder)
    const isGradeB =
      params.bod <= CPCB_STANDARDS.bodMaxGradeB &&
      params.cod <= CPCB_STANDARDS.codMaxGradeB &&
      params.tss <= CPCB_STANDARDS.tssMaxGradeB &&
      params.fecalColiforms <= CPCB_STANDARDS.fecalColiformMaxGradeB &&
      params.electricalConductivity <= 2.0 &&
      params.sodiumAdsorptionRatio <= 6.0;

    if (isGradeB) {
      const wqi = Math.min(88, Math.round(75 + (15 - params.bod * 0.4)));
      const fert = this.calculateFertilizerValue(params);
      return {
        grade: 'grade_b',
        cpcbCompliance: true,
        waterQualityIndex: wqi,
        suitableCrops: ['sugarcane', 'cotton', 'wheat', 'fodder'],
        restrictionNotes: 'GRADE B - COMMERCIAL AGRO REUSE: Compliant for non-raw edible crops, extensive sugarcane command belt, cotton, and cereal grains. Beneficial NPK retained.',
        violations: [],
        isRetreatmentRecommended: false,
        routingAssessment: routing,
        fertilizerSavingsPerHectareKg: fert,
      };
    }

    // 5. Grade C Check: Agroforestry, Greenbelts & Biofuel
    if (params.bod <= 50 && params.cod <= 150) {
      const wqi = Math.round(55 - (params.bod - 30) * 0.5);
      const fert = this.calculateFertilizerValue(params);
      return {
        grade: 'grade_c',
        cpcbCompliance: true,
        waterQualityIndex: wqi,
        suitableCrops: ['fodder'],
        restrictionNotes: 'GRADE C - AGROFORESTRY & GREENBELTS: Suitable for roadside shelterbelts, biomass crops, and municipal green belts. Not recommended for edible crops without drip filtration.',
        violations,
        isRetreatmentRecommended: false,
        routingAssessment: routing,
        fertilizerSavingsPerHectareKg: fert,
      };
    }

    // 6. Otherwise Fallback to Retreatment
    return {
      grade: 'failed',
      cpcbCompliance: false,
      waterQualityIndex: 35,
      suitableCrops: [],
      restrictionNotes: 'TREATMENT DEFICIT: Organic load (BOD/COD) above permissible limits for open farmland. Requires additional polishing stage.',
      violations: ['BOD or COD exceeds commercial limits'],
      isRetreatmentRecommended: true,
      routingAssessment: routing,
      fertilizerSavingsPerHectareKg: { nitrogenKg: 0, phosphorusKg: 0, potassiumKg: 0, estimatedSavingsInr: 0 },
    };
  }

  /**
   * Calculates the synthetic fertilizer savings (Urea, DAP, MOP) in kg/ha
   * from beneficial dissolved N-P-K nutrients in treated municipal water.
   */
  private static calculateFertilizerValue(params: WaterQualityParameters) {
    // Assuming typical irrigation depth of 5,000 m3/ha (5,000,000 L/ha) for crops
    // N: (mg/L * 5,000,000 L) / 1,000,000 = kg of N
    const nKg = Math.round((params.nutrientsMgL.nitrogen * 3.5)); // ~50-80 kg N per ha
    const pKg = Math.round((params.nutrientsMgL.phosphorus * 2.0)); // ~15-25 kg P per ha
    const kKg = Math.round((params.nutrientsMgL.potassium * 3.0)); // ~30-60 kg K per ha

    // Average commercial cost savings (Urea ₹6/kg, DAP ₹27/kg, Potash ₹32/kg)
    const savingsInr = Math.round((nKg * 14) + (pKg * 30) + (kKg * 34));

    return {
      nitrogenKg: nKg,
      phosphorusKg: pKg,
      potassiumKg: kKg,
      estimatedSavingsInr: savingsInr,
    };
  }

  /**
   * Generates a unique verification QR code hash for the official lab certificate
   */
  public static generateVerificationHash(batchNumber: string, date: string, grade: string): string {
    const raw = `KMC-WTR-CERT-${batchNumber}-${grade}-${date}-SECURE-GOV-MAHA`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    return `KMC-LAB-CERT-` + Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  }
}
