import React from 'react';
import { useCivic } from '../context/CivicContext';
import { StatCard } from '../components/common/StatCard';
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
  LineChart,
  Line,
} from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const { issues, departments, zones, resources } = useCivic();

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
    { name: 'Critical P0 (>=80)', value: issues.filter((i) => (i.priorityScore?.finalScore ?? 0) >= 80).length, color: '#ef4444' },
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <BarChart3 size={12} /> Executive Municipal Analytics
            </span>
            <span className="text-xs text-slate-400">KMC Council Overview</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Prioritization Trends, Budgeting & SLA Performance
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Data-backed metrics on resource expenditure, response compliance, and recurring civic hotspots.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Estimated Demand"
          value={`₹${(totalCostEstimated / 1000).toFixed(1)}k`}
          subtext="Total cost of active issues"
          icon={IndianRupee}
          variant="emerald"
        />
        <StatCard
          title="Avg Intake Confidence"
          value={`${avgConfidence}%`}
          subtext="Field validation certainty"
          icon={ShieldCheck}
          variant="blue"
        />
        <StatCard
          title="SLA Compliance Rate"
          value="91.4%"
          subtext="Resolved within target hours"
          icon={Clock}
          variant="emerald"
          trend="+3.2% this month"
        />
        <StatCard
          title="Average Shift Clearance"
          value="74.2%"
          subtext="Issues handled per batch"
          icon={CheckCircle2}
          variant="amber"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Financial Demand vs Daily Cap */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-white text-sm">Estimated Cost vs Daily Budget Cap (₹)</h3>
            <span className="text-xs text-slate-400">By Department</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptCostData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, fontSize: 12 }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, '']}
                />
                <Bar dataKey="cost" fill="#059669" name="Required Cost" radius={[4, 4, 0, 0]} />
                <Bar dataKey="budgetLimit" fill="#334155" name="Budget Limit" radius={[4, 4, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Priority Tier Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-white text-sm">Issue Priority Tier Distribution</h3>
            <span className="text-xs text-slate-400">Deterministic Tiers</span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {severityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Ward Repeat Escalations Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="font-bold text-white text-sm">Ward Repeat Escalation Hotspots</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3">Ward Code</th>
                <th className="py-2.5 px-3">Ward / Locality Name</th>
                <th className="py-2.5 px-3">Active Issues</th>
                <th className="py-2.5 px-3">Total Escalation Reports</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {wardEscalations.map((w) => (
                <tr key={w.ward} className="hover:bg-slate-850">
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{w.ward}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-200">{w.name}</td>
                  <td className="py-2.5 px-3 font-mono">{w.issuesCount}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-amber-400">{w.escalations}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        w.escalations >= 4
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {w.escalations >= 4 ? 'High Frequency Cluster' : 'Normal'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
