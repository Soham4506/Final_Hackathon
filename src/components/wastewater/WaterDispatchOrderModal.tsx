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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-[#76777d]/20 overflow-hidden my-8">
        {/* Screen Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#131b2e] text-white print:hidden">
          <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider">
            <Truck size={18} className="text-emerald-400" />
            <span>Official Treated Irrigation Water Dispatch Order</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#131b2e] bg-white hover:bg-slate-100 rounded-lg transition-all shadow-xs"
            >
              <Printer size={14} />
              <span>Print Order</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Order Sheet */}
        <div className="p-8 space-y-6 text-[#1b1b1d] bg-white print:p-6 print:m-0">
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
                  <span className="text-[10px] uppercase font-bold text-[#76777d] block">Agricultural Zone</span>
                  <span className="font-bold text-emerald-800">{currentItem.commandZoneName}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#76777d] block">Crop Type & Acreage</span>
                  <span className="font-bold capitalize text-[#1b1b1d]">
                    {currentItem.cropType} ({currentItem.acreage} Acres)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#76777d] block">Volume Allocated</span>
                  <span className="font-mono font-bold text-[#1b1b1d] text-sm">
                    {currentItem.allocatedVolumeKLD.toLocaleString()} KL (1,000L units)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#76777d] block">Distribution Mode</span>
                  <span className="font-bold capitalize text-[#1b1b1d]">
                    {currentItem.distributionMethod.replace('_', ' ')}
                  </span>
                  {currentItem.assignedTankerCode && (
                    <span className="text-[10px] text-emerald-700 block font-mono">
                      Vehicle: {currentItem.assignedTankerCode}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#76777d] block">Dispatch Time</span>
                  <span className="font-medium text-[#57657b]">
                    {new Date(currentItem.dispatchTime).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {plan.primaryDestination && (
                  <div className="col-span-2 sm:col-span-3 pt-1 border-t border-[#76777d]/15">
                    <span className="text-[10px] uppercase font-bold text-[#76777d] block">Authorized Flow Destination</span>
                    <span className="font-bold text-emerald-850 capitalize">
                      {plan.primaryDestination.replace('_', ' ')} (CPCB Certified Flow)
                    </span>
                  </div>
                )}
              </div>

              {/* Economic Subsidy & Savings Card */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-900 block">
                      Farmer Economic Benefit Summary
                    </span>
                    <p className="text-xs text-[#57657b]">
                      Subsidized Municipal Rate: <strong className="text-[#1b1b1d]">₹{currentItem.subsidizedRateInrPerKL}/KL</strong> vs Commercial Private Tanker Rate: <strong>₹180/KL</strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-900 uppercase block font-bold">Total Farmer Cost Savings</span>
                    <span className="text-lg font-bold text-emerald-700 font-mono">
                      ₹{currentItem.commercialSavingsInr.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#76777d]">No allocation items in this plan.</p>
          )}

          {/* Signatures & Stamps */}
          <div className="pt-8 border-t border-[#76777d]/15 grid grid-cols-3 gap-4 text-center text-xs">
            <div className="space-y-6">
              <div className="h-8"></div>
              <div className="border-t border-[#76777d]/40 pt-1">
                <span className="text-[#76777d] text-[10px] block uppercase">Dispatched By</span>
                <span className="font-bold text-[#1b1b1d]">Plant Operations Officer</span>
              </div>
            </div>

            <div className="space-y-6">
              <div className="h-8"></div>
              <div className="border-t border-[#76777d]/40 pt-1">
                <span className="text-[#76777d] text-[10px] block uppercase">Vehicle / Canal Operator</span>
                <span className="font-bold text-[#1b1b1d]">Driver / Sluice Gate In-charge</span>
              </div>
            </div>

            <div className="space-y-6">
              <div className="h-8"></div>
              <div className="border-t border-[#76777d]/40 pt-1">
                <span className="text-[#76777d] text-[10px] block uppercase">Beneficiary Farmer</span>
                <span className="font-bold text-[#1b1b1d]">Acknowledgment Signature</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
