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
  Zap,
  Database,
  Flame,
  Activity,
  Check,
} from 'lucide-react';
import { RecoveryReportModal } from '../components/common/RecoveryReportModal';
import { EventLogService } from '../services/eventLogService';
import { IntegrityCheckService } from '../services/integrityCheckService';

export const SettingsPage: React.FC = () => {
  const {
    weightConfig,
    setWeightConfig,
    recalculateAllPriorities,
    auditLogs,
    userRole,
    currentUser,
    recoveryReport,
    isRecoveryModeActive,
    isBlackoutSimulating,
    simulateBlackoutChaos,
  } = useCivic();

  const [activeTab, setActiveTab] = useState<'weights' | 'audit' | 'chaos'>('weights');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [chaosMessage, setChaosMessage] = useState<string | null>(null);

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

  const handleRunChaosSimulation = async () => {
    setChaosMessage('💥 Executing live storage blackout & uncommitted log truncation...');
    try {
      const rep = await simulateBlackoutChaos();
      setChaosMessage(
        `✓ Blackout recovery executed: Restored ${rep.recoveredIssuesCount} records (${rep.corruptedEventsCount} buffer losses, ${rep.unconfirmedInFlightTickets.length} unconfirmed in-flight).`
      );
      setIsReportModalOpen(true);
    } catch (err: any) {
      setChaosMessage(`Chaos simulation error: ${err.message}`);
    }
  };

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
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border border-[#76777d]/20 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-slate-100 text-[#131b2e] border border-slate-300 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <Settings size={12} /> Council Administration
            </span>
            <span className="text-xs text-[#76777d]">KoparNiti (कोपरनीती) • Engine Tuning & Ledger</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1b1b1d] tracking-tight">
            Settings, Priority Weights & Audit Ledger
          </h1>
          <p className="text-xs sm:text-sm text-[#57657b] mt-1">
            Configure mathematical formula weighting parameters and inspect the permanent municipal audit ledger.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-[#f0edef] p-1 rounded-xl border border-[#76777d]/15 flex items-center text-xs shrink-0">
          <button
            onClick={() => setActiveTab('weights')}
            className={`px-4 py-2 rounded-lg font-bold uppercase text-[11px] tracking-wider transition-all flex items-center gap-1.5 ${
              activeTab === 'weights'
                ? 'bg-[#131b2e] text-white shadow-xs'
                : 'text-[#57657b] hover:text-[#1b1b1d]'
            }`}
          >
            <Sliders size={14} />
            <span>Formula Weights</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-lg font-bold uppercase text-[11px] tracking-wider transition-all flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-[#131b2e] text-white shadow-xs'
                : 'text-[#57657b] hover:text-[#1b1b1d]'
            }`}
          >
            <History size={14} />
            <span>Audit Ledger</span>
          </button>
          <button
            onClick={() => setActiveTab('chaos')}
            className={`px-4 py-2 rounded-lg font-bold uppercase text-[11px] tracking-wider transition-all flex items-center gap-1.5 ${
              activeTab === 'chaos'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-800 hover:text-amber-950 bg-amber-50/50'
            }`}
          >
            <Zap size={14} />
            <span>⚡ Chaos Testing (Blackout)</span>
          </button>
        </div>
      </div>

      {activeTab === 'weights' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Form Controls (2 Cols) */}
          <div className="lg:col-span-2 bg-white border border-[#76777d]/20 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#76777d]/15 pb-3">
              <h2 className="font-bold text-sm uppercase tracking-wider text-[#1b1b1d]">
                Mathematical Factor Weight Configuration
              </h2>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="text-xs text-blue-700 font-bold hover:underline flex items-center gap-1"
              >
                <RotateCcw size={13} />
                <span>Reset Standard Model</span>
              </button>
            </div>

            {saveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>Priority formula weights updated and all civic scores recalculated!</span>
              </div>
            )}

            <form onSubmit={handleSaveWeights} className="space-y-4 text-xs">
              {/* Sliders */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-[#1b1b1d]">1. Base Severity Weight (\(W_{sev}\)):</span>
                    <span className="font-mono text-blue-800 font-bold">{(sev * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={0.7}
                    step={0.05}
                    value={sev}
                    onChange={(e) => setSev(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#eae7e9] rounded-lg cursor-pointer accent-[#131b2e]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-[#1b1b1d]">2. SLA Urgency Weight (\(W_{urg}\)):</span>
                    <span className="font-mono text-blue-800 font-bold">{(urg * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={0.6}
                    step={0.05}
                    value={urg}
                    onChange={(e) => setUrg(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#eae7e9] rounded-lg cursor-pointer accent-[#131b2e]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-[#1b1b1d]">3. Population Impact Weight (\(W_{pop}\)):</span>
                    <span className="font-mono text-blue-800 font-bold">{(pop * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={0.5}
                    step={0.05}
                    value={pop}
                    onChange={(e) => setPop(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#eae7e9] rounded-lg cursor-pointer accent-[#131b2e]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-[#1b1b1d]">4. Location Vulnerability Weight (\(W_{loc}\)):</span>
                    <span className="font-mono text-blue-800 font-bold">{(loc * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={0.4}
                    step={0.05}
                    value={loc}
                    onChange={(e) => setLoc(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#eae7e9] rounded-lg cursor-pointer accent-[#131b2e]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-[#1b1b1d]">5. Citizen Escalation Multiplier Weight (\(W_{esc}\)):</span>
                    <span className="font-mono text-blue-800 font-bold">{(esc * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={0.4}
                    step={0.05}
                    value={esc}
                    onChange={(e) => setEsc(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#eae7e9] rounded-lg cursor-pointer accent-[#131b2e]"
                  />
                </div>
              </div>

              {/* Total Sum Validator */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                isValidSum
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold'
                  : 'bg-red-50 border-red-200 text-red-900 font-bold'
              }`}>
                <span>Total Factor Weight Sum:</span>
                <span className="font-mono">{totalWeight.toFixed(2)} / 1.00</span>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={!isValidSum}
                  className="px-6 py-2.5 bg-[#131b2e] hover:bg-[#1e2a47] disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition-all uppercase tracking-wider flex items-center gap-2"
                >
                  <Save size={14} />
                  <span>Save Formula & Recalculate</span>
                </button>
              </div>
            </form>
          </div>

          {/* Formula Reference Card (1 Col) */}
          <div className="bg-white border border-[#76777d]/20 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#1b1b1d] border-b border-[#76777d]/15 pb-3">
              Mathematical Formula Model
            </h3>
            <div className="p-3 bg-[#fcf8fa] border border-[#76777d]/15 rounded-xl text-xs space-y-2 font-mono text-[#1b1b1d]">
              <div className="text-[11px] font-bold text-blue-800">
                Score = W_sev·Sev + W_urg·Urg + W_pop·Pop + W_loc·Loc + W_esc·Esc - Penalty
              </div>
              <p className="text-[10px] text-[#57657b] font-sans">
                Every ticket's priority score is strictly computed via this transparent linear combination formula.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Audit Ledger Tab */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-[#76777d]/20 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[#76777d]/15 bg-[#fcf8fa]">
            <h2 className="font-bold text-xs uppercase tracking-wider text-[#1b1b1d]">
              Permanent Municipal Audit Trail
            </h2>
          </div>

          <div className="divide-y divide-[#76777d]/15 text-xs">
            {auditLogs.length === 0 ? (
              <div className="p-10 text-center text-[#76777d]">No audit records logged yet.</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#1b1b1d]">{log.action}</span>
                    <p className="text-[#57657b] text-[11px]">{log.entityType} • {log.actorName}</p>
                  </div>
                  <span className="text-[10px] text-[#76777d] font-mono">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Chaos Testing (Blackout Resilience) Tab */}
      {activeTab === 'chaos' && (
        <div className="space-y-5">
          {/* Integrity & Independent Ledger Health Status */}
          {(() => {
            const integrity = IntegrityCheckService.verifyStorageIntegrity();
            const { events } = EventLogService.getAllEvents();

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-[#76777d]/20 rounded-2xl p-4 shadow-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#76777d] uppercase tracking-wider">Primary Store Integrity</span>
                    {integrity.isValid ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300">
                        ✓ HEALTHY
                      </span>
                    ) : (
                      <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded border border-red-300 animate-pulse">
                        ⚠️ CORRUPTED
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-mono font-extrabold text-[#1b1b1d]">
                    {integrity.issueCount ?? 0} <span className="text-xs text-[#76777d] font-normal">records stored</span>
                  </div>
                  <div className="text-[10px] text-[#57657b] font-mono truncate">
                    Checksum: {integrity.actualChecksum || integrity.expectedChecksum || 'chk-none'}
                  </div>
                </div>

                <div className="bg-white border border-[#76777d]/20 rounded-2xl p-4 shadow-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#76777d] uppercase tracking-wider">Independent Event Ledger</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded border border-blue-300">
                      APPEND-ONLY
                    </span>
                  </div>
                  <div className="text-lg font-mono font-extrabold text-[#1b1b1d]">
                    {events.length} <span className="text-xs text-[#76777d] font-normal">immutable events</span>
                  </div>
                  <div className="text-[10px] text-[#57657b] font-mono truncate">
                    Key: civicpulse_event_ledger_v1
                  </div>
                </div>

                <div className="bg-white border border-[#76777d]/20 rounded-2xl p-4 shadow-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#76777d] uppercase tracking-wider">Recovery System State</span>
                    {isRecoveryModeActive ? (
                      <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-300">
                        RECOVERY ACTIVE
                      </span>
                    ) : (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300">
                        NORMAL MODE
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-mono font-extrabold text-[#1b1b1d]">
                    {recoveryReport ? (
                      <span>{recoveryReport.recoveredIssuesCount} <span className="text-xs text-slate-500 font-normal">restored</span></span>
                    ) : (
                      <span>Standing By</span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#57657b]">
                    {isRecoveryModeActive ? 'Awaiting officer acknowledgment' : 'Automatic liveness monitor active'}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Main Chaos Simulator Action Box */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950 border-2 border-amber-500/50 rounded-2xl p-6 shadow-xl text-slate-100 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold">
                    <Flame size={18} />
                  </span>
                  <h2 className="text-base font-bold text-white tracking-wide">
                    Live Storage Blackout & Chaos Resilience Simulator
                  </h2>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Demonstrates live mid-operation storage failure detection, write-buffer loss honesty, and state replay.
                </p>
              </div>

              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg font-mono font-bold self-start sm:self-auto">
                CHALLENGE 1 COMPLIANT
              </span>
            </div>

            {/* Step-by-Step Transparency Guide */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
                <span className="text-amber-400 font-bold font-mono">1. Mid-Flight Operation</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Fires an urgent emergency machinery allocation and SMS alert in flight.
                </p>
              </div>
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
                <span className="text-red-400 font-bold font-mono">2. Storage Catastrophe</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Corrupts primary data store (`civicpulse_issues`) with malformed syntax.
                </p>
              </div>
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
                <span className="text-orange-400 font-bold font-mono">3. Buffer Truncation</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Truncates tail entries of the independent event ledger (honest buffer loss).
                </p>
              </div>
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
                <span className="text-emerald-400 font-bold font-mono">4. Event Log Replay</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Reconstructs state, flags in-flight actions, and continues accepting new work.
                </p>
              </div>
            </div>

            {/* Action Trigger Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={handleRunChaosSimulation}
                disabled={isBlackoutSimulating}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-red-600 via-amber-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Flame size={16} />
                <span>
                  {isBlackoutSimulating
                    ? '💥 Simulating Storage Blackout Mid-Operation...'
                    : '💥 Simulate Data Store Blackout Mid-Operation'}
                </span>
              </button>

              {recoveryReport && (
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(true)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <FileText size={14} className="text-amber-400" />
                  <span>View Latest Disaster Recovery Report</span>
                </button>
              )}
            </div>

            {chaosMessage && (
              <div className="p-3 bg-slate-900 border border-amber-500/40 rounded-xl text-amber-200 text-xs font-mono">
                {chaosMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recovery Report Audit Modal */}
      {isReportModalOpen && recoveryReport && (
        <RecoveryReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          report={recoveryReport}
        />
      )}
    </div>
  );
};
