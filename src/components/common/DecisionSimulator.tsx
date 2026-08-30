import React, { useState } from 'react';
import { useCivic } from '../../context/CivicContext';
import {
  Sliders,
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  Zap,
  Info,
  DollarSign,
  Users,
  Truck,
} from 'lucide-react';
import { CounterfactualEngine } from '../../services/counterfactualEngine';
import { ResourceType, CounterfactualSimulationResult } from '../../types';

export const DecisionSimulator: React.FC = () => {
  const {
    departments,
    issues,
    resources,
    categories,
    zones,
    weightConfig,
  } = useCivic();

  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    departments[0]?.id || 'b0000000-0000-0000-0000-000000000001'
  );

  const activeDept = departments.find((d) => d.id === selectedDeptId) || departments[0];

  // Simulation controls state
  const [budgetCap, setBudgetCap] = useState<number>(activeDept?.dailyBudgetLimit || 25000);
  const [availableStaff, setAvailableStaff] = useState<number>(8);
  const [additionalJetting, setAdditionalJetting] = useState<number>(0);
  const [additionalSuction, setAdditionalSuction] = useState<number>(0);

  // Policy weights simulation state
  const [weightSev, setWeightSev] = useState<number>(35);
  const [weightUrg, setWeightUrg] = useState<number>(25);
  const [weightPop, setWeightPop] = useState<number>(20);
  const [weightLoc, setWeightLoc] = useState<number>(10);
  const [weightEsc, setWeightEsc] = useState<number>(10);

  const totalWeightSum = weightSev + weightUrg + weightPop + weightLoc + weightEsc;

  // Run simulation
  const additionalEquipment: Partial<Record<ResourceType, number>> = {};
  if (additionalJetting > 0) additionalEquipment['jetting_machine'] = additionalJetting;
  if (additionalSuction > 0) additionalEquipment['water_tanker'] = additionalSuction;

  const simulationResult: CounterfactualSimulationResult = CounterfactualEngine.simulate({
    department: activeDept,
    candidateIssues: issues,
    baseResources: resources,
    categories,
    zones,
    baselineWeights: weightConfig,
    simulationInput: {
      departmentId: selectedDeptId,
      budgetCap,
      availableStaff,
      additionalEquipment,
      policyWeights: {
        ...weightConfig,
        weightSeverity: weightSev / 100,
        weightUrgency: weightUrg / 100,
        weightPopulation: weightPop / 100,
        weightLocation: weightLoc / 100,
        weightEscalation: weightEsc / 100,
      },
    },
  });

  const handleReset = () => {
    setBudgetCap(activeDept?.dailyBudgetLimit || 25000);
    setAvailableStaff(8);
    setAdditionalJetting(0);
    setAdditionalSuction(0);
    setWeightSev(35);
    setWeightUrg(25);
    setWeightPop(20);
    setWeightLoc(10);
    setWeightEsc(10);
  };

  return (
    <div className="space-y-6 text-xs text-slate-800">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#131b2e] to-indigo-950 border border-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Sliders size={11} />
              <span>Counterfactual Decision Simulator</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <ShieldCheck size={12} /> Sandbox Isolated (Zero Production Mutation)
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            What-If Resource & Policy Allocation Sandbox
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Simulate how budget augmentations, extra machinery, or MCDA formula shifts alter ticket approvals and deferred bottlenecks in real-time.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer self-start md:self-auto"
        >
          <RotateCcw size={13} />
          <span>RESET TO BASELINE</span>
        </button>
      </div>

      {/* Main Grid: Controls Left, Live Decision Diff Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Simulation Sliders (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sliders size={14} className="text-indigo-600" />
              <span>Counterfactual Parameters</span>
            </h3>

            {/* Department Selection */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">Target Department</label>
              <select
                value={selectedDeptId}
                onChange={(e) => {
                  setSelectedDeptId(e.target.value);
                  const dept = departments.find((d) => d.id === e.target.value);
                  if (dept) setBudgetCap(dept.dailyBudgetLimit);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} (Daily Limit: ₹{d.dailyBudgetLimit.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {/* Budget Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <DollarSign size={13} className="text-emerald-600" /> Shift Budget Cap
                </span>
                <span className="font-mono font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                  ₹{budgetCap.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min="5000"
                max="60000"
                step="2500"
                value={budgetCap}
                onChange={(e) => setBudgetCap(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>₹5,000</span>
                <span>Baseline: ₹{activeDept?.dailyBudgetLimit.toLocaleString()}</span>
                <span>₹60,000</span>
              </div>
            </div>

            {/* Staff Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Users size={13} className="text-blue-600" /> Available Technician Crew
                </span>
                <span className="font-mono font-extrabold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                  {availableStaff} Technicians
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="16"
                step="1"
                value={availableStaff}
                onChange={(e) => setAvailableStaff(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>2</span>
                <span>Baseline: 8</span>
                <span>16</span>
              </div>
            </div>

            {/* Additional Fleet Additions */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Truck size={13} className="text-amber-600" /> Add Fleet Equipment Units
              </label>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5">
                  <span className="font-bold text-[10px] text-slate-600 block truncate">Jetting Machine</span>
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setAdditionalJetting(cnt)}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                          additionalJetting === cnt
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        +{cnt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5">
                  <span className="font-bold text-[10px] text-slate-600 block truncate">Suction Tanker</span>
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setAdditionalSuction(cnt)}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                          additionalSuction === cnt
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        +{cnt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Policy Weights */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700">MCDA Formula Weights</label>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  totalWeightSum === 100 ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                }`}>
                  Total: {totalWeightSum}%
                </span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600 w-24 truncate">Severity (Risk)</span>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={weightSev}
                    onChange={(e) => setWeightSev(Number(e.target.value))}
                    className="flex-1 accent-indigo-600 cursor-pointer"
                  />
                  <span className="font-mono font-bold w-8 text-right">{weightSev}%</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600 w-24 truncate">Urgency (SLA)</span>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={weightUrg}
                    onChange={(e) => setWeightUrg(Number(e.target.value))}
                    className="flex-1 accent-indigo-600 cursor-pointer"
                  />
                  <span className="font-mono font-bold w-8 text-right">{weightUrg}%</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600 w-24 truncate">Population</span>
                  <input
                    type="range"
                    min="10"
                    max="40"
                    value={weightPop}
                    onChange={(e) => setWeightPop(Number(e.target.value))}
                    className="flex-1 accent-indigo-600 cursor-pointer"
                  />
                  <span className="font-mono font-bold w-8 text-right">{weightPop}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Decision Diff & Counterfactual Insights (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Newly Executable</span>
              <p className="text-2xl font-black text-emerald-950 mt-1">
                +{simulationResult.unblockedIssuesCount}
              </p>
              <span className="text-[10px] text-emerald-700 mt-0.5 block">Unblocked by resource expansion</span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Newly Deferred</span>
              <p className="text-2xl font-black text-amber-950 mt-1">
                {simulationResult.newlyDeferredIssuesCount}
              </p>
              <span className="text-[10px] text-amber-700 mt-0.5 block">Displaced by priority shifts</span>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Simulated Budget Used</span>
              <p className="text-2xl font-black text-blue-950 mt-1 font-mono">
                ₹{simulationResult.simulatedPlan.budgetUtilized.toLocaleString()}
              </p>
              <span className="text-[10px] text-blue-700 mt-0.5 block">
                {simulationResult.simulatedPlan.issuesApprovedCount} Total Approved Issues
              </span>
            </div>
          </div>

          {/* Decision Diff Cards */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Granular Decision Diff Analysis</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Side-by-side comparison showing which work orders shift from Deferred to Approved.
                </p>
              </div>

              <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                {simulationResult.decisionDiff.length} Evaluated
              </span>
            </div>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {simulationResult.decisionDiff.map((diff) => (
                <div
                  key={diff.issueId}
                  className={`p-4 rounded-2xl border transition-all ${
                    diff.changeType === 'NEWLY_EXECUTABLE'
                      ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-500/20'
                      : diff.changeType === 'NEWLY_DEFERRED'
                      ? 'bg-amber-50/90 border-amber-300'
                      : diff.changeType === 'RANK_SHIFT'
                      ? 'bg-blue-50/50 border-blue-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs text-slate-900">{diff.ticketNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase tracking-wider ${
                        diff.changeType === 'NEWLY_EXECUTABLE'
                          ? 'bg-emerald-600 text-white'
                          : diff.changeType === 'NEWLY_DEFERRED'
                          ? 'bg-amber-600 text-white'
                          : diff.changeType === 'RANK_SHIFT'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {diff.changeType.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded ${
                        diff.baselineStatus === 'approved' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-200 text-slate-700'
                      }`}>
                        Baseline: {diff.baselineStatus.toUpperCase()}
                      </span>
                      <ArrowRight size={11} className="text-slate-400" />
                      <span className={`px-1.5 py-0.5 rounded font-bold ${
                        diff.simulatedStatus === 'approved' ? 'bg-emerald-600 text-white' : 'bg-amber-200 text-amber-900'
                      }`}>
                        Simulated: {diff.simulatedStatus.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <p className="font-bold text-xs text-slate-900 mt-2">{diff.title}</p>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{diff.reason}</p>

                  {/* Actionable Counterfactual Tag */}
                  {diff.actionableCounterfactual && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-semibold flex items-center gap-1">
                        <Info size={11} className="text-indigo-600" /> What would change this?
                      </span>
                      <span className="font-mono font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                        {diff.actionableCounterfactual.requiredChange}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
