import React, { useState } from 'react';
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
  Minus,
  Maximize2,
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
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const handlePrint = () => {
    window.print();
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50 bg-white border-2 border-[#ba1a1a] shadow-2xl rounded-2xl p-3.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
        <div className="p-2 rounded-xl bg-red-100 text-[#ba1a1a]">
          <Waves size={20} className="animate-pulse" />
        </div>
        <div className="text-xs">
          <div className="font-bold text-[#1b1b1d] flex items-center gap-1.5">
            <span>Flood Work Order:</span>
            <span className="font-mono text-[#ba1a1a]">{order.orderNumber}</span>
          </div>
          <p className="text-[11px] text-[#57657b] font-mono">
            Discharge: <strong>{order.damDischargeCusecs.toLocaleString()} Cusecs</strong> • Status: <strong className="uppercase">{order.alertLevel.replace('_', ' ')}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <button
            onClick={() => setIsMinimized(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ba1a1a] hover:bg-[#93000a] text-white font-bold text-xs transition-all shadow-xs"
            title="Expand Work Order"
          >
            <Maximize2 size={14} />
            <span>{language === 'mr' ? 'उघडा (Expand)' : 'Expand Order'}</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#76777d] hover:text-[#1b1b1d] hover:bg-slate-100 transition-all"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white border border-[#76777d]/30 rounded-2xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black my-8">
        {/* Top Header / Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#76777d]/20 bg-[#fcf8fa] print:hidden">
          <div className="flex items-center gap-2 text-[#ba1a1a]">
            <ShieldAlert size={20} />
            <span className="font-bold text-sm tracking-wide uppercase">
              {language === 'mr' ? 'आपत्कालीन पूर नियंत्रण कार्य आदेश' : 'Official Flood Emergency Dispatch Order'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 border border-slate-300 hover:bg-slate-200 text-[#1b1b1d] text-xs font-bold transition-all shadow-xs"
              title="Minimize Order to bottom bar"
            >
              <Minus size={15} />
              <span>{language === 'mr' ? 'लहान करा (Minimize)' : 'Minimize'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#76777d]/30 hover:bg-slate-50 text-[#1b1b1d] text-xs font-semibold transition-all shadow-xs"
            >
              <Printer size={14} />
              <span>{language === 'mr' ? 'प्रत मुद्रित करा (Print)' : 'Print'}</span>
            </button>

            {!order.isApproved && onApprove && (
              <button
                onClick={() => onApprove(order.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#ba1a1a] hover:bg-[#93000a] text-white text-xs font-bold transition-all shadow-xs"
              >
                <CheckCircle2 size={14} />
                <span>{language === 'mr' ? 'मंजूर करा (Authorize)' : 'Authorize'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#76777d] hover:text-[#1b1b1d] hover:bg-slate-200 transition-all ml-1"
              title="Close Order"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 md:p-8 space-y-6 text-[#1b1b1d] print:p-0">
          {/* Official Letterhead */}
          <div className="border-b-2 border-[#ba1a1a] pb-4 text-center space-y-1">
            <div className="inline-flex items-center gap-2 justify-center">
              <Building size={20} className="text-[#ba1a1a]" />
              <span className="text-xs uppercase tracking-widest font-mono text-[#76777d]">
                GOVERNMENT OF MAHARASHTRA • DISASTER MANAGEMENT CELL
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-[#1b1b1d] tracking-tight">
              कोपरगाव नगरपरिषद (आपत्ती व्यवस्थापन कक्ष)
            </h1>
            <p className="text-xs text-[#57657b]">
              KOPARGAON MUNICIPAL COUNCIL • GODAVARI RIVER FLOOD EMERGENCY RESOURCE DISPATCH ORDER
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-mono text-[#76777d] pt-1">
              <span>Order No: <strong>{order.orderNumber}</strong></span>
              <span>•</span>
              <span>Date: {new Date(order.createdAt).toLocaleString('en-IN')}</span>
              <span>•</span>
              <span>Discharge: <strong className="text-[#ba1a1a]">{order.damDischargeCusecs.toLocaleString()} Cusecs</strong></span>
              <span>•</span>
              <span>River Gauge: <strong>{order.riverLevelMeters} m</strong></span>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center justify-between p-3.5 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-3">
              <Waves className="text-red-700" size={24} />
              <div>
                <span className="text-[10px] font-mono uppercase text-red-700 font-semibold block">Alert Status</span>
                <span className="font-bold text-sm text-red-900 uppercase">
                  {order.alertLevel.replace('_', ' ')} • GODAVARI INUNDATION SURGE
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono uppercase text-red-700 font-semibold block">Covered Citizens</span>
              <span className="font-mono font-bold text-red-950 text-sm">
                {order.totalVulnerableCitizensCovered.toLocaleString()} Citizens
              </span>
            </div>
          </div>

          {/* Ranked Zone Dispatch Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1b1b1d] flex items-center gap-2">
              <Navigation size={14} className="text-[#ba1a1a]" />
              <span>Prioritized Zone Resource Deployment Schedule</span>
            </h3>

            <div className="overflow-x-auto border border-[#76777d]/20 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#fcf8fa] text-[#76777d] border-b border-[#76777d]/20 text-[11px] font-bold uppercase">
                    <th className="p-2.5 font-bold">Severity Rank</th>
                    <th className="p-2.5 font-bold">Zone / Ward</th>
                    <th className="p-2.5 font-bold">Severity Level</th>
                    <th className="p-2.5 font-bold">Assigned Emergency Fleet</th>
                    <th className="p-2.5 font-bold">ETA</th>
                    <th className="p-2.5 font-bold">Designated Shelter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#76777d]/15">
                  {order.items.map((item) => (
                    <tr
                      key={item.zoneId}
                      className={
                        item.severityAssessment.severityLevel === 'extreme'
                          ? 'bg-red-50/40 font-medium'
                          : item.severityAssessment.severityLevel === 'critical'
                          ? 'bg-amber-50/30 font-medium'
                          : 'bg-white'
                      }
                    >
                      <td className="p-2.5 font-mono font-bold text-[#ba1a1a]">
                        #{item.rank}
                      </td>
                      <td className="p-2.5">
                        <div className="font-bold text-[#1b1b1d]">{item.zoneName}</div>
                        <div className="text-[10px] text-[#76777d] font-mono">{item.zoneCode}</div>
                      </td>
                      <td className="p-2.5 font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                            item.severityAssessment.severityLevel === 'extreme'
                              ? 'bg-red-100 text-red-800 border-red-200'
                              : item.severityAssessment.severityLevel === 'critical'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : item.severityAssessment.severityLevel === 'high'
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {item.severityAssessment.severityLevel} • {item.severityAssessment.severityScore} pts
                        </span>
                      </td>
                      <td className="p-2.5">
                        <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                          {item.allocatedResources.rescueBoats > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                              🚤 {item.allocatedResources.rescueBoats} Boats
                            </span>
                          )}
                          {item.allocatedResources.dewateringPumps > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                              ⚙️ {item.allocatedResources.dewateringPumps} Pumps
                            </span>
                          )}
                          {item.allocatedResources.sandbagTrucks > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                              🧱 {item.allocatedResources.sandbagTrucks} Trucks
                            </span>
                          )}
                          {item.allocatedResources.evacuationBuses > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-bold">
                              🚌 {item.allocatedResources.evacuationBuses} Buses
                            </span>
                          )}
                          {item.allocatedResources.rescueBoats === 0 &&
                            item.allocatedResources.dewateringPumps === 0 &&
                            item.allocatedResources.sandbagTrucks === 0 && (
                              <span className="text-[#76777d] italic">Standby Monitoring</span>
                            )}
                        </div>
                      </td>
                      <td className="p-2.5 font-mono text-[#1b1b1d]">
                        {item.dispatchEtaMinutes} mins
                      </td>
                      <td className="p-2.5 text-[11px] text-[#1b1b1d]">
                        {item.designatedShelterSite}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signatures & Authorization */}
          <div className="grid grid-cols-2 pt-6 border-t border-[#76777d]/20 text-xs">
            <div className="space-y-1">
              <span className="font-semibold text-[#1b1b1d] block">Municipal Control Room Verification:</span>
              <p className="text-[11px] text-[#76777d]">Digital Sign-off Log ID: {order.id}</p>
              <div className="flex items-center gap-2 pt-2">
                <QrCode size={36} className="text-[#1b1b1d]" />
                <span className="text-[10px] text-[#76777d] font-mono">
                  SCAN TO VERIFY OFFICIAL DISPATCH STATUS
                </span>
              </div>
            </div>

            <div className="text-right space-y-1">
              <span className="text-[#76777d] block text-[11px]">Authorized by:</span>
              <div className="font-bold text-sm text-[#1b1b1d]">Er. S. B. Patil</div>
              <p className="text-[11px] text-[#76777d]">
                Chief Disaster Management Officer • Kopargaon Municipal Council
              </p>
              <div className="inline-block mt-2 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[10px] font-mono font-bold uppercase">
                {order.isApproved ? '✓ DISPATCH AUTHORIZED' : 'OFFICIAL DRAFT'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
