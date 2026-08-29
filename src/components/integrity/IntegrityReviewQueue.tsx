import React, { useState } from 'react';
import { useCivic } from '../../context/CivicContext';
import { CivicIssue } from '../../types';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Camera,
  MapPin,
  Clock,
  Sparkles,
  Zap,
  Filter,
  Search,
} from 'lucide-react';
import { IntegrityEvidenceModal } from './IntegrityEvidenceModal';

export const IntegrityReviewQueue: React.FC = () => {
  const { issues, simulateCoordinatedSmearAttack, userRole } = useCivic();

  const [selectedIssue, setSelectedIssue] = useState<CivicIssue | null>(null);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'high' | 'suspicious'>('all');

  const quarantinedIssues = issues.filter(
    (i) => i.status === 'pending_integrity_review'
  );

  const filtered = quarantinedIssues.filter((iss) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        iss.ticketNumber.toLowerCase().includes(q) ||
        iss.title.toLowerCase().includes(q) ||
        iss.locationAddress.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleInspect = (iss: CivicIssue) => {
    setSelectedIssue(iss);
    setEvidenceModalOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner with Attack Simulator */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-950 border border-amber-500/40 rounded-2xl p-5 text-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldAlert size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Trust & Coordination Intake Quarantine
              </h2>
              <span className="text-[10px] bg-red-500/30 text-red-300 border border-red-500/50 px-2 py-0.5 rounded font-mono font-bold">
                {quarantinedIssues.length} QUARANTINED
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Submissions flagged for duplicate text clusters, reused photos, or burst brigading are withheld from allocation.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => simulateCoordinatedSmearAttack('Sai Snacks Stall, Shivaji Chowk')}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
          title="Inject 4 coordinated smear reports targeting Sai Snacks Stall"
        >
          <Zap size={14} className="fill-slate-950" />
          <span>⚡ Simulate Coordinated Smear Attack (Demo)</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quarantined from Allocation</p>
          <p className="text-xl font-extrabold text-amber-900 mt-1 flex items-center gap-1.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            {quarantinedIssues.length} Complaints
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Zero machinery / budget consumed</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Algorithmic Philosophy</p>
          <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            Throttle & Review (No Auto-Bans)
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Prevents weaponized rival attacks</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Forensic Signals</p>
          <p className="text-xs font-bold text-purple-900 mt-1 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
            pHash + Jaccard N-Grams + Haversine
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">100% Deterministic & Client-Side</p>
        </div>
      </div>

      {/* Issues List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
            Quarantined Complaints Awaiting Officer Adjudication ({filtered.length})
          </h3>

          <div className="relative">
            <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search quarantined tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 w-full sm:w-64"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <p className="font-bold text-slate-800 text-sm">No complaints currently quarantined!</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              All active complaints have passed token similarity and perceptual photo checks. Click the "Simulate Coordinated Smear Attack" button above to test the quarantine gate.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((iss) => {
              const flags = iss.integrityAssessment?.flags || [];
              const hasPhotoMatch = flags.some((f) => f.photoHashMatch);
              const textSimFlag = flags.find((f) => f.similarityScore !== undefined);

              return (
                <div
                  key={iss.id}
                  className="bg-slate-50 border border-amber-200/80 rounded-2xl p-4 space-y-3 hover:border-amber-400 transition-all shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-mono text-[10px] font-bold">
                          {iss.ticketNumber}
                        </span>
                        <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold uppercase">
                          {iss.integrityAssessment?.riskLevel || 'quarantined'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(iss.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-xs leading-snug">{iss.title}</h4>
                    <p className="text-[11px] text-slate-600 italic line-clamp-2">"{iss.rawDescription}"</p>

                    <div className="flex items-center gap-1 text-[11px] text-slate-700 font-medium pt-1">
                      <MapPin size={12} className="text-red-500 shrink-0" />
                      <span className="truncate">{iss.locationAddress}</span>
                    </div>

                    {/* Flags Pills */}
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {flags.map((f, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200"
                        >
                          {f.title}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Reporter: {iss.citizenName || 'Citizen'}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleInspect(iss)}
                      className="px-3 py-1.5 bg-[#131b2e] hover:bg-[#1e2a47] text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Eye size={12} className="text-amber-400" />
                      <span>Inspect Evidence</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Forensic Evidence Modal */}
      <IntegrityEvidenceModal
        issue={selectedIssue}
        isOpen={evidenceModalOpen}
        onClose={() => {
          setEvidenceModalOpen(false);
          setSelectedIssue(null);
        }}
      />
    </div>
  );
};
