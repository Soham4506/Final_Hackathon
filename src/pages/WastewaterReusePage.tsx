import React, { useState } from 'react';
import { useCivic } from '../context/CivicContext';
import {
  WastewaterWorkflowStage,
  WastewaterBatch,
  QualityCheckSample,
  WaterReusePlan,
  WaterQualityParameters,
  DistributionMethod,
  CropCategory,
  WaterFlowDestination,
} from '../types/wastewater';
import { WaterQualityCertificateModal } from '../components/wastewater/WaterQualityCertificateModal';
import { WaterDispatchOrderModal } from '../components/wastewater/WaterDispatchOrderModal';
import { FarmerBookingModal } from '../components/wastewater/FarmerBookingModal';
import { WaterRoutingEngine } from '../services/waterRoutingEngine';
import {
  Trash2,
  Droplets,
  Cpu,
  ShieldCheck,
  ClipboardList,
  Sprout,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  PlusCircle,
  FileCheck,
  Truck,
  TrendingUp,
  Award,
  Layers,
  Sparkles,
  Info,
  Calendar,
  Building,
  Check,
  ChevronRight,
  Flame,
  Activity,
  Gauge,
  Sliders,
  Trees,
  Hammer,
  Waves,
  Apple,
  Wheat,
  XCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const WastewaterReusePage: React.FC = () => {
  const {
    wastewaterBatches,
    treatmentPlants,
    wasteSources,
    commandZones,
    qualitySamples,
    farmerBookings,
    waterReusePlans,
    circularMetrics,
    advanceWastewaterStage,
    recordQualityCheck,
    generateWaterReusePlan,
    approveWaterReusePlan,
    reprocessBatch,
    createWastewaterBatch,
    userRole,
    t,
  } = useCivic();

  // Active UI States
  const [activeStageTab, setActiveStageTab] = useState<WastewaterWorkflowStage>('quality_check');
  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    wastewaterBatches[0]?.id || ''
  );

  // Modals
  const [selectedSampleForModal, setSelectedSampleForModal] = useState<QualityCheckSample | null>(null);
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<WaterReusePlan | null>(null);
  const [showBookingModal, setShowBookingModal] = useState<boolean>(false);

  // Lab Testing Parameter Sandbox state
  const [labParams, setLabParams] = useState<WaterQualityParameters>({
    ph: 7.4,
    electricalConductivity: 1.1,
    sodiumAdsorptionRatio: 3.2,
    bod: 8.5,
    cod: 42.0,
    tss: 7.0,
    fecalColiforms: 65,
    heavyMetalsPpb: { lead: 4.5, cadmium: 0.8, arsenic: 1.2 },
    nutrientsMgL: { nitrogen: 24.0, phosphorus: 9.5, potassium: 18.0 },
  });

  const [preferredDistMode, setPreferredDistMode] = useState<DistributionMethod>('gravity_canal');

  const selectedBatch =
    wastewaterBatches.find((b) => b.id === selectedBatchId) ||
    wastewaterBatches[0] ||
    null;

  const currentPlant = treatmentPlants.find((p) => p.id === selectedBatch?.treatmentPlantId) || treatmentPlants[0];

  // Stage Definition List for the Stepper
  const STAGES: {
    id: WastewaterWorkflowStage;
    titleEn: string;
    titleMr: string;
    icon: any;
    desc: string;
    color: string;
  }[] = [
    {
      id: 'municipal_waste',
      titleEn: '1. Municipal Waste',
      titleMr: '१. कचरा व सांडपाणी संकलन',
      icon: Trash2,
      desc: 'Solid-liquid separation & ward collection streams',
      color: 'border-amber-500 text-amber-400',
    },
    {
      id: 'wastewater_intake',
      titleEn: '2. Wastewater Intake',
      titleMr: '२. सांडपाणी आवक',
      icon: Droplets,
      desc: 'Raw drainage screening & baseline diagnostics',
      color: 'border-cyan-500 text-cyan-400',
    },
    {
      id: 'treatment',
      titleEn: '3. STP Treatment',
      titleMr: '३. मलनिःसारण प्रक्रिया',
      icon: Cpu,
      desc: 'MBBR Biological aeration & Sand/Carbon filtration',
      color: 'border-blue-500 text-blue-400',
    },
    {
      id: 'quality_check',
      titleEn: '4. Quality Check',
      titleMr: '४. CPCB गुणवत्ता तपासणी',
      icon: ShieldCheck,
      desc: 'Agricultural safety standards & lab certification',
      color: 'border-emerald-500 text-emerald-400',
    },
    {
      id: 'reuse_plan',
      titleEn: '5. Reuse Plan',
      titleMr: '५. कृषी वाटप आराखडा',
      icon: ClipboardList,
      desc: 'Demand matching & canal/tanker distribution',
      color: 'border-purple-500 text-purple-400',
    },
    {
      id: 'agriculture',
      titleEn: '6. Agriculture',
      titleMr: '६. शेती सिंचन वितरण',
      icon: Sprout,
      desc: 'Farmer delivery, crop health & fertilizer savings',
      color: 'border-green-500 text-green-400',
    },
  ];

  // Handle Run Quality Test on selected batch
  const handleExecuteQualityCheck = () => {
    if (!selectedBatch) return;
    const sample = recordQualityCheck(selectedBatch.id, labParams);
    setSelectedSampleForModal(sample);
  };

  // Handle Generate Reuse Plan on selected batch
  const handleGeneratePlan = () => {
    if (!selectedBatch) return;
    const plan = generateWaterReusePlan(selectedBatch.id, preferredDistMode);
    setSelectedPlanForModal(plan);
  };

  // Quick Preset Handlers for Lab Parameter Testing
  const applyPresetParams = (type: 'grade_a' | 'grade_b' | 'big_trees' | 'construction' | 'failed') => {
    if (type === 'grade_a') {
      setLabParams({
        ph: 7.3,
        electricalConductivity: 0.95,
        sodiumAdsorptionRatio: 2.8,
        bod: 7.2,
        cod: 35.0,
        tss: 6.0,
        fecalColiforms: 40,
        heavyMetalsPpb: { lead: 3.5, cadmium: 0.5, arsenic: 0.9 },
        nutrientsMgL: { nitrogen: 22.0, phosphorus: 8.5, potassium: 17.0 },
      });
    } else if (type === 'grade_b') {
      setLabParams({
        ph: 7.6,
        electricalConductivity: 1.4,
        sodiumAdsorptionRatio: 4.8,
        bod: 22.0,
        cod: 78.0,
        tss: 15.0,
        fecalColiforms: 450,
        heavyMetalsPpb: { lead: 12.0, cadmium: 1.8, arsenic: 2.5 },
        nutrientsMgL: { nitrogen: 28.0, phosphorus: 12.0, potassium: 22.0 },
      });
    } else if (type === 'big_trees') {
      setLabParams({
        ph: 7.8,
        electricalConductivity: 2.4, // Higher salinity tolerated by native deep-rooted trees
        sodiumAdsorptionRatio: 6.5,
        bod: 42.0, // Higher organic load safely absorbed by agroforestry bio-filters
        cod: 135.0,
        tss: 28.0,
        fecalColiforms: 1800,
        heavyMetalsPpb: { lead: 18.0, cadmium: 2.5, arsenic: 3.5 },
        nutrientsMgL: { nitrogen: 34.0, phosphorus: 14.0, potassium: 25.0 }, // Rich nutrients accelerate timber growth
      });
    } else if (type === 'construction') {
      setLabParams({
        ph: 7.9,
        electricalConductivity: 1.8,
        sodiumAdsorptionRatio: 5.2,
        bod: 32.0,
        cod: 95.0,
        tss: 18.0,
        fecalColiforms: 850,
        heavyMetalsPpb: { lead: 15.0, cadmium: 2.0, arsenic: 2.8 },
        nutrientsMgL: { nitrogen: 16.0, phosphorus: 6.0, potassium: 12.0 },
      });
    } else {
      setLabParams({
        ph: 5.2, // Acidic failure
        electricalConductivity: 2.8,
        sodiumAdsorptionRatio: 8.5,
        bod: 75.0, // Severe organic failure
        cod: 240.0,
        tss: 65.0,
        fecalColiforms: 3200,
        heavyMetalsPpb: { lead: 68.0, cadmium: 14.0, arsenic: 15.0 }, // Heavy metal toxicity
        nutrientsMgL: { nitrogen: 10.0, phosphorus: 4.0, potassium: 8.0 },
      });
    }
  };

  // Quick batch creator
  const handleCreateSampleIntake = () => {
    const newBatch = createWastewaterBatch(
      ['a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003'],
      3200,
      'stp-001'
    );
    setSelectedBatchId(newBatch.id);
    setActiveStageTab('municipal_waste');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <Sparkles size={12} />
              <span>Smart Circular Economy Workflow</span>
            </span>
            <span className="text-xs text-slate-400">
              Kopargaon Municipal Council (कोपरगाव नगरपरिषद)
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Sprout className="text-emerald-400" size={26} />
            <span>Circular Wastewater-to-Agriculture Reuse Hub</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            Converting municipal waste and urban wastewater into certified, nutrient-rich agricultural irrigation water for Kopargaon sugarcane, onion, and pomegranate farming command belts under strict CPCB quality standards.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            onClick={() => setShowBookingModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md shadow-emerald-950/50 transition-all"
          >
            <PlusCircle size={16} />
            <span>{t.bookWaterQuota || 'Book Farmer Water Quota'}</span>
          </button>

          <button
            onClick={handleCreateSampleIntake}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-4 py-2.5 rounded-lg transition-all"
          >
            <Droplets size={16} className="text-cyan-400" />
            <span>New Waste Intake</span>
          </button>
        </div>
      </div>

      {/* 2. Circular Economy Impact Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Treated Water</span>
          <span className="text-lg font-bold text-white block">
            {circularMetrics.totalWastewaterTreatedMLD} MLD
          </span>
          <span className="text-[10px] text-cyan-400 flex items-center gap-1">
            <Droplets size={10} /> Million Liters
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Agri Water Reused</span>
          <span className="text-lg font-bold text-emerald-400 block">
            {circularMetrics.totalAgriculturalReuseKLD.toLocaleString()} KL
          </span>
          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
            <Sprout size={10} /> Dispatched to Farms
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Groundwater Saved</span>
          <span className="text-lg font-bold text-blue-400 block">
            {(circularMetrics.totalGroundwaterSavedLiters / 1000000).toFixed(1)}M Liters
          </span>
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <TrendingUp size={10} /> Aquifer Recharge
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">River Pollution Cut</span>
          <span className="text-lg font-bold text-emerald-300 block">
            {circularMetrics.godavariRiverPollutionDivertedPercent}%
          </span>
          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
            <ShieldCheck size={10} /> Godavari River Clean
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Fertilizer Saved</span>
          <span className="text-lg font-bold text-amber-400 block">
            ₹{(circularMetrics.totalFarmerFertilizerSavingsInr / 100000).toFixed(2)}L
          </span>
          <span className="text-[10px] text-amber-300 flex items-center gap-1">
            <Sparkles size={10} /> N-P-K Nutrients
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Farmer Beneficiaries</span>
          <span className="text-lg font-bold text-white block">
            {circularMetrics.totalFarmersBenefited + farmerBookings.filter(b => b.status === 'allocated' || b.status === 'fulfilled').length}
          </span>
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Award size={10} /> Kopargaon Growers
          </span>
        </div>
      </div>

      {/* 3. Interactive 6-Stage Workflow Pipeline Stepper */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
              6-Stage Circular Water Lifecycle Pipeline
            </span>
            <h2 className="text-sm font-bold text-white">
              Municipal Waste ➔ Wastewater ➔ Treatment ➔ Quality Check ➔ Reuse Plan ➔ Agriculture
            </h2>
          </div>

          {/* Active Batch Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Select Batch:</span>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
            >
              {wastewaterBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber} ({b.currentStage.replace('_', ' ').toUpperCase()}) - {b.intakeVolumeKLD} KL
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stepper Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {STAGES.map((st, idx) => {
            const Icon = st.icon;
            const isSelected = activeStageTab === st.id;
            const isBatchAtOrPast = selectedBatch
              ? STAGES.findIndex((s) => s.id === selectedBatch.currentStage) >= idx
              : false;

            return (
              <button
                key={st.id}
                onClick={() => setActiveStageTab(st.id)}
                className={`relative p-3 rounded-xl text-left border transition-all flex flex-col justify-between min-h-[96px] ${
                  isSelected
                    ? 'bg-slate-800/90 border-emerald-500 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Icon size={16} />
                  </div>

                  {isBatchAtOrPast && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  )}
                </div>

                <div>
                  <div className="text-xs font-bold text-white truncate">{st.titleEn}</div>
                  <div className="text-[10px] text-slate-400 line-clamp-1">{st.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Batch Progress Bar & Advance Control */}
        {selectedBatch && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800/70 text-xs">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-slate-400 font-mono text-[11px] font-bold">
                BATCH {selectedBatch.batchNumber}:
              </span>
              <div className="w-48 bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${selectedBatch.currentProgressPercent}%` }}
                ></div>
              </div>
              <span className="font-mono text-emerald-400 font-bold">
                {selectedBatch.currentProgressPercent}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              {selectedBatch.currentStage !== 'agriculture' && (
                <button
                  onClick={() => advanceWastewaterStage(selectedBatch.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-all"
                >
                  <Play size={13} />
                  <span>Advance to Next Stage</span>
                </button>
              )}

              {selectedBatch.status === 'rejected_for_retreatment' && (
                <button
                  onClick={() => reprocessBatch(selectedBatch.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-all"
                >
                  <RotateCcw size={13} />
                  <span>Send for MBBR Reprocessing</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Active Stage Drilldown Component */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        {/* STAGE 1: MUNICIPAL WASTE INTAKE */}
        {activeStageTab === 'municipal_waste' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Trash2 size={20} className="text-amber-400" />
                  <span>Stage 1: Municipal Waste Collection & Solid-Liquid Segregation</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Monitors ward-wise wastewater streams, sewage discharge lines, and coarse solids screening before intake.
                </p>
              </div>
              <button
                onClick={() => advanceWastewaterStage(selectedBatch?.id || '')}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all"
              >
                <span>Route to Wastewater Intake</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {wasteSources.map((src) => (
                <div key={src.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">{src.wardName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-mono">
                      {src.sourceType.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Daily Inflow Volume:</span>
                      <strong className="text-white font-mono">{src.dailyVolumeKLD.toLocaleString()} KL/day</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Initial Turbidity:</span>
                      <strong className="text-amber-400 font-mono">{src.initialTurbidityNTU} NTU</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Baseline BOD:</span>
                      <strong className="text-slate-200 font-mono">{src.initialBOD} mg/L</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STAGE 2: WASTEWATER INTAKE & DIAGNOSTICS */}
        {activeStageTab === 'wastewater_intake' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Droplets size={20} className="text-cyan-400" />
                  <span>Stage 2: Raw Wastewater Inflow & Primary Diagnostics</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Initial parameter profiling (Turbidity, BOD, COD, Suspended Solids) before biological reactor injection.
                </p>
              </div>
              <button
                onClick={() => advanceWastewaterStage(selectedBatch?.id || '')}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all"
              >
                <span>Inject to MBBR Treatment Plant</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {selectedBatch && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase">Batch Inflow</span>
                  <span className="text-base font-bold text-white font-mono">
                    {selectedBatch.intakeVolumeKLD.toLocaleString()} KL
                  </span>
                </div>
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase">Baseline BOD</span>
                  <span className="text-base font-bold text-amber-400 font-mono">
                    {selectedBatch.initialParameters.bod} mg/L
                  </span>
                </div>
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase">Baseline COD</span>
                  <span className="text-base font-bold text-slate-200 font-mono">
                    {selectedBatch.initialParameters.cod} mg/L
                  </span>
                </div>
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase">Initial Turbidity</span>
                  <span className="text-base font-bold text-cyan-400 font-mono">
                    {selectedBatch.initialParameters.turbidity} NTU
                  </span>
                </div>
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase">Intake pH</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">
                    {selectedBatch.initialParameters.ph}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STAGE 3: STP TREATMENT PROCESS */}
        {activeStageTab === 'treatment' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Cpu size={20} className="text-blue-400" />
                  <span>Stage 3: Sewage Treatment Plant (STP) Multi-Reactor Process</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Live monitoring of Primary Grit Screening, Moving Bed Biofilm Reactor (MBBR), Dual Media Sand/Carbon filtration, and UV Disinfection.
                </p>
              </div>
              <button
                onClick={() => advanceWastewaterStage(selectedBatch?.id || '')}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all"
              >
                <span>Send Sample to Quality Lab</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Plant Overview Banner */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">
                  Active Facility • {currentPlant.code}
                </span>
                <h4 className="text-sm font-bold text-white">{currentPlant.name}</h4>
                <p className="text-slate-400 text-[11px]">{currentPlant.location}</p>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Plant Capacity</span>
                  <span className="font-bold text-white">{currentPlant.capacityMLD} MLD</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Daily Output</span>
                  <span className="font-bold text-emerald-400">{currentPlant.dailyTreatedKLD.toLocaleString()} KL</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Energy Efficiency</span>
                  <span className="font-bold text-cyan-400">{currentPlant.energyEfficiencyKWhPerKL} kWh/KL</span>
                </div>
              </div>
            </div>

            {/* 4 Multi-Stage Reactors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {currentPlant.stages.map((st, i) => (
                <div key={i} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 font-bold">STAGE 0{i + 1}</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-semibold">
                      {st.efficiencyRating}% Efficiency
                    </span>
                  </div>
                  <h5 className="font-bold text-white">{st.stageName}</h5>
                  <div className="space-y-1 text-slate-400 text-[11px]">
                    <div className="flex justify-between">
                      <span>Retention Time:</span>
                      <span className="text-white font-mono">{st.retentionHours} hrs</span>
                    </div>
                    {st.monitoredParameters.dissolvedOxygen && (
                      <div className="flex justify-between">
                        <span>Dissolved Oxygen:</span>
                        <span className="text-cyan-400 font-mono">{st.monitoredParameters.dissolvedOxygen} mg/L</span>
                      </div>
                    )}
                    {st.monitoredParameters.uvDosage && (
                      <div className="flex justify-between">
                        <span>UV Intensity:</span>
                        <span className="text-purple-400 font-mono">{st.monitoredParameters.uvDosage} mJ/cm²</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STAGE 4: QUALITY CHECK & LAB CERTIFICATION (MAIN ENGINE) */}
        {activeStageTab === 'quality_check' && (() => {
          const liveRouting = WaterRoutingEngine.evaluateAllDestinations(
            labParams,
            selectedBatch?.intakeVolumeKLD || 3500
          );
          const primaryDestInfo = liveRouting.allDestinations.find(
            (d) => d.destination === liveRouting.primaryDestination
          );

          return (
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck size={20} className="text-emerald-400" />
                    <span>Stage 4: Comprehensive Water Parameter Analyzer & Flow Routing Decision Engine</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Evaluates all physicochemical parameters to intelligently route flow: High-Value Food, Sugarcane Belt, Big Trees & Agroforestry, or Construction.
                  </p>
                </div>

                {/* 5 Preset buttons */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-slate-400 text-[11px]">Quick Scenarios:</span>
                  <button
                    onClick={() => applyPresetParams('grade_a')}
                    className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-semibold hover:bg-emerald-900 flex items-center gap-1"
                  >
                    <Apple size={12} />
                    <span>Food Crops (BOD ≤ 10)</span>
                  </button>
                  <button
                    onClick={() => applyPresetParams('grade_b')}
                    className="px-2.5 py-1 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[11px] font-semibold hover:bg-blue-900 flex items-center gap-1"
                  >
                    <Wheat size={12} />
                    <span>Sugarcane (High NPK)</span>
                  </button>
                  <button
                    onClick={() => applyPresetParams('big_trees')}
                    className="px-2.5 py-1 rounded bg-teal-950 text-teal-300 border border-teal-800 text-[11px] font-semibold hover:bg-teal-900 flex items-center gap-1"
                  >
                    <Trees size={12} />
                    <span>Big Trees & Forestry</span>
                  </button>
                  <button
                    onClick={() => applyPresetParams('construction')}
                    className="px-2.5 py-1 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[11px] font-semibold hover:bg-amber-900 flex items-center gap-1"
                  >
                    <Hammer size={12} />
                    <span>PWD Construction</span>
                  </button>
                  <button
                    onClick={() => applyPresetParams('failed')}
                    className="px-2.5 py-1 rounded bg-red-950 text-red-300 border border-red-800 text-[11px] font-semibold hover:bg-red-900 flex items-center gap-1"
                  >
                    <AlertTriangle size={12} />
                    <span>Safety Lockout</span>
                  </button>
                </div>
              </div>

              {/* 8 Interactive Parameter Sliders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                {/* BOD Control */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-slate-300 font-semibold">BOD (mg/L)</label>
                    <span className="font-mono text-emerald-400 font-bold">{labParams.bod} mg/L</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="80"
                    step="0.5"
                    value={labParams.bod}
                    onChange={(e) => setLabParams({ ...labParams, bod: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 block">&lt;10 Food, &lt;30 Sugar, &lt;55 Trees</span>
                </div>

                {/* COD Control */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-slate-300 font-semibold">COD (mg/L)</label>
                    <span className="font-mono text-emerald-400 font-bold">{labParams.cod} mg/L</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="220"
                    step="1"
                    value={labParams.cod}
                    onChange={(e) => setLabParams({ ...labParams, cod: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 block">&lt;50 Food, &lt;100 Sugar, &lt;160 Trees</span>
                </div>

                {/* pH Control */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-slate-300 font-semibold">pH Level</label>
                    <span className="font-mono text-emerald-400 font-bold">{labParams.ph}</span>
                  </div>
                  <input
                    type="range"
                    min="4.5"
                    max="10.0"
                    step="0.1"
                    value={labParams.ph}
                    onChange={(e) => setLabParams({ ...labParams, ph: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 block">Safe: 6.5 - 8.5 (Trees: 6.0-9.0)</span>
                </div>

                {/* Fecal Coliforms */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-slate-300 font-semibold">Fecal Coliforms</label>
                    <span className="font-mono text-emerald-400 font-bold">{labParams.fecalColiforms} MPN</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3500"
                    step="25"
                    value={labParams.fecalColiforms}
                    onChange={(e) => setLabParams({ ...labParams, fecalColiforms: parseInt(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 block">&lt;100 Food, &lt;1000 Sugar, &lt;5000 Trees</span>
                </div>

                {/* Salinity EC */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-slate-300 font-semibold">Salinity EC (dS/m)</label>
                    <span className="font-mono text-emerald-400 font-bold">{labParams.electricalConductivity} dS/m</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="3.5"
                    step="0.05"
                    value={labParams.electricalConductivity}
                    onChange={(e) => setLabParams({ ...labParams, electricalConductivity: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 block">&lt;1.2 Food, &lt;2.0 Sugar, &lt;3.0 Trees</span>
                </div>

                {/* Heavy Metal: Lead (Pb) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-slate-300 font-semibold">Lead Heavy Metal (Pb)</label>
                    <span className={`font-mono font-bold ${labParams.heavyMetalsPpb.lead > 50 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {labParams.heavyMetalsPpb.lead} ppb
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="1"
                    value={labParams.heavyMetalsPpb.lead}
                    onChange={(e) => setLabParams({
                      ...labParams,
                      heavyMetalsPpb: { ...labParams.heavyMetalsPpb, lead: parseFloat(e.target.value) },
                    })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 block">&lt;10 Food, &lt;50 CPCB, &gt;50 Toxic</span>
                </div>

                {/* Total Suspended Solids (TSS) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-slate-300 font-semibold">TSS (mg/L)</label>
                    <span className="font-mono text-emerald-400 font-bold">{labParams.tss} mg/L</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="60"
                    step="1"
                    value={labParams.tss}
                    onChange={(e) => setLabParams({ ...labParams, tss: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 block">&lt;10 Food, &lt;20 Sugar, &lt;40 Trees</span>
                </div>

                {/* Nitrogen Nutrient (N) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-slate-300 font-semibold">Nutrient Nitrogen (N)</label>
                    <span className="font-mono text-emerald-400 font-bold">{labParams.nutrientsMgL.nitrogen} mg/L</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="45"
                    step="1"
                    value={labParams.nutrientsMgL.nitrogen}
                    onChange={(e) => setLabParams({
                      ...labParams,
                      nutrientsMgL: { ...labParams.nutrientsMgL, nitrogen: parseFloat(e.target.value) },
                    })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 block">High N beneficial for Sugarcane & Trees</span>
                </div>
              </div>

              {/* DYNAMIC WATER FLOW DESTINATION DECISION BANNER & SLUICE GATE MATRIX */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-emerald-500/40 space-y-4 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold block">
                      Deterministic Flow Destination Decision
                    </span>
                    <h4 className="text-lg font-bold text-white flex items-center gap-2 mt-0.5">
                      {liveRouting.primaryDestination === 'edible_agriculture' && <Apple className="text-green-400" size={22} />}
                      {liveRouting.primaryDestination === 'commercial_agriculture' && <Wheat className="text-amber-400" size={22} />}
                      {liveRouting.primaryDestination === 'big_trees_agroforestry' && <Trees className="text-teal-400" size={22} />}
                      {liveRouting.primaryDestination === 'industrial_construction' && <Hammer className="text-cyan-400" size={22} />}
                      {liveRouting.primaryDestination === 'groundwater_recharge' && <Waves className="text-blue-400" size={22} />}
                      {liveRouting.primaryDestination === 'retreatment_required' && <AlertTriangle className="text-red-400" size={22} />}
                      <span>{primaryDestInfo?.title || 'Flow Destination'}</span>
                    </h4>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-slate-400 block">Suitability Score</span>
                      <span className="text-xl font-bold font-mono text-emerald-400">
                        {primaryDestInfo?.suitabilityScore || 0}/100
                      </span>
                    </div>
                    <button
                      onClick={handleExecuteQualityCheck}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-950/60 transition-all shrink-0"
                    >
                      <ShieldCheck size={16} />
                      <span>Certify & Commit Flow</span>
                    </button>
                  </div>
                </div>

                {/* Sluice Gate Flow Split Visualization */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Sliders size={14} className="text-emerald-400" />
                      <span>Automated Sluice Gate & Channel Distribution Splits</span>
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      Total Batch: {(selectedBatch?.intakeVolumeKLD || 3500).toLocaleString()} KL
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {liveRouting.flowSplits.map((split, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2 text-xs overflow-hidden"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white truncate min-w-0 flex-1" title={split.destinationName}>
                            {split.destinationName}
                          </span>
                          <span className="shrink-0 whitespace-nowrap px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono font-bold">
                            {split.percentage}% Flow
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full transition-all duration-500 ${
                              idx === 0
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : idx === 1
                                ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                                : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                            }`}
                            style={{ width: `${split.percentage}%` }}
                          />
                        </div>

                        <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                          <span>Volume: <strong className="text-white font-mono">{split.volumeKLD.toLocaleString()} KL</strong></span>
                          <span className="capitalize font-mono text-emerald-400">{split.distributionChannel.replace('_', ' ')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 6 Destination Comparative Suitability Grid */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                    Comparative Destination Eligibility & Safety Criteria
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {liveRouting.allDestinations.map((dest) => (
                      <div
                        key={dest.destination}
                        className={`p-3.5 rounded-xl border text-xs space-y-2.5 transition-all overflow-hidden relative ${
                          dest.isEligible
                            ? dest.destination === liveRouting.primaryDestination
                              ? 'bg-emerald-950/40 border-emerald-500/70 shadow-sm shadow-emerald-950/50'
                              : 'bg-slate-950/80 border-slate-800'
                            : 'bg-red-950/20 border-red-900/40 opacity-85'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-bold text-white min-w-0 flex-1">
                            <span className="shrink-0">
                              {dest.destination === 'edible_agriculture' && <Apple size={15} className="text-green-400" />}
                              {dest.destination === 'commercial_agriculture' && <Wheat size={15} className="text-amber-400" />}
                              {dest.destination === 'big_trees_agroforestry' && <Trees size={15} className="text-teal-400" />}
                              {dest.destination === 'industrial_construction' && <Hammer size={15} className="text-cyan-400" />}
                              {dest.destination === 'groundwater_recharge' && <Waves size={15} className="text-blue-400" />}
                              {dest.destination === 'retreatment_required' && <AlertTriangle size={15} className="text-red-400" />}
                            </span>
                            <span className="truncate text-xs text-slate-100" title={dest.title}>{dest.title}</span>
                          </div>

                          <span
                            className={`shrink-0 whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                              dest.isEligible
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : 'bg-red-950 text-red-400 border-red-800'
                            }`}
                          >
                            {dest.isEligible ? `${dest.suitabilityScore} pts` : 'INELIGIBLE'}
                          </span>
                        </div>

                        {/* Qualifying or Disqualifying Points */}
                        <div className="space-y-1 text-[11px]">
                          {dest.isEligible ? (
                            dest.qualifyingReasons.slice(0, 2).map((r, i) => (
                              <div key={i} className="text-emerald-400 flex items-start gap-1">
                                <Check size={12} className="shrink-0 mt-0.5 text-emerald-500" />
                                <span className="line-clamp-1">{r}</span>
                              </div>
                            ))
                          ) : (
                            dest.disqualifyingViolations.slice(0, 2).map((v, i) => (
                              <div key={i} className="text-red-400 flex items-start gap-1">
                                <XCircle size={12} className="shrink-0 mt-0.5 text-red-500" />
                                <span className="line-clamp-1">{v}</span>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Species / Sites */}
                        <div className="pt-1 border-t border-slate-900 text-[10px] text-slate-400 flex justify-between">
                          <span className="truncate">Flora: {dest.suitableSpeciesOrUses.slice(0, 2).join(', ')}</span>
                          <span className="font-semibold text-slate-300 shrink-0">{dest.category}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Verified Lab Certificates Table */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <FileCheck size={15} className="text-emerald-400" />
                  <span>Verified Quality Lab Certificates ({qualitySamples.length})</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {qualitySamples.map((samp) => (
                    <div
                      key={samp.id}
                      className="p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-emerald-500/40 transition-all text-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-emerald-400">{samp.batchNumber}</span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            samp.grade === 'grade_a'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : samp.grade === 'grade_b'
                              ? 'bg-blue-950 text-blue-400 border border-blue-800'
                              : 'bg-red-950 text-red-400 border border-red-800'
                          }`}
                        >
                          {samp.grade.replace('_', ' ')}
                        </span>
                      </div>

                      <p className="text-slate-300 text-[11px] line-clamp-2">{samp.restrictionNotes}</p>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-slate-400 text-[10px]">
                        <span>WQI: {samp.waterQualityIndex}/100</span>
                        <button
                          onClick={() => setSelectedSampleForModal(samp)}
                          className="text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                        >
                          <FileCheck size={12} />
                          <span>View Lab Certificate</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* STAGE 5: REUSE PLAN & ALLOCATION */}
        {activeStageTab === 'reuse_plan' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ClipboardList size={20} className="text-purple-400" />
                  <span>Stage 5: Agricultural Reuse Plan & Demand Matching Engine</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Matches treated water inventory with registered farmer bookings across Kopargaon command zones.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={preferredDistMode}
                  onChange={(e) => setPreferredDistMode(e.target.value as DistributionMethod)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500 capitalize"
                >
                  <option value="gravity_canal">Gravity Canal (कालवा)</option>
                  <option value="underground_pipeline">Underground Pipeline (पाइपलाइन)</option>
                  <option value="municipal_tanker">Municipal Tanker (टँकर)</option>
                </select>

                <button
                  onClick={handleGeneratePlan}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-md shadow-purple-950/40 transition-all"
                >
                  <Cpu size={15} />
                  <span>Generate Reuse Plan</span>
                </button>
              </div>
            </div>

            {/* Active Reuse Plans List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Generated Reuse Action Plans ({waterReusePlans.length})
              </h4>

              {waterReusePlans.map((plan) => (
                <div key={plan.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-purple-400">{plan.planCode}</span>
                      <span className="text-slate-400">for Batch {plan.batchNumber}</span>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        plan.status === 'approved' || plan.status === 'completed'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {plan.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Allocated Volume:</span>
                      <strong className="text-white font-mono">{plan.totalVolumeAllocatedKLD.toLocaleString()} KL</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Farmer Beneficiaries:</span>
                      <strong className="text-emerald-400">{plan.totalFarmerBeneficiaries} Farmers</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Distribution Mode:</span>
                      <strong className="capitalize text-white">{plan.distributionMethod.replace('_', ' ')}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Farmer Savings:</span>
                      <strong className="text-emerald-400">₹{plan.totalCommercialSavingsInr.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setSelectedPlanForModal(plan)}
                      className="text-cyan-400 hover:underline text-xs font-semibold flex items-center gap-1"
                    >
                      <Truck size={14} />
                      <span>View Dispatch Order Sheet</span>
                    </button>

                    {plan.status === 'draft' && (
                      <button
                        onClick={() => approveWaterReusePlan(plan.id)}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition-all"
                      >
                        <CheckCircle2 size={14} />
                        <span>Approve & Release Irrigation Dispatch</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STAGE 6: AGRICULTURE & FARMER DELIVERY */}
        {activeStageTab === 'agriculture' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sprout size={20} className="text-green-400" />
                  <span>Stage 6: Agriculture & Farmer Irrigation Dispatch Hub</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Track farmer water quota fulfillments, soil health enrichment, and agricultural impact across Kopargaon.
                </p>
              </div>

              <button
                onClick={() => setShowBookingModal(true)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-md shadow-emerald-950/40 transition-all"
              >
                <PlusCircle size={15} />
                <span>Register Farmer Quota</span>
              </button>
            </div>

            {/* Farmer Bookings Queue */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Registered Farmer Water Quota Requests ({farmerBookings.length})
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {farmerBookings.map((bk) => (
                  <div key={bk.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{bk.farmerName}</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          bk.status === 'fulfilled'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : bk.status === 'allocated'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {bk.status}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-400">
                      <div className="flex justify-between">
                        <span>Crop & Acreage:</span>
                        <strong className="capitalize text-slate-200">
                          {bk.cropType} ({bk.farmAcreage} Acres)
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Requested Volume:</span>
                        <strong className="text-emerald-400 font-mono">{bk.requestedVolumeKLD.toLocaleString()} KL</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery Channel:</span>
                        <strong className="capitalize text-slate-300">
                          {bk.preferredDistribution.replace('_', ' ')}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Location:</span>
                        <span className="text-slate-400 truncate max-w-[150px]">{bk.wardOrVillage}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Embedded Modals */}
      {selectedSampleForModal && (
        <WaterQualityCertificateModal
          sample={selectedSampleForModal}
          batch={selectedBatch || undefined}
          onClose={() => setSelectedSampleForModal(null)}
        />
      )}

      {selectedPlanForModal && (
        <WaterDispatchOrderModal
          plan={selectedPlanForModal}
          onClose={() => setSelectedPlanForModal(null)}
        />
      )}

      {showBookingModal && (
        <FarmerBookingModal onClose={() => setShowBookingModal(false)} />
      )}
    </div>
  );
};
