import {
  WastewaterBatch,
  FarmerBooking,
  AgriculturalCommandZone,
  WaterReusePlan,
  WaterAllocationItem,
  DistributionMethod,
} from '../types/wastewater';

// ==============================================================================
// WATER REUSE & AGRICULTURAL ALLOCATION ENGINE
// Optimal matching of treated municipal batches with farm command clusters
// ==============================================================================

export interface AllocationPlanParams {
  batch: WastewaterBatch;
  commandZones: AgriculturalCommandZone[];
  pendingBookings: FarmerBooking[];
  preferredDistribution?: DistributionMethod;
  officerName: string;
}

export class ReuseAllocationEngine {
  /**
   * Generates an optimal distribution plan matching treated wastewater inventory with farmer quotas
   */
  public static generatePlan(params: AllocationPlanParams): WaterReusePlan {
    const { batch, commandZones, pendingBookings, preferredDistribution = 'gravity_canal', officerName } = params;

    const planCode = `WRP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${batch.batchNumber.slice(-4)}`;
    const totalAvailable = batch.intakeVolumeKLD * 0.95; // 5% evaporative/backwash loss
    let remainingVolume = totalAvailable;

    const allocationItems: WaterAllocationItem[] = [];

    // Filter eligible farmer bookings based on water quality grade compatibility
    const eligibleBookings = pendingBookings.filter((booking) => {
      if (booking.status === 'allocated' || booking.status === 'fulfilled') return false;
      
      // If batch is Grade B, ensure non-edible or commercial crop (sugarcane, cotton, wheat, fodder)
      if (batch.qualityGrade === 'grade_b') {
        return ['sugarcane', 'cotton', 'wheat', 'fodder'].includes(booking.cropType);
      }
      // Grade A allows all crops including vegetables and orchards
      return true;
    });

    // Prioritize high-acreage sugarcane and water-critical orchards
    const sortedBookings = [...eligibleBookings].sort((a, b) => {
      // Prioritize sugarcane/food over fodder
      const priorityOrder: Record<string, number> = {
        sugarcane: 10,
        pomegranate: 9,
        onion: 8,
        wheat: 7,
        cotton: 6,
        vegetables: 8,
        fodder: 4,
      };
      return (priorityOrder[b.cropType] || 0) - (priorityOrder[a.cropType] || 0);
    });

    let itemIndex = 1;
    for (const booking of sortedBookings) {
      if (remainingVolume <= 0) break;

      const zone = commandZones.find((z) => z.id === booking.commandZoneId) || commandZones[0];
      const allocVol = Math.min(remainingVolume, booking.requestedVolumeKLD);

      // Determine actual distribution method
      let distMode = preferredDistribution;
      if (zone.pipelineConnected && preferredDistribution === 'underground_pipeline') {
        distMode = 'underground_pipeline';
      } else if (booking.preferredDistribution === 'municipal_tanker' || !zone.pipelineConnected) {
        distMode = booking.preferredDistribution;
      }

      // Subsidized municipal tariff: ₹15 / 1,000L vs Commercial private borewell/tanker ₹180 / 1,000L
      const subsidizedRate = 15;
      const commercialMarketRate = 180;
      const savings = Math.round(allocVol * (commercialMarketRate - subsidizedRate));

      const item: WaterAllocationItem = {
        id: `alloc-item-${Date.now()}-${itemIndex++}`,
        bookingId: booking.id,
        farmerName: booking.farmerName,
        farmerPhone: booking.farmerPhone,
        commandZoneId: zone.id,
        commandZoneName: zone.name,
        cropType: booking.cropType,
        acreage: booking.farmAcreage,
        allocatedVolumeKLD: allocVol,
        distributionMethod: distMode,
        assignedTankerCode: distMode === 'municipal_tanker' ? `KMC-TANKER-${(itemIndex % 3) + 1}` : undefined,
        dispatchTime: new Date(Date.now() + itemIndex * 3600 * 1000).toISOString(),
        deliveredStatus: 'scheduled',
        subsidizedRateInrPerKL: subsidizedRate,
        commercialSavingsInr: savings,
      };

      allocationItems.push(item);
      remainingVolume -= allocVol;
    }

    const totalAllocated = totalAvailable - remainingVolume;
    const totalCommercialSavings = allocationItems.reduce((acc, curr) => acc + curr.commercialSavingsInr, 0);

    const defaultZone = commandZones[0]?.id || 'agri-zone-01';

    const reusePlan: WaterReusePlan = {
      id: `wrp-${Date.now()}`,
      planCode,
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      qualityGrade: batch.qualityGrade || 'grade_b',
      targetCommandZoneId: allocationItems[0]?.commandZoneId || defaultZone,
      totalVolumeAvailableKLD: totalAvailable,
      totalVolumeAllocatedKLD: totalAllocated,
      distributionMethod: preferredDistribution,
      status: 'draft',
      createdBy: officerName,
      items: allocationItems,
      totalFarmerBeneficiaries: allocationItems.length,
      totalCommercialSavingsInr: totalCommercialSavings,
      createdAt: new Date().toISOString(),
    };

    return reusePlan;
  }
}
