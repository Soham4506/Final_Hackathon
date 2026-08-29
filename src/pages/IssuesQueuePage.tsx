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
  const [searchQuery, setSearchQuery] = useState('');
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
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Civic Issues Queue
            </h1>
            <span className="bg-slate-800 text-slate-300 border border-slate-700 text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold">
              {filteredIssues.length} of {issues.length} Records
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Prioritized municipal inbox for Kopargaon Municipal Council departments.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ticket #, keywords, citizen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Departments (5)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ward Filter */}
          <div>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Kopargaon Wards (8)</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.code}: {z.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 font-medium focus:ring-1 focus:ring-emerald-500"
            >
              <option value="priority">Sort: Priority Score (High → Low)</option>
              <option value="sla">Sort: SLA Deadline (Urgent First)</option>
              <option value="date">Sort: Reported Date (Newest First)</option>
            </select>
          </div>
        </div>

        {/* Secondary Pill Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 text-xs">
          <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Status:</span>
          {['all', 'submitted', 'prioritized', 'scheduled', 'in_progress', 'resolved'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-2.5 py-1 rounded-lg capitalize text-[11px] font-medium transition-all ${
                selectedStatus === st
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Queue Table (Left) + Detail Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Issues List / Table (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex justify-between items-center text-xs text-slate-400">
            <span>Showing {filteredIssues.length} civic tickets</span>
            <span className="font-mono">Ranked by Priority Engine</span>
          </div>

          <div className="divide-y divide-slate-800/80 max-h-[750px] overflow-y-auto">
            {filteredIssues.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <FileText size={32} className="mx-auto mb-2 opacity-50" />
                <p>No civic issues match the selected filters.</p>
              </div>
            ) : (
              filteredIssues.map((issue, idx) => {
                const zone = zones.find((z) => z.id === issue.zoneId);
                const dept = departments.find((d) => d.id === issue.departmentId);
                const isSelected = activeIssueId === issue.id;

                return (
                  <div
                    key={issue.id}
                    onClick={() => setActiveIssueId(issue.id)}
                    className={`p-4 transition-all cursor-pointer hover:bg-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-slate-800/60 border-l-4 border-emerald-500 pl-3'
                        : 'bg-slate-900/40'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {issue.ticketNumber}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {dept?.code}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <MapPin size={11} className="text-slate-500" />
                          {zone?.code} ({zone?.name.slice(0, 20)}...)
                        </span>
                      </div>

                      <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                        {issue.title}
                      </h3>

                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {issue.rawDescription}
                      </p>

                      <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-0.5">
                        <span>Reported: {new Date(issue.reportedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="text-amber-400/90 flex items-center gap-1 font-mono">
                          <Clock size={11} />
                          SLA Due: {new Date(issue.slaDueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
                      <PriorityBadge
                        score={issue.priorityScore?.finalScore}
                        confidence={issue.confidenceScore}
                        onClick={() => setExplainIssue(issue)}
                        size="md"
                      />
                      <StatusBadge status={issue.status} size="sm" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Issue Inspector Drawer (1 Col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
          {activeIssue ? (
            <>
              {/* Drawer Header */}
              <div className="space-y-2 border-b border-slate-800 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {activeIssue.ticketNumber}
                  </span>
                  <StatusBadge status={activeIssue.status} />
                </div>
                <h2 className="text-base font-bold text-white leading-snug">{activeIssue.title}</h2>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <MapPin size={13} className="text-emerald-400 shrink-0" />
                  <span>{activeIssue.locationAddress}</span>
                </div>
              </div>

              {/* Priority Engine Quick Card */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Deterministic Priority</span>
                  <PriorityBadge
                    score={activeIssue.priorityScore?.finalScore}
                    confidence={activeIssue.confidenceScore}
                    size="md"
                  />
                </div>

                <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  {activeIssue.priorityScore?.explanationSummary}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => setExplainIssue(activeIssue)}
                    className="flex-1 py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <HelpCircle size={13} />
                    <span>Score Breakdown</span>
                  </button>

                  {(userRole === 'officer' || userRole === 'admin') && (
                    <button
                      onClick={() => setOverrideIssue(activeIssue)}
                      className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Override priority score with logged justification"
                    >
                      <ShieldAlert size={13} />
                      <span>Override</span>
                    </button>
                  )}
                </div>
              </div>

              {/* AI Structured Feature Extraction */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-emerald-400" />
                  <span>AI Structured Intake Extraction</span>
                </h3>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Confidence Score:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {((activeIssue.confidenceScore ?? 1.0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Affected Citizens:</span>
                    <span className="font-mono text-white">
                      ~{activeIssue.affectedPopulationEstimate.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Estimated Cost:</span>
                    <span className="font-mono text-white">₹{activeIssue.estimatedCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Required Equipment:</span>
                    <span className="font-mono text-amber-300 capitalize">
                      {activeIssue.requiredEquipment?.replace('_', ' ') || 'Standard Kit'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Required Crew:</span>
                    <span className="font-mono text-white">{activeIssue.requiredStaffCount} staff</span>
                  </div>
                </div>
              </div>

              {/* Citizen Details */}
              <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800 pt-3">
                <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <User size={13} /> Citizen Information
                </div>
                <div>Name: {activeIssue.citizenName || 'Verified Kopargaon Resident'}</div>
                <div className="flex items-center gap-1">
                  <Phone size={12} /> {activeIssue.citizenPhone || '+91 98XXX XXXXX'}
                </div>
              </div>

              {/* Status Update Quick Controls for Officers */}
              {(userRole === 'officer' || userRole === 'admin') && (
                <div className="space-y-2 border-t border-slate-800 pt-3 text-xs">
                  <span className="font-semibold text-slate-300">Quick Status Transition:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateIssueStatus(activeIssue.id, 'scheduled')}
                      className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 font-medium text-center"
                    >
                      Schedule for Shift
                    </button>
                    <button
                      onClick={() => updateIssueStatus(activeIssue.id, 'in_progress')}
                      className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg border border-cyan-800 font-medium text-center"
                    >
                      Mark In Progress
                    </button>
                    <button
                      onClick={() => updateIssueStatus(activeIssue.id, 'resolved')}
                      className="col-span-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-center shadow-md shadow-emerald-950 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 size={14} />
                      <span>Mark Rectified & Resolved</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-slate-500">
              Select an issue from the queue to inspect details.
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {explainIssue && (
        <ExplainabilityModal issue={explainIssue} onClose={() => setExplainIssue(null)} />
      )}
      {overrideIssue && (
        <OfficerOverrideModal issue={overrideIssue} onClose={() => setOverrideIssue(null)} />
      )}
    </div>
  );
};
