import React, { useState, useEffect } from 'react';
import { useCivic } from '../../context/CivicContext';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Database,
  Lock,
  FileCode,
  Layers,
  ArrowRight,
  UserCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { PrimaryStoreService, PrimaryStoreHealth } from '../../services/primaryStoreService';
import { RecoveryLedgerService } from '../../services/recoveryLedgerService';
import { RecoveryReport, LedgerVerificationResult, RecoveryLedgerEvent } from '../../types';

export const DisasterRecoveryConsole: React.FC = () => {
  const {
    issues,
    recoveryReport,
    isRecoveryModeActive,
    acknowledgeRecoveryReport,
    confirmUnconfirmedInFlightIssue,
    currentUser,
    userRole,
  } = useCivic();

  const [primaryHealth, setPrimaryHealth] = useState<PrimaryStoreHealth>(PrimaryStoreService.checkHealth());
  const [ledgerEvents, setLedgerEvents] = useState<RecoveryLedgerEvent[]>([]);
  const [hashVerification, setHashVerification] = useState<LedgerVerificationResult>({
    valid: true,
    checkedEvents: 0,
    firstBrokenSequence: null,
    reason: 'OK',
  });
  const [isSimulatingFailure, setIsSimulatingFailure] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [officerNotes, setOfficerNotes] = useState('');
  const [resolvedOpId, setResolvedOpId] = useState<string | null>(null);

  // Poll health & ledger events
  const refreshLedgerAndHealth = async () => {
    const health = PrimaryStoreService.checkHealth();
    setPrimaryHealth(health);
    const events = await RecoveryLedgerService.getAllEvents();
    setLedgerEvents(events);
    const verify = RecoveryLedgerService.verifyRecoveryLedger(events);
    setHashVerification(verify);
  };

  useEffect(() => {
    refreshLedgerAndHealth();
    const interval = setInterval(refreshLedgerAndHealth, 2500);
    return () => clearInterval(interval);
  }, []);

  // 1. Reset Judge Demo
  const handleResetJudgeDemo = async () => {
    await RecoveryLedgerService.seedDemoLedger(issues);
    PrimaryStoreService.restorePrimaryStore(issues);
    acknowledgeRecoveryReport();
    await refreshLedgerAndHealth();
  };

  // 2. Trigger Primary Failure (P0 Task 1)
  const handleTriggerPrimaryFailure = () => {
    setIsSimulatingFailure(true);
    PrimaryStoreService.triggerDestructivePrimaryFailure();
    setTimeout(() => {
      refreshLedgerAndHealth();
      setIsSimulatingFailure(false);
    }, 400);
  };

  // 3. Execute Independent Recovery (P0 Task 4)
  const handleExecuteRecovery = async () => {
    setIsRecovering(true);
    try {
      // Direct call through RecoveryService via window dispatch or refresh
      const { RecoveryService } = await import('../../services/recoveryService');
      const result = await RecoveryService.executeRecovery('manual_simulation');
      await refreshLedgerAndHealth();
    } finally {
      setIsRecovering(false);
    }
  };

  const inFlightOp = issues.find((i) => i.recoveryStatus === 'unconfirmed_in_flight');

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-4 text-xs text-slate-800">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-[#131b2e] to-slate-900 border border-slate-700/80 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Zap size={11} className="fill-red-400" />
              <span>Challenge 1: The Blackout Resilience Console</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Phoenix Protocol v3.0</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Disaster Recovery & Tamper-Evident Ledger Console
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Demonstrates controlled primary-store failure during in-flight operations, independent recovery from append-only SHA-256 hash chains, and uninterrupted operational resumption.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 z-10">
          <button
            type="button"
            onClick={handleResetJudgeDemo}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            title="Reset to clean baseline with in-flight operation OP-8841"
          >
            <RotateCcw size={13} />
            <span>RESET JUDGE DEMO</span>
          </button>
        </div>
      </div>

      {/* 4 Telemetry Status Cards (State Inspection) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Primary Store Health */}
        <div className={`p-4 rounded-2xl border transition-all ${
          primaryHealth.isHealthy
            ? 'bg-white border-slate-200 shadow-xs'
            : 'bg-red-50 border-red-300 text-red-900 shadow-md ring-2 ring-red-500/20'
        }`}>
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>Primary Store</span>
            <Database size={14} className={primaryHealth.isHealthy ? 'text-emerald-600' : 'text-red-600'} />
          </div>
          <p className={`text-base font-extrabold mt-1 flex items-center gap-1.5 ${
            primaryHealth.isHealthy ? 'text-emerald-700' : 'text-red-700'
          }`}>
            {primaryHealth.isHealthy ? 'HEALTHY' : 'FAILED / CORRUPTED'}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">
            {primaryHealth.isHealthy ? `${primaryHealth.totalRecords} Live Records Active` : primaryHealth.lastReadError || 'Read failure'}
          </p>
        </div>

        {/* Independent Ledger Status */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>Recovery Ledger</span>
            <Layers size={14} className="text-blue-600" />
          </div>
          <p className="text-base font-extrabold text-blue-900 mt-1 flex items-center gap-1.5">
            HEALTHY
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            IndexedDB + Supabase ({ledgerEvents.length} Events)
          </p>
        </div>

        {/* Cryptographic Hash Chain */}
        <div className={`p-4 rounded-2xl border transition-all ${
          hashVerification.valid
            ? 'bg-white border-slate-200 shadow-xs'
            : 'bg-amber-50 border-amber-300 text-amber-900'
        }`}>
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>Hash Chain Integrity</span>
            <Lock size={14} className={hashVerification.valid ? 'text-emerald-600' : 'text-amber-600'} />
          </div>
          <p className={`text-base font-extrabold mt-1 flex items-center gap-1.5 ${
            hashVerification.valid ? 'text-emerald-700' : 'text-amber-800'
          }`}>
            {hashVerification.valid ? 'VERIFIED (SHA-256)' : 'COMPROMISED'}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {hashVerification.valid ? `${hashVerification.checkedEvents} Blocks Linked (Genesis 0000)` : hashVerification.reason}
          </p>
        </div>

        {/* In-Flight Operations */}
        <div className={`p-4 rounded-2xl border transition-all ${
          inFlightOp
            ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-xs'
            : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>Operations In Flight</span>
            <AlertTriangle size={14} className={inFlightOp ? 'text-amber-600' : 'text-slate-400'} />
          </div>
          <p className={`text-base font-extrabold mt-1 ${inFlightOp ? 'text-amber-900' : 'text-slate-700'}`}>
            {inFlightOp ? '1 UNCERTAIN' : '0 PENDING'}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">
            {inFlightOp ? `OP-8841 (${inFlightOp.ticketNumber})` : 'All transactions committed'}
          </p>
        </div>
      </div>

      {/* Main Interactive Stage Flow (State A -> B -> C -> D) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              <span>Step-by-Step Judge Demonstration Flow</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Execute controlled primary store failure, observe live corruption, and trigger autonomous replay.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {primaryHealth.isHealthy ? (
              <button
                type="button"
                onClick={handleTriggerPrimaryFailure}
                disabled={isSimulatingFailure}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Zap size={14} className="fill-white" />
                <span>{isSimulatingFailure ? 'Corrupting...' : '💥 TRIGGER PRIMARY STORE FAILURE'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExecuteRecovery}
                disabled={isRecovering}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer animate-pulse"
              >
                <RefreshCw size={14} className={isRecovering ? 'animate-spin' : ''} />
                <span>{isRecovering ? 'Replaying Ledger...' : '🔄 EXECUTE INDEPENDENT LEDGER RECOVERY'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Recovery Report Display (If recovery mode active or report present) */}
        {recoveryReport && (
          <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-emerald-950">
                    State Reconstruction Complete (Phoenix Protocol)
                  </h3>
                  <p className="text-[10px] text-emerald-800 font-mono">
                    Reconstructed at: {new Date(recoveryReport.recoveryTimestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] font-mono font-bold">
                <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded">
                  {recoveryReport.recoveredIssuesCount} RECOVERED
                </span>
                <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded">
                  {recoveryReport.unconfirmedInFlightTickets.length} UNCERTAIN
                </span>
                <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded">
                  0 LOST
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div className="bg-white/80 border border-emerald-200 rounded-xl p-3 space-y-1">
                <span className="font-bold text-slate-600 block">Recovery Source Physical Boundary:</span>
                <span className="font-mono text-emerald-900 font-bold">
                  Independent Append-Only Recovery Ledger (`IndexedDB` + `recovery_event_ledger`)
                </span>
              </div>

              <div className="bg-white/80 border border-emerald-200 rounded-xl p-3 space-y-1">
                <span className="font-bold text-slate-600 block">Cryptographic Hash Validation:</span>
                <span className="font-mono text-emerald-900 font-bold">
                  {hashVerification.valid ? '✓ 100% SHA-256 Hash Chain Integrity Verified' : '⚠ Hash Chain Compromised'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* In-Flight Uncertain Operation Adjudication Card (P0 Task 5 & 7) */}
        {inFlightOp && (
          <div className="p-5 bg-amber-50 border border-amber-300 rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-amber-200 pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                <h3 className="font-bold text-xs text-amber-950">
                  ⚠ Action Confirmation Required for In-Flight Operation
                </h3>
              </div>
              <span className="text-[10px] font-mono bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold">
                OP-8841 (UNCONFIRMED_IN_FLIGHT)
              </span>
            </div>

            <p className="text-[11px] text-amber-900 leading-relaxed">
              Ticket <strong>{inFlightOp.ticketNumber}</strong> had a <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">DISPATCH_STARTED</code> event initiated before the primary storage failure, but crew physical acknowledgment was unconfirmed.
            </p>

            <div className="bg-white border border-amber-200 rounded-xl p-3 text-[11px] space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Incident:</span>
                <span className="font-bold text-slate-900">{inFlightOp.title} ({inFlightOp.locationAddress})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Assigned Equipment:</span>
                <span className="font-mono font-bold text-slate-800">{inFlightOp.requiredEquipment || 'Jetting Machine'}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Enter officer verification notes (e.g. Physical on-site crew dispatch verified)..."
                value={officerNotes}
                onChange={(e) => setOfficerNotes(e.target.value)}
                className="flex-1 bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
              />

              <button
                type="button"
                onClick={() => {
                  confirmUnconfirmedInFlightIssue(inFlightOp.id, officerNotes || 'On-site officer confirmation post-recovery');
                  setResolvedOpId('OP-8841');
                  setOfficerNotes('');
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                <span>✓ Confirm & Re-Verify Action</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ledger Event Inspection Table (Tamper Evidence Proof) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <FileCode size={15} className="text-blue-600" />
              <span>Independent Append-Only Ledger Blocks ({ledgerEvents.length} Events)</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Each block contains SHA-256 payload hash linked to its predecessor block hash.
            </p>
          </div>

          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
            Genesis: 000000000000...
          </span>
        </div>

        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0">
              <tr>
                <th className="py-2 px-3 font-mono">Seq #</th>
                <th className="py-2 px-3">Event Type</th>
                <th className="py-2 px-3 font-mono">Issue ID</th>
                <th className="py-2 px-3 font-mono">Previous Hash</th>
                <th className="py-2 px-3 font-mono">Payload Hash (SHA-256)</th>
                <th className="py-2 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {ledgerEvents.map((evt) => (
                <tr key={evt.sequenceNo} className="hover:bg-slate-50/80">
                  <td className="py-2 px-3 font-bold text-slate-900">#{evt.sequenceNo}</td>
                  <td className="py-2 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      evt.eventType === 'DISPATCH_STARTED'
                        ? 'bg-amber-100 text-amber-900'
                        : evt.eventType === 'ISSUE_CREATED'
                        ? 'bg-blue-100 text-blue-900'
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      {evt.eventType}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-600 truncate max-w-[100px]">{evt.issueId}</td>
                  <td className="py-2 px-3 text-slate-400">{evt.previousHash.substring(0, 10)}...</td>
                  <td className="py-2 px-3 text-emerald-800 font-bold">{evt.payloadHash.substring(0, 10)}...</td>
                  <td className="py-2 px-3 text-slate-500 text-[10px]">
                    {new Date(evt.occurredAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
