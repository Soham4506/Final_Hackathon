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
  }[] = [
    {
      id: 'municipal_waste',
      titleEn: '1. Municipal Waste',
      titleMr: '१. कचरा व सांडपाणी संकलन',
      icon: Trash2,
      desc: 'Solid-liquid separation & ward collection streams',
    },
    {
      id: 'wastewater_intake',
      titleEn: '2. Wastewater Intake',
      titleMr: '२. सांडपाणी आवक',
      icon: Droplets,
      desc: 'Raw drainage screening & baseline diagnostics',
    },
    {
      id: 'treatment',
      titleEn: '3. STP Treatment',
      titleMr: '३. मलनिःसारण प्रक्रिया',
      icon: Cpu,
      desc: 'MBBR Biological aeration & Sand/Carbon filtration',
    },
    {
      id: 'quality_check',
      titleEn: '4. Quality Check',
      titleMr: '४. CPCB गुणवत्ता तपासणी',
      icon: ShieldCheck,
      desc: 'Agricultural safety standards & lab certification',
    },
    {
      id: 'reuse_plan',
      titleEn: '5. Reuse Plan',
      titleMr: '५. कृषी वाटप आराखडा',
      icon: ClipboardList,
      desc: 'Demand matching & canal/tanker distribution',
    },
    {
      id: 'agriculture',
      titleEn: '6. Agriculture',
      titleMr: '६. शेती सिंचन वितरण',
      icon: Sprout,
      desc: 'Farmer delivery, crop health & fertilizer savings',
    },
  ];

  const handleExecuteQualityCheck = () => {
    if (!selectedBatch) return;
    const sample = recordQualityCheck(selectedBatch.id, labParams);
    setSelectedSampleForModal(sample);
  };

  const handleGeneratePlan = () => {
    if (!selectedBatch) return;
    const plan = generateWaterReusePlan(selectedBatch.id, preferredDistMode);
    setSelectedPlanForModal(plan);
  };

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
        electricalConductivity: 2.4,
        sodiumAdsorptionRatio: 6.5,
        bod: 42.0,
        cod: 135.0,
        tss: 28.0,
        fecalColiforms: 1800,
        heavyMetalsPpb: { lead: 18.0, cadmium: 2.5, arsenic: 3.5 },
        nutrientsMgL: { nitrogen: 34.0, phosphorus: 14.0, potassium: 25.0 },
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
        ph: 5.2,
        electricalConductivity: 2.8,
        sodiumAdsorptionRatio: 8.5,
        bod: 75.0,
        cod: 240.0,
        tss: 65.0,
        fecalColiforms: 3200,
        heavyMetalsPpb: { lead: 68.0, cadmium: 14.0, arsenic: 15.0 },
        nutrientsMgL: { nitrogen: 10.0, phosphorus: 4.0, potassium: 8.0 },
      });
    }
  };

  const handleCreateSampleIntake = () => {
    createWastewaterBatch(
      ['a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004'],
      3800,
      'stp-plant-01'
    );
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Banner */}
      <div className="bg-white border border-[#76777d]/20 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <Sparkles size={12} className="text-emerald-600" />
              <span>Smart Circular Economy Workflow</span>
            </span>
            <span className="text-xs text-[#76777d]">
              Kopargaon Municipal Council (कोपरगाव नगरपरिषद)
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-[#1b1b1d] tracking-tight flex items-center gap-2">
            <Sprout className="text-emerald-700" size={24} />
            <span>Circular Wastewater-to-Agriculture Reuse Hub</span>
          </h1>

          <p className="text-xs sm:text-sm text-[#57657b] mt-1 max-w-3xl leading-relaxed">
            Converting municipal waste and urban wastewater into certified, nutrient-rich agricultural irrigation water for Kopargaon sugarcane, onion, and pomegranate farming command belts under strict CPCB quality standards.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            onClick={() => setShowBookingModal(true)}
            className="flex items-center gap-2 bg-[#131b2e] hover:bg-[#1e2a47] text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-xs transition-all"
          >
            <PlusCircle size={15} />
            <span>{t.bookWaterQuota || 'Book Water Quota'}</span>
          </button>

          <button
            onClick={handleCreateSampleIntake}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-[#131b2e] border border-[#76777d]/30 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-xs transition-all"
          >
            <Droplets size={15} className="text-cyan-700" />
            <span>New Waste Intake</span>
          </button>
        </div>
      </div>

      {/* 2. Circular Economy Impact Counters (6 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-[#76777d]/20 p-4 rounded-xl shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#76777d] mb-1">Treated Water</span>
          <div className="text-2xl font-bold text-[#1b1b1d] font-mono">
            {circularMetrics.totalWastewaterTreatedMLD} MLD
          </div>
          <span className="text-[10px] text-cyan-700 font-bold flex items-center gap-1 mt-1 font-mono">
            <Droplets size={11} /> Million Liters
          </span>
        </div>

        <div className="bg-white border border-[#76777d]/20 p-4 rounded-xl shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#76777d] mb-1">Agri Water Reused</span>
          <div className="text-2xl font-bold text-emerald-700 font-mono">
            {circularMetrics.totalAgriculturalReuseKLD.toLocaleString()} KL
          </div>
          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-1 font-mono">
            <Sprout size={11} /> Dispatched to Farms
          </span>
        </div>

        <div className="bg-white border border-[#76777d]/20 p-4 rounded-xl shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#76777d] mb-1">Groundwater Saved</span>
          <div className="text-2xl font-bold text-blue-700 font-mono">
            {(circularMetrics.totalGroundwaterSavedLiters / 1000000).toFixed(1)}M L
          </div>
          <span className="text-[10px] text-[#76777d] flex items-center gap-1 mt-1 font-mono">
            <TrendingUp size={11} /> Aquifer Recharge
          </span>
        </div>

        <div className="bg-white border border-[#76777d]/20 p-4 rounded-xl shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#76777d] mb-1">River Pollution Cut</span>
          <div className="text-2xl font-bold text-emerald-700 font-mono">
            {circularMetrics.godavariRiverPollutionDivertedPercent}%
          </div>
          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-1 font-mono">
            <ShieldCheck size={11} /> Godavari Clean
          </span>
        </div>

        <div className="bg-white border border-[#76777d]/20 p-4 rounded-xl shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#76777d] mb-1">Fertilizer Saved</span>
          <div className="text-2xl font-bold text-amber-700 font-mono">
            ₹{(circularMetrics.totalFarmerFertilizerSavingsInr / 100000).toFixed(2)}L
          </div>
          <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1 mt-1 font-mono">
            <Sparkles size={11} /> N-P-K Nutrients
          </span>
        </div>

        <div className="bg-white border border-[#76777d]/20 p-4 rounded-xl shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#76777d] mb-1">Beneficiaries</span>
          <div className="text-2xl font-bold text-[#1b1b1d] font-mono">
            {circularMetrics.totalFarmersBenefited + farmerBookings.filter(b => b.status === 'allocated' || b.status === 'fulfilled').length}
          </div>
          <span className="text-[10px] text-[#76777d] flex items-center gap-1 mt-1 font-mono">
            <Award size={11} /> Kopargaon Growers
          </span>
        </div>
      </div>

      {/* 3. Interactive 6-Stage Workflow Pipeline Stepper */}
      <div className="bg-white border border-[#76777d]/20 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#76777d]/15 pb-3">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-[#76777d]">
              6-Stage Circular Water Lifecycle Pipeline
            </span>
            <h2 className="text-sm font-bold text-[#1b1b1d] mt-0.5">
              Municipal Waste ➔ Wastewater ➔ Treatment ➔ Quality Check ➔ Reuse Plan ➔ Agriculture
            </h2>
          </div>

          {/* Active Batch Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#76777d] font-bold">Select Batch:</span>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="bg-[#f6f3f5] border border-[#76777d]/20 rounded-xl px-3 py-1.5 text-[#1b1b1d] font-mono text-xs font-semibold focus:outline-none focus:border-[#131b2e]"
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
                className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between min-h-[90px] ${
                  isSelected
                    ? 'bg-[#131b2e] text-white border-[#131b2e] shadow-xs ring-1 ring-[#131b2e]/20'
                    : 'bg-[#fcf8fa] text-[#1b1b1d] border-[#76777d]/15 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-[#131b2e]'
                    }`}
                  >
                    <Icon size={16} />
                  </div>

                  {isBatchAtOrPast && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  )}
                </div>

                <div>
                  <div className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-[#1b1b1d]'}`}>
                    {st.titleEn}
                  </div>
                  <div className={`text-[10px] line-clamp-1 ${isSelected ? 'text-white/80' : 'text-[#76777d]'}`}>
                    {st.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Batch Progress Bar & Advance Control */}
        {selectedBatch && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#76777d]/15 text-xs">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-[#131b2e] font-mono text-[11px] font-bold">
                BATCH {selectedBatch.batchNumber}:
              </span>
              <div className="w-48 bg-[#eae7e9] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#131b2e] h-full rounded-full transition-all duration-500"
                  style={{ width: `${selectedBatch.currentProgressPercent}%` }}
                ></div>
              </div>
              <span className="font-mono text-emerald-800 font-bold">
                {selectedBatch.currentProgressPercent}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              {selectedBatch.currentStage !== 'agriculture' && (
                <button
                  onClick={() => advanceWastewaterStage(selectedBatch.id)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#131b2e] hover:bg-[#1e2a47] text-white font-bold text-xs uppercase tracking-wider shadow-xs transition-all"
                >
                  <Play size={13} />
                  <span>Advance to Next Stage</span>
                </button>
              )}

              {selectedBatch.status === 'rejected_for_retreatment' && (
                <button
                  onClick={() => reprocessBatch(selectedBatch.id)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
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
      <div className="bg-white border border-[#76777d]/20 rounded-2xl p-6 shadow-xs space-y-6 text-[#1b1b1d]">
        {/* STAGE 1: MUNICIPAL WASTE INTAKE */}
        {activeStageTab === 'municipal_waste' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1b1b1d] flex items-center gap-2">
                  <Trash2 size={20} className="text-amber-600" />
                  <span>Stage 1: Municipal Waste Collection & Solid-Liquid Segregation</span>
                </h3>
                <p className="text-xs text-[#57657b]">
                  Monitors ward-wise wastewater streams, sewage discharge lines, and coarse solids screening before intake.
                </p>
              </div>
              <button
                onClick={() => advanceWastewaterStage(selectedBatch?.id || '')}
                className="flex items-center gap-1.5 bg-[#131b2e] hover:bg-[#1e2a47] text-white text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all"
              >
                <span>Route to Wastewater Intake</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {wasteSources.map((src) => (
                <div key={src.id} className="bg-[#fcf8fa] border border-[#76777d]/15 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1b1b1d] truncate">{src.wardName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 uppercase font-mono font-bold">
                      {src.sourceType.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-[#57657b]">
                      <span>Daily Inflow Volume:</span>
                      <strong className="text-[#1b1b1d] font-mono">{src.dailyVolumeKLD.toLocaleString()} KL/day</strong>
                    </div>
                    <div className="flex justify-between text-[#57657b]">
                      <span>Initial Turbidity:</span>
                      <strong className="text-amber-700 font-mono">{src.initialTurbidityNTU} NTU</strong>
                    </div>
                    <div className="flex justify-between text-[#57657b]">
                      <span>Baseline BOD:</span>
                      <strong className="text-[#1b1b1d] font-mono">{src.initialBOD} mg/L</strong>
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
                <h3 className="text-base font-bold text-[#1b1b1d] flex items-center gap-2">
                  <Droplets size={20} className="text-cyan-700" />
                  <span>Stage 2: Raw Wastewater Inflow & Primary Diagnostics</span>
                </h3>
                <p className="text-xs text-[#57657b]">
                  Initial parameter profiling (Turbidity, BOD, COD, Suspended Solids) before biological reactor injection.
                </p>
              </div>
              <button
                onClick={() => advanceWastewaterStage(selectedBatch?.id || '')}
                className="flex items-center gap-1.5 bg-[#131b2e] hover:bg-[#1e2a47] text-white text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all"
              >
                <span>Inject to MBBR Treatment Plant</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {selectedBatch && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3.5 bg-[#fcf8fa] rounded-xl border border-[#76777d]/15 text-xs">
                  <span className="text-[#76777d] font-bold block text-[10px] uppercase">Batch Inflow</span>
                  <span className="text-base font-bold text-[#1b1b1d] font-mono">
                    {selectedBatch.intakeVolumeKLD.toLocaleString()} KL
                  </span>
                </div>
                <div className="p-3.5 bg-[#fcf8fa] rounded-xl border border-[#76777d]/15 text-xs">
                  <span className="text-[#76777d] font-bold block text-[10px] uppercase">Baseline BOD</span>
                  <span className="text-base font-bold text-amber-700 font-mono">
                    {selectedBatch.initialParameters.bod} mg/L
                  </span>
                </div>
                <div className="p-3.5 bg-[#fcf8fa] rounded-xl border border-[#76777d]/15 text-xs">
                  <span className="text-[#76777d] font-bold block text-[10px] uppercase">Baseline COD</span>
                  <span className="text-base font-bold text-[#1b1b1d] font-mono">
                    {selectedBatch.initialParameters.cod} mg/L
                  </span>
                </div>
                <div className="p-3.5 bg-[#fcf8fa] rounded-xl border border-[#76777d]/15 text-xs">
                  <span className="text-[#76777d] font-bold block text-[10px] uppercase">Initial Turbidity</span>
                  <span className="text-base font-bold text-cyan-800 font-mono">
                    {selectedBatch.initialParameters.turbidity} NTU
                  </span>
                </div>
                <div className="p-3.5 bg-[#fcf8fa] rounded-xl border border-[#76777d]/15 text-xs">
                  <span className="text-[#76777d] font-bold block text-[10px] uppercase">Intake pH</span>
                  <span className="text-base font-bold text-emerald-800 font-mono">
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
                <h3 className="text-base font-bold text-[#1b1b1d] flex items-center gap-2">
                  <Cpu size={20} className="text-blue-700" />
                  <span>Stage 3: Sewage Treatment Plant (STP) Multi-Reactor Process</span>
                </h3>
                <p className="text-xs text-[#57657b]">
                  Live monitoring of Primary Grit Screening, Moving Bed Biofilm Reactor (MBBR), Dual Media Sand/Carbon filtration, and UV Disinfection.
                </p>
              </div>
              <button
                onClick={() => advanceWastewaterStage(selectedBatch?.id || '')}
                className="flex items-center gap-1.5 bg-[#131b2e] hover:bg-[#1e2a47] text-white text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all"
              >
                <span>Send Sample to Quality Lab</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Plant Overview Banner */}
            <div className="p-4 bg-[#fcf8fa] rounded-xl border border-[#76777d]/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-emerald-800 font-bold block">
                  Active Facility • {currentPlant.code}
                </span>
                <h4 className="text-sm font-bold text-[#1b1b1d]">{currentPlant.name}</h4>
                <p className="text-[#57657b] text-[11px]">{currentPlant.location}</p>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[10px] text-[#76777d] font-bold uppercase block">Plant Capacity</span>
                  <span className="font-bold text-[#1b1b1d]">{currentPlant.capacityMLD} MLD</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#76777d] font-bold uppercase block">Daily Output</span>
                  <span className="font-bold text-emerald-800">{currentPlant.dailyTreatedKLD.toLocaleString()} KL</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#76777d] font-bold uppercase block">Energy Efficiency</span>
                  <span className="font-bold text-cyan-800">{currentPlant.energyEfficiencyKWhPerKL} kWh/KL</span>
                </div>
              </div>
            </div>

            {/* 4 Multi-Stage Reactors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {currentPlant.stages.map((st, i) => (
                <div key={i} className="p-4 bg-[#fcf8fa] rounded-xl border border-[#76777d]/15 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#76777d] font-bold">STAGE 0{i + 1}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                      {st.efficiencyRating}% Efficiency
                    </span>
                  </div>
                  <h5 className="font-bold text-[#1b1b1d]">{st.stageName}</h5>
                  <div className="space-y-1 text-[#57657b] text-[11px]">
                    <div className="flex justify-between">
                      <span>Retention Time:</span>
                      <span className="text-[#1b1b1d] font-mono">{st.retentionHours} hrs</span>
                    </div>
                    {st.monitoredParameters.dissolvedOxygen && (
                      <div className="flex justify-between">
                        <span>Dissolved Oxygen:</span>
                        <span className="text-cyan-800 font-mono font-bold">{st.monitoredParameters.dissolvedOxygen} mg/L</span>
                      </div>
                    )}
                    {st.monitoredParameters.uvDosage && (
                      <div className="flex justify-between">
                        <span>UV Intensity:</span>
                        <span className="text-purple-800 font-mono font-bold">{st.monitoredParameters.uvDosage} mJ/cm²</span>
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
                  <h3 className="text-base font-bold text-[#1b1b1d] flex items-center gap-2">
                    <ShieldCheck size={20} className="text-emerald-700" />
                    <span>Stage 4: Comprehensive Water Parameter Analyzer & Flow Routing Decision Engine</span>
                  </h3>
                  <p className="text-xs text-[#57657b]">
                    Evaluates all physicochemical parameters to intelligently route flow: High-Value Food, Sugarcane Belt, Big Trees & Agroforestry, or Construction.
                  </p>
                </div>

                {/* 5 Preset buttons */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[#76777d] font-bold text-[11px]">Scenarios:</span>
                  <button
                    onClick={() => applyPresetParams('grade_a')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-[11px] font-bold hover:bg-emerald-100 flex items-center gap-1"
                  >
                    <Apple size={12} />
                    <span>Food Crops (BOD ≤ 10)</span>
                  </button>
                  <button
                    onClick={() => applyPresetParams('grade_b')}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 text-[11px] font-bold hover:bg-blue-100 flex items-center gap-1"
                  >
                    <Wheat size={12} />
                    <span>Sugarcane (High NPK)</span>
                  </button>
                  <button
                    onClick={() => applyPresetParams('big_trees')}
                    className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-900 border border-teal-200 text-[11px] font-bold hover:bg-teal-100 flex items-center gap-1"
                  >
                    <Trees size={12} />
                    <span>Big Trees & Forestry</span>
                  </button>
                  <button
                    onClick={() => applyPresetParams('construction')}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold hover:bg-amber-100 flex items-center gap-1"
                  >
                    <Hammer size={12} />
                    <span>PWD Construction</span>
                  </button>
                  <button
                    onClick={() => applyPresetParams('failed')}
                    className="px-2.5 py-1 rounded-lg bg-red-50 text-red-900 border border-red-200 text-[11px] font-bold hover:bg-red-100 flex items-center gap-1"
                  >
                    <AlertTriangle size={12} />
                    <span>Safety Lockout</span>
                  </button>
                </div>
              </div>

              {/* 8 Interactive Parameter Sliders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 bg-[#fcf8fa] p-4 rounded-xl border border-[#76777d]/15 text-xs">
                {/* BOD Control */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-[#1b1b1d] font-bold">BOD (mg/L)</label>
                    <span className="font-mono text-emerald-800 font-bold">{labParams.bod} mg/L</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="80"
                    step="0.5"
                    value={labParams.bod}
                    onChange={(e) => setLabParams({ ...labParams, bod: parseFloat(e.target.value) })}
                    className="w-full accent-[#131b2e] cursor-pointer"
                  />
                  <span className="text-[10px] text-[#76777d] block">&lt;10 Food, &lt;30 Sugar, &lt;55 Trees</span>
                </div>

                {/* COD Control */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-[#1b1b1d] font-bold">COD (mg/L)</label>
                    <span className="font-mono text-emerald-800 font-bold">{labParams.cod} mg/L</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="220"
                    step="1"
                    value={labParams.cod}
                    onChange={(e) => setLabParams({ ...labParams, cod: parseFloat(e.target.value) })}
                    className="w-full accent-[#131b2e] cursor-pointer"
                  />
                  <span className="text-[10px] text-[#76777d] block">&lt;50 Food, &lt;100 Sugar, &lt;160 Trees</span>
                </div>

                {/* pH Control */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-[#1b1b1d] font-bold">pH Level</label>
                    <span className="font-mono text-emerald-800 font-bold">{labParams.ph}</span>
                  </div>
                  <input
                    type="range"
                    min="4.5"
                    max="10.0"
                    step="0.1"
                    value={labParams.ph}
                    onChange={(e) => setLabParams({ ...labParams, ph: parseFloat(e.target.value) })}
                    className="w-full accent-[#131b2e] cursor-pointer"
                  />
                  <span className="text-[10px] text-[#76777d] block">Safe: 6.5 - 8.5 (Trees: 6.0-9.0)</span>
                </div>

                {/* Fecal Coliforms */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-[#1b1b1d] font-bold">Fecal Coliforms</label>
                    <span className="font-mono text-emerald-800 font-bold">{labParams.fecalColiforms} MPN</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3500"
                    step="25"
                    value={labParams.fecalColiforms}
                    onChange={(e) => setLabParams({ ...labParams, fecalColiforms: parseInt(e.target.value) })}
                    className="w-full accent-[#131b2e] cursor-pointer"
                  />
                  <span className="text-[10px] text-[#76777d] block">&lt;100 Food, &lt;1000 Sugar, &lt;5000 Trees</span>
                </div>

                {/* Salinity EC */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-[#1b1b1d] font-bold">Salinity EC (dS/m)</label>
                    <span className="font-mono text-emerald-800 font-bold">{labParams.electricalConductivity} dS/m</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="3.5"
                    step="0.05"
                    value={labParams.electricalConductivity}
                    onChange={(e) => setLabParams({ ...labParams, electricalConductivity: parseFloat(e.target.value) })}
                    className="w-full accent-[#131b2e] cursor-pointer"
                  />
                  <span className="text-[10px] text-[#76777d] block">&lt;1.2 Food, &lt;2.0 Sugar, &lt;3.0 Trees</span>
                </div>

                {/* Heavy Metal: Lead (Pb) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-[#1b1b1d] font-bold">Lead Heavy Metal (Pb)</label>
                    <span className={`font-mono font-bold ${labParams.heavyMetalsPpb.lead > 50 ? 'text-[#ba1a1a]' : 'text-emerald-800'}`}>
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
                    className="w-full accent-[#131b2e] cursor-pointer"
                  />
                  <span className="text-[10px] text-[#76777d] block">&lt;10 Food, &lt;50 CPCB, &gt;50 Toxic</span>
                </div>

                {/* Total Suspended Solids (TSS) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-[#1b1b1d] font-bold">TSS (mg/L)</label>
                    <span className="font-mono text-emerald-800 font-bold">{labParams.tss} mg/L</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="60"
                    step="1"
                    value={labParams.tss}
                    onChange={(e) => setLabParams({ ...labParams, tss: parseFloat(e.target.value) })}
                    className="w-full accent-[#131b2e] cursor-pointer"
                  />
                  <span className="text-[10px] text-[#76777d] block">&lt;10 Food, &lt;20 Sugar, &lt;40 Trees</span>
                </div>

                {/* Nitrogen Nutrient (N) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-[#1b1b1d] font-bold">Nutrient Nitrogen (N)</label>
                    <span className="font-mono text-emerald-800 font-bold">{labParams.nutrientsMgL.nitrogen} mg/L</span>
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
                    className="w-full accent-[#131b2e] cursor-pointer"
                  />
                  <span className="text-[10px] text-[#76777d] block">High N beneficial for Sugarcane & Trees</span>
                </div>
              </div>

              {/* DYNAMIC WATER FLOW DESTINATION DECISION BANNER & SLUICE GATE MATRIX */}
              <div className="p-5 rounded-2xl bg-white border border-emerald-300 space-y-4 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#76777d]/15 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-800 font-bold block">
                      Deterministic Flow Destination Decision
                    </span>
                    <h4 className="text-lg font-bold text-[#1b1b1d] flex items-center gap-2 mt-0.5">
                      {liveRouting.primaryDestination === 'edible_agriculture' && <Apple className="text-green-600" size={22} />}
                      {liveRouting.primaryDestination === 'commercial_agriculture' && <Wheat className="text-amber-600" size={22} />}
                      {liveRouting.primaryDestination === 'big_trees_agroforestry' && <Trees className="text-teal-600" size={22} />}
                      {liveRouting.primaryDestination === 'industrial_construction' && <Hammer className="text-cyan-700" size={22} />}
                      {liveRouting.primaryDestination === 'groundwater_recharge' && <Waves className="text-blue-600" size={22} />}
                      {liveRouting.primaryDestination === 'retreatment_required' && <AlertTriangle className="text-red-600" size={22} />}
                      <span>{primaryDestInfo?.title || 'Flow Destination'}</span>
                    </h4>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-[#76777d] font-bold block">Suitability Score</span>
                      <span className="text-xl font-bold font-mono text-emerald-800">
                        {primaryDestInfo?.suitabilityScore || 0}/100
                      </span>
                    </div>
                    <button
                      onClick={handleExecuteQualityCheck}
                      className="flex items-center gap-2 bg-[#131b2e] hover:bg-[#1e2a47] text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-xs transition-all shrink-0"
                    >
                      <ShieldCheck size={16} />
                      <span>Certify & Commit Flow</span>
                    </button>
                  </div>
                </div>

                {/* Sluice Gate Flow Split Visualization */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#1b1b1d]">
                    <span className="flex items-center gap-1.5">
                      <Sliders size={14} className="text-[#131b2e]" />
                      <span>Automated Sluice Gate & Channel Distribution Splits</span>
                    </span>
                    <span className="text-[#76777d] font-mono text-[11px]">
                      Total Batch: {(selectedBatch?.intakeVolumeKLD || 3500).toLocaleString()} KL
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {liveRouting.flowSplits.map((split, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-[#fcf8fa] rounded-xl border border-[#76777d]/15 space-y-2 text-xs overflow-hidden"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[#1b1b1d] truncate min-w-0 flex-1" title={split.destinationName}>
                            {split.destinationName}
                          </span>
                          <span className="shrink-0 whitespace-nowrap px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-mono font-bold">
                            {split.percentage}% Flow
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-[#eae7e9] h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              idx === 0
                                ? 'bg-emerald-600'
                                : idx === 1
                                ? 'bg-blue-600'
                                : 'bg-amber-600'
                            }`}
                            style={{ width: `${split.percentage}%` }}
                          />
                        </div>

                        <div className="flex justify-between text-[11px] text-[#57657b] pt-0.5">
                          <span>Volume: <strong className="text-[#1b1b1d] font-mono">{split.volumeKLD.toLocaleString()} KL</strong></span>
                          <span className="capitalize font-mono text-emerald-800 font-bold">{split.distributionChannel.replace('_', ' ')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 6 Destination Comparative Suitability Grid */}
                <div className="space-y-2 pt-2 border-t border-[#76777d]/15">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#76777d] block">
                    Comparative Destination Eligibility & Safety Criteria
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {liveRouting.allDestinations.map((dest) => (
                      <div
                        key={dest.destination}
                        className={`p-3.5 rounded-xl border text-xs space-y-2.5 transition-all overflow-hidden relative ${
                          dest.isEligible
                            ? dest.destination === liveRouting.primaryDestination
                              ? 'bg-emerald-50 border-emerald-400 shadow-xs'
                              : 'bg-[#fcf8fa] border-[#76777d]/15'
                            : 'bg-red-50 border-red-200 opacity-90'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-bold text-[#1b1b1d] min-w-0 flex-1">
                            <span className="shrink-0">
                              {dest.destination === 'edible_agriculture' && <Apple size={15} className="text-green-600" />}
                              {dest.destination === 'commercial_agriculture' && <Wheat size={15} className="text-amber-600" />}
                              {dest.destination === 'big_trees_agroforestry' && <Trees size={15} className="text-teal-600" />}
                              {dest.destination === 'industrial_construction' && <Hammer size={15} className="text-cyan-700" />}
                              {dest.destination === 'groundwater_recharge' && <Waves size={15} className="text-blue-600" />}
                              {dest.destination === 'retreatment_required' && <AlertTriangle size={15} className="text-red-600" />}
                            </span>
                            <span className="truncate text-xs" title={dest.title}>{dest.title}</span>
                          </div>

                          <span
                            className={`shrink-0 whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                              dest.isEligible
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-red-100 text-red-900 border-red-300'
                            }`}
                          >
                            {dest.isEligible ? `${dest.suitabilityScore} pts` : 'INELIGIBLE'}
                          </span>
                        </div>

                        {/* Qualifying or Disqualifying Points */}
                        <div className="space-y-1 text-[11px]">
                          {dest.isEligible ? (
                            dest.qualifyingReasons.slice(0, 2).map((r, i) => (
                              <div key={i} className="text-emerald-900 flex items-start gap-1 font-medium">
                                <Check size={12} className="shrink-0 mt-0.5 text-emerald-700" />
                                <span className="line-clamp-1">{r}</span>
                              </div>
                            ))
                          ) : (
                            dest.disqualifyingViolations.slice(0, 2).map((v, i) => (
                              <div key={i} className="text-red-900 flex items-start gap-1 font-medium">
                                <XCircle size={12} className="shrink-0 mt-0.5 text-red-700" />
                                <span className="line-clamp-1">{v}</span>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Species / Sites */}
                        <div className="pt-1 border-t border-[#76777d]/10 text-[10px] text-[#76777d] flex justify-between">
                          <span className="truncate">Flora: {dest.suitableSpeciesOrUses.slice(0, 2).join(', ')}</span>
                          <span className="font-bold text-[#1b1b1d] shrink-0">{dest.category}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Verified Lab Certificates Table */}
              <div className="space-y-2 pt-2 border-t border-[#76777d]/15">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1b1b1d] flex items-center gap-1.5">
                  <FileCheck size={15} className="text-emerald-700" />
                  <span>Verified Quality Lab Certificates ({qualitySamples.length})</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {qualitySamples.map((samp) => (
                    <div
                      key={samp.id}
                      className="p-4 bg-[#fcf8fa] rounded-xl border border-[#76777d]/15 hover:border-slate-400 transition-all text-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[#131b2e]">{samp.batchNumber}</span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            samp.grade === 'grade_a'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : samp.grade === 'grade_b'
                              ? 'bg-blue-100 text-blue-900 border border-blue-300'
                              : 'bg-red-100 text-red-900 border border-red-300'
                          }`}
                        >
                          {samp.grade.replace('_', ' ')}
                        </span>
                      </div>

                      <p className="text-[#57657b] text-[11px] line-clamp-2">{samp.restrictionNotes}</p>

                      <div className="flex items-center justify-between pt-1 border-t border-[#76777d]/10 text-[#76777d] text-[10px]">
                        <span>WQI: {samp.waterQualityIndex}/100</span>
                        <button
                          onClick={() => setSelectedSampleForModal(samp)}
                          className="text-blue-700 hover:underline font-bold flex items-center gap-1"
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
                <h3 className="text-base font-bold text-[#1b1b1d] flex items-center gap-2">
                  <ClipboardList size={20} className="text-purple-700" />
                  <span>Stage 5: Agricultural Reuse Plan & Demand Matching Engine</span>
                </h3>
                <p className="text-xs text-[#57657b]">
                  Matches treated water inventory with registered farmer bookings across Kopargaon command zones.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={preferredDistMode}
                  onChange={(e) => setPreferredDistMode(e.target.value as DistributionMethod)}
                  className="bg-[#f6f3f5] border border-[#76777d]/20 rounded-xl px-3 py-2 text-[#1b1b1d] text-xs font-semibold focus:outline-none focus:border-[#131b2e] capitalize"
                >
                  <option value="gravity_canal">Gravity Canal (कालवा)</option>
                  <option value="underground_pipeline">Underground Pipeline (पाइपलाइन)</option>
                  <option value="municipal_tanker">Municipal Tanker (टँकर)</option>
                </select>

                <button
                  onClick={handleGeneratePlan}
                  className="flex items-center gap-2 bg-[#131b2e] hover:bg-[#1e2a47] text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl shadow-xs transition-all"
                >
                  <Cpu size={15} />
                  <span>Generate Reuse Plan</span>
                </button>
              </div>
            </div>

            {/* Active Reuse Plans List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#76777d]">
                Generated Reuse Action Plans ({waterReusePlans.length})
              </h4>

              {waterReusePlans.map((plan) => (
                <div key={plan.id} className="p-4 bg-[#fcf8fa] rounded-xl border border-[#76777d]/15 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#131b2e]">{plan.planCode}</span>
                      <span className="text-[#76777d]">for Batch {plan.batchNumber}</span>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        plan.status === 'approved' || plan.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {plan.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-3 rounded-xl border border-[#76777d]/10 text-[11px]">
                    <div>
                      <span className="text-[#76777d] block">Allocated Volume:</span>
                      <strong className="text-[#1b1b1d] font-mono">{plan.totalVolumeAllocatedKLD.toLocaleString()} KL</strong>
                    </div>
                    <div>
                      <span className="text-[#76777d] block">Farmer Beneficiaries:</span>
                      <strong className="text-emerald-800">{plan.totalFarmerBeneficiaries} Farmers</strong>
                    </div>
                    <div>
                      <span className="text-[#76777d] block">Distribution Mode:</span>
                      <strong className="capitalize text-[#1b1b1d]">{plan.distributionMethod.replace('_', ' ')}</strong>
                    </div>
                    <div>
                      <span className="text-[#76777d] block">Farmer Savings:</span>
                      <strong className="text-emerald-800 font-mono">₹{plan.totalCommercialSavingsInr.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setSelectedPlanForModal(plan)}
                      className="text-blue-700 hover:underline text-xs font-bold flex items-center gap-1"
                    >
                      <Truck size={14} />
                      <span>View Dispatch Order Sheet</span>
                    </button>

                    {plan.status === 'draft' && (
                      <button
                        onClick={() => approveWaterReusePlan(plan.id)}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-lg shadow-xs transition-all"
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
                <h3 className="text-base font-bold text-[#1b1b1d] flex items-center gap-2">
                  <Sprout size={20} className="text-emerald-700" />
                  <span>Stage 6: Agriculture & Farmer Irrigation Dispatch Hub</span>
                </h3>
                <p className="text-xs text-[#57657b]">
                  Track farmer water quota fulfillments, soil health enrichment, and agricultural impact across Kopargaon.
                </p>
              </div>

              <button
                onClick={() => setShowBookingModal(true)}
                className="flex items-center gap-2 bg-[#131b2e] hover:bg-[#1e2a47] text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl shadow-xs transition-all"
              >
                <PlusCircle size={15} />
                <span>Register Farmer Quota</span>
              </button>
            </div>

            {/* Farmer Bookings Queue */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#76777d]">
                Registered Farmer Water Quota Requests ({farmerBookings.length})
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {farmerBookings.map((bk) => (
                  <div key={bk.id} className="p-4 bg-[#fcf8fa] rounded-xl border border-[#76777d]/15 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1b1b1d]">{bk.farmerName}</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          bk.status === 'fulfilled'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : bk.status === 'allocated'
                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {bk.status}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] text-[#57657b]">
                      <div className="flex justify-between">
                        <span>Crop & Acreage:</span>
                        <strong className="capitalize text-[#1b1b1d]">
                          {bk.cropType} ({bk.farmAcreage} Acres)
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Requested Volume:</span>
                        <strong className="text-emerald-800 font-mono">{bk.requestedVolumeKLD.toLocaleString()} KL</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery Channel:</span>
                        <strong className="capitalize text-[#1b1b1d]">
                          {bk.preferredDistribution.replace('_', ' ')}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Location:</span>
                        <span className="text-[#76777d] truncate max-w-[150px]">{bk.wardOrVillage}</span>
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
