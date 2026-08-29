import {
  ZoneFloodProfile,
  FloodRiskScoreDecomposition,
  FloodRiskTier,
  AreaSeverityAssessment,
  AreaSeverityLevel,
  EmergencyTeamDeployment,
  UpstreamDamTelemetry,
  EmergencyResourceInventory,
  ZoneDispatchPlanItem,
  FloodDispatchOrder,
  DamDischargeAlertLevel,
} from '../types/floodAlert';

// ==============================================================================
// DETERMINISTIC FLOOD RISK & EMERGENCY RESOURCE DISPATCH PRIORITY ENGINE
// Decides which zone gets flood-alert resources first and in what exact sequence.
// ==============================================================================

export class FloodPriorityEngine {
  /**
   * Deterministically calculates the multi-factor Area Severity Assessment.
   * When multiple areas are at risk, this severity score governs which area receives
   * limited emergency rescue teams and pumps first.
   */
  public static calculateAreaSeverity(
    zone: ZoneFloodProfile,
    damTelemetry: UpstreamDamTelemetry
  ): AreaSeverityAssessment {
    // 1. Life Threat Severity (40% Weight): Vulnerable population in riverbank kutcha settlements
    // Higher vulnerable population + closer river proximity = extreme human life hazard
    const proximityMultiplier = Math.max(0.2, (2000 - zone.distanceToGodavariRiverMeters) / 1950);
    const rawLifeThreat = Math.min(
      100,
      Math.round((zone.vulnerablePopulation / 3200) * 100 * proximityMultiplier)
    );

    // 2. Submergence Depth Severity (30% Weight):
    // Physical head difference between Godavari River gauge level and ground elevation
    // Ground: 492.2m vs River: 496.2m => water is +4.0m above local ground datum!
    const submergenceHeadMeters = Math.max(0, damTelemetry.waterLevelMeters - zone.elevationAboveDatumMeters + 1.5);
    const rawSubmergence = Math.min(
      100,
      Math.round((submergenceHeadMeters / 6.0) * 100)
    );

    // 3. Critical Infrastructure Severity (20% Weight):
    // Intake pumping stations, hospitals, power transformers, oxygen plants
    const rawInfra = Math.min(100, zone.criticalInfrastructureCount * 28);

    // 4. Drainage Congestion & Evacuation Route Blockage (10% Weight):
    const rawIsolation = Math.min(100, zone.drainageCongestionIndex * 20);

    // Deterministic Multi-Factor Severity Formula:
    // S_sev = 0.40 * Life + 0.30 * Submergence + 0.20 * Infra + 0.10 * Isolation
    const severityScore = Number(
      (
        rawLifeThreat * 0.40 +
        rawSubmergence * 0.30 +
        rawInfra * 0.20 +
        rawIsolation * 0.10
      ).toFixed(1)
    );

    // Severity Level Classification
    let severityLevel: AreaSeverityAssessment['severityLevel'] = 'low';
    let urgencyWindowMinutes = 180;

    if (severityScore >= 80) {
      severityLevel = 'extreme';
      urgencyWindowMinutes = 20; // Immediate 20-minute emergency team response required
    } else if (severityScore >= 65) {
      severityLevel = 'critical';
      urgencyWindowMinutes = 45;
    } else if (severityScore >= 45) {
      severityLevel = 'high';
      urgencyWindowMinutes = 90;
    } else if (severityScore >= 25) {
      severityLevel = 'moderate';
      urgencyWindowMinutes = 180;
    } else {
      severityLevel = 'low';
      urgencyWindowMinutes = 360;
    }

    let severityRationale = '';
    let severityRationaleMr = '';

    if (severityLevel === 'extreme') {
      severityRationale = `EXTREME SEVERITY: Direct riverfront submergence head (+${submergenceHeadMeters.toFixed(1)}m) combined with ${zone.vulnerablePopulation.toLocaleString()} residents in low-lying kutcha settlements requires Priority #1 emergency rescue boat and heavy pump deployment.`;
      severityRationaleMr = `अति-गंभीर धोका: गोदावरी पात्राजवळ थेट जलमग्नता (+${submergenceHeadMeters.toFixed(1)} मी) आणि ${zone.vulnerablePopulation.toLocaleString()} नागरिकांच्या जीविताचा धोका असल्याने प्रथम प्राधान्याने बचाव पथके व पंप वाटप मंजूर.`;
    } else if (severityLevel === 'critical') {
      severityRationale = `CRITICAL SEVERITY: Severe waterlogging and critical infrastructure at risk (${zone.criticalInfrastructureNames.join(', ') || 'Local grid'}). Dispatch emergency teams before flood peak arrival.`;
      severityRationaleMr = `गंभीर धोका: महत्त्वाच्या पायाभूत सुविधांवर पाणी साचण्याचा धोका (${zone.criticalInfrastructureNames.join(', ') || 'स्थानिक यंत्रणा'}). तातडीने आपत्कालीन पथके तैनात करणे आवश्यक.`;
    } else if (severityLevel === 'high') {
      severityRationale = `HIGH SEVERITY: Runoff accumulation with moderate evacuation buffer. Precautionary de-watering pump and sandbag staging deployed.`;
      severityRationaleMr = `मध्यम-उच्च धोका: पाण्याचा साचणारा प्रवाह. प्रतिबंधात्मक उपसा पंप व वाळू पोती पथके तैनात.`;
    } else {
      severityRationale = `LOW SEVERITY: Naturally elevated terrain (${zone.elevationAboveDatumMeters}m datum). Serves as safe staging and recipient shelter area.`;
      severityRationaleMr = `कमी धोका: नैसर्गिक उंचावरील सुरक्षित भाग (${zone.elevationAboveDatumMeters} मी). आपत्कालीन स्थलांतर केंद्र म्हणून कार्यरत.`;
    }

    return {
      severityLevel,
      severityScore,
      severityRank: 1, // calculated dynamically when ranking
      lifeThreatSeverity: rawLifeThreat,
      submergenceDepthSeverity: rawSubmergence,
      criticalInfrastructureSeverity: rawInfra,
      isolationBlockageSeverity: rawIsolation,
      urgencyWindowMinutes,
      severityRationale,
      severityRationaleMr,
    };
  }

