import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCivic } from '../context/CivicContext';
import { CivicIssue, IssueStatus, UrgencyLevel } from '../types';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { ExplainabilityModal } from '../components/common/ExplainabilityModal';
import { OfficerOverrideModal } from '../components/common/OfficerOverrideModal';
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
} from 'lucide-react';

export const IssuesQueuePage: React.FC = () => {
  const { issues, departments, zones, categories, updateIssueStatus, userRole } = useCivic();
  const [searchParams, setSearchParams] = useSearchParams();

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
      <div className="bg-white border border-[#76777d]/20 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-slate-100 text-[#131b2e] border border-slate-300 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded">
              Triage & Dispatch Stream
            </span>
            <span className="text-xs text-[#76777d]">Showing {filteredIssues.length} of {issues.length} tickets</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1b1b1d] tracking-tight">
            Civic Grievance Triage Queue
          </h1>
          <p className="text-xs sm:text-sm text-[#57657b] mt-1">
            Inspect incoming complaints, audit mathematical scoring drivers, and trigger shift dispatches.
          </p>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white border border-[#76777d]/20 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search size={15} className="absolute left-3 top-2.5 text-[#76777d]" />
            <input
              type="text"
              placeholder="Search Ticket, Title, Address, Resident..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f6f3f5] border border-[#76777d]/20 rounded-xl pl-9 pr-3 py-2 text-xs text-[#1b1b1d] placeholder:text-[#76777d]/70 focus:outline-none focus:border-[#131b2e] font-medium"
            />
          </div>

          {/* Department */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-[#f6f3f5] border border-[#76777d]/20 rounded-xl px-3 py-2 text-[#1b1b1d] focus:outline-none focus:border-[#131b2e] text-xs font-semibold"
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
              className="w-full bg-[#f6f3f5] border border-[#76777d]/20 rounded-xl px-3 py-2 text-[#1b1b1d] focus:outline-none focus:border-[#131b2e] text-xs font-semibold"
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
              className="w-full bg-[#f6f3f5] border border-[#76777d]/20 rounded-xl px-3 py-2 text-[#1b1b1d] focus:outline-none focus:border-[#131b2e] text-xs font-semibold"
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
            <div className="bg-white border border-[#76777d]/20 rounded-2xl p-12 text-center text-[#76777d] text-xs space-y-1">
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
                  className={`bg-white border rounded-2xl p-4 cursor-pointer transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isSelected
                      ? 'border-[#131b2e] ring-2 ring-[#131b2e]/10'
                      : 'border-[#76777d]/20 hover:border-slate-400'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-[#131b2e]">
                        #{idx + 1} • {issue.ticketNumber}
                      </span>
                      <span className="text-[#76777d]">•</span>
                      <span className="text-[11px] text-[#76777d] truncate">
                        {issue.locationAddress}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-[#1b1b1d] truncate">
                      {issue.title}
                    </h3>

                    <p className="text-xs text-[#57657b] line-clamp-1">
                      {issue.rawDescription}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-[#76777d] font-mono pt-1">
                      <span>Reported: {new Date(issue.reportedAt).toLocaleDateString()}</span>
                      <span>SLA: {new Date(issue.slaDueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
        <div className="bg-white border border-[#76777d]/20 rounded-2xl p-5 shadow-xs space-y-4 lg:sticky lg:top-24 self-start">
          {activeIssue ? (
            <div className="space-y-4 text-xs">
              <div className="border-b border-[#76777d]/15 pb-3 flex justify-between items-start">
                <div>
                  <span className="font-mono font-bold text-xs text-[#131b2e]">
                    {activeIssue.ticketNumber}
                  </span>
                  <h3 className="font-bold text-sm text-[#1b1b1d] mt-0.5">
                    {activeIssue.title}
                  </h3>
                </div>
                <StatusBadge status={activeIssue.status} />
              </div>

              {/* Photo if present */}
              {activeIssue.photoUrls && activeIssue.photoUrls.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-[#76777d] uppercase tracking-wider block mb-1">
                    Photo Evidence
                  </span>
                  <img
                    src={activeIssue.photoUrls[0]}
                    alt="Ticket Evidence"
                    className="w-full h-36 object-cover rounded-xl border border-slate-200"
                  />
                </div>
              )}

              {/* Priority Score Breakdown Card */}
              <div className="p-3 bg-[#fcf8fa] border border-[#76777d]/15 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#1b1b1d]">Deterministic Score:</span>
                  <PriorityBadge score={activeIssue.priorityScore?.finalScore} size="sm" />
                </div>
                <p className="text-[11px] text-[#57657b] leading-relaxed">
                  {activeIssue.priorityScore?.explanationSummary || 'Mathematical multi-factor ranking evaluated.'}
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setExplainIssue(activeIssue)}
                    className="flex-1 py-1.5 bg-[#131b2e] hover:bg-[#1e2a47] text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors"
                  >
                    Audit Formula
                  </button>
                  <button
                    onClick={() => setOverrideIssue(activeIssue)}
                    className="flex-1 py-1.5 bg-white border border-[#76777d]/30 hover:bg-slate-50 text-[#131b2e] font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors"
                  >
                    Override
                  </button>
                </div>
              </div>

              {/* Status Update Quick Buttons */}
              <div className="space-y-1.5 pt-2 border-t border-[#76777d]/15">
                <span className="text-[10px] font-bold text-[#76777d] uppercase tracking-wider block">
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
            <div className="p-8 text-center text-[#76777d] text-xs">
              Select a ticket from the queue to inspect details.
            </div>
          )}
        </div>
      </div>

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
    </div>
  );
};
