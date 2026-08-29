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
  FileCheck,
  Building,
  ArrowRight,
  HelpCircle,
  Clock,
  Radio,
  FileText,
  MapPin,
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
    floodDispatchOrders,
    updateDamDischarge,
    generateFloodDispatchPlan,
    approveFloodDispatchOrder,
    language,
    t,
  } = useCivic();

  const [simulatedDischarge, setSimulatedDischarge] = useState<number>(
    damTelemetry.currentDischargeCusecs
  );
  const [simulatedRainfall, setSimulatedRainfall] = useState<number>(
    damTelemetry.rainfallMmPerHour
  );
  const [selectedZoneAId, setSelectedZoneAId] = useState<string>(
    zoneFloodProfiles[0]?.id || 'zf-01'
  );
  const [selectedZoneBId, setSelectedZoneBId] = useState<string>(
    zoneFloodProfiles[3]?.id || 'zf-03'
  );
  const [activeModalOrder, setActiveModalOrder] = useState<FloodDispatchOrder | null>(null);

  // Synchronize telemetry with slider changes
  const handleDischargeChange = (val: number) => {
    setSimulatedDischarge(val);
    updateDamDischarge(val, simulatedRainfall);
  };

  const handleRainfallChange = (val: number) => {
    setSimulatedRainfall(val);
    updateDamDischarge(simulatedDischarge, val);
  };

  // Preset scenarios
  const applyPreset = (discharge: number, rain: number) => {
    setSimulatedDischarge(discharge);
    setSimulatedRainfall(rain);
    updateDamDischarge(discharge, rain);
  };

  // Compute live dispatch plan for current simulation parameters
  const currentPlan = useMemo(() => {
    return FloodPriorityEngine.generateEmergencyDispatchPlan(
      zoneFloodProfiles,
      damTelemetry,
      emergencyInventory
    );
  }, [zoneFloodProfiles, damTelemetry, emergencyInventory]);

  // Compute pairwise comparison
  const zoneA = zoneFloodProfiles.find((z) => z.id === selectedZoneAId) || zoneFloodProfiles[0];
  const zoneB = zoneFloodProfiles.find((z) => z.id === selectedZoneBId) || zoneFloodProfiles[3];

  const pairwiseComparison = useMemo(() => {
    if (!zoneA || !zoneB) return null;
    return FloodPriorityEngine.compareTwoZones(zoneA, zoneB, damTelemetry);
  }, [zoneA, zoneB, damTelemetry]);

  const handleGenerateOfficialOrder = () => {
    const newOrder = generateFloodDispatchPlan();
    setActiveModalOrder(newOrder);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 p-6 rounded-2xl border border-rose-900/50 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rose-400">
            <ShieldAlert size={22} className="animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-widest">
              {language === 'mr' ? 'कोपरगाव नगरपरिषद • पूर नियंत्रण केंद्र' : 'KOPARGAON MUNICIPAL COUNCIL • DISASTER RESPONSE'}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            {language === 'mr' ? 'पूर इशारा व आपत्कालीन साधन वाटप' : 'Flood Alert & Emergency Resource Dispatch'}
          </h1>
          <p className="text-sm text-slate-300">
            {language === 'mr'
              ? 'गोदावरी नदी पूर धोका विश्लेषण: कोणत्या प्रभागाला प्रथम आपत्कालीन मदत मिळेल व का?'
              : 'Deterministic Godavari River flood risk engine: which zone gets rescue fleet first, why, and in what exact sequence.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateOfficialOrder}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-950 border border-rose-400/30"
          >
            <FileText size={16} />
            <span>{language === 'mr' ? 'अधिकृत आपत्कालीन कार्य आदेश' : 'Issue Official Dispatch Order'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: LIVE DAM DISCHARGE & TELEMETRY SIMULATOR */}
      <div className="p-5 md:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Waves className="text-rose-400" size={20} />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              {language === 'mr' ? 'धरण विसर्ग व नदी पातळी सिम्युलेटर' : 'Upstream Dam Discharge & River Inflow Telemetry'}
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-mono">Status:</span>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase border ${
                damTelemetry.alertLevel === 'catastrophic' || damTelemetry.alertLevel === 'danger_red'
                  ? 'bg-red-950 text-red-300 border-red-800 animate-pulse'
                  : damTelemetry.alertLevel === 'alert_orange'
                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-800'
              }`}
            >
              {damTelemetry.alertLevel.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Quick Scenario Presets */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 text-xs font-semibold mr-1">Presets:</span>
          <button
            onClick={() => applyPreset(6500, 10)}
            className={`px-2.5 py-1 rounded-lg border text-xs transition-all ${
              simulatedDischarge <= 10000
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700 font-bold'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            Normal (6.5k cusecs)
          </button>
          <button
            onClick={() => applyPreset(22000, 28)}
            className={`px-2.5 py-1 rounded-lg border text-xs transition-all ${
              simulatedDischarge > 15000 && simulatedDischarge <= 25000
                ? 'bg-yellow-950 text-yellow-300 border-yellow-700 font-bold'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            Advisory Gate Rise (22k cusecs)
          </button>
          <button
            onClick={() => applyPreset(38000, 45)}
            className={`px-2.5 py-1 rounded-lg border text-xs transition-all ${
              simulatedDischarge > 25000 && simulatedDischarge <= 45000
                ? 'bg-amber-950 text-amber-300 border-amber-700 font-bold'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            Alert Orange (38k cusecs)
          </button>
          <button
            onClick={() => applyPreset(58000, 65)}
            className={`px-2.5 py-1 rounded-lg border text-xs transition-all ${
              simulatedDischarge > 45000 && simulatedDischarge <= 65000
                ? 'bg-rose-950 text-rose-300 border-rose-700 font-bold'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            Danger Red Spillage (58k cusecs)
          </button>
          <button
            onClick={() => applyPreset(75000, 90)}
            className={`px-2.5 py-1 rounded-lg border text-xs transition-all ${
              simulatedDischarge > 65000
                ? 'bg-red-950 text-red-300 border-red-700 font-bold animate-pulse'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            Flash Flood Emergency (75k cusecs)
          </button>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 text-xs">
          {/* Dam Discharge Slider */}
          <div className="space-y-2 md:col-span-2">
            <div className="flex justify-between items-center">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Sliders size={14} className="text-rose-400" />
                <span>Nandur Madhmeshwar Dam Release Rate</span>
              </label>
              <span className="font-mono text-base font-black text-rose-400">
                {simulatedDischarge.toLocaleString()} Cusecs
              </span>
            </div>
            <input
              type="range"
              min="2000"
              max="80000"
              step="1000"
              value={simulatedDischarge}
              onChange={(e) => handleDischargeChange(parseInt(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0 (Safe Flow)</span>
              <span>25k (Alert Orange)</span>
              <span>50k (Danger Red)</span>
              <span>80k (Catastrophic)</span>
            </div>
          </div>

          {/* Gauge Level & Rainfall */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Godavari Gauge Level:</span>
              <span className="font-mono font-bold text-white text-sm">
                {damTelemetry.waterLevelMeters} m
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">High Flood Danger Level:</span>
              <span className="font-mono font-semibold text-rose-400">498.50 m</span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-300 ${
                  damTelemetry.waterLevelMeters >= 498
                    ? 'bg-red-500'
                    : damTelemetry.waterLevelMeters >= 496
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{
                  width: `${Math.min(100, ((damTelemetry.waterLevelMeters - 490) / 10) * 100)}%`,
                }}
              />
            </div>
            <div className="text-[10px] text-slate-500 flex justify-between">
              <span>Rainfall: {damTelemetry.rainfallMmPerHour} mm/hr</span>
              <span>ETA Peak: {damTelemetry.timeToPeakArrivalHours} hrs</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: EMERGENCY FLEET INVENTORY KNAPSACK */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
        {/* Rescue Boats */}
        <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-blue-400">
            <LifeBuoy size={18} />
            <span className="text-[10px] uppercase font-bold text-slate-400">Rescue Boats</span>
          </div>
          <div className="font-mono font-bold text-lg text-white">
            {emergencyInventory.rescueBoats.available} / {emergencyInventory.rescueBoats.total}
          </div>
          <span className="text-[10px] text-slate-400 block">12-person motorized SDRF</span>
        </div>

        {/* De-watering Pumps */}
        <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-400">
            <Sliders size={18} />
            <span className="text-[10px] uppercase font-bold text-slate-400">Heavy Pumps</span>
          </div>
          <div className="font-mono font-bold text-lg text-white">
            {emergencyInventory.dewateringPumps.available} / {emergencyInventory.dewateringPumps.total}
          </div>
          <span className="text-[10px] text-slate-400 block">4,500 LPM diesel submersible</span>
        </div>

        {/* Sandbag Bunding Trucks */}
        <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-amber-400">
            <Truck size={18} />
            <span className="text-[10px] uppercase font-bold text-slate-400">Sandbag Trucks</span>
          </div>
          <div className="font-mono font-bold text-lg text-white">
            {emergencyInventory.sandbagTrucks.available} / {emergencyInventory.sandbagTrucks.total}
          </div>
          <span className="text-[10px] text-slate-400 block">500 bags per tipper truck</span>
        </div>

        {/* Evacuation Buses */}
        <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-purple-400">
            <Users size={18} />
            <span className="text-[10px] uppercase font-bold text-slate-400">Evac Buses</span>
          </div>
          <div className="font-mono font-bold text-lg text-white">
            {emergencyInventory.evacuationBuses.available} / {emergencyInventory.evacuationBuses.total}
          </div>
          <span className="text-[10px] text-slate-400 block">45-seater citizen evacuation</span>
        </div>

        {/* Medical Relief Vans */}
        <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1.5 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-rose-400">
            <Radio size={18} />
            <span className="text-[10px] uppercase font-bold text-slate-400">Medical Vans</span>
          </div>
          <div className="font-mono font-bold text-lg text-white">
            {emergencyInventory.medicalReliefVans.available} / {emergencyInventory.medicalReliefVans.total}
          </div>
          <span className="text-[10px] text-slate-400 block">Mobile emergency clinic</span>
        </div>
      </div>

      {/* SECTION 3: DETERMINISTIC ZONE DISPATCH SEQUENCE LEADERBOARD */}
      <div className="p-5 md:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase text-rose-400 font-bold tracking-widest block">
              Multi-Factor Resource Allocation Knapsack
            </span>
            <h3 className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
              <Navigation size={18} className="text-rose-400" />
              <span>
                {language === 'mr' ? 'प्रभाग आपत्कालीन साधन वाटप क्रमवारी' : 'Zone Dispatch Priority Sequence (Rank #1 to #8)'}
              </span>
            </h3>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Zones at Risk: <strong className="text-rose-400">{currentPlan.totalZonesAtRisk}</strong> • Covered Citizens:{' '}
            <strong className="text-white">{currentPlan.totalVulnerableCitizensCovered.toLocaleString()}</strong>
          </div>
        </div>

        {/* Ranked Zone Cards */}
        <div className="space-y-3">
          {currentPlan.items.map((item) => (
            <div
              key={item.zoneId}
              className={`p-4 rounded-xl border transition-all ${
                item.rank === 1
                  ? 'bg-rose-950/30 border-rose-600/70 shadow-lg shadow-rose-950/40'
                  : item.rank === 2
                  ? 'bg-rose-950/20 border-rose-800/50'
                  : item.riskScore >= 55
                  ? 'bg-amber-950/20 border-amber-800/40'
                  : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Left: Rank & Zone Meta */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-sm border ${
                      item.rank === 1
                        ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-900'
                        : item.rank === 2
                        ? 'bg-rose-900 text-rose-200 border-rose-700'
                        : item.riskTier === 'p1_high'
                        ? 'bg-amber-900 text-amber-200 border-amber-700'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    #{item.rank}
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-white text-sm truncate" title={item.zoneName}>
                        {item.zoneName}
                      </h4>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {item.zoneCode}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                          item.riskTier === 'p0_critical'
                            ? 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse'
                            : item.riskTier === 'p1_high'
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : item.riskTier === 'p2_moderate'
                            ? 'bg-yellow-950 text-yellow-300 border-yellow-800'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        }`}
                      >
                        {item.riskTier.replace('_', ' ')} • {item.riskScore} pts
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-1">{item.rationale}</p>
                  </div>
                </div>

                {/* Right: Allocated Emergency Assets & ETA */}
                <div className="flex flex-wrap md:flex-col lg:flex-row items-start md:items-end lg:items-center gap-3 text-xs">
                  {/* Assigned Assets Badges */}
                  <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                    {item.allocatedResources.rescueBoats > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-blue-950 text-blue-300 border border-blue-800 font-bold">
                        🚤 {item.allocatedResources.rescueBoats} Boats
                      </span>
                    )}
                    {item.allocatedResources.dewateringPumps > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                        ⚙️ {item.allocatedResources.dewateringPumps} Pumps
                      </span>
                    )}
                    {item.allocatedResources.sandbagTrucks > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                        🧱 {item.allocatedResources.sandbagTrucks} Sandbag Trks
                      </span>
                    )}
                    {item.allocatedResources.evacuationBuses > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                        🚌 {item.allocatedResources.evacuationBuses} Buses
                      </span>
                    )}
                  </div>

                  {/* ETA & Shelter */}
                  <div className="text-right text-[11px] space-y-0.5">
                    <span className="text-slate-400 block">
                      Dispatch ETA: <strong className="text-white font-mono">{item.dispatchEtaMinutes} mins</strong>
                    </span>
                    <span className="text-emerald-400 font-medium block truncate max-w-[220px]" title={item.designatedShelterSite}>
                      🏥 {item.designatedShelterSite}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4: PAIRWISE EXPLAINABILITY COMPARISON TOOL */}
      <div className="p-5 md:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
        <div className="border-b border-slate-800 pb-3">
          <span className="text-[10px] font-mono uppercase text-rose-400 font-bold tracking-widest block">
            Mathematical Decision Transparency
          </span>
          <h3 className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
            <HelpCircle size={18} className="text-rose-400" />
            <span>
              {language === 'mr' ? 'तुलनात्मक प्राधान्य स्पष्टीकरण (Pairwise Explainability)' : 'Pairwise Zone Risk & Resource Priority Comparison'}
            </span>
          </h3>
        </div>

        {/* Dropdowns to select Zone A and Zone B */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold">Select Primary Zone A:</label>
            <select
              value={selectedZoneAId}
              onChange={(e) => setSelectedZoneAId(e.target.value)}
              className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-700 font-medium"
            >
              {zoneFloodProfiles.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.zoneName} ({z.elevationAboveDatumMeters}m datum, {z.distanceToGodavariRiverMeters}m to river)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-semibold">Select Comparison Zone B:</label>
            <select
              value={selectedZoneBId}
              onChange={(e) => setSelectedZoneBId(e.target.value)}
              className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-700 font-medium"
            >
              {zoneFloodProfiles.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.zoneName} ({z.elevationAboveDatumMeters}m datum, {z.distanceToGodavariRiverMeters}m to river)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Comparison Explainability Card */}
        {pairwiseComparison && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2">
              <span className="font-bold text-rose-400">
                {pairwiseComparison.higherZoneName} ranks HIGHER than {pairwiseComparison.lowerZoneName}
              </span>
              <span className="font-mono font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                +{pairwiseComparison.scoreDifference} pts difference
              </span>
            </div>

            <p className="text-slate-200 leading-relaxed">
              {language === 'mr' ? pairwiseComparison.plainExplanationMr : pairwiseComparison.plainExplanation}
            </p>

            {/* Contributing Factor Decomposition */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-900 text-[11px]">
              {pairwiseComparison.topContributingFactors.map((f, i) => (
                <div key={i} className="p-2 rounded bg-slate-900 border border-slate-800/80 space-y-0.5">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-300">{f.factor}</span>
                    <span className={f.delta >= 0 ? 'text-rose-400 font-mono' : 'text-emerald-400 font-mono'}>
                      {f.delta >= 0 ? `+${f.delta.toFixed(1)} pts` : `${f.delta.toFixed(1)} pts`}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block">{f.detail}</span>
                </div>
              ))}
            </div>
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
