import React from 'react';
import {
  X,
  Printer,
  ShieldAlert,
  Waves,
  Building,
  Truck,
  Users,
  Navigation,
  Clock,
  QrCode,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { FloodDispatchOrder } from '../../types/floodAlert';
import { useCivic } from '../../context/CivicContext';

interface FloodDispatchOrderModalProps {
  order: FloodDispatchOrder;
  onClose: () => void;
  onApprove?: (orderId: string) => void;
}

export const FloodDispatchOrderModal: React.FC<FloodDispatchOrderModalProps> = ({
  order,
  onClose,
  onApprove,
}) => {
  const { language } = useCivic();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black my-8">
        {/* Top Header / Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 print:hidden">
          <div className="flex items-center gap-2 text-rose-400">
            <ShieldAlert size={20} />
            <span className="font-bold text-sm tracking-wide">
              {language === 'mr' ? 'आपत्कालीन पूर नियंत्रण कार्य आदेश' : 'OFFICIAL FLOOD DISASTER DISPATCH ORDER'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
            >
              <Printer size={14} />
              <span>{language === 'mr' ? 'प्रत मुद्रित करा (Print)' : 'Print Official Order'}</span>
            </button>
            {!order.isApproved && onApprove && (
              <button
                onClick={() => onApprove(order.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-950"
              >
                <CheckCircle2 size={14} />
                <span>{language === 'mr' ? 'आदेश मंजूर करा (Authorize)' : 'Authorize & Dispatch'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 md:p-8 space-y-6 text-slate-200 print:text-black print:p-0">
          {/* Official Letterhead */}
          <div className="border-b-2 border-rose-600/60 pb-4 text-center space-y-1">
            <div className="inline-flex items-center gap-2 justify-center">
              <Building size={20} className="text-rose-500 print:text-black" />
              <span className="text-xs uppercase tracking-widest font-mono text-slate-400 print:text-gray-600">
                GOVERNMENT OF MAHARASHTRA • DISASTER MANAGEMENT CELL
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white print:text-black tracking-tight">
              कोपरगाव नगरपरिषद (आपत्ती व्यवस्थापन विभाग)
            </h1>
            <p className="text-xs text-slate-300 print:text-gray-700">
              KOPARGAON MUNICIPAL COUNCIL • GODAVARI RIVER FLOOD EMERGENCY RESOURCE DISPATCH ORDER
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-mono text-slate-400 print:text-gray-600 pt-1">
              <span>Order No: <strong>{order.orderNumber}</strong></span>
              <span>•</span>
              <span>Date: {new Date(order.createdAt).toLocaleString('en-IN')}</span>
              <span>•</span>
              <span>Discharge: <strong className="text-rose-400 print:text-black">{order.damDischargeCusecs.toLocaleString()} Cusecs</strong></span>
              <span>•</span>
              <span>River Gauge: <strong>{order.riverLevelMeters} m</strong></span>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center justify-between p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl print:bg-gray-100 print:border-gray-400">
            <div className="flex items-center gap-3">
              <Waves className="text-rose-400 print:text-black" size={24} />
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 print:text-gray-600 block">Alert Status</span>
                <span className="font-bold text-sm text-rose-300 print:text-black uppercase">
                  {order.alertLevel.replace('_', ' ')} • GODAVARI HIGH INUNDATION SURGE
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono uppercase text-slate-400 print:text-gray-600 block">Covered Population</span>
              <span className="font-mono font-bold text-white print:text-black text-sm">
                {order.totalVulnerableCitizensCovered.toLocaleString()} Citizens
              </span>
            </div>
          </div>

          {/* Ranked Zone Dispatch Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 print:text-black flex items-center gap-2">
              <Navigation size={14} className="text-rose-400 print:text-black" />
              <span>Prioritized Zone Resource Deployment Schedule</span>
            </h3>

            <div className="overflow-x-auto border border-slate-800 print:border-black rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 print:bg-gray-200 print:text-black border-b border-slate-800 print:border-black text-[11px]">
                    <th className="p-2.5 font-bold">Severity Rank</th>
                    <th className="p-2.5 font-bold">Zone / Ward</th>
                    <th className="p-2.5 font-bold">Severity Level & Score</th>
                    <th className="p-2.5 font-bold">Assigned Emergency Teams & Fleet</th>
                    <th className="p-2.5 font-bold">ETA</th>
                    <th className="p-2.5 font-bold">Designated Shelter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 print:divide-gray-300">
                  {order.items.map((item) => (
                    <tr
                      key={item.zoneId}
                      className={
                        item.severityAssessment.severityLevel === 'extreme'
                          ? 'bg-rose-950/30 font-medium print:bg-red-50'
                          : item.severityAssessment.severityLevel === 'critical'
                          ? 'bg-rose-950/20 font-medium print:bg-amber-50'
                          : 'bg-slate-900/40 print:bg-white'
                      }
                    >
                      <td className="p-2.5 font-mono font-bold text-rose-400 print:text-black">
                        #{item.rank}
                      </td>
                      <td className="p-2.5">
                        <div className="font-semibold text-white print:text-black">{item.zoneName}</div>
                        <div className="text-[10px] text-slate-400 print:text-gray-600">{item.zoneCode}</div>
                      </td>
                      <td className="p-2.5 font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                            item.severityAssessment.severityLevel === 'extreme'
                              ? 'bg-rose-950 text-rose-300 border-rose-700'
                              : item.severityAssessment.severityLevel === 'critical'
                              ? 'bg-amber-950 text-amber-300 border-amber-700'
                              : item.severityAssessment.severityLevel === 'high'
                              ? 'bg-yellow-950 text-yellow-300 border-yellow-700'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {item.severityAssessment.severityLevel} • {item.severityAssessment.severityScore} pts
                        </span>
                      </td>
                      <td className="p-2.5">
                        <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                          {item.assignedTeams.length > 0 ? (
                            item.assignedTeams.map((team) => (
                              <span
                                key={team.teamId}
                                className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-200 border border-slate-700"
                              >
                                🚨 {team.teamName}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 italic">Precautionary Monitoring</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2.5 font-mono text-slate-300 print:text-black">
                        {item.dispatchEtaMinutes} mins
                      </td>
                      <td className="p-2.5 text-[11px] text-slate-300 print:text-black">
                        {item.designatedShelterSite}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Unmet Demands / Bottleneck Warnings */}
          {order.unmetDemandDiagnostics.length > 0 && (
            <div className="p-3.5 bg-amber-950/30 border border-amber-800/60 rounded-xl space-y-1.5 text-xs print:bg-yellow-50 print:border-yellow-300">
              <div className="font-bold text-amber-400 print:text-amber-800 flex items-center gap-1.5">
                <AlertTriangle size={14} />
                <span>Resource Deficit & Contingency Requests</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-300 print:text-black text-[11px]">
                {order.unmetDemandDiagnostics.map((d, idx) => (
                  <li key={idx}>
                    <strong>{d.resourceType} (Deficit: {d.deficitCount}):</strong> {d.recommendation}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Signatures & QR Verification */}
          <div className="pt-6 border-t border-slate-800 print:border-black grid grid-cols-3 gap-6 items-end text-xs">
            <div className="space-y-6">
              <div className="h-6"></div>
              <div className="border-t border-slate-700 print:border-black pt-1">
                <span className="text-slate-400 print:text-gray-600 text-[10px] block uppercase">Prepared By</span>
                <span className="font-semibold text-slate-200 print:text-black">{order.disasterOfficerName}</span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center text-center space-y-1">
              <div className="p-2 bg-white rounded-lg border border-slate-300 shadow-sm inline-block">
                <QrCode size={48} className="text-slate-900" />
              </div>
              <span className="font-mono text-[9px] text-slate-400 print:text-gray-600 block">
                VERIFIED GOVT DISPATCH ORDER
              </span>
            </div>

            <div className="space-y-6 text-right">
              <div className="h-6"></div>
              <div className="border-t border-slate-700 print:border-black pt-1">
                <span className="text-slate-400 print:text-gray-600 text-[10px] block uppercase">Chief Officer Stamp</span>
                <span className="font-semibold text-slate-200 print:text-black">
                  {order.approvedBy || 'Shri S. K. Jadhav (Chief Officer, KMC)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
