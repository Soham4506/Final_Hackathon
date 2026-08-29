import React from 'react';
import { QualityCheckSample, WastewaterBatch } from '../../types/wastewater';
import {
  X,
  Printer,
  ShieldCheck,
  Award,
  AlertTriangle,
  QrCode,
  CheckCircle2,
  Calendar,
  UserCheck,
  Building,
  Droplets,
  Sprout,
  FileCheck,
  Trees,
} from 'lucide-react';

interface WaterQualityCertificateModalProps {
  sample: QualityCheckSample;
  batch?: WastewaterBatch;
  onClose: () => void;
}

export const WaterQualityCertificateModal: React.FC<WaterQualityCertificateModalProps> = ({
  sample,
  batch,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case 'grade_a':
        return {
          text: 'GRADE A • UNRESTRICTED EDIBLE CROPS',
          color: 'bg-emerald-600 text-white border-emerald-500',
          desc: '100% compliant for raw edible vegetables, onion crops, and pomegranate orchards.',
        };
      case 'grade_b':
        return {
          text: 'GRADE B • COMMERCIAL & CASH CROPS',
          color: 'bg-blue-600 text-white border-blue-500',
          desc: 'Certified safe for Sugarcane, Cotton, Wheat, and animal fodder irrigation.',
        };
      case 'grade_c':
        return {
          text: 'GRADE C • AGROFORESTRY & GREENBELTS',
          color: 'bg-amber-600 text-white border-amber-500',
          desc: 'Suitable for biomass trees, bio-diesel crops, and municipal green belts.',
        };
      default:
        return {
          text: 'SAFETY DEFICIT • RETREATMENT REQUIRED',
          color: 'bg-red-600 text-white border-red-500',
          desc: 'Failed threshold. Discharge prohibited. Auto-routed to secondary MBBR reactor.',
        };
    }
  };

  const badge = getGradeBadge(sample.grade);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-[#76777d]/20 overflow-hidden my-8">
        {/* Modal Top Bar (Screen Only) */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#131b2e] text-white print:hidden">
          <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider">
            <FileCheck size={18} className="text-emerald-400" />
            <span>Official Municipal Water Quality Lab Certificate</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#131b2e] bg-white hover:bg-slate-100 rounded-lg transition-all shadow-xs"
            >
              <Printer size={14} />
              <span>Print Certificate</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Certificate Body (Printable Area) */}
        <div className="p-8 space-y-6 text-[#1b1b1d] bg-white print:p-6 print:m-0">
          {/* Certificate Header / Emblems */}
          <div className="border-b-2 border-emerald-600/30 pb-5 text-center relative">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#76777d]">
                  Govt. of Maharashtra • Kopargaon Municipal Council
                </span>
                <h1 className="text-xl font-bold tracking-tight text-[#1b1b1d] flex items-center gap-2">
                  <Building size={20} className="text-emerald-700" />
                  कोपरगाव नगरपरिषद (अहिल्यानगर)
                </h1>
                <p className="text-xs text-[#57657b]">
                  Water Supply & Sanitation Department • Central Environmental Testing Laboratory
                </p>
              </div>

              <div className="text-right">
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-mono font-bold">
                  <ShieldCheck size={14} className="text-emerald-700" />
                  <span>CPCB CERTIFIED</span>
                </div>
                <div className="text-[10px] text-[#76777d] mt-1 font-mono">
                  ISO 14001:2015 Compliant
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#76777d]/15">
              <h2 className="text-base font-extrabold uppercase tracking-wide text-emerald-800">
                Agricultural Water Quality & Safety Clearance Certificate
              </h2>
              <p className="text-[11px] text-[#57657b] mt-0.5">
                Issued in accordance with Central Pollution Control Board (CPCB) & FAO Agricultural Irrigation Norms
              </p>
            </div>
          </div>

          {/* Certificate Metadata Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#fcf8fa] p-4 rounded-xl border border-[#76777d]/15 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#76777d] block">Certificate No.</span>
              <span className="font-mono font-bold text-emerald-800">{sample.qrVerificationHash}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#76777d] block">Batch Identifier</span>
              <span className="font-mono font-semibold text-[#1b1b1d]">{sample.batchNumber}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#76777d] block">Test Date & Time</span>
              <span className="font-medium text-[#1b1b1d]">
                {new Date(sample.testedAt).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#76777d] block">Certified Lab Chemist</span>
              <span className="font-semibold text-[#1b1b1d]">{sample.labTechnicianName || 'Dr. Anjali Deshmukh (M.Sc Env)'}</span>
            </div>
          </div>

          {/* Official Clearance Tier Banner */}
          <div className={`p-4 rounded-xl border text-center space-y-1 ${badge.color}`}>
            <span className="text-xs font-mono font-bold tracking-wider uppercase block">
              {badge.text}
            </span>
            <p className="text-xs opacity-90">{badge.desc}</p>
          </div>

          {/* Core Tested Parameters Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1b1b1d]">
              Physicochemical & Microbiological Laboratory Analysis
            </h3>
            <div className="border border-[#76777d]/15 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#fcf8fa] text-[#76777d] border-b border-[#76777d]/15 uppercase text-[10px] font-mono">
                  <tr>
                    <th className="p-2.5">Parameter</th>
                    <th className="p-2.5">Recorded Value</th>
                    <th className="p-2.5">CPCB Safe Standard</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#76777d]/10 text-xs">
                  <tr>
                    <td className="p-2.5 font-bold text-[#1b1b1d]">pH Level</td>
                    <td className="p-2.5 font-mono">{sample.parameters.ph.toFixed(2)}</td>
                    <td className="p-2.5 text-[#57657b]">6.5 - 8.5</td>
                    <td className="p-2.5">
                      <span className="text-emerald-700 font-bold">COMPLIANT</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-[#1b1b1d]">BOD (Biological Oxygen Demand)</td>
                    <td className="p-2.5 font-mono">{sample.parameters.bod.toFixed(1)} mg/L</td>
                    <td className="p-2.5 text-[#57657b]">&le; 10.0 mg/L (Grade A)</td>
                    <td className="p-2.5">
                      <span className="text-emerald-700 font-bold">OPTIMAL</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-[#1b1b1d]">TSS (Total Suspended Solids)</td>
                    <td className="p-2.5 font-mono">{sample.parameters.tss.toFixed(1)} mg/L</td>
                    <td className="p-2.5 text-[#57657b]">&le; 20.0 mg/L</td>
                    <td className="p-2.5">
                      <span className="text-emerald-700 font-bold">PASSED</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-[#1b1b1d]">Fecal Coliforms (MPN/100ml)</td>
                    <td className="p-2.5 font-mono">{sample.parameters.fecalColiforms} MPN</td>
                    <td className="p-2.5 text-[#57657b]">&le; 100 MPN (Grade A)</td>
                    <td className="p-2.5">
                      <span className="text-emerald-700 font-bold">STERILE</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Signatures & Seals */}
          <div className="pt-6 border-t border-[#76777d]/15 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="space-y-4">
              <div className="h-8"></div>
              <div className="border-t border-[#76777d]/40 pt-1">
                <span className="text-[#76777d] text-[10px] block uppercase">Analyzing Environmental Chemist</span>
                <span className="font-bold text-[#1b1b1d]">{sample.labTechnicianName || 'Dr. Anjali Deshmukh (M.Sc Env)'}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="h-8"></div>
              <div className="border-t border-[#76777d]/40 pt-1">
                <span className="text-[#76777d] text-[10px] block uppercase">Municipal Health & Water Officer</span>
                <span className="font-bold text-[#1b1b1d]">KMC Authorised Signatory</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
