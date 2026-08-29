import React from 'react';
import { AllocationPlan, Department } from '../../types';
import { useCivic } from '../../context/CivicContext';
import { X, Printer, Building2, CheckCircle2, ShieldAlert, QrCode, FileText } from 'lucide-react';

interface WorkOrderModalProps {
  plan: AllocationPlan;
  onClose: () => void;
}

export const WorkOrderModal: React.FC<WorkOrderModalProps> = ({ plan, onClose }) => {
  const { departments, zones, currentUser } = useCivic();
  const dept = departments.find((d) => d.id === plan.departmentId);

  const approvedItems = plan.items.filter((i) => i.itemStatus === 'approved');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Modal Action Header (Non-printable) */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex justify-between items-center shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-emerald-400" />
            <span className="font-bold text-sm">Official Municipal Work Order Document</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
            >
              <Printer size={14} />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Official Document Body */}
        <div className="p-8 overflow-y-auto space-y-6 text-slate-800 font-sans print:p-0 print:m-0">
          {/* Official Letterhead */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 border-2 border-slate-900 flex items-center justify-center font-bold text-slate-900 text-2xl">
                🏛️
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight uppercase text-slate-900">
                  Kopargaon Municipal Council (कोपरगाव नगरपरिषद)
                </h1>
                <p className="text-xs text-slate-600 font-medium">
                  District Ahilyanagar, Maharashtra • PIN 423601 • Decision Support & Public Works
                </p>
                <p className="text-[11px] font-bold text-slate-700 mt-0.5 uppercase tracking-wide">
                  Department of {dept?.name || 'Municipal Works'}
                </p>
              </div>
            </div>

            <div className="text-right font-mono text-xs space-y-0.5">
              <div className="font-bold text-slate-900 text-sm">WORK ORDER</div>
              <div className="text-slate-600">Ref: {plan.planCode}</div>
              <div className="text-slate-600">Date: {plan.targetDate}</div>
              <div className="text-slate-600">Shift: {plan.shiftNumber} (Day Dispatch)</div>
            </div>
          </div>

          {/* Authorization Metadata Grid */}
          <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 font-semibold uppercase text-[10px] block">Authorized Supervisor</span>
              <span className="font-bold text-slate-900">{dept?.headOfficerName || currentUser.fullName}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold uppercase text-[10px] block">Budget Commitment</span>
              <span className="font-bold font-mono text-emerald-800">
                ₹{plan.budgetUtilized.toLocaleString()} (Cap: ₹{plan.totalBudgetCap.toLocaleString()})
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold uppercase text-[10px] block">Crew Roster Assigned</span>
              <span className="font-bold font-mono text-slate-900">
                {plan.staffHoursUtilized} Technician Hours ({plan.issuesApprovedCount} Works)
              </span>
            </div>
          </div>

          {/* Scheduled Field Works Table */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 border-b pb-1">
              Scheduled Rectification Work Orders ({approvedItems.length} Sites)
            </h3>

            <table className="w-full text-left text-xs border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-2.5 border-r border-slate-200 w-12 text-center">Seq</th>
                  <th className="p-2.5 border-r border-slate-200 w-32">Ticket / Priority</th>
                  <th className="p-2.5 border-r border-slate-200">Location Address & Description</th>
                  <th className="p-2.5 border-r border-slate-200 w-36">Equipment Assigned</th>
                  <th className="p-2.5 w-24 text-right">Estimated Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {approvedItems.map((item, idx) => {
                  const iss = item.issue;
                  const zone = zones.find((z) => z.id === iss?.zoneId);

                  return (
                    <tr key={item.id} className="text-[11px] hover:bg-slate-50">
                      <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-center">
                        #{idx + 1}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 font-mono">
                        <div className="font-bold text-slate-900">{iss?.ticketNumber}</div>
                        <div className="text-[10px] text-slate-500">Score: {item.priorityAtAllocation.toFixed(1)}</div>
                      </td>
                      <td className="p-2.5 border-r border-slate-200">
                        <div className="font-bold text-slate-900">{iss?.title}</div>
                        <div className="text-slate-600 text-[10px] mt-0.5">
                          📍 {iss?.locationAddress} ({zone?.code})
                        </div>
                      </td>
                      <td className="p-2.5 border-r border-slate-200 font-mono">
                        <div className="font-semibold text-slate-800">
                          {item.allocatedResource?.identifierCode || iss?.requiredEquipment?.replace('_', ' ') || 'Standard Toolset'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {item.allocatedStaffCount} Staff • {item.allocatedHours} Hours
                        </div>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                        ₹{item.allocatedCost.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Safety & Compliance Checklist */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-[11px] text-amber-900 space-y-1">
            <span className="font-bold uppercase tracking-wider block">Field Safety & Execution Protocol:</span>
            <ul className="list-disc list-inside space-y-0.5 text-amber-800">
              <li>Deploy high-visibility safety cones and warning barricades around open manholes and road excavation sites.</li>
              <li>For electrical issues, obtain line clear code from MSEB sub-station before telescopic boom lift operation.</li>
              <li>Upload before-and-after photo verification via the field inspector mobile terminal upon rectification.</li>
            </ul>
          </div>

          {/* Signature & Seal Footer */}
          <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs">
            <div className="space-y-8">
              <div className="h-10 border-b border-dashed border-slate-400 w-48"></div>
              <div>
                <span className="font-bold text-slate-900 block">Junior Engineer / Field Supervisor</span>
                <span className="text-[10px] text-slate-500">Kopargaon Municipal Council</span>
              </div>
            </div>

            <div className="space-y-8 text-right">
              <div className="h-10 border-b border-dashed border-slate-400 w-48 ml-auto"></div>
              <div>
                <span className="font-bold text-slate-900 block">Chief Officer / Department Head</span>
                <span className="text-[10px] text-slate-500">Seal & Official Authorization</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
