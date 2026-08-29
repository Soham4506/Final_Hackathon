import React, { useState, useEffect } from 'react';
import { useCivic } from '../context/CivicContext';
import { AllocationPlan, AllocationPlanItem, CivicIssue } from '../types';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { ExplainabilityModal } from '../components/common/ExplainabilityModal';
import { OfficerOverrideModal } from '../components/common/OfficerOverrideModal';
import { WorkOrderModal } from '../components/common/WorkOrderModal';
import { ResourceDeficitReport } from '../services/allocationEngine';
import { AllocationStrategy, StrategyComparisonMetric } from '../services/multiStrategyEngine';
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
  Printer,
  Scale,
  Sliders,
  Gavel,
} from 'lucide-react';

export const PriorityEnginePage: React.FC = () => {
  const {
    departments,
    issues,
    resources,
    generateAllocationPlan,
    getStrategyComparisons,
    approveAllocationPlan,
    activePlans,
    userRole,
    t,
  } = useCivic();

  const [selectedDeptId, setSelectedDeptId] = useState<string>(departments[0]?.id || 'b0000000-0000-0000-0000-000000000001');
  const selectedDept = departments.find((d) => d.id === selectedDeptId) || departments[0];

  const [budgetCap, setBudgetCap] = useState<number>(selectedDept?.dailyBudgetLimit || 65000);
  const [availableStaff, setAvailableStaff] = useState<number>(8);
  const [shiftNumber, setShiftNumber] = useState<number>(1);
  const [selectedStrategy, setSelectedStrategy] = useState<AllocationStrategy>('max_risk');
  const [solverMode, setSolverMode] = useState<'greedy' | 'dp_knapsack'>('greedy');

  const [currentPlan, setCurrentPlan] = useState<AllocationPlan | null>(null);
  const [deficitReport, setDeficitReport] = useState<ResourceDeficitReport | null>(null);
  const [strategyComparisons, setStrategyComparisons] = useState<StrategyComparisonMetric[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [planCommitted, setPlanCommitted] = useState(false);

  // Modals
  const [explainIssue, setExplainIssue] = useState<CivicIssue | null>(null);
  const [overrideIssue, setOverrideIssue] = useState<CivicIssue | null>(null);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState<boolean>(false);

  // Update defaults when department changes
  useEffect(() => {
    if (selectedDept) {
      setBudgetCap(selectedDept.dailyBudgetLimit);
      handleRunEngine(selectedStrategy, solverMode);
    }
  }, [selectedDeptId, selectedStrategy, solverMode]);

  const handleRunEngine = (strat: AllocationStrategy = selectedStrategy, mode: 'greedy' | 'dp_knapsack' = solverMode) => {
    setIsGenerating(true);
    setPlanCommitted(false);
    setTimeout(() => {
      const result = generateAllocationPlan(selectedDeptId, budgetCap, availableStaff, strat, mode);
      setCurrentPlan(result.plan);
      setDeficitReport(result.deficitReport);
      
      const comparisons = getStrategyComparisons(selectedDeptId, budgetCap, availableStaff);
      setStrategyComparisons(comparisons);

      setIsGenerating(false);
    }, 200);
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
  const optComp = currentPlan?.optimalityComparison;

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white border border-[#76777d]/20 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <Scale size={12} /> Multi-Strategy Allocation Core
            </span>
            <span className="text-xs text-[#76777d]">Deterministic Optimization Engine</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1b1b1d] tracking-tight">
            Decision Workbench & Resource Allocation
          </h1>
          <p className="text-xs sm:text-sm text-[#57657b] mt-1 max-w-2xl">
            Simulate and compare mathematical allocation strategies under constrained staff, budget, and heavy fleet limits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleRunEngine(selectedStrategy, solverMode)}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-[#131b2e] hover:bg-[#1e2a47] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all tracking-wider uppercase"
          >
            <RefreshCw size={14} className={isGenerating ? 'animate-spin' : ''} />
            <span>{isGenerating ? 'Running Engine...' : 'Re-Run Optimization'}</span>
          </button>
        </div>
      </div>

      {/* Control Panel Strip (Department, Budget, Staff, Strategy, Solver Algorithm) */}
      <div className="bg-white border border-[#76777d]/20 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Department */}
          <div>
            <label className="block text-[#1b1b1d] font-bold mb-1">Department</label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full bg-[#f6f3f5] border border-[#76777d]/20 rounded-xl px-3 py-2 text-[#1b1b1d] focus:outline-none focus:border-[#131b2e] font-semibold text-xs"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Budget Limit */}
          <div>
            <label className="block text-[#1b1b1d] font-bold mb-1">Shift Budget Cap (₹)</label>
            <input
              type="number"
              step={5000}
              value={budgetCap}
              onChange={(e) => setBudgetCap(Number(e.target.value))}
              className="w-full bg-[#f6f3f5] border border-[#76777d]/20 rounded-xl px-3 py-2 text-[#1b1b1d] focus:outline-none focus:border-[#131b2e] font-mono font-bold text-xs"
            />
          </div>

          {/* Available Technicians */}
          <div>
            <label className="block text-[#1b1b1d] font-bold mb-1">Staff / Crew Headcount</label>
            <input
              type="number"
              min={1}
              max={30}
              value={availableStaff}
              onChange={(e) => setAvailableStaff(Number(e.target.value))}
              className="w-full bg-[#f6f3f5] border border-[#76777d]/20 rounded-xl px-3 py-2 text-[#1b1b1d] focus:outline-none focus:border-[#131b2e] font-mono font-bold text-xs"
            />
          </div>

          {/* Strategy Selector */}
          <div>
            <label className="block text-[#1b1b1d] font-bold mb-1">Municipal Objective</label>
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value as AllocationStrategy)}
              className="w-full bg-[#f6f3f5] border border-[#76777d]/20 rounded-xl px-3 py-2 text-[#1b1b1d] focus:outline-none focus:border-[#131b2e] font-semibold text-xs"
            >
              <option value="max_risk">1. Max Risk Reduction (Standard)</option>
              <option value="cost_efficient">2. Maximum Issue Count (Cost Efficient)</option>
              <option value="sla_compliance">3. SLA Breach Penalty Minimization</option>
              <option value="balanced">4. Balanced Multi-Objective</option>
            </select>
          </div>
        </div>

        {/* Algorithm Solver Toggle & Optimality Defense Strip */}
        <div className="pt-3 border-t border-[#76777d]/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1b1b1d] text-[11px] uppercase tracking-wider">Solver Algorithm:</span>
            <div className="bg-[#f0edef] p-1 rounded-xl border border-[#76777d]/15 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSolverMode('greedy')}
                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 ${
                  solverMode === 'greedy'
                    ? 'bg-[#131b2e] text-white shadow-xs'
                    : 'text-[#57657b] hover:text-[#1b1b1d]'
                }`}
              >
                <span>⚡ Fast Greedy Heuristic</span>
                <span className="font-mono text-[10px] opacity-75">O(N log N)</span>
              </button>
              <button
                type="button"
                onClick={() => setSolverMode('dp_knapsack')}
                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 ${
                  solverMode === 'dp_knapsack'
                    ? 'bg-[#131b2e] text-white shadow-xs'
                    : 'text-[#57657b] hover:text-[#1b1b1d]'
                }`}
              >
                <span>🎯 Exact 0/1 Knapsack DP</span>
                <span className="font-mono text-[10px] opacity-75">O(N · W)</span>
              </button>
            </div>
          </div>

          {optComp && (
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs">
                <span>Greedy Yield: <strong>{optComp.greedyValue} pts</strong></span>
                <span>•</span>
                <span>DP Optimum: <strong>{optComp.dpValue} pts</strong></span>
                <span>•</span>
                <span className="text-emerald-900 bg-emerald-100 px-1.5 py-0.2 rounded">
                  {optComp.optimalityGapPct}% Optimal
                </span>
              </span>
              {optComp.isCapped && (
                <span className="bg-amber-50 text-amber-800 border border-amber-300 px-2 py-1 rounded-lg text-[10px] font-bold">
                  Queue &gt; 40 (Fast Greedy Active)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Strategy Comparison Matrix */}
        {strategyComparisons.length > 0 && (
          <div className="pt-3 border-t border-[#76777d]/15">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#76777d]">
                4-Strategy Municipal Simulation Comparison
              </span>
              <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono font-bold">
                Auto-Ranked
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              {strategyComparisons.map((c) => (
                <div
                  key={c.strategy}
                  onClick={() => setSelectedStrategy(c.strategy)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedStrategy === c.strategy
                      ? 'bg-blue-50/60 border-blue-600 shadow-xs'
                      : 'bg-[#fcf8fa] border-[#76777d]/15 hover:border-slate-400'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-[#1b1b1d]">{c.strategyName}</span>
                    {selectedStrategy === c.strategy && (
                      <CheckCircle2 size={13} className="text-blue-700" />
                    )}
                  </div>
                  <div className="space-y-0.5 text-[11px] text-[#57657b] font-mono">
                    <div>Approved: <strong className="text-[#1b1b1d]">{c.approvedCount}</strong></div>
                    <div>Cost: <strong className="text-[#1b1b1d]">₹{c.totalCost.toLocaleString()}</strong></div>
                    <div>Avg Priority: <strong className="text-emerald-700">{c.avgPriorityScore.toFixed(0)} pts</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Allocation Plan Results: Approved & Deferred Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Approved Dispatches */}
        <div className="bg-white border border-[#76777d]/20 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#76777d]/15 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#1b1b1d] uppercase tracking-wider">
                  Approved For Shift Execution ({approvedItems.length})
                </h3>
                <p className="text-[11px] text-[#76777d]">Resource constraints satisfied</p>
              </div>
            </div>

            {approvedItems.length > 0 && !planCommitted && (
              <button
                onClick={handleApprovePlan}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-xs uppercase tracking-wider transition-all"
              >
                Approve & Dispatch
              </button>
            )}
          </div>

          {approvedItems.length === 0 ? (
            <div className="p-10 text-center text-[#76777d] text-xs">
              No tickets currently approved under this shift constraint.
            </div>
          ) : (
            <div className="space-y-3">
              {approvedItems.map((item, idx) => {
                const issue = issues.find((i) => i.id === item.issueId);
                if (!issue) return null;

                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-[#fcf8fa] border border-emerald-200/80 rounded-xl space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="font-mono text-xs font-bold text-[#131b2e]">
                          #{idx + 1} • {issue.ticketNumber}
                        </span>
                        <h4 className="font-bold text-xs text-[#1b1b1d]">{issue.title}</h4>
                      </div>
                      <PriorityBadge score={item.priorityAtAllocation} size="sm" />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#57657b] font-mono pt-1 border-t border-slate-100">
                      <span>Crew: {item.allocatedStaffCount} Staff</span>
                      <span>Cost: ₹{item.allocatedCost.toLocaleString()}</span>
                      <span>Hours: {item.allocatedHours}h</span>
                      <button
                        onClick={() => setExplainIssue(issue)}
                        className="text-blue-700 font-bold underline ml-auto"
                      >
                        Explain Decision →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Deferred Issues & Deficit Explanations */}
        <div className="bg-white border border-[#76777d]/20 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#76777d]/15 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                <AlertTriangle size={16} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#1b1b1d] uppercase tracking-wider">
                  Deferred to Next Shift ({deferredItems.length})
                </h3>
                <p className="text-[11px] text-[#76777d]">Resource bottleneck reached</p>
              </div>
            </div>
          </div>

          {deferredItems.length === 0 ? (
            <div className="p-10 text-center text-[#76777d] text-xs">
              All candidate tickets fit within the current shift budget and crew capacity!
            </div>
          ) : (
            <div className="space-y-3">
              {deferredItems.map((item) => {
                const issue = issues.find((i) => i.id === item.issueId);
                if (!issue) return null;

                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-[#fcf8fa] border border-amber-200/80 rounded-xl space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="font-mono text-xs font-bold text-[#76777d]">
                          {issue.ticketNumber}
                        </span>
                        <h4 className="font-bold text-xs text-[#1b1b1d]">{issue.title}</h4>
                      </div>
                      <PriorityBadge score={item.priorityAtAllocation} size="sm" />
                    </div>

                    <div className="p-2 bg-amber-50 rounded-lg text-[11px] text-amber-900 border border-amber-200">
                      <strong>Deficit Driver:</strong> {item.deferralReason || 'Budget or staff capacity limit reached.'}
                    </div>

                    <div className="flex justify-between items-center text-[11px] pt-1">
                      <button
                        onClick={() => setOverrideIssue(issue)}
                        className="text-red-700 font-bold underline"
                      >
                        Emergency Override →
                      </button>
                      <button
                        onClick={() => setExplainIssue(issue)}
                        className="text-blue-700 font-bold underline"
                      >
                        Audit Breakdown →
                      </button>
                    </div>
                  </div>
                );
              })}
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
