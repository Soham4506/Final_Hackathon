import React, { useState } from 'react';
import { useCivic } from '../context/CivicContext';
import { PriorityWeightConfig } from '../types';
import {
  Settings,
  Sliders,
  ShieldAlert,
  History,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Lock,
  FileText,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const {
    weightConfig,
    setWeightConfig,
    recalculateAllPriorities,
    auditLogs,
    userRole,
    currentUser,
  } = useCivic();

  const [activeTab, setActiveTab] = useState<'weights' | 'audit'>('weights');

  // Form state for weights
  const [sev, setSev] = useState(weightConfig.weightSeverity);
  const [urg, setUrg] = useState(weightConfig.weightUrgency);
  const [pop, setPop] = useState(weightConfig.weightPopulation);
  const [loc, setLoc] = useState(weightConfig.weightLocation);
  const [esc, setEsc] = useState(weightConfig.weightEscalation);
  const [penaltyMax, setPenaltyMax] = useState(weightConfig.missingDataPenaltyMax);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const totalWeight = Math.round((sev + urg + pop + loc + esc) * 100) / 100;
  const isValidSum = Math.abs(totalWeight - 1.0) < 0.01;

  const handleSaveWeights = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidSum) return;

    const newConfig: PriorityWeightConfig = {
      ...weightConfig,
      weightSeverity: sev,
      weightUrgency: urg,
      weightPopulation: pop,
      weightLocation: loc,
      weightEscalation: esc,
      missingDataPenaltyMax: penaltyMax,
    };

    setWeightConfig(newConfig);
    recalculateAllPriorities();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    setSev(0.35);
    setUrg(0.25);
    setPop(0.2);
    setLoc(0.1);
    setEsc(0.1);
    setPenaltyMax(20.0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <Settings size={12} /> Council Administration
            </span>
            <span className="text-xs text-slate-400">Deterministic Engine Tuning & Ledger</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Settings, Priority Weights & Audit Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure mathematical formula weighting parameters and inspect the permanent municipal audit ledger.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs shrink-0">
          <button
            onClick={() => setActiveTab('weights')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'weights'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders size={14} />
            <span>Priority Formula Weights</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History size={14} />
            <span>Audit Ledger ({auditLogs.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FORMULA WEIGHTS */}
      {activeTab === 'weights' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <h2 className="font-bold text-white text-base">Deterministic Formula Parameter Tuning</h2>
              <p className="text-xs text-slate-400">
                Formula: S = w_sev*S_sev + w_urg*S_urg + w_pop*S_pop + w_loc*S_loc + w_esc*S_esc - Penalty
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Weights Sum:</span>
              <span
                className={`font-mono font-bold text-sm px-2.5 py-1 rounded-lg border ${
                  isValidSum
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-red-950 text-red-300 border-red-800'
                }`}
              >
                {(totalWeight * 100).toFixed(0)}% / 100%
              </span>
            </div>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>
                Weights updated successfully! Deterministic priority scores recomputed across all active issues.
              </span>
            </div>
          )}

          <form onSubmit={handleSaveWeights} className="space-y-6 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Severity Weight */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-200">Severity / Public Risk (w_sev):</span>
                  <span className="font-mono text-emerald-400 font-bold text-sm">{(sev * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.70"
                  step="0.05"
                  value={sev}
                  onChange={(e) => setSev(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <p className="text-[10px] text-slate-500">
                  Relative importance of health, life-threatening, or structural risks.
                </p>
              </div>

              {/* Urgency Weight */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-200">SLA Urgency Time Decay (w_urg):</span>
                  <span className="font-mono text-amber-400 font-bold text-sm">{(urg * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.50"
                  step="0.05"
                  value={urg}
                  onChange={(e) => setUrg(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <p className="text-[10px] text-slate-500">
                  Rate at which priority accelerates as departmental SLA deadline nears.
                </p>
              </div>

              {/* Population Weight */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-200">Affected Population Spread (w_pop):</span>
                  <span className="font-mono text-blue-400 font-bold text-sm">{(pop * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.40"
                  step="0.05"
                  value={pop}
                  onChange={(e) => setPop(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <p className="text-[10px] text-slate-500">
                  Logarithmic scaling factor based on number of residents impacted.
                </p>
              </div>

              {/* Zone Risk Multiplier */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-200">Ward Critical Multiplier (w_loc):</span>
                  <span className="font-mono text-purple-400 font-bold text-sm">{(loc * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.30"
                  step="0.05"
                  value={loc}
                  onChange={(e) => setLoc(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <p className="text-[10px] text-slate-500">
                  Weight given to critical hospital, school, market, and temple zones.
                </p>
              </div>

              {/* Escalation Weight */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-200">Repeat Escalation Reports (w_esc):</span>
                  <span className="font-mono text-orange-400 font-bold text-sm">{(esc * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.30"
                  step="0.05"
                  value={esc}
                  onChange={(e) => setEsc(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <p className="text-[10px] text-slate-500">
                  Boost applied when multiple unique citizen complaints are logged in same cluster.
                </p>
              </div>

              {/* Confidence Penalty Max */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-red-950/50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-200">Max Confidence Deduction (pts):</span>
                  <span className="font-mono text-red-400 font-bold text-sm">-{penaltyMax} pts</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="35"
                  step="5"
                  value={penaltyMax}
                  onChange={(e) => setPenaltyMax(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
                <p className="text-[10px] text-slate-500">
                  Penalty deducted when citizen submission lacks photos or exact GPS coordinates.
                </p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                <span>Reset Standard Defaults</span>
              </button>

              <button
                type="submit"
                disabled={!isValidSum}
                className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg ${
                  isValidSum
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Save size={15} />
                <span>Save & Recalculate Live Scores</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: AUDIT LOGS LEDGER */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm space-y-4 p-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="font-bold text-white text-base flex items-center gap-2">
                <Lock size={16} className="text-purple-400" />
                <span>Immutable Municipal Audit Trail</span>
              </h2>
              <p className="text-xs text-slate-400">
                Permanent ledger recording every priority override, allocation plan authorization, and system action.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
              {auditLogs.length} Events
            </span>
          </div>

          <div className="divide-y divide-slate-800/80 max-h-[650px] overflow-y-auto text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3.5 space-y-1 hover:bg-slate-850 px-2 rounded-lg transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-purple-400 font-bold bg-purple-950/60 border border-purple-900/60 px-2 py-0.5 rounded text-[10px]">
                      {log.action}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="font-semibold text-slate-200">{log.actorName}</span>
                    <span className="text-slate-400 capitalize">({log.actorRole})</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/60 font-mono text-[11px] text-slate-300 overflow-x-auto">
                  {JSON.stringify(log.details, null, 2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
