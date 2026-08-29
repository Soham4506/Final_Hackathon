import React, { useState, useMemo } from 'react';
import {
  Waves,
  ShieldAlert,
  AlertTriangle,
  Sliders,
  LifeBuoy,
  Truck,
  Users,
  Navigation,
  CheckCircle2,
  FileText,
  HelpCircle,
  Clock,
  Radio,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { useCivic } from '../context/CivicContext';
import { FloodPriorityEngine } from '../services/floodPriorityEngine';
import { FloodDispatchOrderModal } from '../components/flood/FloodDispatchOrderModal';
import { FloodDispatchOrder } from '../types/floodAlert';

export const FloodPriorityPage: React.FC = () => {
  const {
    damTelemetry,
    zoneFloodProfiles,
    emergencyInventory,
    updateDamDischarge,
    generateFloodDispatchPlan,
    approveFloodDispatchOrder,
    language,
  } = useCivic();

  const [simulatedDischarge, setSimulatedDischarge] = useState<number>(
    damTelemetry.currentDischargeCusecs
  );
  const [selectedZoneAId, setSelectedZoneAId] = useState<string>(
    zoneFloodProfiles[0]?.id || 'zf-01'
  );
  const [selectedZoneBId, setSelectedZoneBId] = useState<string>(
    zoneFloodProfiles[2]?.id || 'zf-02'
  );
  const [activeModalOrder, setActiveModalOrder] = useState<FloodDispatchOrder | null>(null);

  // Sync telemetry with slider
  const handleDischargeChange = (val: number) => {
    setSimulatedDischarge(val);
    updateDamDischarge(val);
  };

  const applyPreset = (discharge: number) => {
    setSimulatedDischarge(discharge);
    updateDamDischarge(discharge);
  };

  // Compute live dispatch plan
  const currentPlan = useMemo(() => {
    return FloodPriorityEngine.generateEmergencyDispatchPlan(
      zoneFloodProfiles,
      damTelemetry,
      emergencyInventory
    );
  }, [zoneFloodProfiles, damTelemetry, emergencyInventory]);

  // Compute pairwise comparison
  const zoneA = zoneFloodProfiles.find((z) => z.id === selectedZoneAId) || zoneFloodProfiles[0];
  const zoneB = zoneFloodProfiles.find((z) => z.id === selectedZoneBId) || zoneFloodProfiles[2];

  const pairwiseComparison = useMemo(() => {
    if (!zoneA || !zoneB) return null;
    return FloodPriorityEngine.compareTwoZones(zoneA, zoneB, damTelemetry);
  }, [zoneA, zoneB, damTelemetry]);

  const handleGenerateOfficialOrder = () => {
    const newOrder = generateFloodDispatchPlan();
    setActiveModalOrder(newOrder);
  };

  return (
    <div className="space-y-5 pb-10">
      {/* 1. TOP HEADER BANNER */}
      <div className="bg-white border border-[#76777d]/20 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <Waves size={12} className="text-rose-600 animate-pulse" />
              Godavari River Flood Command
            </span>
            <span className="text-xs text-[#76777d]">Ahilyanagar District, Kopargaon</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1b1b1d] tracking-tight">
            {language === 'mr' ? 'पूर आपत्कालीन साधन वाटप व प्राधान्यक्रम' : 'Flood Alert & Emergency Resource Dispatch'}
          </h1>
          <p className="text-xs sm:text-sm text-[#57657b] mt-1 max-w-2xl">
            {language === 'mr'
              ? 'एकाच वेळी अनेक भागात पूर धोका उद्भवल्यास ज्या भागात तीव्रता (Severity) जास्त असते, त्या भागाला मर्यादित बचाव नौका व पंप प्रथम दिले जातात.'
              : 'When multiple areas are at risk, emergency rescue teams and heavy pumps are dispatched strictly in order of Area Severity.'}
          </p>
        </div>

        <button
          onClick={handleGenerateOfficialOrder}
          className="flex items-center gap-2 bg-[#ba1a1a] hover:bg-[#93000a] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all tracking-wider uppercase shrink-0"
        >
          <FileText size={14} />
          <span>{language === 'mr' ? 'अधिकृत कार्य आदेश जारी करा' : 'Issue Official Work Order'}</span>
        </button>
      </div>

      {/* 2. DAM DISCHARGE CONTROLLER & TELEMETRY */}
      <div className="bg-white border border-[#76777d]/20 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#76777d]/15 pb-3">
          <div className="flex items-center gap-2">
            <Sliders size={16} className="text-[#131b2e]" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#1b1b1d]">
              {language === 'mr' ? 'धरण विसर्ग व पूर सिम्युलेटर' : 'Upstream Dam Release Telemetry & Simulation'}
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#76777d] font-medium">Alert Status:</span>
            <span
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase ${
                damTelemetry.alertLevel === 'catastrophic' || damTelemetry.alertLevel === 'danger_red'
                  ? 'bg-red-100 text-red-800 border border-red-300 animate-pulse'
                  : damTelemetry.alertLevel === 'alert_orange'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}
            >
              {damTelemetry.alertLevel.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#76777d] font-semibold mr-1">Discharge Presets:</span>
          <button
            onClick={() => applyPreset(6500)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              simulatedDischarge <= 10000
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                : 'bg-[#fcf8fa] text-[#1b1b1d] border-[#76777d]/20 hover:bg-slate-100'
            }`}
          >
            Normal Flow (6,500 Cusecs)
          </button>
          <button
            onClick={() => applyPreset(32000)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              simulatedDischarge > 25000 && simulatedDischarge <= 45000
                ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                : 'bg-[#fcf8fa] text-[#1b1b1d] border-[#76777d]/20 hover:bg-slate-100'
            }`}
          >
            Alert Orange (32,000 Cusecs)
          </button>
          <button
            onClick={() => applyPreset(62000)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              simulatedDischarge > 45000
                ? 'bg-red-50 text-red-800 border-red-300 font-bold'
                : 'bg-[#fcf8fa] text-[#1b1b1d] border-[#76777d]/20 hover:bg-slate-100'
            }`}
          >
            Danger Red Spillage (62,000 Cusecs)
          </button>
        </div>

        {/* Slider & River Level Gauge */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1 text-xs">
          <div className="md:col-span-2 space-y-2 bg-[#fcf8fa] p-4 rounded-xl border border-[#76777d]/15">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-[#1b1b1d]">
                Nandur Madhmeshwar Dam Release Rate:
              </span>
              <span className="font-mono text-base font-bold text-[#ba1a1a]">
                {simulatedDischarge.toLocaleString()} Cusecs
              </span>
            </div>
            <input
              type="range"
              min="3000"
              max="75000"
              step="1000"
              value={simulatedDischarge}
              onChange={(e) => handleDischargeChange(parseInt(e.target.value))}
              className="w-full accent-red-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-[#76777d] font-mono">
              <span>0 (Normal Flow)</span>
              <span>25,000 (Alert Orange)</span>
              <span>50,000+ (Danger Red)</span>
            </div>
          </div>

          <div className="bg-[#fcf8fa] p-4 rounded-xl border border-[#76777d]/15 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[#76777d] font-medium">Godavari Gauge Level:</span>
              <span className="font-mono font-bold text-[#1b1b1d] text-sm">
                {damTelemetry.waterLevelMeters} m
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#76777d]">High Flood Line (HFL):</span>
              <span className="font-mono font-bold text-red-700">498.50 m</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  damTelemetry.waterLevelMeters >= 498
                    ? 'bg-red-600'
                    : damTelemetry.waterLevelMeters >= 496
                    ? 'bg-amber-500'
                    : 'bg-emerald-600'
                }`}
                style={{
                  width: `${Math.min(100, ((damTelemetry.waterLevelMeters - 490) / 10) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. EMERGENCY FLEET INVENTORY (5 Clean Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-[#76777d]/20 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-blue-700">
            <LifeBuoy size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#76777d]">Rescue Boats</span>
          </div>
          <div className="text-xl font-bold font-mono text-[#1b1b1d]">
            {emergencyInventory.rescueBoats.available} <span className="text-xs font-normal text-[#76777d]">/ {emergencyInventory.rescueBoats.total}</span>
          </div>
          <span className="text-[10px] text-[#76777d] block">Motorized 12-man boats</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#76777d]/20 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <Sliders size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#76777d]">Heavy Pumps</span>
          </div>
          <div className="text-xl font-bold font-mono text-[#1b1b1d]">
            {emergencyInventory.dewateringPumps.available} <span className="text-xs font-normal text-[#76777d]">/ {emergencyInventory.dewateringPumps.total}</span>
          </div>
          <span className="text-[10px] text-[#76777d] block">4,500 LPM diesel pumps</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#76777d]/20 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <Truck size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#76777d]">Sandbag Trucks</span>
          </div>
          <div className="text-xl font-bold font-mono text-[#1b1b1d]">
            {emergencyInventory.sandbagTrucks.available} <span className="text-xs font-normal text-[#76777d]">/ {emergencyInventory.sandbagTrucks.total}</span>
          </div>
          <span className="text-[10px] text-[#76777d] block">500 bags per truck</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#76777d]/20 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-purple-700">
            <Users size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#76777d]">Evac Buses</span>
          </div>
          <div className="text-xl font-bold font-mono text-[#1b1b1d]">
            {emergencyInventory.evacuationBuses.available} <span className="text-xs font-normal text-[#76777d]">/ {emergencyInventory.evacuationBuses.total}</span>
          </div>
          <span className="text-[10px] text-[#76777d] block">45-seater transit buses</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#76777d]/20 shadow-xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-rose-700">
            <Radio size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#76777d]">Medical Vans</span>
          </div>
          <div className="text-xl font-bold font-mono text-[#1b1b1d]">
            {emergencyInventory.medicalReliefVans.available} <span className="text-xs font-normal text-[#76777d]">/ {emergencyInventory.medicalReliefVans.total}</span>
          </div>
          <span className="text-[10px] text-[#76777d] block">Rapid trauma clinics</span>
        </div>
      </div>

      {/* 4. SEVERITY-BASED RESOURCE DISPATCH TABLE */}
      <div className="bg-white border border-[#76777d]/20 rounded-2xl shadow-xs overflow-hidden">
        {/* Card Header */}
        <div className="p-5 border-b border-[#76777d]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-[#1b1b1d] uppercase tracking-wider flex items-center gap-2">
              <Navigation size={16} className="text-[#ba1a1a]" />
              <span>
                {language === 'mr'
                  ? 'तीव्रता-आधारित आपत्कालीन वाटप क्रमवारी (Severity Ranking)'
                  : 'Severity-First Emergency Resource Dispatch Sequence'}
              </span>
            </h3>
            <p className="text-xs text-[#57657b] mt-0.5">
              Ranked from highest severity to lowest. Limited emergency teams are deployed to Rank #1 first.
            </p>
          </div>

          <div className="text-xs font-mono text-[#76777d] bg-[#fcf8fa] px-3 py-1.5 rounded-xl border border-[#76777d]/15">
            At-Risk Zones: <strong className="text-[#ba1a1a]">{currentPlan.totalZonesAtRisk}</strong> • Citizens Protected: <strong className="text-[#1b1b1d]">{currentPlan.totalVulnerableCitizensCovered.toLocaleString()}</strong>
          </div>
        </div>

        {/* Clean Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#fcf8fa] text-[#76777d] border-b border-[#76777d]/15 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4 w-16">Rank</th>
                <th className="py-3 px-4">Zone / Ward</th>
                <th className="py-3 px-4">Severity Level</th>
                <th className="py-3 px-4">Why This Area First? (Threat Reason)</th>
                <th className="py-3 px-4">Assigned Emergency Fleet</th>
                <th className="py-3 px-4">Designated Shelter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#76777d]/10">
              {currentPlan.items.map((item) => (
                <tr
                  key={item.zoneId}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    item.severityAssessment.severityLevel === 'extreme'
                      ? 'bg-red-50/30'
                      : item.severityAssessment.severityLevel === 'critical'
                      ? 'bg-amber-50/20'
                      : ''
                  }`}
                >
                  {/* Rank */}
                  <td className="py-3.5 px-4 font-mono font-bold">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
                        item.rank === 1
                          ? 'bg-[#ba1a1a] text-white shadow-xs'
                          : item.rank === 2
                          ? 'bg-[#131b2e] text-white'
                          : 'bg-slate-100 text-[#1b1b1d]'
                      }`}
                    >
                      #{item.rank}
                    </span>
                  </td>

                  {/* Zone Name */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-[#1b1b1d] text-xs">{item.zoneName}</div>
                    <div className="text-[11px] text-[#76777d] font-mono">{item.zoneCode}</div>
                  </td>

                  {/* Severity Badge */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                          item.severityAssessment.severityLevel === 'extreme'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : item.severityAssessment.severityLevel === 'critical'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : item.severityAssessment.severityLevel === 'high'
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {item.severityAssessment.severityLevel} • {item.severityAssessment.severityScore} pts
                      </span>
                      <span className="text-[10px] text-[#76777d] block font-mono">
                        ETA: {item.dispatchEtaMinutes}m ({item.severityAssessment.urgencyWindowMinutes}m window)
                      </span>
                    </div>
                  </td>

                  {/* Rationale */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <p className="text-xs text-[#1b1b1d] font-medium line-clamp-2">
                      {item.severityAssessment.severityRationale}
                    </p>
                    <span className="text-[10px] text-[#76777d] block mt-0.5 italic">
                      {item.severityConflictResolutionNote}
                    </span>
                  </td>

                  {/* Assigned Fleet */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1 font-mono text-[11px]">
                      {item.allocatedResources.rescueBoats > 0 && (
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                          🚤 {item.allocatedResources.rescueBoats} Boats
                        </span>
                      )}
                      {item.allocatedResources.dewateringPumps > 0 && (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                          ⚙️ {item.allocatedResources.dewateringPumps} Pumps
                        </span>
                      )}
                      {item.allocatedResources.sandbagTrucks > 0 && (
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                          🧱 {item.allocatedResources.sandbagTrucks} Trucks
                        </span>
                      )}
                      {item.allocatedResources.evacuationBuses > 0 && (
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-bold">
                          🚌 {item.allocatedResources.evacuationBuses} Buses
                        </span>
                      )}
                      {item.allocatedResources.rescueBoats === 0 &&
                        item.allocatedResources.dewateringPumps === 0 &&
                        item.allocatedResources.sandbagTrucks === 0 && (
                          <span className="text-[#76777d] italic text-[11px]">Standby Monitoring</span>
                        )}
                    </div>
                  </td>

                  {/* Shelter */}
                  <td className="py-3.5 px-4">
                    <span className="text-xs text-[#1b1b1d] font-medium block">
                      {item.designatedShelterSite}
                    </span>
                    <span className="text-[10px] text-[#76777d] font-mono block">
                      {item.evacuationRoute}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. PAIRWISE COMPARISON EXPLAINER (Simple & Clean) */}
      <div className="bg-white border border-[#76777d]/20 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="border-b border-[#76777d]/15 pb-2.5">
          <h3 className="font-bold text-xs uppercase tracking-wider text-[#1b1b1d] flex items-center gap-1.5">
            <HelpCircle size={15} className="text-[#131b2e]" />
            <span>Why did Area A get resources before Area B? (Pairwise Explainability)</span>
          </h3>
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <label className="text-[#76777d] font-semibold">Select Area 1:</label>
            <select
              value={selectedZoneAId}
              onChange={(e) => setSelectedZoneAId(e.target.value)}
              className="w-full bg-[#fcf8fa] text-[#1b1b1d] p-2 rounded-xl border border-[#76777d]/20 font-medium"
            >
              {zoneFloodProfiles.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.zoneName} ({z.elevationAboveDatumMeters}m datum, {z.distanceToGodavariRiverMeters}m to river)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[#76777d] font-semibold">Select Area 2:</label>
            <select
              value={selectedZoneBId}
              onChange={(e) => setSelectedZoneBId(e.target.value)}
              className="w-full bg-[#fcf8fa] text-[#1b1b1d] p-2 rounded-xl border border-[#76777d]/20 font-medium"
            >
              {zoneFloodProfiles.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.zoneName} ({z.elevationAboveDatumMeters}m datum, {z.distanceToGodavariRiverMeters}m to river)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Result Explanation */}
        {pairwiseComparison && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#ba1a1a]">
                Decision: {pairwiseComparison.higherZoneName} receives resources FIRST
              </span>
              <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-mono font-bold">
                +{pairwiseComparison.scoreDifference} pts higher severity
              </span>
            </div>
            <p className="text-[#1b1b1d] leading-relaxed">
              {language === 'mr' ? pairwiseComparison.plainExplanationMr : pairwiseComparison.plainExplanation}
            </p>
          </div>
        )}
      </div>

      {/* DISPATCH ORDER MODAL */}
      {activeModalOrder && (
        <FloodDispatchOrderModal
          order={activeModalOrder}
          onClose={() => setActiveModalOrder(null)}
          onApprove={(orderId) => {
            approveFloodDispatchOrder(orderId);
            setActiveModalOrder((prev) => (prev ? { ...prev, isApproved: true } : null));
          }}
        />
      )}
    </div>
  );
};
