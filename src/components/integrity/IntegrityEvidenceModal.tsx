import React, { useState } from 'react';
import { CivicIssue } from '../../types';
import { useCivic } from '../../context/CivicContext';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  MapPin,
  Camera,
  UserCheck,
  X,
  Sparkles,
} from 'lucide-react';

interface IntegrityEvidenceModalProps {
  issue: CivicIssue | null;
  isOpen: boolean;
  onClose: () => void;
}

export const IntegrityEvidenceModal: React.FC<IntegrityEvidenceModalProps> = ({
  issue,
  isOpen,
  onClose,
}) => {
  const { clearIntegrityReview, rejectFabricatedIssue, issues } = useCivic();

  const [officerNotes, setOfficerNotes] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  if (!isOpen || !issue) return null;

  const assessment = issue.integrityAssessment;
  const flags = assessment?.flags || [];

  // Find any comparator issues referenced in flags
  const referencedTicketNumbers = Array.from(
    new Set(flags.flatMap((f) => f.matchedTicketNumbers || []))
  );
  const referencedIssues = issues.filter((i) =>
    referencedTicketNumbers.includes(i.ticketNumber)
  );

  const handleClear = () => {
    clearIntegrityReview(issue.id, officerNotes || 'Cleared after officer evaluation of on-site evidence.');
    setActionSuccess('Issue cleared and released into normal prioritized allocation queue!');
    setTimeout(() => {
      setActionSuccess(null);
      onClose();
    }, 1500);
  };

  const handleReject = () => {
    if (!officerNotes.trim()) {
      alert('Please provide a mandatory officer reason for rejecting this cluster.');
      return;
    }
    rejectFabricatedIssue(issue.id, officerNotes);
    setActionSuccess('Issue marked as REJECTED_FABRICATED and permanently quarantined.');
    setTimeout(() => {
      setActionSuccess(null);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <ShieldAlert size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-amber-400 font-bold tracking-wider uppercase">
                  Challenge 2 • Coordination & Sybil Gate
                </span>
                <span className="px-2 py-0.5 rounded bg-red-500/30 border border-red-500/50 text-red-300 text-[10px] font-mono font-bold uppercase">
                  QUARANTINED
                </span>
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Integrity Evidence Review: {issue.ticketNumber}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action success alert */}
        {actionSuccess && (
          <div className="px-6 py-3 bg-emerald-500 text-white font-bold text-xs flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          {/* Target Issue Overview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">{issue.title}</span>
                <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                  {issue.ticketNumber}
                </span>
              </div>
              <span className="text-slate-500 text-[11px] font-mono">
                Reported: {new Date(issue.reportedAt).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] pt-1">
              <div>
                <span className="text-slate-400 block font-semibold">Location / Stall Target:</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <MapPin size={12} className="text-red-500 shrink-0" />
                  {issue.locationAddress}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Reporter Account:</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <UserCheck size={12} className="text-blue-500 shrink-0" />
                  {issue.citizenName || 'Citizen User'} ({issue.citizenPhone || 'No Phone'})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Claimed Population Impact:</span>
                <span className="font-bold text-amber-800 mt-0.5 block">
                  {issue.affectedPopulationEstimate?.toLocaleString()} Citizens
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 text-[11px] italic leading-relaxed">
              "{issue.rawDescription}"
            </div>
          </div>

          {/* Forensic Evidence Factor Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                <span>Forensic Algorithmic Detections ({flags.length} Flags)</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                Deterministic Client-Side pHash & Jaccard Engine
              </span>
            </div>

            {flags.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-xl text-center text-slate-500">
                No automated integrity anomalies detected.
              </div>
            ) : (
              <div className="space-y-3">
                {flags.map((flag, idx) => (
                  <div
                    key={idx}
                    className={`border rounded-xl p-4 space-y-2.5 ${
                      flag.severity === 'critical'
                        ? 'bg-red-50/70 border-red-200'
                        : flag.severity === 'high'
                        ? 'bg-amber-50/70 border-amber-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            flag.severity === 'critical'
                              ? 'bg-red-200 text-red-900'
                              : 'bg-amber-200 text-amber-900'
                          }`}
                        >
                          {flag.severity}
                        </span>
                        <h4 className="font-bold text-slate-900 text-xs">{flag.title}</h4>
                      </div>
                      {flag.similarityScore !== undefined && (
                        <span className="font-mono text-xs font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                          {(flag.similarityScore * 100).toFixed(0)}% Text Overlap
                        </span>
                      )}
                      {flag.photoHashMatch && (
                        <span className="font-mono text-xs font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded">
                          pHash Match (0 bit dist)
                        </span>
                      )}
                    </div>

                    <p className="text-slate-700 text-xs leading-relaxed">{flag.description}</p>

                    {flag.matchedTicketNumbers && flag.matchedTicketNumbers.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="font-bold text-slate-600">Correlated Clustered Tickets:</span>
                        {flag.matchedTicketNumbers.map((tNum) => (
                          <span
                            key={tNum}
                            className="bg-white border border-slate-300 font-mono font-bold text-slate-800 px-2 py-0.5 rounded"
                          >
                            {tNum}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Side-by-Side Photo & Text Comparison */}
          {referencedIssues.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                Correlated Submission Comparison (Side-by-Side)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Candidate Under Review */}
                <div className="p-4 bg-amber-50/40 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase text-amber-900">
                    <span>Target Under Review</span>
                    <span className="font-mono">{issue.ticketNumber}</span>
                  </div>
                  <div className="h-28 bg-slate-200 rounded-lg flex items-center justify-center overflow-hidden border border-slate-300 relative">
                    <Camera size={24} className="text-slate-400" />
                    <span className="absolute bottom-1 right-2 text-[9px] font-mono bg-black/60 text-white px-1.5 py-0.5 rounded">
                      pHash: {issue.perceptualPhotoHash || 'a1b2c3d4e5f60011'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 italic">"{issue.rawDescription}"</p>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    Reporter: {issue.citizenName} ({issue.citizenPhone})
                  </p>
                </div>

                {/* Matched Comparator Ticket */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-700">
                    <span>Matched Cluster Ticket</span>
                    <span className="font-mono">{referencedIssues[0].ticketNumber}</span>
                  </div>
                  <div className="h-28 bg-slate-200 rounded-lg flex items-center justify-center overflow-hidden border border-slate-300 relative">
                    <Camera size={24} className="text-slate-400" />
                    <span className="absolute bottom-1 right-2 text-[9px] font-mono bg-black/60 text-white px-1.5 py-0.5 rounded">
                      pHash: {referencedIssues[0].perceptualPhotoHash || 'a1b2c3d4e5f60011'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 italic">"{referencedIssues[0].rawDescription}"</p>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    Reporter: {referencedIssues[0].citizenName} ({referencedIssues[0].citizenPhone})
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Adjudication Decision Card */}
          <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-xl space-y-4 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-white">Officer Adjudication Action</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Transparent human decision logged to permanent municipal ledger.
                </p>
              </div>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-mono">
                RLS AUDIT ENFORCED
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-300">
                Officer Review Notes / Justification:
              </label>
              <textarea
                value={officerNotes}
                onChange={(e) => setOfficerNotes(e.target.value)}
                placeholder="Enter field inspection findings or reason for rejection..."
                rows={2}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <p className="text-[10px] text-slate-400">
                * Rejection permanently quarantines fabricated complaints without deleting evidence.
              </p>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleReject}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-red-600/90 hover:bg-red-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <XCircle size={14} />
                  <span>✕ Reject as Fabricated Cluster</span>
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                  <span>✓ Clear & Release to Queue</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