  /**
   * Deterministically calculates the flood risk score and parameter decomposition
   * for a specific zone based on physical geography and live dam telemetry.
   */
  public static calculateZoneRisk(
    zone: ZoneFloodProfile,
    damTelemetry: UpstreamDamTelemetry
  ): FloodRiskScoreDecomposition {
    // 1. Elevation Hazard (Lower elevation = extreme flood submergence)
    // Datum base: 490m (River bed), High Flood Line: ~498m
    const rawElevationScore = Math.max(
      5,
      Math.min(100, Math.round((512 - zone.elevationAboveDatumMeters) * 5.2))
    );

    // 2. River Proximity Hazard (Distance to Godavari banks)
    // 40m = 100 pts, 2000m+ = 5 pts
    const rawProximityScore = Math.max(
      5,
      Math.min(100, Math.round((2200 - zone.distanceToGodavariRiverMeters) / 21.6))
    );

    // 3. Dam Discharge & River Swell Impact
    // Normal (<15k cusecs) = 15pts, Alert (25k-40k) = 65pts, Danger (>50k cusecs) = 100pts
    let baseDamScore = Math.min(100, Math.round((damTelemetry.currentDischargeCusecs / 65000) * 100));
    // Amplify dam surge impact for riverbank zones within 300m
    if (zone.distanceToGodavariRiverMeters <= 300) {
      baseDamScore = Math.min(100, Math.round(baseDamScore * 1.25));
    }

    // 4. Vulnerable Population Density (Slums, kutcha homes, elderly along ghats)
    const rawPopScore = Math.min(100, Math.round((zone.vulnerablePopulation / 3200) * 100));

    // 5. Critical Infrastructure Hazard
    const rawInfraScore = Math.min(100, zone.criticalInfrastructureCount * 25);

    // 6. Drainage Congestion / Historical Waterlogging Index (1 to 5)
    const rawDrainageScore = Math.min(100, zone.drainageCongestionIndex * 20);

    // WEIGHTED DETERMINISTIC FORMULA
    // S_flood = 0.25*Elev + 0.25*Dist + 0.20*Dam + 0.15*Pop + 0.10*Infra + 0.05*Drain
    const finalRiskScore = Number(
      (
        rawElevationScore * 0.25 +
        rawProximityScore * 0.25 +
        baseDamScore * 0.20 +
        rawPopScore * 0.15 +
        rawInfraScore * 0.10 +
        rawDrainageScore * 0.05
      ).toFixed(1)
    );

    // Determine Risk Tier
    let riskTier: FloodRiskTier = 'p3_safe';
    let timeToInundationHours = 24.0;

    if (finalRiskScore >= 75) {
      riskTier = 'p0_critical';
      timeToInundationHours = Number(Math.max(0.5, (100 - finalRiskScore) / 10).toFixed(1)); // 0.5 to 2.5 hrs
    } else if (finalRiskScore >= 55) {
      riskTier = 'p1_high';
      timeToInundationHours = Number((3.0 + (75 - finalRiskScore) / 8).toFixed(1)); // 3 to 5.5 hrs
    } else if (finalRiskScore >= 35) {
      riskTier = 'p2_moderate';
      timeToInundationHours = Number((6.0 + (55 - finalRiskScore) / 5).toFixed(1)); // 6 to 10 hrs
    } else {
      riskTier = 'p3_safe';
      timeToInundationHours = 48.0;
    }

    // Primary Risk Rationale
    let primaryRiskReason = '';
    let primaryRiskReasonMr = '';

    if (zone.distanceToGodavariRiverMeters <= 100 && damTelemetry.currentDischargeCusecs >= 25000) {
      primaryRiskReason = `Immediate riverbank inundation hazard (${zone.distanceToGodavariRiverMeters}m from Godavari Ghats) under ${damTelemetry.currentDischargeCusecs.toLocaleString()} cusecs dam discharge`;
      primaryRiskReasonMr = `गोदावरी नदीपात्राजवळ (${zone.distanceToGodavariRiverMeters} मी) असल्याने व धरण विसर्ग (${damTelemetry.currentDischargeCusecs.toLocaleString()} क्युसेक्स) यामुळे तातडीचा पूर धोका`;
    } else if (zone.elevationAboveDatumMeters <= 494) {
      primaryRiskReason = `Low-lying topographic depression (${zone.elevationAboveDatumMeters}m datum) susceptible to storm surge backflow`;
      primaryRiskReasonMr = `सखल भौगोलिक भाग (${zone.elevationAboveDatumMeters} मी) असल्याने सांडपाणी व पावसाचे पाणी तुंबण्याचा तीव्र धोका`;
    } else if (zone.vulnerablePopulation >= 2000) {
      primaryRiskReason = `High density vulnerable population (${zone.vulnerablePopulation.toLocaleString()} residents in riverbank kutcha settlements)`;
      primaryRiskReasonMr = `नदीकाठच्या कच्च्या वस्त्यांमध्ये उच्च लोकसंख्या धोका (${zone.vulnerablePopulation.toLocaleString()} नागरिक)`;
    } else {
      primaryRiskReason = `Moderate runoff accumulation with elevation safety buffer (${zone.elevationAboveDatumMeters}m)`;
      primaryRiskReasonMr = `उंचावरील सुरक्षित भाग (${zone.elevationAboveDatumMeters} मी) व नियंत्रित पाण्याचा निचरा`;
    }

    return {
      elevationScore: rawElevationScore,
      riverProximityScore: rawProximityScore,
      damDischargeImpactScore: baseDamScore,
      vulnerablePopulationScore: rawPopScore,
      criticalInfrastructureScore: rawInfraScore,
      drainageCongestionScore: rawDrainageScore,
      finalRiskScore,
      riskTier,
      estimatedTimeToInundationHours: timeToInundationHours,
      primaryRiskReason,
      primaryRiskReasonMr,
    };
  }

