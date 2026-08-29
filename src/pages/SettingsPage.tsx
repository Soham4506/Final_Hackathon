import React, { useState } from 'react';
import { useCivic } from '../context/CivicContext';
import { useResilience } from '../context/ResilienceContext';
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
  FileText,
  Zap,
  Flame,
  Activity,
  RefreshCw,
  HardDrive,
  Cpu,
  ShieldCheck,
  Smartphone,
  KeyRound,
  Download,
  Trash2,
} from 'lucide-react';
import { TwoFactorSetupModal } from '../components/auth/TwoFactorSetupModal';
import { getUser2FAConfig, disable2FA, is2FAEnabledForUser } from '../services/twoFactorService';

export const SettingsPage: React.FC = () => {
  const {
    weightConfig,
    setWeightConfig,
    recalculateAllPriorities,
    auditLogs,
    userRole,
    currentUser,
  } = useCivic();

  const {
    isBlackout,
    isWiped,
    inFlightCount,
    shadowDocCount,
    recoveryLoading,
    setModalOpen,
    triggerBlackout,
    triggerCorruption,
    resetSystem,
    runRecovery,
  } = useResilience();

  const [activeTab, setActiveTab] = useState<'weights' | 'audit' | 'chaos' | '2fa'>('weights');
  const [show2FASetupModal, setShow2FASetupModal] = useState(false);
  const [twoFactorConfig, setTwoFactorConfig] = useState(getUser2FAConfig(currentUser.id));

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

  const handleDisable2FA = () => {
    if (window.confirm('Disable Two-Factor Authentication for your account?')) {
      disable2FA(currentUser.id);
      setTwoFactorConfig(getUser2FAConfig(currentUser.id));
    }
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
            Settings, Priority Weights & Security
          </h1>
          <p className="text-xs sm:text-sm text-[#57657b] mt-1">
            Configure formula weighting parameters, audit logs, 2FA authentication, and blackout chaos testing.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-[#f0edef] p-1 rounded-xl border border-[#76777d]/15 flex flex-wrap items-center text-xs shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('weights')}
            className={`px-3.5 py-2 rounded-lg font-bold uppercase text-[11px] tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'weights'
                ? 'bg-[#131b2e] text-white shadow-xs'
                : 'text-[#57657b] hover:text-[#1b1b1d]'
            }`}
          >
            <Sliders size={14} />
            <span>Formula Weights</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-2 rounded-lg font-bold uppercase text-[11px] tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-[#131b2e] text-white shadow-xs'
                : 'text-[#57657b] hover:text-[#1b1b1d]'
            }`}
          >
            <History size={14} />
            <span>Audit Ledger</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTwoFactorConfig(getUser2FAConfig(currentUser.id));
              setActiveTab('2fa');
            }}
            className={`px-3.5 py-2 rounded-lg font-bold uppercase text-[11px] tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === '2fa'
                ? 'bg-[#131b2e] text-white shadow-xs'
                : 'text-[#57657b] hover:text-[#1b1b1d]'
            }`}
          >
            <ShieldCheck size={14} className={is2FAEnabledForUser(currentUser.id) ? 'text-emerald-500' : 'text-amber-500'} />
            <span>2FA Security</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chaos')}
            className={`px-3.5 py-2 rounded-lg font-bold uppercase text-[11px] tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'chaos'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-800 hover:text-amber-950 bg-amber-50/50'
            }`}
          >
            <Zap size={14} />
            <span>⚡ Chaos Testing</span>
          </button>
        </div>
      </div>

      {/* 1. Formula Weights Tab */}
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
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-[#1b1b1d]">1. Base Severity Weight:</span>
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
                    <span className="text-[#1b1b1d]">2. SLA Urgency Weight:</span>
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
                    <span className="text-[#1b1b1d]">3. Population Impact Weight:</span>
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
                    <span className="text-[#1b1b1d]">4. Location Vulnerability Weight:</span>
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
                    <span className="text-[#1b1b1d]">5. Citizen Escalation Multiplier Weight:</span>
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
                  className="px-6 py-2.5 bg-[#131b2e] hover:bg-[#1e2a47] disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition-all uppercase tracking-wider flex items-center gap-2 cursor-pointer"
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
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 font-mono text-[#1b1b1d]">
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

      {/* 2. Audit Ledger Tab */}
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

      {/* 3. 2FA Security Tab */}
      {activeTab === '2fa' && (
        <div className="bg-white border border-[#76777d]/20 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#76777d]/15 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#131b2e] flex items-center justify-center text-amber-400 shadow-md">
                <ShieldCheck size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[#1b1b1d]">Two-Factor Authentication (2FA) Shield</h2>
                  <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded border ${
                    twoFactorConfig.enabled
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border-slate-300'
                  }`}>
                    {twoFactorConfig.enabled ? '✓ ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <p className="text-xs text-[#57657b] mt-0.5">
                  Protect officer and citizen accounts with RFC 6238 TOTP (Google Authenticator) & SMS OTP.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShow2FASetupModal(true)}
              className="px-5 py-2.5 bg-[#131b2e] hover:bg-[#1e2a47] text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm self-start sm:self-auto"
            >
              <Smartphone size={15} className="text-amber-400" />
              <span>{twoFactorConfig.enabled ? 'Reconfigure 2FA' : 'Setup 2FA Authenticator'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                <Smartphone size={16} className="text-blue-700" />
                <span>Authenticator App (TOTP)</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Compatible with Google Authenticator, Microsoft Authenticator, Apple Passwords, Authy, and 1Password.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                <KeyRound size={16} className="text-amber-600" />
                <span>Emergency Backup Codes</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                8 cryptographically hashed single-use recovery codes generated for emergency offline account access.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                <Activity size={16} className="text-emerald-600" />
                <span>SMS OTP Delivery</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Instant SMS verification fallback sent to the user's verified registered Indian mobile number (+91).
              </p>
            </div>
          </div>

          {twoFactorConfig.enabled && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
                <span className="text-xs text-emerald-900 font-semibold">
                  2FA is protecting this session. Any sign-in from a new device will prompt for 6-digit TOTP or SMS code.
                </span>
              </div>
              <button
                type="button"
                onClick={handleDisable2FA}
                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Trash2 size={13} />
                <span>Disable 2FA</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. Chaos Testing Tab */}
      {activeTab === 'chaos' && (
        <div className="space-y-5">
          {/* Status KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-[#76777d]/20 rounded-2xl p-4 shadow-xs space-y-1">
              <p className="text-[10px] font-bold text-[#76777d] uppercase tracking-wider">Primary Store Health</p>
              <p className="text-sm font-extrabold mt-1 flex items-center gap-1.5">
                {isBlackout ? (
                  <span className="text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {isWiped ? 'WIPED (0 RECORDS)' : 'BIT-ROT CORRUPTED'}
                  </span>
                ) : (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    HEALTHY (ONLINE)
                  </span>
                )}
              </p>
            </div>

            <div className="bg-white border border-[#76777d]/20 rounded-2xl p-4 shadow-xs space-y-1">
              <p className="text-[10px] font-bold text-[#76777d] uppercase tracking-wider">Shadow Ledger Mirror</p>
              <p className="text-sm font-extrabold mt-1 text-cyan-600 flex items-center gap-1.5">
                <HardDrive className="h-4 w-4 shrink-0" />
                {shadowDocCount} Checkpoints
              </p>
            </div>

            <div className="bg-white border border-[#76777d]/20 rounded-2xl p-4 shadow-xs space-y-1">
              <p className="text-[10px] font-bold text-[#76777d] uppercase tracking-wider">In-Flight Outbox Buffer</p>
              <p className="text-sm font-extrabold mt-1 text-amber-600 flex items-center gap-1.5">
                <Zap className="h-4 w-4 shrink-0" />
                {inFlightCount} Transactions Held
              </p>
            </div>

            <div className="bg-white border border-[#76777d]/20 rounded-2xl p-4 shadow-xs space-y-1">
              <p className="text-[10px] font-bold text-[#76777d] uppercase tracking-wider">Disaster Recovery RTO</p>
              <p className="text-sm font-extrabold mt-1 text-purple-600 flex items-center gap-1.5">
                <Cpu className="h-4 w-4 shrink-0" />
                &lt; 50ms Autonomous
              </p>
            </div>
          </div>

          {/* Main Phoenix Protocol Chaos Console */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950 border-2 border-amber-500/50 rounded-2xl p-6 shadow-xl text-slate-100 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold">
                    <Flame size={18} />
                  </span>
                  <h2 className="text-base font-bold text-white tracking-wide">
                    The Blackout: Live Disaster Recovery Sentry (Phoenix Protocol)
                  </h2>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Live data store wipe & in-flight corruption survivability engine for hackathon evaluation
                </p>
              </div>

              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg font-mono font-bold self-start sm:self-auto">
                CHALLENGE 1 COMPLIANT
              </span>
            </div>

            {/* 3-Action Chaos Trigger Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                type="button"
                onClick={triggerBlackout}
                className="p-3.5 rounded-xl border border-red-500/40 bg-red-600/20 hover:bg-red-600/30 text-red-300 font-bold text-xs flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-xs text-center"
              >
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <span>⚡ 1. Wipe Primary Data Store (The Blackout)</span>
              </button>

              <button
                type="button"
                onClick={triggerCorruption}
                className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 font-bold text-xs flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-xs text-center"
              >
                <ShieldAlert className="h-5 w-5 text-amber-400" />
                <span>💥 2. Corrupt In-Flight Bit-Rot</span>
              </button>

              <button
                type="button"
                onClick={runRecovery}
                disabled={recoveryLoading}
                className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold text-xs flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-xs text-center disabled:opacity-50"
              >
                <RefreshCw className={`h-5 w-5 text-emerald-400 ${recoveryLoading ? 'animate-spin' : ''}`} />
                <span>🛡️ 3. Autonomous Phoenix Rebuild</span>
              </button>
            </div>

            {isBlackout && (
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-amber-300 font-medium">
                  Disaster state active. Reset to normal primary store:
                </span>
                <button
                  type="button"
                  onClick={resetSystem}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  Reset to Normal Primary Store
                </button>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <FileText size={14} className="text-amber-400" />
                <span>Open Full Telemetry & Post-Mortem Console</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Setup Modal */}
      <TwoFactorSetupModal
        user={currentUser}
        isOpen={show2FASetupModal}
        onClose={() => setShow2FASetupModal(false)}
        onConfigUpdated={() => setTwoFactorConfig(getUser2FAConfig(currentUser.id))}
      />
    </div>
  );
};
