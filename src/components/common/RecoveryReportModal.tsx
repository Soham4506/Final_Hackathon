import React, { useState } from 'react';
import { RecoveryReport, CivicIssue } from '../../types';
import { useCivic } from '../../context/CivicContext';
import {
  X,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  RefreshCcw,
  Clock,
  FileText,
  AlertCircle,
  Database,
  Layers,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { PriorityBadge } from './PriorityBadge';
import { StatusBadge } from './StatusBadge';

interface RecoveryReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: RecoveryReport;
}

export const RecoveryReportModal: React.FC<RecoveryReportModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  const { issues, confirmUnconfirmedInFlightIssue, acknowledgeRecoveryReport } = useCivic();
  const [activeTab, setActiveTab] = useState<'overview' | 'inflight' | 'unrecoverable' | 'recovered'>('overview');
  const [reverifyingId, setReverifyingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const inFlightIssues = issues.filter((i) => i.recoveryStatus === 'unconfirmed_in_flight');
  const recoveredIssues = issues.filter((i) => i.recoveryStatus === 'recovered' || !i.recoveryStatus);

  const handleConfirmInFlight = (issueId: string) => {
    setReverifyingId(issueId);
    setTimeout(() => {
      confirmUnconfirmedInFlightIssue(issueId, 'Re-verified by Municipal Officer on duty');
      setReverifyingId(null);
    }, 300);
  };

  const handleAcknowledgeAndClose = () => {
    acknowledgeRecoveryReport();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8 text-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-950 border border-amber-800 text-amber-400">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold border border-amber-500/40">
                  DISASTER RECOVERY AUDIT
                </span>
                <span className="text-slate-400">•</span>
                <h3 className="text-base font-bold text-white">
                  Data Store Integrity & Ledger Replay Report
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Independent Append-Only Event Ledger State Reconstruction
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Top Metric Summary Cards */}
        <div className="p-6 bg-slate-950/50 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Events Processed</div>
            <div className="text-xl font-mono font-extrabold text-white mt-0.5">
              {report.successfulEventsReplayed} <span className="text-xs text-slate-500 font-normal">/ {report.totalEventsProcessed}</span>
            </div>
            <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 size={11} /> 100% Sequence Replayed
            </div>
          </div>

          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-emerald-900/50">
            <div className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">Clean Recovered</div>
            <div className="text-xl font-mono font-extrabold text-emerald-400 mt-0.5">
              {report.fullyRecoveredCount} <span className="text-xs text-slate-500 font-normal">records</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Full state restored</div>
          </div>

          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-amber-900/50">
            <div className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">In-Flight Unconfirmed</div>
            <div className="text-xl font-mono font-extrabold text-amber-400 mt-0.5">
              {report.unconfirmedInFlightTickets.length} <span className="text-xs text-slate-500 font-normal">action(s)</span>
            </div>
            <div className="text-[10px] text-amber-300 mt-1">Requires re-verification</div>
          </div>

          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-red-900/50">
            <div className="text-[11px] text-red-400 font-bold uppercase tracking-wider">Buffer Loss (Lost)</div>
            <div className="text-xl font-mono font-extrabold text-red-400 mt-0.5">
              {report.corruptedEventsCount} <span className="text-xs text-slate-500 font-normal">events</span>
            </div>
            <div className="text-[10px] text-red-400 mt-1">Honest tail truncation</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 bg-slate-900 border-b border-slate-800 flex gap-2 text-xs shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition-all ${
              activeTab === 'overview'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📋 Recovery Overview & Narrative
          </button>
          <button
            onClick={() => setActiveTab('inflight')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'inflight'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>⚠️ In-Flight Verification</span>
            {report.unconfirmedInFlightTickets.length > 0 && (
              <span className="bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-full font-mono text-[10px] font-extrabold">
                {report.unconfirmedInFlightTickets.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('recovered')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition-all ${
              activeTab === 'recovered'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ✓ Recovered Records ({recoveredIssues.length})
          </button>
          <button
            onClick={() => setActiveTab('unrecoverable')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition-all ${
              activeTab === 'unrecoverable'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🔴 Honest Loss Log ({report.unrecoverableTickets.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-4 text-amber-200 space-y-2">
                <div className="font-bold text-amber-400 flex items-center gap-2 text-sm">
                  <AlertTriangle size={17} />
                  <span>Resilience Mechanism: Independent Append-Only Event Sourcing</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  When primary browser storage (`civicpulse_issues`) was destroyed during active mid-operation execution, the system detected the checksum violation and initiated automated replay from the isolated append-only event ledger (`civicpulse_event_ledger_v1`).
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Recovery Audit Timeline Diagnostics
                </span>
                <ul className="space-y-2 text-xs text-slate-300">
                  {report.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-2 text-slate-400 font-mono text-[11px]">
                    <Clock size={13} className="shrink-0 mt-0.5 text-slate-500" />
                    <span>Timestamp: {new Date(report.recoveryTimestamp).toLocaleString()} • Trigger: {report.triggerSource}</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Continuous Operations Guarantee
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The system is currently <strong>100% operational</strong>. New complaints can be submitted, prioritized, and dispatched immediately. No page reload or administrative server restart is required.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: IN-FLIGHT RE-VERIFICATION */}
          {activeTab === 'inflight' && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-200 text-xs">
                <strong>Why this is here:</strong> An operation was in mid-execution when the blackout occurred. Instead of assuming it succeeded or dropping it silently, KoparNiti flags it for human officer confirmation.
              </div>

              {inFlightIssues.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs bg-slate-950 rounded-xl border border-slate-800">
                  ✓ All in-flight actions have been reviewed and confirmed.
                </div>
              ) : (
                inFlightIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-4 bg-slate-950 border border-amber-900/60 rounded-xl space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-amber-400 font-bold text-xs">{issue.ticketNumber}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-white font-bold text-xs">{issue.title}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">{issue.locationAddress}</span>
                      </div>
                      <PriorityBadge score={issue.priorityScore?.finalScore} size="sm" />
                    </div>

                    <div className="text-xs text-amber-300/90 leading-relaxed bg-amber-950/20 p-2.5 rounded-lg border border-amber-900/30">
                      {issue.recoveryNote || 'In-flight operation interrupted mid-execution during blackout.'}
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <span className="text-[11px] font-mono text-slate-400">
                        Status: <strong className="text-white capitalize">{issue.status}</strong>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleConfirmInFlight(issue.id)}
                        disabled={reverifyingId === issue.id}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <UserCheck size={14} />
                        <span>{reverifyingId === issue.id ? 'Confirming...' : '✓ Confirm & Re-Verify Action'}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: RECOVERED RECORDS */}
          {activeTab === 'recovered' && (
            <div className="space-y-2">
              <span className="text-xs text-slate-400 block mb-2">
                The following {recoveredIssues.length} records were fully restored with their complete multi-factor priority scores:
              </span>
              <div className="divide-y divide-slate-800 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                {recoveredIssues.map((iss) => (
                  <div key={iss.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-400">{iss.ticketNumber}</span>
                        <span className="text-slate-400 truncate">{iss.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{iss.locationAddress}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <PriorityBadge score={iss.priorityScore?.finalScore} size="sm" />
                      <StatusBadge status={iss.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: UNRECOVERABLE / BUFFER LOSS */}
          {activeTab === 'unrecoverable' && (
            <div className="space-y-3">
              <div className="p-3 bg-red-950/30 border border-red-800/50 rounded-xl text-red-200 text-xs">
                <strong>Honest Failure Surface:</strong> In a real-world crash, uncommitted in-flight write-ahead buffers may experience partial loss. Rather than faking 100% magic recovery, KoparNiti surfaces these losses explicitly so municipal staff can perform manual follow-up.
              </div>

              <div className="space-y-2">
                {report.unrecoverableTickets.map((unrec, idx) => (
                  <div key={idx} className="p-3 bg-slate-950 border border-red-900/40 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center justify-between text-red-400 font-bold">
                      <span className="font-mono">{unrec.eventId}</span>
                      <span className="text-[10px] uppercase bg-red-950 px-2 py-0.5 rounded border border-red-800">
                        Buffer Loss
                      </span>
                    </div>
                    <p className="text-slate-300 text-xs">{unrec.reason}</p>
                    {unrec.lastKnownDetails && (
                      <div className="text-[11px] text-slate-500 font-mono">
                        Note: {unrec.lastKnownDetails}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400">
            {inFlightIssues.length > 0 ? (
              <span className="text-amber-400 font-bold">
                ⚠️ {inFlightIssues.length} in-flight action(s) still require officer re-verification.
              </span>
            ) : (
              <span className="text-emerald-400 font-bold">
                ✓ All recovered items confirmed. System ready for normal operation.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAcknowledgeAndClose}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-sm"
            >
              ✓ Acknowledge & Dismiss Banner
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
