import React, { useState } from 'react';
import { useCivic } from '../../context/CivicContext';
import { AlertTriangle, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import { RecoveryReportModal } from './RecoveryReportModal';

export const BlackoutRecoveryBanner: React.FC = () => {
  const { recoveryReport, isRecoveryModeActive, acknowledgeRecoveryReport } = useCivic();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!isRecoveryModeActive || !recoveryReport || recoveryReport.acknowledgedByOfficer) {
    return null;
  }

  const unconfirmedCount = recoveryReport.unconfirmedInFlightTickets?.length || 0;
  const lostCount = recoveryReport.corruptedEventsCount || 0;
  const recoveredCount = recoveryReport.recoveredIssuesCount || 0;

  return (
    <>
      <div className="bg-gradient-to-r from-amber-900 via-amber-950 to-slate-950 text-amber-100 border-b-2 border-amber-600 px-4 py-3 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs z-30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500 text-slate-950 shrink-0 font-bold animate-pulse">
            <ShieldAlert size={18} />
          </div>
          <div>
            <div className="font-extrabold text-amber-300 text-xs sm:text-sm flex items-center gap-2">
              <span>⚠️ Data Store Integrity Failure Detected — State Reconstructed</span>
              <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.2 rounded-full uppercase font-mono font-black">
                Recovery Mode
              </span>
            </div>
            <p className="text-slate-300 text-[11px] sm:text-xs mt-0.5 leading-relaxed">
              Recovered <strong>{recoveredCount}</strong> records from isolated append-only event ledger.
              {lostCount > 0 && <span> <strong>{lostCount}</strong> uncommitted event(s) could not be recovered.</span>}
              {unconfirmedCount > 0 && <span> <strong>{unconfirmedCount}</strong> in-flight action(s) require officer re-verification.</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm"
          >
            <FileText size={13} />
            <span>View Recovery Report</span>
          </button>
          <button
            type="button"
            onClick={acknowledgeRecoveryReport}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-lg text-xs transition-all flex items-center gap-1"
          >
            <CheckCircle2 size={13} className="text-emerald-400" />
            <span>Acknowledge</span>
          </button>
        </div>
      </div>

      {isModalOpen && (
        <RecoveryReportModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          report={recoveryReport}
        />
      )}
    </>
  );
};
