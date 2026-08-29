import React from 'react';
import { useCivic } from '../context/CivicContext';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  IndianRupee,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const { issues, departments, zones } = useCivic();

  const totalCostEstimated = issues.reduce((sum, i) => sum + (i.estimatedCost || 0), 0);
  const avgConfidence = issues.length > 0
    ? Math.round((issues.reduce((sum, i) => sum + (i.confidenceScore || 1.0), 0) / issues.length) * 100)
    : 100;

  // Department cost chart data
  const deptCostData = departments.map((d) => {
    const deptIssues = issues.filter((i) => i.departmentId === d.id);
    const totalCost = deptIssues.reduce((sum, i) => sum + (i.estimatedCost || 0), 0);
    return {
      name: d.code,
      fullName: d.name,
      cost: totalCost,
      budgetLimit: d.dailyBudgetLimit,
    };
  });

  // Severity Distribution Data
  const severityDistribution = [
    { name: 'Critical P0 (>=80)', value: issues.filter((i) => (i.priorityScore?.finalScore ?? 0) >= 80).length, color: '#ba1a1a' },
    { name: 'High P1 (65-79)', value: issues.filter((i) => {
      const s = i.priorityScore?.finalScore ?? 0;
      return s >= 65 && s < 80;
    }).length, color: '#f59e0b' },
    { name: 'Medium P2 (45-64)', value: issues.filter((i) => {
      const s = i.priorityScore?.finalScore ?? 0;
      return s >= 45 && s < 65;
    }).length, color: '#10b981' },
    { name: 'Low P3 (<45)', value: issues.filter((i) => (i.priorityScore?.finalScore ?? 0) < 45).length, color: '#3b82f6' },
  ];

  // Ward Escalations Heat Data
  const wardEscalations = zones.map((z) => {
    const wardIssues = issues.filter((i) => i.zoneId === z.id);
    const totalEscalations = wardIssues.reduce((sum, i) => sum + (i.escalationCount || 1), 0);
    return {
      ward: z.code,
      name: z.name,
      escalations: totalEscalations,
      issuesCount: wardIssues.length,
    };
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border border-[#76777d]/20 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <BarChart3 size={12} /> Executive Municipal Analytics
            </span>
            <span className="text-xs text-[#76777d]">KMC Council Overview</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1b1b1d] tracking-tight">
            Prioritization Trends, Budgeting & SLA Performance
          </h1>
          <p className="text-xs sm:text-sm text-[#57657b] mt-1">
            Data-backed metrics on resource expenditure, response compliance, and recurring civic hotspots.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#76777d]/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#76777d]">Estimated Demand</span>
            <div className="text-2xl font-bold text-[#1b1b1d] font-mono mt-1">
              ₹{(totalCostEstimated / 1000).toFixed(1)}k
            </div>
            <p className="text-[10px] text-[#76777d]">Active issue demand</p>
          </div>
          <div className="p-2 rounded-xl bg-slate-100 text-[#131b2e]">
            <IndianRupee size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#76777d]/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#76777d]">AI Intake Accuracy</span>
            <div className="text-2xl font-bold text-emerald-700 font-mono mt-1">
              {avgConfidence}%
            </div>
            <p className="text-[10px] text-[#76777d]">Verification score</p>
          </div>
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
            <ShieldCheck size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#76777d]/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#76777d]">Total Wards Monitored</span>
            <div className="text-2xl font-bold text-blue-700 font-mono mt-1">
              {zones.length} Wards
            </div>
            <p className="text-[10px] text-[#76777d]">Kopargaon Municipal Grid</p>
          </div>
          <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
            <Building2 size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#76777d]/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#76777d]">Critical Threats (P0)</span>
            <div className="text-2xl font-bold text-[#ba1a1a] font-mono mt-1">
              {issues.filter((i) => (i.priorityScore?.finalScore ?? 0) >= 80).length}
            </div>
            <p className="text-[10px] text-[#76777d]">Immediate escalation</p>
          </div>
          <div className="p-2 rounded-xl bg-red-50 text-[#ba1a1a]">
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Department Budget Expenditure */}
        <div className="bg-white border border-[#76777d]/20 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="border-b border-[#76777d]/15 pb-3">
            <h2 className="font-bold text-xs uppercase tracking-wider text-[#1b1b1d]">
              Department Resource Demand vs Budget Cap (₹)
            </h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptCostData}>
                <XAxis dataKey="name" stroke="#76777d" fontSize={11} />
                <YAxis stroke="#76777d" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#1b1b1d', fontSize: '12px' }}
                />
                <Bar dataKey="cost" fill="#131b2e" name="Estimated Cost (₹)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="budgetLimit" fill="#cbd5e1" name="Daily Budget Cap (₹)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="bg-white border border-[#76777d]/20 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="border-b border-[#76777d]/15 pb-3">
            <h2 className="font-bold text-xs uppercase tracking-wider text-[#1b1b1d]">
              Priority Severity Tier Distribution
            </h2>
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {severityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#1b1b1d', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#57657b' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
