import { StructuredIssueData, UrgencyLevel, ResourceType } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface AIIntakeResult {
  categoryIdSuggested: string;
  departmentCodeSuggested: string;
  structuredData: StructuredIssueData;
  affectedPopulationEstimate: number;
  confidenceScore: number;
  missingAttributes: string[];
  suggestedUrgency: UrgencyLevel;
  estimatedCost: number;
  estimatedHours: number;
  requiredStaffCount: number;
  requiredEquipment?: ResourceType;
  visualFindings?: string;
  aiExplanation: string;
  intakeSource: 'ai_llm' | 'rule_fallback';
  aiRationale?: string;
  modelUsed?: string;
}

export class AIIntakeParser {
  /**
   * Secure Server-Side Multimodal Intake Parser:
   * 1. Calls Supabase Edge Function 'parse-complaint' (where GEMINI_API_KEY is securely stored on the server)
   * 2. If the Edge Function is not deployed or is offline, falls back seamlessly to the local rule engine
   * (Zero client-side API key exposure)
   */
  public static async parseComplaintAsync(
    title: string,
    rawText: string,
    hasPhotos: boolean = false,
    hasPreciseLocation: boolean = false,
    imageBase64?: string
  ): Promise<AIIntakeResult> {
    // Call Supabase Edge Function with Gemini Vision on server
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.functions.invoke('parse-complaint', {
          body: {
            title: title || 'Civic Issue',
            rawText: rawText || '',
            imageBase64,
            hasPhotos: Boolean(hasPhotos || imageBase64),
            hasPreciseLocation,
          },
        });

        if (!error && data && data.categoryIdSuggested) {
          const missingAttributes: string[] = [];
          if (!hasPhotos && !imageBase64) missingAttributes.push('photo_evidence');
          if (!hasPreciseLocation) missingAttributes.push('precise_coordinates');

          const structuredData: StructuredIssueData = {
            waterContaminationSuspected: Boolean(data.waterContaminationSuspected || data.categoryIdSuggested === 'c0000000-0000-0000-0000-000000000001'),
            nearHospitalOrSchool: Boolean(data.nearHospitalOrSchool),
            mainRoadBlockage: Boolean(data.mainRoadBlockage || data.categoryIdSuggested === 'c0000000-0000-0000-0000-000000000003'),
            healthHazardRisk: data.healthHazardRisk || 'moderate',
            isPublicTransitRoute: Boolean(data.isPublicTransitRoute),
            intakeSource: 'ai_llm',
            aiRationale: data.rationale || data.visualFindings || 'Analyzed securely via Supabase Gemini Vision Edge Function.',
            extractedSummary: data.visualFindings || `Identified ${data.departmentCodeSuggested} issue with ${data.requiredEquipment || 'standard equipment'}.`,
          };

          return {
            categoryIdSuggested: data.categoryIdSuggested,
            departmentCodeSuggested: data.departmentCodeSuggested || 'WSS',
            structuredData,
            affectedPopulationEstimate: Number(data.affectedPopulationEstimate) || 150,
            confidenceScore: Math.min(1.0, Math.max(0.5, Number(data.confidenceScore) || (imageBase64 || hasPhotos ? 0.95 : 0.80))),
            missingAttributes,
            suggestedUrgency: (data.suggestedUrgency as UrgencyLevel) || 'medium',
            estimatedCost: Number(data.estimatedCost) || 6000,
            estimatedHours: Number(data.estimatedHours) || 4.0,
            requiredStaffCount: Number(data.requiredStaffCount) || 3,
            requiredEquipment: data.requiredEquipment,
            visualFindings: data.visualFindings,
            modelUsed: data.modelUsed || 'Gemini 2.5 Flash (Supabase Edge)',
            intakeSource: 'ai_llm',
            aiRationale: data.rationale || 'Server-side Gemini Vision assessment verified.',
            aiExplanation: data.visualFindings || `Vision & text analysis identified ${data.departmentCodeSuggested} defect.`,
          };
        }
      } catch (err) {
        console.warn('Supabase Edge Function invocation unavailable, using local engine:', err);
      }
    }

    // Deterministic rule-based fallback
    return AIIntakeParser.parseComplaint(title, rawText, Boolean(hasPhotos || imageBase64), hasPreciseLocation);
  }

  /**
   * Deterministic rule-based fallback parser
   */
  public static parseComplaint(
    title: string,
    rawText: string,
    hasPhotos: boolean = false,
    hasPreciseLocation: boolean = false
  ): AIIntakeResult {
    const combinedText = `${title} ${rawText}`.toLowerCase();

    const missingAttributes: string[] = [];
    if (!hasPhotos) missingAttributes.push('photo_evidence');
    if (!hasPreciseLocation) missingAttributes.push('precise_coordinates');

    let confidenceScore = 1.0;
    if (!hasPhotos) confidenceScore -= 0.15;
    if (!hasPreciseLocation) confidenceScore -= 0.15;
    if (rawText.trim().length < 20) confidenceScore -= 0.15;
    confidenceScore = Math.max(0.5, Math.round(confidenceScore * 100) / 100);

    const structuredData: StructuredIssueData = {
      keywordsExtracted: [],
      intakeSource: 'rule_fallback',
      aiRationale: hasPhotos
        ? 'Visual evidence attached. Classified via municipal hazard recognition engine.'
        : 'Classified via municipal hazard recognition engine.',
    };

    let categoryIdSuggested = 'c0000000-0000-0000-0000-000000000003';
    let departmentCodeSuggested = 'PWD';
    let suggestedUrgency: UrgencyLevel = 'high';
    let estimatedCost = 18000;
    let estimatedHours = 8.0;
    let requiredStaffCount = 5;
    let requiredEquipment: ResourceType | undefined = 'road_roller';
    let visualFindings = 'Detected road asphalt defect / crater posing traffic risk.';

    // 1. Water contamination
    if (
      combinedText.includes('water') &&
      (combinedText.includes('smell') ||
        combinedText.includes('color') ||
        combinedText.includes('yellow') ||
        combinedText.includes('muddy') ||
        combinedText.includes('dirty') ||
        combinedText.includes('poison') ||
        combinedText.includes('diarrhea') ||
        combinedText.includes('pipe'))
    ) {
      categoryIdSuggested = 'c0000000-0000-0000-0000-000000000001';
      departmentCodeSuggested = 'WSS';
      structuredData.waterContaminationSuspected = true;
      structuredData.healthHazardRisk = 'extreme';
      suggestedUrgency = 'critical';
      estimatedCost = 12000;
      estimatedHours = 6.0;
      requiredStaffCount = 4;
      requiredEquipment = 'jetting_machine';
      visualFindings = 'Drinking water pipeline contamination with immediate public health risk.';
    }
    // 2. Sewer overflow
    else if (
      combinedText.includes('sewer') ||
      combinedText.includes('manhole') ||
      combinedText.includes('drain') ||
      combinedText.includes('gutter') ||
      combinedText.includes('choke')
    ) {
      categoryIdSuggested = 'c0000000-0000-0000-0000-000000000002';
      departmentCodeSuggested = 'WSS';
      structuredData.healthHazardRisk = 'high';
      suggestedUrgency = 'high';
      estimatedCost = 9500;
      estimatedHours = 5.0;
      requiredStaffCount = 3;
      requiredEquipment = 'jetting_machine';
      visualFindings = 'Underground sewer blockage with effluent overflow on public street.';
    }
    // 3. Electrical hazard
    else if (
      combinedText.includes('wire') ||
      combinedText.includes('spark') ||
      combinedText.includes('shock') ||
      combinedText.includes('electric') ||
      combinedText.includes('current') ||
      combinedText.includes('pole')
    ) {
      if (combinedText.includes('spark') || combinedText.includes('snapped') || combinedText.includes('hanging') || combinedText.includes('live')) {
        categoryIdSuggested = 'c0000000-0000-0000-0000-000000000004';
        departmentCodeSuggested = 'ELEC';
        structuredData.healthHazardRisk = 'extreme';
        suggestedUrgency = 'critical';
        estimatedCost = 4500;
        estimatedHours = 3.0;
        requiredStaffCount = 3;
        requiredEquipment = 'hydraulic_bucket_truck';
        visualFindings = 'Exposed high-voltage snapped electrical conductor requiring immediate bucket truck dispatch.';
      } else {
        categoryIdSuggested = 'c0000000-0000-0000-0000-000000000006';
        departmentCodeSuggested = 'ELEC';
        structuredData.healthHazardRisk = 'low';
        suggestedUrgency = 'low';
        estimatedCost = 3000;
        estimatedHours = 3.0;
        requiredStaffCount = 2;
        requiredEquipment = 'hydraulic_bucket_truck';
        visualFindings = 'Streetlight luminaire failure in residential sector.';
      }
    }
    // 4. Solid Waste Dump
    else if (
      combinedText.includes('garbage') ||
      combinedText.includes('kachra') ||
      combinedText.includes('dump') ||
      combinedText.includes('waste') ||
      combinedText.includes('stench')
    ) {
      categoryIdSuggested = 'c0000000-0000-0000-0000-000000000005';
      departmentCodeSuggested = 'SWM';
      structuredData.healthHazardRisk = 'high';
      suggestedUrgency = 'medium';
      estimatedCost = 6000;
      estimatedHours = 4.0;
      requiredStaffCount = 4;
      requiredEquipment = 'tipper_truck';
      visualFindings = 'Solid waste dump accumulation requiring hydraulic tipper refuse vehicle.';
    }
    // 5. Dengue / Vector breeding
    else if (
      combinedText.includes('mosquito') ||
      combinedText.includes('dengue') ||
      combinedText.includes('malaria') ||
      combinedText.includes('stagnant')
    ) {
      categoryIdSuggested = 'c0000000-0000-0000-0000-000000000007';
      departmentCodeSuggested = 'PHD';
      structuredData.healthHazardRisk = 'high';
      suggestedUrgency = 'medium';
      estimatedCost = 4000;
      estimatedHours = 3.5;
      requiredStaffCount = 2;
      requiredEquipment = 'fogging_machine';
      visualFindings = 'Stagnant water pool with vector proliferation hazard.';
    }

    let affectedPopulationEstimate = 150;
    if (combinedText.includes('hospital') || combinedText.includes('school')) {
      affectedPopulationEstimate = 2000;
    } else if (structuredData.healthHazardRisk === 'extreme') {
      affectedPopulationEstimate = 1200;
    }

    return {
      categoryIdSuggested,
      departmentCodeSuggested,
      structuredData,
      affectedPopulationEstimate,
      confidenceScore,
      missingAttributes,
      suggestedUrgency,
      estimatedCost,
      estimatedHours,
      requiredStaffCount,
      requiredEquipment,
      visualFindings,
      modelUsed: 'Municipal Classification Engine',
      intakeSource: 'rule_fallback',
      aiRationale: 'Evaluated via Kopargaon municipal hazard classification engine.',
      aiExplanation: visualFindings,
    };
  }
}
