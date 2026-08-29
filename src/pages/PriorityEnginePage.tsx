import React, { useState, useEffect } from 'react';
import { useCivic } from '../context/CivicContext';
import { AllocationPlan, AllocationPlanItem, CivicIssue } from '../types';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { ExplainabilityModal } from '../components/common/ExplainabilityModal';
import { OfficerOverrideModal } from '../components/common/OfficerOverrideModal';
import { ResourceDeficitReport } from '../services/allocationEngine';
import {
  Cpu,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Truck,
  Users,
  IndianRupee,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  FileCheck,
} from 'lucide-react';

export const PriorityEnginePage: React.FC = () => {
  const {
    departments,
    issues,
    resources,
    generateAllocationPlan,
    approveAllocationPlan,
    activePlans,
    userRole,
  } = useCivic();

  const [selectedDeptId, setSelectedDeptId] = useState<string>(departments[0]?.id || 'dept-wss');
  const selectedDept = departments.find((d) => d.id === selectedDeptId) || departments[0];

  const [budgetCap, setBudgetCap] = useState<number>(selectedDept?.dailyBudgetLimit || 65000);
  const [availableStaff, setAvailableStaff] = useState<number>(8);
  const [shiftNumber, setShiftNumber] = useState<number>(1);

  const [currentPlan, setCurrentPlan] = useState<AllocationPlan | null>(null);
  const [deficitReport, setDeficitReport] = useState<ResourceDeficitReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [planCommitted, setPlanCommitted] = useState(false);

  // Modals
  const [explainIssue, setExplainIssue] = useState<CivicIssue | null>(null);
  const [overrideIssue, setOverrideIssue] = useState<CivicIssue | null>(null);

  // Update defaults when department changes
  useEffect(() => {
    if (selectedDept) {
      setBudgetCap(selectedDept.dailyBudgetLimit);
      handleRunEngine();
    }
  }, [selectedDeptId]);

  const handleRunEngine = () => {
    setIsGenerating(true);
    setPlanCommitted(false);
    setTimeout(() => {
      const result = generateAllocationPlan(selectedDeptId, budgetCap, availableStaff);
      setCurrentPlan(result.plan);
      setDeficitReport(result.deficitReport);
      setIsGenerating(false);
    }, 300);
  };

  const handleApprovePlan = () => {
    if (currentPlan) {
      approveAllocationPlan(currentPlan.id, `Shift ${shiftNumber} Plan approved for ${selectedDept.code}`);
      setPlanCommitted(true);
    }
  };

  const candidateIssues = issues.filter(
    (i) => i.departmentId === selectedDeptId && i.status !== 'resolved' && i.status !== 'rejected'
  );

  const approvedItems = currentPlan?.items.filter((i) => i.itemStatus === 'approved') || [];
  const deferredItems = currentPlan?.items.filter((i) => i.itemStatus === 'deferred') || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <Cpu size={12} />
              Deterministic Multi-Constraint Knapsack
            </span>
            <span className="text-xs text-slate-400">Shift Action Planner</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Resource-Aware Prioritization & Allocation Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
            Solves the municipal dilemma: decides which competing civic emergencies to handle in today's shift given strictly limited technician crews, heavy machinery, and budget caps.
          </p>
        </div>

        <button
          onClick={handleRunEngine}
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-3 rounded-xl shadow-lg shadow-emerald-950/60 transition-all shrink-0"
        >
          <Play size={16} className={isGenerating ? 'animate-spin' : ''} />
          <span>{isGenerating ? 'Optimizing...' : 'Run Allocation Engine'}</span>
        </button>
      </div>

      {/* Control Sandbox: Department & Shift Constraints */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>Shift Constraint Parameters</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {candidateIssues.length} Candidate Issues in Queue
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Department Select */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">Target Department:</label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-medium focus:ring-1 focus:ring-emerald-500"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Daily Budget Cap */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">
              Daily Budget Limit (₹):
            </label>
            <input
              type="number"
              step={5000}
              value={budgetCap}
              onChange={(e) => setBudgetCap(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono font-semibold focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Available Crew */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">
              Available Technicians / Staff:
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={availableStaff}
              onChange={(e) => setAvailableStaff(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono font-semibold focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Shift Number */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">Operational Shift:</label>
            <select
              value={shiftNumber}
              onChange={(e) => setShiftNumber(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:ring-1 focus:ring-emerald-500"
            >
              <option value={1}>Shift 1 (08:00 - 16:00 Day)</option>
              <option value={2}>Shift 2 (16:00 - 24:00 Evening)</option>
              <option value={3}>Shift 3 (Emergency Night Standby)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Plan Execution Summary Bars */}
      {currentPlan && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Budget Utilization</span>
              <IndianRupee size={16} className="text-emerald-400" />
            </div>
            <div className="mt-2 text-xl font-mono font-bold text-white">
              ₹{currentPlan.budgetUtilized.toLocaleString()}
              <span className="text-xs text-slate-500 font-normal font-sans ml-1">
                / ₹{currentPlan.totalBudgetCap.toLocaleString()}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{
                  width: `${Math.min(100, (currentPlan.budgetUtilized / currentPlan.totalBudgetCap) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Staff Capacity</span>
              <Users size={16} className="text-blue-400" />
            </div>
            <div className="mt-2 text-xl font-mono font-bold text-white">
              {currentPlan.staffHoursUtilized} hrs
              <span className="text-xs text-slate-500 font-normal font-sans ml-1">
                / {availableStaff * 8} hrs pool
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{
                  width: `${Math.min(100, (currentPlan.staffHoursUtilized / (availableStaff * 8)) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Approved for Shift</span>
              <CheckCircle2 size={16} className="text-emerald-400" />
            </div>
            <div className="mt-2 text-xl font-mono font-bold text-emerald-400">
              {currentPlan.issuesApprovedCount} Issues
              <span className="text-xs text-slate-500 font-normal font-sans ml-1">
                ({Math.round((currentPlan.issuesApprovedCount / Math.max(1, currentPlan.totalIssuesEvaluated)) * 100)}% approved)
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Direct work order dispatch</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Deferred (Constrained)</span>
              <AlertTriangle size={16} className="text-amber-400" />
            </div>
            <div className="mt-2 text-xl font-mono font-bold text-amber-400">
              {currentPlan.issuesDeferredCount} Issues
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Queued with bottleneck diagnosis</div>
          </div>
        </div>
      )}

      {/* Strategic Deficit Diagnostics Report */}
      {deficitReport && deficitReport.hasDeficits && (
        <div className="bg-amber-950/30 border border-amber-800/50 rounded-2xl p-5 text-xs text-amber-200 space-y-3">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
            <AlertTriangle size={17} />
            <span>Allocation Engine Deficit Analysis & Bottlenecks</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            The optimization engine successfully filled today's shift capacity. However, {currentPlan?.issuesDeferredCount} issues had to be deferred due to specific municipal resource shortages.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {deficitReport.recommendations.map((rec, i) => (
              <div
                key={i}
                className="bg-slate-950/70 border border-amber-900/60 p-3 rounded-xl flex items-start gap-2.5 text-slate-200"
              >
                <span className="w-5 h-5 rounded-full bg-amber-900/60 text-amber-300 flex items-center justify-center font-bold shrink-0 mt-0.5 text-[11px]">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Plan Results: Approved Batch & Deferred Backlog */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Approved Work Orders (Left) */}
        <div className="bg-slate-900 border border-emerald-800/50 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
                <CheckCircle2 size={16} />
              </div>
              <h3 className="font-bold text-white text-sm">
                Approved Work Orders ({approvedItems.length})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 font-semibold">
              Scheduled for Execution
            </span>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {approvedItems.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No issues could be scheduled within current constraint limits.
              </div>
            ) : (
              approvedItems.map((item) => {
                const issue = item.issue;
                if (!issue) return null;

                return (
                  <div
                    key={item.id}
                    className="p-4 bg-slate-950/80 border border-emerald-900/40 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-emerald-400 font-bold">
                          {issue.ticketNumber}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300 font-medium">Rank #{item.scheduledOrder}</span>
                      </div>
                      <PriorityBadge score={item.priorityAtAllocation} size="sm" />
                    </div>

                    <h4 className="font-semibold text-white">{issue.title}</h4>

                    {/* Allocated Resources Info */}
                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Crew Assigned:</span>
                        <span className="font-mono text-white font-semibold">
                          {item.allocatedStaffCount} Staff ({item.allocatedHours}h)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Equipment Bound:</span>
                        <span className="font-mono text-amber-300 font-semibold truncate block">
                          {item.allocatedResource?.identifierCode || issue.requiredEquipment?.replace('_', ' ') || 'Standard Kit'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Cost Allocated:</span>
                        <span className="font-mono text-emerald-400 font-semibold">
                          ₹{item.allocatedCost.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setExplainIssue(issue)}
                        className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1"
                      >
                        <HelpCircle size={12} />
                        <span>Why ranked #{item.scheduledOrder}?</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Commit Action Plan Button */}
          {(userRole === 'officer' || userRole === 'admin') && currentPlan && (
            <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs text-slate-400">
                {planCommitted ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={14} /> Plan Approved & Dispatched
                  </span>
                ) : (
                  'Review and commit daily dispatch'
                )}
              </span>
              <button
                onClick={handleApprovePlan}
                disabled={planCommitted || approvedItems.length === 0}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all ${
                  planCommitted
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
                }`}
              >
                <FileCheck size={16} />
                <span>{planCommitted ? 'Work Orders Dispatched' : 'Approve & Commit Plan'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Deferred Queue with Explainable Bottlenecks (Right) */}
        <div className="bg-slate-900 border border-amber-800/50 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-950 text-amber-400 border border-amber-800">
                <AlertTriangle size={16} />
              </div>
              <h3 className="font-bold text-white text-sm">
                Deferred Issues Backlog ({deferredItems.length})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-amber-400 font-semibold">
              Awaiting Next Shift Capacity
            </span>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {deferredItems.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Zero backlog! All candidate issues fit within available resources.
              </div>
            ) : (
              deferredItems.map((item) => {
                const issue = item.issue;
                if (!issue) return null;

                return (
                  <div
                    key={item.id}
                    className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-300 font-bold">
                          {issue.ticketNumber}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400">Score {item.priorityAtAllocation.toFixed(1)}</span>
                      </div>
                      <StatusBadge status="deferred" size="sm" />
                    </div>

                    <h4 className="font-semibold text-slate-200">{issue.title}</h4>

                    {/* Transparent Deferral Reason Callout */}
                    <div className="bg-amber-950/30 border border-amber-900/60 p-2.5 rounded-lg text-amber-200 text-[11px] leading-relaxed">
                      <span className="font-semibold text-amber-400">Constraint Bottleneck: </span>
                      {item.deferralReason || 'Exceeds shift resource capacity.'}
                    </div>

                    {/* Officer Override Option */}
                    <div className="flex justify-between items-center pt-1 text-[11px]">
                      <button
                        onClick={() => setExplainIssue(issue)}
                        className="text-slate-400 hover:text-emerald-400 flex items-center gap-1"
                      >
                        <HelpCircle size={12} />
                        <span>Inspect Breakdown</span>
                      </button>

                      {(userRole === 'officer' || userRole === 'admin') && (
                        <button
                          onClick={() => setOverrideIssue(issue)}
                          className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                        >
                          <ShieldAlert size={12} />
                          <span>Emergency Force Inject</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
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
