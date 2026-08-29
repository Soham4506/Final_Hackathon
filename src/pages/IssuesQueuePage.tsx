import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCivic } from '../context/CivicContext';
import { CivicIssue, IssueStatus, UrgencyLevel } from '../types';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { ExplainabilityModal } from '../components/common/ExplainabilityModal';
import { OfficerOverrideModal } from '../components/common/OfficerOverrideModal';
import { IntegrityEvidenceModal } from '../components/integrity/IntegrityEvidenceModal';
import { IntegrityReviewQueue } from '../components/integrity/IntegrityReviewQueue';
import {
  Search,
  Filter,
  SlidersHorizontal,
  Flame,
  Clock,
  MapPin,
  HelpCircle,
  ShieldAlert,
  CheckCircle2,
  ChevronRight,
  Eye,
  Calendar,
  Phone,
  User,
  Layers,
  ArrowUpDown,
  X,
  FileText,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export const IssuesQueuePage: React.FC = () => {
  const { issues, departments, zones, categories, updateIssueStatus, verifyIssueOnSite, userRole } = useCivic();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab View: Standard Queue vs. Integrity Quarantine Review
  const [viewTab, setViewTab] = useState<'queue' | 'integrity'>('queue');
  const [integrityModalIssue, setIntegrityModalIssue] = useState<CivicIssue | null>(null);

  const quarantinedCount = issues.filter(
    (i) => i.status === 'pending_integrity_review'
  ).length;

  // Filters state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'sla'>('priority');

  // Selected issue for inspector drawer
  const selectedParamId = searchParams.get('selected');
  const [activeIssueId, setActiveIssueId] = useState<string | null>(
    selectedParamId || (issues.length > 0 ? issues[0].id : null)
  );

  // Modals state
  const [explainIssue, setExplainIssue] = useState<CivicIssue | null>(null);
  const [overrideIssue, setOverrideIssue] = useState<CivicIssue | null>(null);

  // Filtered & Sorted Issues
  const filteredIssues = useMemo(() => {
    return issues
      .filter((iss) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTicket = iss.ticketNumber.toLowerCase().includes(q);
          const matchesTitle = iss.title.toLowerCase().includes(q);
          const matchesDesc = iss.rawDescription.toLowerCase().includes(q);
          const matchesCitizen = iss.citizenName?.toLowerCase().includes(q);
          if (!matchesTicket && !matchesTitle && !matchesDesc && !matchesCitizen) return false;
        }

        // Department
        if (selectedDept !== 'all' && iss.departmentId !== selectedDept) return false;

        // Zone
        if (selectedZone !== 'all' && iss.zoneId !== selectedZone) return false;

        // Status
        if (selectedStatus !== 'all' && iss.status !== selectedStatus) return false;

        // Urgency
        if (selectedUrgency !== 'all' && iss.urgency !== selectedUrgency) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priority') {
          return (b.priorityScore?.finalScore ?? 0) - (a.priorityScore?.finalScore ?? 0);
        } else if (sortBy === 'sla') {
          return new Date(a.slaDueAt).getTime() - new Date(b.slaDueAt).getTime();
        } else {
          return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
        }
      });
  }, [issues, searchQuery, selectedDept, selectedZone, selectedStatus, selectedUrgency, sortBy]);

  const activeIssue = issues.find((i) => i.id === activeIssueId);

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-slate-100 text-[#131b2e] border border-slate-300 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded">
              Triage & Dispatch Stream
            </span>
            <span className="text-xs text-muted-foreground">Showing {filteredIssues.length} of {issues.length} tickets</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Civic Grievance Triage Queue
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Inspect incoming complaints, audit mathematical scoring drivers, and trigger shift dispatches.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-[#f0edef] dark:bg-slate-800 p-1 rounded-xl border border-border flex items-center text-xs shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setViewTab('queue')}
            className={`px-3.5 py-2 rounded-lg font-bold uppercase text-[11px] tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              viewTab === 'queue'
                ? 'bg-[#131b2e] text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers size={14} />
            <span>Active Queue ({filteredIssues.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewTab('integrity')}
            className={`px-3.5 py-2 rounded-lg font-bold uppercase text-[11px] tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              viewTab === 'integrity'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-800 hover:text-amber-950 bg-amber-50/50'
            }`}
          >
            <ShieldAlert size={14} className={quarantinedCount > 0 ? 'text-amber-300' : ''} />
            <span>Trust & Quarantine ({quarantinedCount})</span>
          </button>
        </div>
      </div>

      {viewTab === 'integrity' ? (
        <IntegrityReviewQueue />
      ) : (
        <>
          {/* Filter Control Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search size={15} className="absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search Ticket, Title, Address, Resident..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted/60 dark:bg-slate-900 border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary font-medium"
            />
          </div>

          {/* Department */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-muted/60 dark:bg-slate-900 border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs font-semibold"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code}: {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ward */}
          <div>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="w-full bg-muted/60 dark:bg-slate-900 border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs font-semibold"
            >
              <option value="all">All Wards</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.code} - {z.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-muted/60 dark:bg-slate-900 border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs font-semibold"
            >
              <option value="priority">Rank: Priority Score</option>
              <option value="date">Rank: Most Recent</option>
              <option value="sla">Rank: SLA Urgency</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Queue & Inspector Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Issue List */}
        <div className="lg:col-span-2 space-y-3">
          {filteredIssues.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground text-xs space-y-1">
              <p>No civic issues match the selected criteria.</p>
              <p className="text-[11px] opacity-75">Try clearing your filters or search query.</p>
            </div>
          ) : (
            filteredIssues.map((issue, idx) => {
              const isSelected = issue.id === activeIssueId;

              return (
                <div
                  key={issue.id}
                  onClick={() => setActiveIssueId(issue.id)}
                  className={`bg-card border rounded-2xl p-4 cursor-pointer transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isSelected
                      ? 'border-[#131b2e] ring-2 ring-[#131b2e]/10'
                      : 'border-border hover:border-slate-400'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-[#131b2e]">
                        #{idx + 1} • {issue.ticketNumber}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-[11px] text-muted-foreground truncate">
                        {issue.locationAddress}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-foreground truncate">
                      {issue.title}
                    </h3>

                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {issue.rawDescription}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground font-mono pt-1">
                      <span>Reported: {new Date(issue.reportedAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>SLA: {new Date(issue.slaDueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {issue.fieldVerificationStatus === 'verified' && (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded font-bold text-[10px]">
                          ✓ Verified On-Site
                        </span>
                      )}
                      {(issue.fieldVerificationStatus === 'pending' || issue.verificationMethod === 'field_verification_requested') && (
                        <span className="bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded font-bold text-[10px]">
                          ⏳ Field Inspection Pending
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0">
                    <PriorityBadge
                      score={issue.priorityScore?.finalScore}
                      confidence={issue.confidenceScore}
                      size="md"
                    />
                    <StatusBadge status={issue.status} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right 1 Col: Selected Issue Telemetry & Action Drawer */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4 lg:sticky lg:top-24 self-start">
          {activeIssue ? (
            <div className="space-y-4 text-xs">
              <div className="border-b border-border pb-3 flex justify-between items-start">
                <div>
                  <span className="font-mono font-bold text-xs text-[#131b2e]">
                    {activeIssue.ticketNumber}
                  </span>
                  <h3 className="font-bold text-sm text-foreground mt-0.5">
                    {activeIssue.title}
                  </h3>
                </div>
                <StatusBadge status={activeIssue.status} />
              </div>

              {/* Photo if present */}
              {activeIssue.photoUrls && activeIssue.photoUrls.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Photo Evidence
                  </span>
                  <img
                    src={activeIssue.photoUrls[0]}
                    alt="Ticket Evidence"
                    className="w-full h-36 object-cover rounded-xl border border-slate-200"
                  />
                </div>
              )}

              {/* Quarantine Alert Card */}
              {activeIssue.status === 'pending_integrity_review' && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <ShieldAlert size={16} className="text-amber-600 shrink-0" />
                    <span>Quarantined: Coordination Flag</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    This ticket triggered algorithmic duplicate or burst signals. It is withheld from allocation pending officer decision.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIntegrityModalIssue(activeIssue)}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Eye size={13} />
                    <span>Inspect Forensic Evidence & Adjudicate</span>
                  </button>
                </div>
              )}

              {/* Priority Score Breakdown Card */}
              <div className="p-3 bg-muted/30 dark:bg-slate-900/60 border border-border rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground">Deterministic Score:</span>
                  <PriorityBadge score={activeIssue.priorityScore?.finalScore} size="sm" />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {activeIssue.priorityScore?.explanationSummary || 'Mathematical multi-factor ranking evaluated.'}
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setExplainIssue(activeIssue)}
                    className="flex-1 py-1.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors"
                  >
                    Audit Formula
                  </button>
                  <button
                    onClick={() => setOverrideIssue(activeIssue)}
                    className="flex-1 py-1.5 bg-card border border-border hover:bg-slate-50 text-[#131b2e] font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors"
                  >
                    Override
                  </button>
                </div>
              </div>

              {/* Field Verification Loop Card (Compensating action for non-smartphone/missing evidence) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-foreground">Field Verification:</span>
                  {activeIssue.fieldVerificationStatus === 'verified' ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded">
                      ✓ Confirmed On-Site
                    </span>
                  ) : activeIssue.fieldVerificationStatus === 'pending' || activeIssue.verificationMethod === 'field_verification_requested' ? (
                    <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded">
                      ⏳ Inspection Pending
                    </span>
                  ) : (
                    <span className="text-[10px] bg-slate-200 text-slate-700 font-medium px-2 py-0.5 rounded">
                      Standard
                    </span>
                  )}
                </div>

                {activeIssue.fieldVerificationStatus === 'verified' ? (
                  <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">
                    Verified on-site by <strong>{activeIssue.fieldVerifiedBy || 'KMC Ward Inspector'}</strong>. Confidence penalty restored to 0.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      {activeIssue.verificationMethod === 'field_verification_requested'
                        ? 'Citizen reported without smartphone photos and requested physical verification.'
                        : 'Missing photo/GPS evidence. Confirming on-site restores full confidence score.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => verifyIssueOnSite(activeIssue.id, 'Physical on-site inspection verified by Ward Officer.')}
                      className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors shadow-2xs"
                    >
                      ✓ Confirm On-Site Verification (+Confidence Bump)
                    </button>
                  </div>
                )}
              </div>

              {/* Status Update Quick Buttons */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Update Municipal Status
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => updateIssueStatus(activeIssue.id, 'scheduled')}
                    className="py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg font-bold text-[10px] uppercase transition-colors"
                  >
                    Schedule
                  </button>
                  <button
                    onClick={() => updateIssueStatus(activeIssue.id, 'in_progress')}
                    className="py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg font-bold text-[10px] uppercase transition-colors"
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => updateIssueStatus(activeIssue.id, 'resolved')}
                    className="py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg font-bold text-[10px] uppercase transition-colors col-span-2"
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-xs">
              Select a ticket from the queue to inspect details.
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {/* Modals */}
      {explainIssue && (
        <ExplainabilityModal
          issue={explainIssue}
          onClose={() => setExplainIssue(null)}
        />
      )}

      {overrideIssue && (
        <OfficerOverrideModal
          issue={overrideIssue}
          onClose={() => setOverrideIssue(null)}
        />
      )}

      {integrityModalIssue && (
        <IntegrityEvidenceModal
          issue={integrityModalIssue}
          isOpen={Boolean(integrityModalIssue)}
          onClose={() => setIntegrityModalIssue(null)}
        />
      )}
    </div>
  );
};

export default IssuesQueuePage;