  /**
   * Generates a resource-constrained emergency dispatch plan
   * ranking all zones strictly by Area Severity Score (#1 to #8)
   * and distributing limited emergency teams and fleet.
   */
  public static generateEmergencyDispatchPlan(
    zones: ZoneFloodProfile[],
    damTelemetry: UpstreamDamTelemetry,
    inventory: EmergencyResourceInventory,
    disasterOfficerName: string = 'Er. S. B. Patil (Disaster Response Head)'
  ): FloodDispatchOrder {
    // 1. Evaluate all zones: compute Risk Decomposition & Area Severity Assessment
    const evaluatedZones = zones.map((zone) => {
      const risk = this.calculateZoneRisk(zone, damTelemetry);
      const severity = this.calculateAreaSeverity(zone, damTelemetry);
      return { zone, risk, severity };
    });

    // 2. Sort strictly by SEVERITY SCORE descending (High Severity receives emergency resources FIRST)
    evaluatedZones.sort((a, b) => b.severity.severityScore - a.severity.severityScore);

    // Assign severityRank to each
    evaluatedZones.forEach((item, index) => {
      item.severity.severityRank = index + 1;
    });

    // 3. Track remaining emergency inventory for greedy knapsack allocation
    let remainingPumps = inventory.dewateringPumps.available;
    let remainingBoats = inventory.rescueBoats.available;
    let remainingSandbags = inventory.sandbagTrucks.available;
    let remainingBuses = inventory.evacuationBuses.available;
    let remainingMedical = inventory.medicalReliefVans.available;

    const dispatchItems: ZoneDispatchPlanItem[] = [];
    const unmetDeficits: {
      resourceType: string;
      deficitCount: number;
      affectedZones: string[];
      recommendation: string;
    }[] = [];

    let totalVulnerableCitizensCovered = 0;
    let totalZonesAtRisk = 0;

    evaluatedZones.forEach((item, index) => {
      const rank = index + 1;
      const { zone, risk, severity } = item;

      if (severity.severityLevel === 'extreme' || severity.severityLevel === 'critical' || severity.severityLevel === 'high') {
        totalZonesAtRisk++;
      }

      // Determine required resource package based on SEVERITY LEVEL
      let reqPumps = 0;
      let reqBoats = 0;
      let reqSandbags = 0;
      let reqBuses = 0;
      let reqMedical = 0;

      if (severity.severityLevel === 'extreme') {
        reqBoats = zone.distanceToGodavariRiverMeters <= 200 ? 2 : 1;
        reqPumps = 2;
        reqSandbags = 3;
        reqBuses = 2;
        reqMedical = 1;
      } else if (severity.severityLevel === 'critical') {
        reqBoats = zone.distanceToGodavariRiverMeters <= 300 ? 1 : 0;
        reqPumps = 2;
        reqSandbags = 2;
        reqBuses = 1;
        reqMedical = 1;
      } else if (severity.severityLevel === 'high') {
        reqPumps = 1;
        reqSandbags = 2;
        reqBuses = 1;
      } else if (severity.severityLevel === 'moderate') {
        reqPumps = 1;
        reqSandbags = 1;
      }

      // Allocate from available inventory greedily based on severity rank
      const allocPumps = Math.min(reqPumps, remainingPumps);
      const allocBoats = Math.min(reqBoats, remainingBoats);
      const allocSandbags = Math.min(reqSandbags, remainingSandbags);
      const allocBuses = Math.min(reqBuses, remainingBuses);
      const allocMedical = Math.min(reqMedical, remainingMedical);

      remainingPumps -= allocPumps;
      remainingBoats -= allocBoats;
      remainingSandbags -= allocSandbags;
      remainingBuses -= allocBuses;
      remainingMedical -= allocMedical;

      if (allocBuses > 0 || allocBoats > 0 || allocPumps > 0) {
        totalVulnerableCitizensCovered += zone.vulnerablePopulation;
      }

      // Build structured Emergency Team Deployments
      const assignedTeams: EmergencyTeamDeployment[] = [];
      if (allocBoats > 0) {
        assignedTeams.push({
          teamId: `team-boat-${rank}`,
          teamType: 'sdrf_boat_rescue_team',
          teamName: `SDRF Motorized Boat Rescue Squad #${rank}`,
          allocatedZoneId: zone.id,
          allocatedZoneName: zone.zoneName,
          severityRank: rank,
          severityScore: severity.severityScore,
          deploymentPriorityReason: `Deployed on Priority #${rank} due to ${severity.severityLevel.toUpperCase()} severity (${severity.severityScore} pts).`,
          deploymentStatus: 'deployed',
        });
      }

      if (allocPumps > 0) {
        assignedTeams.push({
          teamId: `team-pump-${rank}`,
          teamType: 'heavy_pumping_squad',
          teamName: `High-Capacity De-watering Squad #${rank}`,
          allocatedZoneId: zone.id,
          allocatedZoneName: zone.zoneName,
          severityRank: rank,
          severityScore: severity.severityScore,
          deploymentPriorityReason: `Pumping squad allocated to relieve submergence head in ${zone.zoneName}.`,
          deploymentStatus: 'deployed',
        });
      }

      if (allocBuses > 0) {
        assignedTeams.push({
          teamId: `team-bus-${rank}`,
          teamType: 'rapid_evacuation_bus_fleet',
          teamName: `Rapid Evacuation Transit Unit #${rank}`,
          allocatedZoneId: zone.id,
          allocatedZoneName: zone.zoneName,
          severityRank: rank,
          severityScore: severity.severityScore,
          deploymentPriorityReason: `Evacuation fleet assigned to transport ${zone.vulnerablePopulation.toLocaleString()} residents to ${zone.designatedShelterSite}.`,
          deploymentStatus: 'deployed',
        });
      }

      if (allocSandbags > 0) {
        assignedTeams.push({
          teamId: `team-sandbag-${rank}`,
          teamType: 'embankment_sandbag_team',
          teamName: `Embankment Bunding Crew #${rank}`,
          allocatedZoneId: zone.id,
          allocatedZoneName: zone.zoneName,
          severityRank: rank,
          severityScore: severity.severityScore,
          deploymentPriorityReason: `Bunding crew assigned to prevent storm canal breach.`,
          deploymentStatus: 'deployed',
        });
      }

      // Check for unmet bottleneck
      if (reqBoats > allocBoats) {
        unmetDeficits.push({
          resourceType: 'Inflatable Rescue Boats',
          deficitCount: reqBoats - allocBoats,
          affectedZones: [zone.zoneName],
          recommendation: `Request ${reqBoats - allocBoats} additional SDRF rescue boats from Ahilyanagar Collectorate for ${zone.zoneName} (Severity: ${severity.severityScore})`,
        });
      }

      if (reqPumps > allocPumps) {
        unmetDeficits.push({
          resourceType: 'High-Capacity De-watering Pumps',
          deficitCount: reqPumps - allocPumps,
          affectedZones: [zone.zoneName],
          recommendation: `Deploy 1 mobile diesel pump from PWD backup depot to ${zone.zoneName}`,
        });
      }

      const dispatchStatus =
        severity.severityLevel === 'extreme'
          ? 'immediate_dispatch'
          : severity.severityLevel === 'critical'
          ? 'immediate_dispatch'
          : severity.severityLevel === 'high'
          ? 'standby_precaution'
          : 'monitoring_safe';

      const etaMinutes = rank * 6; // e.g. Rank 1 = 6 mins, Rank 2 = 12 mins

      // Severity Conflict Resolution Plain-Language Note
      let conflictNote = '';
      if (rank === 1) {
        conflictNote = `HIGHEST SEVERITY IN MUNICIPALITY: Receives first call on all rescue boats and pumping squads due to peak life hazard score (${severity.lifeThreatSeverity}/100) and lowest topographic elevation (${zone.elevationAboveDatumMeters}m).`;
      } else if (rank === 2) {
        conflictNote = `RANK #2 SEVERITY: Receives secondary rescue fleet immediately following Rank #1 deployment.`;
      } else if (allocBoats === 0 && reqBoats > 0) {
        conflictNote = `RESOURCE CONFLICT: Rescue boats exhausted by higher severity zones (Rank #1 & #2). Queued for standby de-watering pumps and secondary SDRF detachment.`;
      } else {
        conflictNote = `Precautionary deployment allocated in accordance with severity rank #${rank}.`;
      }

      dispatchItems.push({
        rank,
        zoneId: zone.id,
        zoneCode: zone.zoneCode,
        zoneName: zone.zoneName,
        wardNumber: zone.wardNumber,
        riskScore: risk.finalRiskScore,
        riskTier: risk.riskTier,
        severityAssessment: severity,
        timeToInundationHours: risk.estimatedTimeToInundationHours,
        allocatedResources: {
          dewateringPumps: allocPumps,
          rescueBoats: allocBoats,
          sandbagTrucks: allocSandbags,
          evacuationBuses: allocBuses,
          medicalReliefVans: allocMedical,
        },
        assignedTeams,
        dispatchStatus,
        dispatchEtaMinutes: etaMinutes,
        evacuationRoute: `Via Shivaji Road ➔ Arterial Link to ${zone.designatedShelterSite}`,
        designatedShelterSite: zone.designatedShelterSite,
        rationale: severity.severityRationale,
        severityConflictResolutionNote: conflictNote,
      });
    });

    const now = new Date().toISOString();
    const orderNumber = `KMC-FLD-${now.slice(0, 10).replace(/-/g, '')}-${String(Math.floor(100 + Math.random() * 900))}`;

    return {
      id: `fld-order-${Date.now()}`,
      orderNumber,
      createdAt: now,
      damDischargeCusecs: damTelemetry.currentDischargeCusecs,
      riverLevelMeters: damTelemetry.waterLevelMeters,
      alertLevel: damTelemetry.alertLevel,
      disasterOfficerName,
      totalZonesAtRisk,
      totalVulnerableCitizensCovered,
      items: dispatchItems,
      unmetDemandDiagnostics: unmetDeficits,
      isApproved: false,
    };
  }

