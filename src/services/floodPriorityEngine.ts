import {
  ZoneFloodProfile,
  FloodRiskScoreDecomposition,
  FloodRiskTier,
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
   * ranking all zones from Rank #1 to #8 and distributing limited municipal assets.
   */
  public static generateEmergencyDispatchPlan(
    zones: ZoneFloodProfile[],
    damTelemetry: UpstreamDamTelemetry,
    inventory: EmergencyResourceInventory,
    disasterOfficerName: string = 'Er. S. B. Patil (Disaster Response Head)'
  ): FloodDispatchOrder {
    // 1. Evaluate all zones and compute risk scores
    const evaluatedZones = zones.map((zone) => {
      const risk = this.calculateZoneRisk(zone, damTelemetry);
      return { zone, risk };
    });

    // 2. Sort strictly by final risk score descending (Rank #1 gets resources first)
    evaluatedZones.sort((a, b) => b.risk.finalRiskScore - a.risk.finalRiskScore);

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
      const { zone, risk } = item;

      if (risk.riskTier === 'p0_critical' || risk.riskTier === 'p1_high') {
        totalZonesAtRisk++;
      }

      // Determine required resource package based on tier
      let reqPumps = 0;
      let reqBoats = 0;
      let reqSandbags = 0;
      let reqBuses = 0;
      let reqMedical = 0;

      if (risk.riskTier === 'p0_critical') {
        reqBoats = zone.distanceToGodavariRiverMeters <= 200 ? 2 : 1;
        reqPumps = 2;
        reqSandbags = 3;
        reqBuses = 2;
        reqMedical = 1;
      } else if (risk.riskTier === 'p1_high') {
        reqBoats = zone.distanceToGodavariRiverMeters <= 300 ? 1 : 0;
        reqPumps = 1;
        reqSandbags = 2;
        reqBuses = 1;
        reqMedical = 1;
      } else if (risk.riskTier === 'p2_moderate') {
        reqPumps = 1;
        reqSandbags = 1;
      }

      // Allocate from available inventory greedily
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

      // Check for unmet bottleneck
      if (reqBoats > allocBoats) {
        unmetDeficits.push({
          resourceType: 'Inflatable Rescue Boats',
          deficitCount: reqBoats - allocBoats,
          affectedZones: [zone.zoneName],
          recommendation: `Request ${reqBoats - allocBoats} additional SDRF rescue boats from Ahilyanagar Collectorate for ${zone.zoneName}`,
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
        risk.riskTier === 'p0_critical'
          ? 'immediate_dispatch'
          : risk.riskTier === 'p1_high'
          ? 'immediate_dispatch'
          : risk.riskTier === 'p2_moderate'
          ? 'standby_precaution'
          : 'monitoring_safe';

      const etaMinutes = rank * 8; // e.g. Rank 1 = 8 mins, Rank 2 = 16 mins

      dispatchItems.push({
        rank,
        zoneId: zone.id,
        zoneCode: zone.zoneCode,
        zoneName: zone.zoneName,
        wardNumber: zone.wardNumber,
        riskScore: risk.finalRiskScore,
        riskTier: risk.riskTier,
        timeToInundationHours: risk.estimatedTimeToInundationHours,
        allocatedResources: {
          dewateringPumps: allocPumps,
          rescueBoats: allocBoats,
          sandbagTrucks: allocSandbags,
          evacuationBuses: allocBuses,
          medicalReliefVans: allocMedical,
        },
        dispatchStatus,
        dispatchEtaMinutes: etaMinutes,
        evacuationRoute: `Via Shivaji Road ➔ Arterial Link to ${zone.designatedShelterSite}`,
        designatedShelterSite: zone.designatedShelterSite,
        rationale: risk.primaryRiskReason,
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
   */
  public static compareTwoZones(
    zoneA: ZoneFloodProfile,
    zoneB: ZoneFloodProfile,
    damTelemetry: UpstreamDamTelemetry
  ) {
    const riskA = this.calculateZoneRisk(zoneA, damTelemetry);
    const riskB = this.calculateZoneRisk(zoneB, damTelemetry);

    const higherZone = riskA.finalRiskScore >= riskB.finalRiskScore ? zoneA : zoneB;
    const lowerZone = riskA.finalRiskScore >= riskB.finalRiskScore ? zoneB : zoneA;
    const higherRisk = riskA.finalRiskScore >= riskB.finalRiskScore ? riskA : riskB;
    const lowerRisk = riskA.finalRiskScore >= riskB.finalRiskScore ? riskB : riskA;

    const diff = Number((higherRisk.finalRiskScore - lowerRisk.finalRiskScore).toFixed(1));

    const factorDiffs = [
      {
        factor: 'River Proximity',
        delta: higherRisk.riverProximityScore - lowerRisk.riverProximityScore,
        detail: `${higherZone.zoneName} is ${higherZone.distanceToGodavariRiverMeters}m from Godavari vs ${lowerZone.distanceToGodavariRiverMeters}m for ${lowerZone.zoneName}`,
      },
      {
        factor: 'Elevation Deficit',
        delta: higherRisk.elevationScore - lowerRisk.elevationScore,
        detail: `${higherZone.zoneName} elevation is ${higherZone.elevationAboveDatumMeters}m (${lowerZone.elevationAboveDatumMeters - higherZone.elevationAboveDatumMeters}m lower than ${lowerZone.zoneName})`,
      },
      {
        factor: 'Vulnerable Population',
        delta: higherRisk.vulnerablePopulationScore - lowerRisk.vulnerablePopulationScore,
        detail: `${higherZone.vulnerablePopulation.toLocaleString()} vulnerable residents in ${higherZone.zoneName} vs ${lowerZone.vulnerablePopulation.toLocaleString()} in ${lowerZone.zoneName}`,
      },
      {
        factor: 'Critical Infrastructure',
        delta: higherRisk.criticalInfrastructureScore - lowerRisk.criticalInfrastructureScore,
        detail: `${higherZone.criticalInfrastructureCount} critical facilities (${higherZone.criticalInfrastructureNames.join(', ') || 'None'})`,
      },
    ];

    factorDiffs.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    return {
      higherZoneName: higherZone.zoneName,
      lowerZoneName: lowerZone.zoneName,
      scoreDifference: diff,
      topContributingFactors: factorDiffs,
      plainExplanation: `${higherZone.zoneName} ranks +${diff} points higher than ${lowerZone.zoneName} primarily due to closer riverbank proximity (${higherZone.distanceToGodavariRiverMeters}m vs ${lowerZone.distanceToGodavariRiverMeters}m) and lower topographic elevation (${higherZone.elevationAboveDatumMeters}m vs ${lowerZone.elevationAboveDatumMeters}m), warranting first-priority boat and dewatering pump dispatch.`,
      plainExplanationMr: `${higherZone.zoneName} चा पूर धोका ${lowerZone.zoneName} पेक्षा +${diff} गुणांनी जास्त आहे. याचे मुख्य कारण म्हणजे गोदावरी पात्रापासूनचे कमी अंतर (${higherZone.distanceToGodavariRiverMeters} मी) आणि सखल भाग (${higherZone.elevationAboveDatumMeters} मी) यामुळे प्रथम प्राधान्याने बचाव नौका व पंप वाटप मंजूर करण्यात आले आहे.`,
    };
  }
}
