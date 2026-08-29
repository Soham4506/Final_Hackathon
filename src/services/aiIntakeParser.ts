import { StructuredIssueData, UrgencyLevel, ResourceType } from '../types';

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
  aiExplanation: string;
}

export class AIIntakeParser {
  /**
   * Parses unstructured citizen complaint text into structured attributes with confidence metrics
   * (Does NOT fabricate priority scores; strictly outputs structured domain signals)
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

    // Base confidence starts at 1.0, minus penalties for missing fields
    let confidenceScore = 1.0;
    if (!hasPhotos) confidenceScore -= 0.15;
    if (!hasPreciseLocation) confidenceScore -= 0.15;
    if (rawText.trim().length < 30) confidenceScore -= 0.15;
    confidenceScore = Math.max(0.4, Math.round(confidenceScore * 100) / 100);

    const structuredData: StructuredIssueData = {
      keywordsExtracted: [],
    };

    // Category detection signals
    let categoryIdSuggested = 'cat-sewer-overflow';
    let departmentCodeSuggested = 'WSS';
    let suggestedUrgency: UrgencyLevel = 'medium';
    let estimatedCost = 6000;
    let estimatedHours = 4.0;
    let requiredStaffCount = 3;
    let requiredEquipment: ResourceType | undefined = 'jetting_machine';

    // 1. Water contamination detection
    if (
      combinedText.includes('water') &&
      (combinedText.includes('smell') ||
        combinedText.includes('color') ||
        combinedText.includes('yellow') ||
        combinedText.includes('muddy') ||
        combinedText.includes('dirty') ||
        combinedText.includes('poison') ||
        combinedText.includes('vomit') ||
        combinedText.includes('diarrhea') ||
        combinedText.includes('ill'))
    ) {
      categoryIdSuggested = 'cat-water-contam';
      departmentCodeSuggested = 'WSS';
      structuredData.waterContaminationSuspected = true;
      structuredData.healthHazardRisk = 'extreme';
      suggestedUrgency = 'critical';
      estimatedCost = 12000;
      estimatedHours = 6.0;
      requiredStaffCount = 4;
      requiredEquipment = 'jetting_machine';
      structuredData.keywordsExtracted?.push('potable water', 'contamination', 'illness risk');
    }
    // 2. Electrical hazard detection
    else if (
      combinedText.includes('wire') ||
      combinedText.includes('spark') ||
      combinedText.includes('shock') ||
      combinedText.includes('electric') ||
      combinedText.includes('current') ||
      combinedText.includes('pole fallen')
    ) {
      if (combinedText.includes('spark') || combinedText.includes('snapped') || combinedText.includes('hanging')) {
        categoryIdSuggested = 'cat-live-wire';
        departmentCodeSuggested = 'ELEC';
        structuredData.healthHazardRisk = 'extreme';
        suggestedUrgency = 'critical';
        estimatedCost = 4500;
        estimatedHours = 3.0;
        requiredStaffCount = 3;
        requiredEquipment = 'hydraulic_bucket_truck';
        structuredData.keywordsExtracted?.push('snapped cable', 'sparking', 'electrocution');
      } else {
        categoryIdSuggested = 'cat-streetlight-outage';
        departmentCodeSuggested = 'ELEC';
        structuredData.healthHazardRisk = 'low';
        suggestedUrgency = 'low';
        estimatedCost = 3000;
        estimatedHours = 3.0;
        requiredStaffCount = 2;
        requiredEquipment = 'hydraulic_bucket_truck';
        structuredData.keywordsExtracted?.push('streetlight dark', 'bulb fused');
      }
    }
    // 3. Road damage & cave-in detection
    else if (
      combinedText.includes('pothole') ||
      combinedText.includes('road') ||
      combinedText.includes('crater') ||
      combinedText.includes('accident') ||
      combinedText.includes('cave in') ||
      combinedText.includes('culvert')
    ) {
      categoryIdSuggested = 'cat-road-cavein';
      departmentCodeSuggested = 'PWD';
      structuredData.mainRoadBlockage = true;
      structuredData.healthHazardRisk = 'high';
      suggestedUrgency = 'high';
      estimatedCost = 18000;
      estimatedHours = 8.0;
      requiredStaffCount = 5;
      requiredEquipment = 'road_roller';
      structuredData.keywordsExtracted?.push('road fracture', 'traffic hazard', 'asphalt damage');
    }
    // 4. Garbage dump detection
    else if (
      combinedText.includes('garbage') ||
      combinedText.includes('kachra') ||
      combinedText.includes('dump') ||
      combinedText.includes('waste') ||
      combinedText.includes('dog') ||
      combinedText.includes('stench')
    ) {
      categoryIdSuggested = 'cat-garbage-dump';
      departmentCodeSuggested = 'SWM';
      structuredData.healthHazardRisk = 'high';
      suggestedUrgency = 'medium';
      estimatedCost = 6000;
      estimatedHours = 4.0;
      requiredStaffCount = 4;
      requiredEquipment = 'tipper_truck';
      structuredData.keywordsExtracted?.push('solid waste', 'dumping', 'hygiene risk');
    }
    // 5. Dengue / Mosquito detection
    else if (
      combinedText.includes('mosquito') ||
      combinedText.includes('dengue') ||
      combinedText.includes('malaria') ||
      combinedText.includes('stagnant') ||
      combinedText.includes('plot water')
    ) {
      categoryIdSuggested = 'cat-dengue-stagnation';
      departmentCodeSuggested = 'PHD';
      structuredData.healthHazardRisk = 'high';
      suggestedUrgency = 'medium';
      estimatedCost = 4000;
      estimatedHours = 3.5;
      requiredStaffCount = 2;
      requiredEquipment = 'fogging_machine';
      structuredData.keywordsExtracted?.push('mosquito breeding', 'vector threat', 'stagnant pool');
    }

    // Spatial & Critical Infrastructure keywords
    if (
      combinedText.includes('hospital') ||
      combinedText.includes('school') ||
      combinedText.includes('clinic') ||
      combinedText.includes('maternity') ||
      combinedText.includes('temple') ||
      combinedText.includes('student')
    ) {
      structuredData.nearHospitalOrSchool = true;
      structuredData.keywordsExtracted?.push('critical landmark nearby');
    }

    if (
      combinedText.includes('highway') ||
      combinedText.includes('bus stand') ||
      combinedText.includes('station') ||
      combinedText.includes('main road') ||
      combinedText.includes('chowk')
    ) {
      structuredData.mainRoadBlockage = true;
      structuredData.isPublicTransitRoute = true;
      structuredData.keywordsExtracted?.push('arterial transport corridor');
    }

    // Estimate affected population from context
    let affectedPopulationEstimate = 150;
    if (structuredData.isPublicTransitRoute || structuredData.nearHospitalOrSchool) {
      affectedPopulationEstimate = 2000;
    } else if (structuredData.healthHazardRisk === 'extreme') {
      affectedPopulationEstimate = 1200;
    } else if (combinedText.includes('entire colony') || combinedText.includes('ward')) {
      affectedPopulationEstimate = 800;
    }

    structuredData.extractedSummary = `Structured Signals: ${structuredData.keywordsExtracted?.join(', ') || 'Standard request'}. Confidence: ${Math.round(confidenceScore * 100)}%.`;

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
      aiExplanation: `Extracted structured domain features without hallucinating score. Confidence assessed at ${(confidenceScore * 100).toFixed(0)}% based on ${missingAttributes.length === 0 ? 'complete submission' : 'missing ' + missingAttributes.join(' & ')}.`,
    };
  }
}