  /**
   * Pairwise Comparison Explainer: Explains why Zone A was dispatched before Zone B
   * based on specific severity factors.
   */
  public static compareTwoZones(
    zoneA: ZoneFloodProfile,
    zoneB: ZoneFloodProfile,
    damTelemetry: UpstreamDamTelemetry
  ) {
    const sevA = this.calculateAreaSeverity(zoneA, damTelemetry);
    const sevB = this.calculateAreaSeverity(zoneB, damTelemetry);

    const higherZone = sevA.severityScore >= sevB.severityScore ? zoneA : zoneB;
    const lowerZone = sevA.severityScore >= sevB.severityScore ? zoneB : zoneA;
    const higherSev = sevA.severityScore >= sevB.severityScore ? sevA : sevB;
    const lowerSev = sevA.severityScore >= sevB.severityScore ? sevB : sevA;

    const diff = Number((higherSev.severityScore - lowerSev.severityScore).toFixed(1));

    const factorDiffs = [
      {
        factor: 'Life Safety & Trapped Population Threat',
        delta: higherSev.lifeThreatSeverity - lowerSev.lifeThreatSeverity,
        detail: `${higherZone.vulnerablePopulation.toLocaleString()} vulnerable residents in ${higherZone.zoneName} vs ${lowerZone.vulnerablePopulation.toLocaleString()} in ${lowerZone.zoneName}`,
      },
      {
        factor: 'Submergence Head & Riverhead Surge',
        delta: higherSev.submergenceDepthSeverity - lowerSev.submergenceDepthSeverity,
        detail: `${higherZone.zoneName} is at ${higherZone.elevationAboveDatumMeters}m datum (${lowerZone.elevationAboveDatumMeters - higherZone.elevationAboveDatumMeters}m lower than ${lowerZone.zoneName}), closer to river (${higherZone.distanceToGodavariRiverMeters}m vs ${lowerZone.distanceToGodavariRiverMeters}m)`,
      },
      {
        factor: 'Critical Infrastructure Hazard',
        delta: higherSev.criticalInfrastructureSeverity - lowerSev.criticalInfrastructureSeverity,
        detail: `${higherZone.criticalInfrastructureCount} critical facilities at risk in ${higherZone.zoneName} (${higherZone.criticalInfrastructureNames.join(', ') || 'Local grid'})`,
      },
      {
        factor: 'Drainage & Evacuation Blockage',
        delta: higherSev.isolationBlockageSeverity - lowerSev.isolationBlockageSeverity,
        detail: `Drainage congestion index: ${higherZone.drainageCongestionIndex}/5 vs ${lowerZone.drainageCongestionIndex}/5`,
      },
    ];

    factorDiffs.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    return {
      higherZoneName: higherZone.zoneName,
      lowerZoneName: lowerZone.zoneName,
      scoreDifference: diff,
      topContributingFactors: factorDiffs,
      plainExplanation: `SEVERITY CONFLICT RESOLUTION: When both areas are at risk, ${higherZone.zoneName} receives limited emergency teams/resources first because its Severity Score (${higherSev.severityScore}/100, ${higherSev.severityLevel.toUpperCase()}) is +${diff} points higher than ${lowerZone.zoneName} (${lowerSev.severityScore}/100, ${lowerSev.severityLevel.toUpperCase()}). The primary driver is higher life threat to ${higherZone.vulnerablePopulation.toLocaleString()} riverbank residents and acute submergence depth.`,
      plainExplanationMr: `तीव्रता प्राधान्य निर्णय: जेव्हा दोन्ही भागांना पूर धोका असतो, तेव्हा ${higherZone.zoneName} ला प्रथम आपत्कालीन पथके व संसाधने दिली जातात, कारण त्याचा तीव्रता गुण (${higherSev.severityScore}/100, ${higherSev.severityLevel.toUpperCase()}) हा ${lowerZone.zoneName} पेक्षा +${diff} ने जास्त आहे. ${higherZone.vulnerablePopulation.toLocaleString()} नागरिकांच्या जीविताचा थेट धोका असल्याने प्रथम बचाव नौका वाटप मंजूर करण्यात आले आहे.`,
    };
  }
}
