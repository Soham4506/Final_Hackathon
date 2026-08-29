import React, { useState } from 'react';
import { WaterReusePlan, WaterAllocationItem } from '../../types/wastewater';
import {
  X,
  Printer,
  Truck,
  CheckCircle2,
  Calendar,
  User,
  Phone,
  MapPin,
  QrCode,
  Building,
  Droplets,
  Sprout,
  ShieldCheck,
  Minus,
  Maximize2,
} from 'lucide-react';

interface WaterDispatchOrderModalProps {
  plan: WaterReusePlan;
  item?: WaterAllocationItem;
  onClose: () => void;
}

export const WaterDispatchOrderModal: React.FC<WaterDispatchOrderModalProps> = ({
  plan,
  item,
  onClose,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const handlePrint = () => {
    window.print();
  };

  const currentItem = item || plan.items[0];

  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50 bg-white border-2 border-emerald-600 shadow-2xl rounded-2xl p-3.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
        <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
          <Truck size={20} />
        </div>
        <div className="text-xs">
          <div className="font-bold text-[#1b1b1d] flex items-center gap-1.5">
            <span>Water Dispatch Order:</span>
            <span className="font-mono text-emerald-800">{plan.planCode}</span>
          </div>
          <p className="text-[11px] text-[#57657b]">
            Volume: <strong>{plan.totalVolumeAllocatedKLD.toLocaleString()} KL</strong> • Mode: <strong className="capitalize">{plan.distributionMethod.replace('_', ' ')}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <button
            onClick={() => setIsMinimized(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition-all shadow-xs"
            title="Expand Dispatch Order"
          >
            <Maximize2 size={14} />
            <span>Expand Order</span>
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
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-[#76777d]/20 my-4 sm:my-8 flex flex-col max-h-[90vh] overflow-hidden print:my-0 print:border-none print:shadow-none print:max-h-none">
        {/* Sticky Screen Top Bar */}
        <div className="sticky top-0 z-30 shrink-0 flex items-center justify-between px-6 py-3.5 bg-[#131b2e] text-white shadow-xs print:hidden">
          <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider">
            <Truck size={18} className="text-emerald-400" />
            <span>Official Treated Irrigation Water Dispatch Order</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-200 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all shadow-xs"
              title="Minimize Order to bottom bar"
            >
              <Minus size={15} className="text-emerald-400" />
              <span>Minimize</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#131b2e] bg-white hover:bg-slate-100 rounded-lg transition-all shadow-xs"
            >
              <Printer size={14} />
              <span>Print Order</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Order Sheet */}
        <div className="p-6 md:p-8 space-y-6 text-[#1b1b1d] bg-white overflow-y-auto flex-1 print:p-6 print:m-0 print:overflow-visible">
          {/* Header */}
          <div className="border-b-2 border-emerald-600/30 pb-5 text-center">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#76777d]">
                  Kopargaon Municipal Council • Department of Water Works
                </span>
                <h1 className="text-lg font-bold text-[#1b1b1d] flex items-center gap-2">
                  <Building size={18} className="text-emerald-700" />
                  कोपरगाव नगरपरिषद (कृषी जल वितरण आदेश)
                </h1>
                <p className="text-xs text-[#57657b]">
                  Treated Wastewater Agricultural Reuse & Farmer Quota Dispatch Order
                </p>
              </div>

              <div className="text-right">
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-mono font-bold">
                  <ShieldCheck size={14} className="text-emerald-700" />
                  <span>AUTHORISED DISPATCH</span>
                </div>
                <div className="text-[10px] text-[#76777d] mt-1 font-mono">
                  Plan: {plan.planCode}
                </div>
              </div>
            </div>
          </div>

          {/* Details Card */}
          {currentItem ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#fcf8fa] p-4 rounded-xl border border-[#76777d]/15 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#76777d] block">Beneficiary Farmer</span>
                  <span className="font-bold text-[#1b1b1d] text-sm">{currentItem.farmerName}</span>
                  <span className="text-[11px] text-[#57657b] block">{currentItem.farmerPhone}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#76777d] block">Command Zone & Farmland</span>
                  <span className="font-bold text-[#1b1b1d] text-sm">{currentItem.commandZoneName}</span>
                  <span className="text-[11px] text-[#57657b] block">{currentItem.acreage} Acres • {currentItem.cropType}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#76777d] block">Allocated Quota</span>
                  <span className="font-bold text-emerald-800 font-mono text-base">{currentItem.allocatedVolumeKLD.toLocaleString()} KL</span>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase block">CPCB Approved</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#fcf8fa] p-4 rounded-xl border border-[#76777d]/15 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#76777d] block">Delivery Method</span>
                  <span className="font-mono font-bold text-[#1b1b1d] capitalize">{currentItem.distributionMethod.replace('_', ' ')}</span>
                  <span className="text-[11px] text-[#57657b] block">Mode: {plan.distributionMethod.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#76777d] block">Scheduled Window</span>
                  <span className="font-bold text-[#1b1b1d] text-xs">{currentItem.dispatchTime}</span>
                  <span className="text-[11px] text-[#57657b] block">Status: {currentItem.deliveredStatus}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#76777d] block">Tariff / Revenue</span>
                  <span className="font-mono font-bold text-emerald-800 text-sm">₹{(currentItem.subsidizedRateInrPerKL * currentItem.allocatedVolumeKLD).toLocaleString()}</span>
                  <span className="text-[10px] text-[#57657b] block">₹{currentItem.subsidizedRateInrPerKL}/KL Subsidized Rate</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-[#76777d]">
              No individual allocation item specified.
            </div>
          )}

          {/* Verification and Sign-off */}
          <div className="grid grid-cols-2 pt-6 border-t border-[#76777d]/20 text-xs">
            <div className="space-y-1">
              <span className="font-semibold text-[#1b1b1d] block">Security & Gate Pass Verification:</span>
              <p className="text-[11px] text-[#57657b]">Present this QR pass at KMC STP Outlet Sluice Gate #3:</p>
              <div className="flex items-center gap-2 pt-2">
                <QrCode size={40} className="text-[#131b2e]" />
                <span className="text-[10px] text-[#76777d] font-mono">
                  PASS-ID: {plan.id.slice(0, 10).toUpperCase()}
                </span>
              </div>
            </div>

            <div className="text-right space-y-1">
              <span className="text-[#76777d] block text-[11px]">Authorized Sluice Gate Officer:</span>
              <div className="font-bold text-sm text-[#1b1b1d]">Shri. V. M. Gite</div>
              <p className="text-[11px] text-[#57657b]">Assistant Engineer (Irrigation & Distribution)</p>
              <p className="text-[10px] text-emerald-800 font-mono font-bold mt-1">✓ DIGITALLY VERIFIED DISPATCH</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
