import React from 'react';
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
  const handlePrint = () => {
    window.print();
  };

  const currentItem = item || plan.items[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Screen Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/70 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <Truck size={18} />
            <span>Official Treated Irrigation Water Dispatch Order</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all"
            >
              <Printer size={14} />
              <span>Print Dispatch Order</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Order Sheet */}
        <div className="p-8 space-y-6 text-slate-200 bg-slate-900 print:bg-white print:text-black print:p-6 print:m-0">
          {/* Header */}
          <div className="border-b-2 border-emerald-600/40 pb-5 text-center">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 print:text-gray-600">
                  Kopargaon Municipal Council • Department of Water Works
                </span>
                <h1 className="text-lg font-bold text-white print:text-black flex items-center gap-2">
                  <Building size={18} className="text-emerald-400 print:text-emerald-700" />
                  कोपरगाव नगरपरिषद (कृषी जल वितरण आदेश)
                </h1>
                <p className="text-xs text-slate-400 print:text-gray-600">
                  Treated Wastewater Agricultural Reuse & Farmer Quota Dispatch Order
                </p>
              </div>

              <div className="text-right">
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs font-mono font-bold print:bg-emerald-50 print:text-emerald-800">
                  <ShieldCheck size={14} />
                  <span>AUTHORISED DISPATCH</span>
                </div>
                <div className="text-[10px] text-slate-400 print:text-gray-600 mt-1 font-mono">
                  Plan: {plan.planCode}
                </div>
              </div>
            </div>
          </div>

          {/* Details Card */}
          {currentItem ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950/60 print:bg-gray-100 p-4 rounded-xl border border-slate-800 print:border-gray-300 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-600 block">Beneficiary Farmer</span>
                  <span className="font-bold text-white print:text-black text-sm">{currentItem.farmerName}</span>
                  <span className="text-[11px] text-slate-400 print:text-gray-600 block">{currentItem.farmerPhone}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-600 block">Agricultural Zone</span>
                  <span className="font-semibold text-emerald-400 print:text-emerald-800">{currentItem.commandZoneName}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-600 block">Crop Type & Acreage</span>
                  <span className="font-semibold capitalize text-white print:text-black">
                    {currentItem.cropType} ({currentItem.acreage} Acres)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-600 block">Volume Allocated</span>
                  <span className="font-mono font-bold text-white print:text-black text-sm">
                    {currentItem.allocatedVolumeKLD.toLocaleString()} KL (1,000L units)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-600 block">Distribution Mode</span>
                  <span className="font-semibold capitalize text-white print:text-black">
                    {currentItem.distributionMethod.replace('_', ' ')}
                  </span>
                  {currentItem.assignedTankerCode && (
                    <span className="text-[10px] text-emerald-400 print:text-emerald-700 block font-mono">
                      Vehicle: {currentItem.assignedTankerCode}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-600 block">Dispatch Time</span>
                  <span className="font-medium text-slate-300 print:text-black">
                    {new Date(currentItem.dispatchTime).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {plan.primaryDestination && (
                  <div className="col-span-2 sm:col-span-3 pt-1 border-t border-slate-800 print:border-gray-300">
                    <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-600 block">Authorized Flow Destination</span>
                    <span className="font-bold text-emerald-400 print:text-emerald-800 capitalize">
                      {plan.primaryDestination.replace('_', ' ')} (CPCB Certified Flow)
                    </span>
                  </div>
                )}
              </div>

              {/* Economic Subsidy & Savings Card */}
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40 print:bg-emerald-50 print:border-emerald-200 text-xs">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-600 block">
                      Farmer Economic Benefit Summary
                    </span>
                    <p className="text-xs text-slate-300 print:text-gray-800">
                      Subsidized Municipal Rate: <strong className="text-white print:text-black">₹{currentItem.subsidizedRateInrPerKL}/KL</strong> vs Commercial Private Tanker Rate: <strong>₹180/KL</strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 print:text-gray-600 uppercase block">Total Farmer Cost Savings</span>
                    <span className="text-lg font-bold text-emerald-400 print:text-emerald-800">
                      ₹{currentItem.commercialSavingsInr.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">No allocation items in this plan.</p>
          )}

          {/* Signatures & Stamps */}
          <div className="pt-8 border-t border-slate-800 print:border-gray-300 grid grid-cols-3 gap-4 text-center text-xs">
            <div className="space-y-6">
              <div className="h-8"></div>
              <div className="border-t border-slate-700 print:border-black pt-1">
                <span className="text-slate-400 print:text-gray-600 text-[10px] block uppercase">Dispatched By</span>
                <span className="font-semibold text-slate-200 print:text-black">Plant Operations Officer</span>
              </div>
            </div>

            <div className="space-y-6">
              <div className="h-8"></div>
              <div className="border-t border-slate-700 print:border-black pt-1">
                <span className="text-slate-400 print:text-gray-600 text-[10px] block uppercase">Vehicle / Canal Operator</span>
                <span className="font-semibold text-slate-200 print:text-black">Driver / Sluice Gate In-charge</span>
              </div>
            </div>

            <div className="space-y-6">
              <div className="h-8"></div>
              <div className="border-t border-slate-700 print:border-black pt-1">
                <span className="text-slate-400 print:text-gray-600 text-[10px] block uppercase">Beneficiary Farmer</span>
                <span className="font-semibold text-slate-200 print:text-black">Acknowledgment Signature</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
