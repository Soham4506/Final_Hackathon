import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCivic } from '../context/CivicContext';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { AIIntakeParser } from '../services/aiIntakeParser';
import { ExplainabilityService } from '../services/explainabilityService';
import {
  PlusCircle,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Camera,
  MapPin,
  FileText,
  HelpCircle,
  Truck,
  ShieldCheck,
  Send,
  ArrowRight,
  Info,
} from 'lucide-react';

export const CitizenPortalPage: React.FC = () => {
  const { zones, categories, submitIssue, issues, currentUser } = useCivic();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'submit';

  // Submission Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones[0]?.id || 'z-01');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [affectedPop, setAffectedPop] = useState<number>(50);
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);

  // Tracking Search State
  const [trackQuery, setTrackQuery] = useState<string>('');
  const [trackedIssue, setTrackedIssue] = useState<any>(null);

  // Live AI Structured Intake Preview
  const aiPreview = React.useMemo(() => {
    if (!description.trim() && !title.trim()) return null;
    return AIIntakeParser.parseComplaint(
      title,
      description,
      Boolean(photoUrl.trim()),
      Boolean(address.trim())
    );
  }, [title, description, photoUrl, address]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !address.trim()) return;

    const newIssue = submitIssue({
      title: title.trim(),
      description: description.trim(),
      address: address.trim(),
      zoneId: selectedZoneId,
      photoUrls: photoUrl.trim() ? [photoUrl.trim()] : [],
      affectedPopulation: affectedPop,
    });

    setSubmittedTicket(newIssue.ticketNumber);
    setTrackedIssue(newIssue);
    // Reset form
    setTitle('');
    setDescription('');
    setAddress('');
    setPhotoUrl('');
  };

  const handleTrackSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const found = issues.find(
      (i) => i.ticketNumber.toLowerCase() === trackQuery.trim().toLowerCase()
    );
    setTrackedIssue(found || null);
  };

  // Pre-load recent issue if tracking
  useEffect(() => {
    if (activeTab === 'track' && !trackedIssue && issues.length > 0) {
      setTrackedIssue(issues[0]);
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded">
              Kopargaon Citizen Gateway (नागरिक सेवा केंद्र)
            </span>
            <span className="text-xs text-slate-400">Direct Municipal Transparency</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Citizen Grievance Submission & Real-time Tracking
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Submit civic emergencies with automated structured intake and track exact priority ranking and dispatch stages.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs shrink-0">
          <button
            onClick={() => setSearchParams({ tab: 'submit' })}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'submit'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle size={15} />
            <span>Report Issue</span>
          </button>
          <button
            onClick={() => setSearchParams({ tab: 'track' })}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'track'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search size={15} />
            <span>Track Ticket</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SUBMISSION FORM WIZARD */}
      {activeTab === 'submit' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form (2 Cols) */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
            <h2 className="font-bold text-white text-base flex items-center gap-2">
              <PlusCircle size={18} className="text-emerald-400" />
              <span>Report a Civic Problem in Kopargaon</span>
            </h2>

            {submittedTicket && (
              <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-200 text-xs space-y-1">
                <div className="font-bold text-emerald-300 text-sm flex items-center gap-1.5">
                  <CheckCircle2 size={16} />
                  <span>Issue Registered Successfully!</span>
                </div>
                <p>
                  Your ticket number is <strong className="font-mono text-white">{submittedTicket}</strong>. The deterministic priority engine has calculated its priority score and queued it for the next municipal dispatch.
                </p>
                <button
                  onClick={() => setSearchParams({ tab: 'track' })}
                  className="mt-2 text-emerald-400 font-semibold underline text-[11px]"
                >
                  Click here to view live tracking status →
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Title */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Issue Summary / Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Drinking water pipeline smelling of sewage near Civil Hospital"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Detailed Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe what happened, risk to residents, duration of problem, and any nearby landmarks (e.g. school, hospital, temple)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:ring-1 focus:ring-emerald-500 text-xs leading-relaxed"
                />
              </div>

              {/* Ward & Address Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Kopargaon Ward / Zone <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={selectedZoneId}
                    onChange={(e) => setSelectedZoneId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs focus:ring-1 focus:ring-emerald-500"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.code} - {z.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Specific Street / Landmark Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lane 3, Behind Kopargaon Civil Hospital"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Photos & Population Estimate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
                    <Camera size={13} /> Photo Evidence URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/photo.jpg"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Adding photo evidence ensures 100% confidence with zero penalty deduction.
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Estimated Affected Residents
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20000}
                    value={affectedPop}
                    onChange={(e) => setAffectedPop(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-950/60 flex items-center gap-2 transition-all"
                >
                  <Send size={15} />
                  <span>Submit to Municipal Decision Engine</span>
                </button>
              </div>
            </form>
          </div>

          {/* Real-time AI Structured Extraction Preview (1 Col) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" />
                <span>AI Structured Intake Extraction</span>
              </h3>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                Live Analysis
              </span>
            </div>

            {aiPreview ? (
              <div className="space-y-3 text-xs">
                {/* Confidence Bar */}
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Intake Confidence:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {(aiPreview.confidenceScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${aiPreview.confidenceScore * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    {aiPreview.missingAttributes.length === 0
                      ? 'High confidence: complete location and details provided.'
                      : `Missing: ${aiPreview.missingAttributes.join(', ')} (applies small score penalty).`}
                  </p>
                </div>

                {/* Extracted Attributes */}
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target Dept:</span>
                    <span className="font-mono font-bold text-white">
                      {aiPreview.departmentCodeSuggested}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hazard Level:</span>
                    <span className="font-mono text-amber-300 font-bold uppercase">
                      {aiPreview.structuredData.healthHazardRisk || 'Standard'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Required Machine:</span>
                    <span className="font-mono text-slate-200 capitalize">
                      {aiPreview.requiredEquipment?.replace('_', ' ') || 'Standard Toolset'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Crew Needed:</span>
                    <span className="font-mono text-slate-200">{aiPreview.requiredStaffCount} staff</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 leading-relaxed bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-800/40 text-emerald-300">
                  <Info size={13} className="inline mr-1 text-emerald-400" />
                  AI extracts structured fields only; final priority is calculated deterministically.
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs leading-relaxed">
                Type in your problem description to view real-time structured feature extraction and confidence assessment.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CITIZEN TICKET TRACKING */}
      {activeTab === 'track' && (
        <div className="space-y-6">
          {/* Tracking Search Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <form onSubmit={handleTrackSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter Municipal Ticket Number (e.g. KMC-2026-00101)..."
                  value={trackQuery}
                  onChange={(e) => setTrackQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-blue-950"
              >
                Track Status
              </button>
            </form>
          </div>

          {/* Tracked Ticket Detail Card */}
          {trackedIssue ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
              {/* Top Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-emerald-400 font-bold text-sm">
                      {trackedIssue.ticketNumber}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-xs text-slate-400">
                      Reported on {new Date(trackedIssue.reportedAt).toLocaleString()}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white">{trackedIssue.title}</h2>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <MapPin size={13} className="text-emerald-400" />
                    <span>{trackedIssue.locationAddress}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <PriorityBadge
                    score={trackedIssue.priorityScore?.finalScore}
                    confidence={trackedIssue.confidenceScore}
                    size="lg"
                  />
                  <StatusBadge status={trackedIssue.status} />
                </div>
              </div>

              {/* Progress Stage Timeline */}
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4">
                  Municipal Action Timeline
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {[
                    { key: 'submitted', label: '1. Registered', desc: 'Received by council' },
                    { key: 'prioritized', label: '2. Scored & Queued', desc: 'Evaluated by priority engine' },
                    { key: 'scheduled', label: '3. Work Dispatched', desc: 'Crew & equipment assigned' },
                    { key: 'resolved', label: '4. Rectified', desc: 'Closed and inspected' },
                  ].map((stage, i) => {
                    const isDone =
                      (stage.key === 'submitted') ||
                      (stage.key === 'prioritized' && trackedIssue.status !== 'submitted') ||
                      (stage.key === 'scheduled' && (trackedIssue.status === 'scheduled' || trackedIssue.status === 'in_progress' || trackedIssue.status === 'resolved')) ||
                      (stage.key === 'resolved' && trackedIssue.status === 'resolved');

                    return (
                      <div
                        key={stage.key}
                        className={`p-3.5 rounded-xl border text-xs transition-all ${
                          isDone
                            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                            : 'bg-slate-950/40 border-slate-800 text-slate-500'
                        }`}
                      >
                        <div className="font-bold text-white flex items-center gap-1.5 mb-1">
                          <CheckCircle2
                            size={14}
                            className={isDone ? 'text-emerald-400' : 'text-slate-600'}
                          />
                          <span>{stage.label}</span>
                        </div>
                        <div className="text-[11px] opacity-80">{stage.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Citizen Reassuring Explanation Banner */}
              {(() => {
                const expl = ExplainabilityService.generateCitizenExplanation(trackedIssue);
                return (
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
                    <div className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                      <ShieldCheck size={16} />
                      <span>{expl.statusHeadline}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{expl.detail}</p>
                    <div className="text-[11px] text-amber-300 font-medium">
                      Next Step: {expl.expectedAction}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
              Ticket not found. Check the ticket number or select from recent complaints.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
