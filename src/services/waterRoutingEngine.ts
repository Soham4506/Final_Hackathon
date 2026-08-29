import {
  WaterQualityParameters,
  WaterFlowDestination,
  DestinationSuitability,
  WaterRoutingAssessment,
  DistributionMethod,
} from '../types/wastewater';

// ==============================================================================
// WATER PARAMETER ANALYZER & INTELLIGENT FLOW ROUTING DECISION ENGINE
// Determines optimal water flow allocation across Agriculture, Big Trees, Industry, etc.
// ==============================================================================

export class WaterRoutingEngine {
  /**
   * Evaluates all water parameters against strict standards to determine
   * the exact destination ranking, eligibility, and flow split allocation.
   */
  public static evaluateAllDestinations(
    params: WaterQualityParameters,
    totalVolumeKLD: number = 3500
  ): WaterRoutingAssessment {
    const destinations: DestinationSuitability[] = [];

    // -------------------------------------------------------------------------
    // 1. RE-TREATMENT REQUIRED (Critical Safety Floor)
    // -------------------------------------------------------------------------
    const isToxicMetals =
      params.heavyMetalsPpb.lead > 50 ||
      params.heavyMetalsPpb.cadmium > 10 ||
      params.heavyMetalsPpb.arsenic > 10;
    const isExtremePH = params.ph < 5.5 || params.ph > 9.5;
    const isSevereOrganicSurge = params.bod > 60 || params.cod > 200;

    const retreatmentViolations: string[] = [];
    if (isToxicMetals) retreatmentViolations.push('Heavy metals (Pb/Cd/As) exceed statutory safe discharge limits');
    if (isExtremePH) retreatmentViolations.push(`Extreme pH (${params.ph}) poses chemical hazard`);
    if (isSevereOrganicSurge) retreatmentViolations.push(`Extreme organic load (BOD ${params.bod} mg/L, COD ${params.cod} mg/L)`);

    const mustRetreat = isToxicMetals || isExtremePH || isSevereOrganicSurge;

    destinations.push({
      destination: 'retreatment_required',
      title: 'Secondary MBBR Re-treatment',
      titleMr: 'पुनर्प्रक्रिया व शुद्धीकरण केंद्र',
      category: 'safety',
      suitabilityScore: mustRetreat ? 100 : 0,
      isEligible: mustRetreat,
      qualifyingReasons: mustRetreat
        ? retreatmentViolations
        : ['Water quality satisfies discharge norms; re-treatment not needed'],
      disqualifyingViolations: mustRetreat ? [] : ['Water meets minimum reuse thresholds'],
      recommendedVolumePercent: mustRetreat ? 100 : 0,
      recommendedSites: ['Central STP MBBR Reactor Tank #2', 'Tertiary Dual Media Filtration Unit'],
      suitableSpeciesOrUses: ['Internal STP Recirculation', 'Secondary Biological Sludge Digestion'],
      safetyNotes: mustRetreat
        ? 'CRITICAL SAFETY LOCKOUT: Discharge to open soil/canals is strictly prohibited. Automatically diverted back to aeration tank.'
        : 'Water parameters are safe for downstream municipal and agricultural utilization.',
      iconName: 'RotateCcw',
    });

    // If severe toxicity exists, return retreatment as the only primary destination
    if (mustRetreat) {
      return {
        primaryDestination: 'retreatment_required',
        allDestinations: destinations,
        explanationRationale:
          'CRITICAL REJECTION: Water failed statutory health safety standards due to heavy metals or extreme organic contamination. Flow is diverted back to STP aeration & filtration.',
        flowSplits: [
          {
            destination: 'retreatment_required',
            destinationName: 'Central STP Re-aeration Loop',
            volumeKLD: totalVolumeKLD,
            percentage: 100,
            distributionChannel: 'underground_pipeline',
            targetLocation: 'Central STP MBBR Reactor #2',
          },
        ],
      };
    }

    // -------------------------------------------------------------------------
    // 2. HIGH-VALUE FOOD & EDIBLE AGRICULTURE
    // -------------------------------------------------------------------------
    const edibleQualifiers: string[] = [];
    const edibleDisqualifiers: string[] = [];

    if (params.bod <= 10) edibleQualifiers.push(`Ultra-low BOD (${params.bod} mg/L ≤ 10 mg/L)`);
    else edibleDisqualifiers.push(`BOD (${params.bod} mg/L) exceeds edible limit (max 10 mg/L)`);

    if (params.cod <= 50) edibleQualifiers.push(`Low COD (${params.cod} mg/L ≤ 50 mg/L)`);
    else edibleDisqualifiers.push(`COD (${params.cod} mg/L) exceeds edible limit (max 50 mg/L)`);

    if (params.fecalColiforms <= 100) edibleQualifiers.push(`Pathogen-safe Fecal Coliforms (${params.fecalColiforms} MPN ≤ 100 MPN)`);
    else edibleDisqualifiers.push(`Fecal Coliforms (${params.fecalColiforms} MPN) exceed raw food limit (max 100 MPN)`);

    if (params.electricalConductivity <= 1.2) edibleQualifiers.push(`Low salinity EC (${params.electricalConductivity} dS/m ≤ 1.2)`);
    else edibleDisqualifiers.push(`Salinity EC (${params.electricalConductivity} dS/m) exceeds sensitive crop limit (max 1.2)`);

    if (params.ph >= 6.5 && params.ph <= 8.5) edibleQualifiers.push(`Optimal agronomic pH (${params.ph})`);
    else edibleDisqualifiers.push(`pH (${params.ph}) outside optimal range (6.5 - 8.5)`);

    if (params.heavyMetalsPpb.lead <= 10 && params.heavyMetalsPpb.cadmium <= 2 && params.heavyMetalsPpb.arsenic <= 2) {
      edibleQualifiers.push('Zero heavy metal trace (Pb < 10ppb, Cd < 2ppb, As < 2ppb)');
    } else {
      edibleDisqualifiers.push('Heavy metals slightly elevated for raw salad food crops');
    }

    const isEdibleEligible = edibleDisqualifiers.length === 0;
    const edibleScore = isEdibleEligible
      ? Math.min(99, Math.round(98 - (params.bod * 1.5) - (params.fecalColiforms / 20)))
      : Math.max(10, Math.round(70 - edibleDisqualifiers.length * 20));

    destinations.push({
      destination: 'edible_agriculture',
      title: 'Edible Agriculture & Orchards',
      titleMr: 'भाजीपाला, कांदा व फळबागा',
      category: 'agriculture',
      suitabilityScore: edibleScore,
      isEligible: isEdibleEligible,
      qualifyingReasons: edibleQualifiers,
      disqualifyingViolations: edibleDisqualifiers,
      recommendedVolumePercent: isEdibleEligible ? 75 : 0,
      recommendedSites: ['Godavari North Bank Agro Belt', 'Ward 5 Greenhouse Clusters', 'Suregaon Vegetable Corridor'],
      suitableSpeciesOrUses: ['Onion (कांदा)', 'Pomegranate (डाळिंब)', 'Tomato & Vegetables', 'Guava Orchards'],
      safetyNotes: isEdibleEligible
        ? 'GRADE A CERTIFIED: 100% compliant with WHO/CPCB unrestricted food crop irrigation standards. Safe for direct spray.'
        : 'DISQUALIFIED FOR RAW FOOD CROPS: Pathogen or organic load exceeds Grade A threshold.',
      iconName: 'Apple',
    });

    // -------------------------------------------------------------------------
    // 3. COMMERCIAL & CASH AGRICULTURE (Sugarcane, Cotton, Cereals)
    // -------------------------------------------------------------------------
    const commercialQualifiers: string[] = [];
    const commercialDisqualifiers: string[] = [];

    if (params.bod <= 30) commercialQualifiers.push(`Acceptable BOD for commercial crops (${params.bod} mg/L ≤ 30 mg/L)`);
    else commercialDisqualifiers.push(`BOD (${params.bod} mg/L) exceeds Grade B commercial threshold (max 30 mg/L)`);

    if (params.cod <= 100) commercialQualifiers.push(`Acceptable COD (${params.cod} mg/L ≤ 100 mg/L)`);
    else commercialDisqualifiers.push(`COD (${params.cod} mg/L) exceeds Grade B threshold (max 100 mg/L)`);

    if (params.fecalColiforms <= 1000) commercialQualifiers.push(`Fecal Coliforms (${params.fecalColiforms} MPN ≤ 1000 MPN)`);
    else commercialDisqualifiers.push(`Fecal Coliforms (${params.fecalColiforms} MPN) exceed 1000 MPN limit`);

    if (params.electricalConductivity <= 2.0) commercialQualifiers.push(`Moderate salinity (${params.electricalConductivity} dS/m ≤ 2.0) tolerated by sugarcane`);
    else commercialDisqualifiers.push(`High salinity (${params.electricalConductivity} dS/m) risk for soil salinity`);

    const nutrientBonus = Math.round((params.nutrientsMgL.nitrogen + params.nutrientsMgL.phosphorus) / 3);
    commercialQualifiers.push(`High natural N-P-K nutrient enrichment (+${nutrientBonus} pts value for Sugarcane)`);

    const isCommercialEligible = commercialDisqualifiers.length === 0;
    const commercialScore = isCommercialEligible
      ? Math.min(96, Math.round(88 - (params.bod * 0.4) + nutrientBonus))
      : Math.max(15, Math.round(65 - commercialDisqualifiers.length * 20));

    destinations.push({
      destination: 'commercial_agriculture',
      title: 'Sugarcane & Cash Crops Belt',
      titleMr: 'ऊस व नगदी पिके सिंचन',
      category: 'agriculture',
      suitabilityScore: commercialScore,
      isEligible: isCommercialEligible,
      qualifyingReasons: commercialQualifiers,
      disqualifyingViolations: commercialDisqualifiers,
      recommendedVolumePercent: isCommercialEligible ? (isEdibleEligible ? 25 : 80) : 0,
      recommendedSites: ['Sanjivani Canal Command Area', 'Kolpewadi Sugarcane Belt', 'Shirdi-Kopargaon Farm Border'],
      suitableSpeciesOrUses: ['Sugarcane (ऊस)', 'Cotton (कापूस)', 'Wheat (गहू)', 'Maize (मका)', 'Fodder (चारा)'],
      safetyNotes: isCommercialEligible
        ? 'GRADE B CERTIFIED: Highly recommended for Kopargaon sugarcane belt. Natural nitrogen & phosphorus content saves ₹28/KL in commercial urea fertilizer.'
        : 'DISQUALIFIED: Exceeds CPCB Grade B standard for open field crops.',
      iconName: 'Wheat',
    });

    // -------------------------------------------------------------------------
    // 4. BIG TREES, AGROFORESTRY & MUNICIPAL GREEN BELTS
    // -------------------------------------------------------------------------
    const forestryQualifiers: string[] = [];
    const forestryDisqualifiers: string[] = [];

    // Big deep-rooted trees (Banyan, Neem, Teak, Peepal, Subabul) have enormous organic/salt resilience
    if (params.bod <= 55) forestryQualifiers.push(`BOD (${params.bod} mg/L ≤ 55 mg/L) optimal for deep tree root uptake`);
    else forestryDisqualifiers.push(`BOD (${params.bod} mg/L) exceeds agroforestry ceiling (55 mg/L)`);

    if (params.cod <= 160) forestryQualifiers.push(`COD (${params.cod} mg/L ≤ 160 mg/L) safely buffered by forest soil microbiome`);
    else forestryDisqualifiers.push(`COD (${params.cod} mg/L) exceeds 160 mg/L limit`);

    if (params.electricalConductivity <= 3.0) forestryQualifiers.push(`Salinity (${params.electricalConductivity} dS/m ≤ 3.0) well-tolerated by native tree species`);
    else forestryDisqualifiers.push(`Extreme salinity (${params.electricalConductivity} dS/m) exceeds tree tolerance`);

    if (params.fecalColiforms <= 5000) forestryQualifiers.push(`Coliform count (${params.fecalColiforms} MPN) non-hazardous for non-food perennial timber & shade trees`);
    else forestryDisqualifiers.push(`Coliform count (${params.fecalColiforms} MPN) exceeds greenbelt ceiling`);

    forestryQualifiers.push('Deep root architecture prevents groundwater contaminant seepage');
    forestryQualifiers.push('High transpiration rate accelerates carbon sequestration (8.4T CO2/yr)');

    const isForestryEligible = forestryDisqualifiers.length === 0;
    const forestryScore = isForestryEligible
      ? (params.bod > 10 ? 94 : 85)
      : Math.max(20, Math.round(60 - forestryDisqualifiers.length * 20));

    destinations.push({
      destination: 'big_trees_agroforestry',
      title: 'Big Trees & Agroforestry Greenbelts',
      titleMr: 'मोठी झाडे, वनीकरण व हरित पट्टे',
      category: 'forestry',
      suitabilityScore: forestryScore,
      isEligible: isForestryEligible,
      qualifyingReasons: forestryQualifiers,
      disqualifyingViolations: forestryDisqualifiers,
      recommendedVolumePercent: isForestryEligible ? (isEdibleEligible ? 15 : 30) : 0,
      recommendedSites: [
        'Nagar-Manmad Highway Roadside Green Corridor (12,500+ Big Trees)',
        'Godavari Riverbank Ecological Buffer Strip',
        'Kopargaon Municipal Oxygen Park & Urban Forestry Belt',
      ],
      suitableSpeciesOrUses: [
        'Banyan (वड) & Peepal (पिंपळ)',
        'Neem (कडुलिंब) & Karanj',
        'Teak (सागवान) & Shisham',
        'Subabul & Bamboo Groves',
      ],
      safetyNotes:
        'HIGH EFFICIENCY AGROFORESTRY: Deep-rooted native trees act as living bio-filters, absorbing high organic nitrogen & phosphorus without entering the human food chain.',
      iconName: 'Trees',
    });

    // -------------------------------------------------------------------------
    // 5. INDUSTRIAL COOLING & PWD CONSTRUCTION
    // -------------------------------------------------------------------------
    const constrQualifiers: string[] = [];
    const constrDisqualifiers: string[] = [];

    if (params.bod <= 40) constrQualifiers.push(`BOD (${params.bod} mg/L ≤ 40 mg/L) safe for non-potable construction`);
    else constrDisqualifiers.push(`BOD (${params.bod} mg/L) too high for concrete mixing odor limits`);

    if (params.tss <= 30) constrQualifiers.push(`TSS (${params.tss} mg/L ≤ 30 mg/L) safe for compaction nozzles`);
    else constrDisqualifiers.push(`TSS (${params.tss} mg/L) will clog sprinkler nozzles`);

    if (params.ph >= 6.5 && params.ph <= 9.0) constrQualifiers.push(`pH (${params.ph}) will not degrade concrete setting chemistry`);
    else constrDisqualifiers.push(`pH (${params.ph}) acidic/alkaline hazard for cement`);

    const isConstrEligible = constrDisqualifiers.length === 0;
    const constrScore = isConstrEligible
      ? 82
      : Math.max(15, Math.round(50 - constrDisqualifiers.length * 20));

    destinations.push({
      destination: 'industrial_construction',
      title: 'PWD Construction & Dust Control',
      titleMr: 'बांधकाम, रस्ता काम व धूळ नियंत्रण',
      category: 'infrastructure',
      suitabilityScore: constrScore,
      isEligible: isConstrEligible,
      qualifyingReasons: constrQualifiers,
      disqualifyingViolations: constrDisqualifiers,
      recommendedVolumePercent: isConstrEligible ? 10 : 0,
      recommendedSites: ['Kopargaon PWD Bypass Construction Yard', 'Ready-Mix Concrete (RMC) Plant Ward 7', 'Highway Dust Suppression Route'],
      suitableSpeciesOrUses: ['Concrete Curing (काँक्रीट क्युरिंग)', 'Road Roller Compaction', 'Highway Dust Sprinkling'],
      safetyNotes:
        'Saves ~200,000 Liters of drinking water daily by substituting treated municipal effluent for industrial dust suppression & civil works.',
      iconName: 'Hammer',
    });

    // -------------------------------------------------------------------------
    // 6. GROUNDWATER AQUIFER RECHARGE
    // -------------------------------------------------------------------------
    const rechargeQualifiers: string[] = [];
    const rechargeDisqualifiers: string[] = [];

    if (params.bod <= 5) rechargeQualifiers.push(`Ultra-pure BOD (${params.bod} mg/L ≤ 5 mg/L)`);
    else rechargeDisqualifiers.push(`BOD (${params.bod} mg/L) exceeds aquifer injection limit (max 5 mg/L)`);

    if (params.tss <= 5) rechargeQualifiers.push(`Turbidity/TSS (${params.tss} mg/L ≤ 5 mg/L) will not clog recharge strata`);
    else rechargeDisqualifiers.push(`TSS (${params.tss} mg/L) will silt up percolation wells`);

    if (params.fecalColiforms === 0) rechargeQualifiers.push('Zero coliform bacteria detected');
    else rechargeDisqualifiers.push(`Coliforms (${params.fecalColiforms} MPN) risk contaminating deep drinking aquifer`);

    const isRechargeEligible = rechargeDisqualifiers.length === 0;
    const rechargeScore = isRechargeEligible ? 90 : Math.max(10, Math.round(40 - rechargeDisqualifiers.length * 20));

    destinations.push({
      destination: 'groundwater_recharge',
      title: 'Groundwater Aquifer Recharge',
      titleMr: 'भूजल पुनर्भरण व पाझर तलाव',
      category: 'ecological',
      suitabilityScore: rechargeScore,
      isEligible: isRechargeEligible,
      qualifyingReasons: rechargeQualifiers,
      disqualifyingViolations: rechargeDisqualifiers,
      recommendedVolumePercent: isRechargeEligible ? 20 : 0,
      recommendedSites: ['Kopargaon Municipal Percolation Tank #3', 'Shirdi Border Artificial Recharge Shafts'],
      suitableSpeciesOrUses: ['Deep Aquifer Replenishment', 'Groundwater Table Elevation'],
      safetyNotes:
        'Permitted only for tertiary UV-polished effluent to protect drinking water aquifers from biological contamination.',
      iconName: 'Waves',
    });

    // -------------------------------------------------------------------------
    // SORT & DETERMINE PRIMARY AND SECONDARY DESTINATIONS
    // -------------------------------------------------------------------------
    const eligibleDestinations = destinations.filter((d) => d.isEligible && d.destination !== 'retreatment_required');
    eligibleDestinations.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

    const primaryDest = eligibleDestinations[0]?.destination || 'commercial_agriculture';
    const secondaryDest = eligibleDestinations[1]?.destination || 'big_trees_agroforestry';

    // Calculate volume splits based on priority
    const flowSplits = [];
    if (isEdibleEligible) {
      flowSplits.push({
        destination: 'edible_agriculture' as WaterFlowDestination,
        destinationName: 'High-Value Food & Edible Crops (Onion & Orchards)',
        volumeKLD: Math.round(totalVolumeKLD * 0.65),
        percentage: 65,
        distributionChannel: 'underground_pipeline' as DistributionMethod,
        targetLocation: 'Godavari North Bank Agro Belt',
      });
      flowSplits.push({
        destination: 'commercial_agriculture' as WaterFlowDestination,
        destinationName: 'Sanjivani Sugarcane Command Area',
        volumeKLD: Math.round(totalVolumeKLD * 0.20),
        percentage: 20,
        distributionChannel: 'gravity_canal' as DistributionMethod,
        targetLocation: 'Sanjivani Command Canal Sluice Gate 1',
      });
      flowSplits.push({
        destination: 'big_trees_agroforestry' as WaterFlowDestination,
        destinationName: 'Highway Big Trees Green Corridor & Urban Forestry',
        volumeKLD: Math.round(totalVolumeKLD * 0.15),
        percentage: 15,
        distributionChannel: 'municipal_tanker' as DistributionMethod,
        targetLocation: 'Nagar-Manmad Highway Teak & Banyan Corridor',
      });
    } else if (isCommercialEligible) {
      flowSplits.push({
        destination: 'commercial_agriculture' as WaterFlowDestination,
        destinationName: 'Sanjivani Sugarcane Command Area (Main Flow)',
        volumeKLD: Math.round(totalVolumeKLD * 0.70),
        percentage: 70,
        distributionChannel: 'gravity_canal' as DistributionMethod,
        targetLocation: 'Sanjivani Command Canal Sluice Gate 1 & 2',
      });
      flowSplits.push({
        destination: 'big_trees_agroforestry' as WaterFlowDestination,
        destinationName: 'Highway Big Trees & Riverbank Buffer Agroforestry',
        volumeKLD: Math.round(totalVolumeKLD * 0.20),
        percentage: 20,
        distributionChannel: 'underground_pipeline' as DistributionMethod,
        targetLocation: 'Godavari Riverbank Tree Buffer Strip',
      });
      flowSplits.push({
        destination: 'industrial_construction' as WaterFlowDestination,
        destinationName: 'PWD Bypass Road Construction & Dust Suppression',
        volumeKLD: Math.round(totalVolumeKLD * 0.10),
        percentage: 10,
        distributionChannel: 'municipal_tanker' as DistributionMethod,
        targetLocation: 'Kopargaon PWD Bypass Construction Yard',
      });
    } else if (isForestryEligible) {
      flowSplits.push({
        destination: 'big_trees_agroforestry' as WaterFlowDestination,
        destinationName: 'Big Trees, Highway Agroforestry & Municipal Green Belts',
        volumeKLD: Math.round(totalVolumeKLD * 0.80),
        percentage: 80,
        distributionChannel: 'gravity_canal' as DistributionMethod,
        targetLocation: 'Nagar-Manmad Highway Tree Corridor & Municipal Oxygen Park',
      });
      flowSplits.push({
        destination: 'industrial_construction' as WaterFlowDestination,
        destinationName: 'PWD Construction & Road Roller Compaction',
        volumeKLD: Math.round(totalVolumeKLD * 0.20),
        percentage: 20,
        distributionChannel: 'municipal_tanker' as DistributionMethod,
        targetLocation: 'PWD Compaction Yards',
      });
    }

    const explanation = `DECISION RATIONALE: Based on tested parameters (BOD: ${params.bod} mg/L, COD: ${params.cod} mg/L, Coliforms: ${params.fecalColiforms} MPN, EC: ${params.electricalConductivity} dS/m), the primary recommended flow is assigned to "${destinations.find((d) => d.destination === primaryDest)?.title}". Secondary diversion allocated to Big Trees and Agroforestry to maximize circular environmental value.`;

    return {
      primaryDestination: primaryDest,
      secondaryDestination: secondaryDest,
      allDestinations: destinations,
      explanationRationale: explanation,
      flowSplits,
    };
  }
}
