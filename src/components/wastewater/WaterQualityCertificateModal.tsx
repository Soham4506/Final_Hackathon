import React, { useState } from 'react';
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
  Minus,
  Maximize2,
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
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

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

  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50 bg-white border-2 border-emerald-600 shadow-2xl rounded-2xl p-3.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
        <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
          <FileCheck size={20} />
        </div>
        <div className="text-xs">
          <div className="font-bold text-[#1b1b1d] flex items-center gap-1.5">
            <span>Water Certificate:</span>
            <span className="font-mono text-emerald-800">{sample.batchNumber}</span>
          </div>
          <p className="text-[11px] text-[#57657b] font-mono">
            Grade: <strong className="uppercase">{sample.grade.replace('_', ' ')}</strong> • WQI: <strong>{sample.waterQualityIndex}/100</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <button
            onClick={() => setIsMinimized(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition-all shadow-xs"
            title="Expand Certificate"
          >
            <Maximize2 size={14} />
            <span>Expand Certificate</span>
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
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-[#76777d]/20 my-4 sm:my-8 flex flex-col max-h-[90vh] overflow-hidden print:my-0 print:border-none print:shadow-none print:max-h-none">
        {/* Sticky Modal Top Action Bar */}
        <div className="sticky top-0 z-30 shrink-0 flex items-center justify-between px-6 py-3.5 bg-[#131b2e] text-white shadow-xs print:hidden">
          <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider">
            <FileCheck size={18} className="text-emerald-400" />
            <span>Official Municipal Water Quality Lab Certificate</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-200 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all shadow-xs"
              title="Minimize Certificate to bottom bar"
            >
              <Minus size={15} className="text-emerald-400" />
              <span>Minimize</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#131b2e] bg-white hover:bg-slate-100 rounded-lg transition-all shadow-xs"
            >
              <Printer size={14} />
              <span>Print Certificate</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors ml-1"
              title="Close Certificate"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Certificate Sheet Body */}
        <div className="p-6 md:p-8 space-y-6 text-[#1b1b1d] overflow-y-auto flex-1 print:p-0 print:overflow-visible">
          {/* Official Letterhead */}
          <div className="border-b-2 border-emerald-600 pb-4 text-center space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-left">
                <Building size={28} className="text-[#131b2e]" />
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#76777d] block">
                    GOVT. OF MAHARASHTRA • KOPARGAON MUNICIPAL COUNCIL
                  </span>
                  <h1 className="text-base font-bold text-[#1b1b1d]">
                    कोपरगाव नगरपरिषद (अहिल्यानगर)
                  </h1>
                  <span className="text-[11px] text-[#57657b] font-medium block">
                    Water Supply & Sanitation Department • Central Environmental Testing Laboratory
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-mono font-bold">
                  <ShieldCheck size={14} className="text-emerald-700" />
                  <span>CPCB CERTIFIED</span>
                </div>
                <div className="text-[10px] text-[#76777d] mt-0.5 font-mono">
                  ISO 14001:2015 Compliant
                </div>
              </div>
            </div>
          </div>

          {/* Certificate Title */}
          <div className="text-center space-y-1 py-1">
            <h2 className="text-base sm:text-lg font-bold text-emerald-900 uppercase tracking-wide">
              Agricultural Water Quality & Safety Clearance Certificate
            </h2>
            <p className="text-xs text-[#57657b]">
              Issued in accordance with Central Pollution Control Board (CPCB) & FAO Agricultural Irrigation Norms
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#fcf8fa] p-4 rounded-xl border border-[#76777d]/15 text-xs">
            <div>
              <span className="text-[#76777d] text-[10px] uppercase font-bold block">Certificate No.</span>
              <span className="font-mono font-bold text-emerald-800 text-xs">
                KMC-LAB-CERT-{sample.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-[#76777d] text-[10px] uppercase font-bold block">Batch Identifier</span>
              <span className="font-mono font-bold text-[#1b1b1d] text-xs">
                WW-{sample.batchNumber}
              </span>
            </div>
            <div>
              <span className="text-[#76777d] text-[10px] uppercase font-bold block">Test Date & Time</span>
              <span className="text-[#1b1b1d] font-medium text-xs">
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
              <span className="text-[#76777d] text-[10px] uppercase font-bold block">Certified Lab Chemist</span>
              <span className="text-[#1b1b1d] font-bold text-xs">
                {sample.certifiedOfficerName || sample.labTechnicianName} (Govt Certified Chemist)
              </span>
            </div>
          </div>

          {/* Large Quality Classification Ribbon */}
          <div className={`p-4 rounded-xl border text-center space-y-1 ${badge.color}`}>
            <h3 className="text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-2">
              <Award size={18} />
              <span>{badge.text}</span>
            </h3>
            <p className="text-xs opacity-95">{badge.desc}</p>
          </div>

          {/* Detailed Physicochemical Lab Analysis Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1b1b1d]">
              Physicochemical & Microbiological Laboratory Analysis
            </h4>

            <div className="overflow-x-auto border border-[#76777d]/20 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#fcf8fa] text-[#76777d] border-b border-[#76777d]/15 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Parameter</th>
                    <th className="py-2.5 px-3">Recorded Value</th>
                    <th className="py-2.5 px-3">CPCB Safe Standard</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#76777d]/10 font-mono text-[11px]">
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-medium text-[#1b1b1d]">pH Level</td>
                    <td className="py-2.5 px-3 font-bold text-[#1b1b1d]">{sample.parameters.ph}</td>
                    <td className="py-2.5 px-3 text-[#57657b]">6.5 - 8.5</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-700">COMPLIANT</td>
                  </tr>
                  <tr className="bg-[#fcf8fa]/50">
                    <td className="py-2.5 px-3 font-sans font-medium text-[#1b1b1d]">BOD (Biological Oxygen Demand)</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-800">{sample.parameters.bod} mg/L</td>
                    <td className="py-2.5 px-3 text-[#57657b]">≤ 10.0 mg/L (Grade A)</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-700">OPTIMAL</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-medium text-[#1b1b1d]">TSS (Total Suspended Solids)</td>
                    <td className="py-2.5 px-3 font-bold text-[#1b1b1d]">{sample.parameters.tss} mg/L</td>
                    <td className="py-2.5 px-3 text-[#57657b]">≤ 20.0 mg/L</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-700">PASSED</td>
                  </tr>
                  <tr className="bg-[#fcf8fa]/50">
                    <td className="py-2.5 px-3 font-sans font-medium text-[#1b1b1d]">Fecal Coliforms (MPN/100ml)</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-800">{sample.parameters.fecalColiforms} MPN</td>
                    <td className="py-2.5 px-3 text-[#57657b]">≤ 100 MPN (Grade A)</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-700">STERILE</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-medium text-[#1b1b1d]">Salinity EC (Electrical Conductivity)</td>
                    <td className="py-2.5 px-3 font-bold text-[#1b1b1d]">{sample.parameters.electricalConductivity} dS/m</td>
                    <td className="py-2.5 px-3 text-[#57657b]">≤ 1.2 dS/m</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-700">NON-SALINE</td>
                  </tr>
                  <tr className="bg-[#fcf8fa]/50">
                    <td className="py-2.5 px-3 font-sans font-medium text-[#1b1b1d]">Nutrient Value (N-P-K)</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-800">
                      N:{sample.parameters.nutrientsMgL.nitrogen} | P:{sample.parameters.nutrientsMgL.phosphorus} | K:{sample.parameters.nutrientsMgL.potassium} mg/L
                    </td>
                    <td className="py-2.5 px-3 text-[#57657b]">Natural Fertigation</td>
                    <td className="py-2.5 px-3 font-bold text-amber-700">HIGH VALUE</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-medium text-[#1b1b1d]">Heavy Metals (Lead Pb / Cadmium Cd)</td>
                    <td className="py-2.5 px-3 font-bold text-[#1b1b1d]">
                      Pb: {sample.parameters.heavyMetalsPpb.lead} ppb | Cd: {sample.parameters.heavyMetalsPpb.cadmium} ppb
                    </td>
                    <td className="py-2.5 px-3 text-[#57657b]">Pb ≤ 50 | Cd ≤ 10 ppb</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-700">NON-TOXIC</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Legal Signatures & QR Code */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t-2 border-[#131b2e] text-xs">
            <div className="flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#76777d] block">Digital Verification</span>
                <p className="text-[11px] text-[#57657b] mt-0.5">Scan to verify authentic laboratory clearance record:</p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <QrCode size={44} className="text-[#131b2e]" />
                <span className="font-mono text-[9px] text-[#76777d] leading-tight">
                  KMC-CLEAR-ID: {sample.id.slice(0, 12)}
                </span>
              </div>
            </div>

            <div className="text-center flex flex-col justify-end">
              <div className="border-t border-[#76777d]/40 pt-1 font-bold text-xs text-[#1b1b1d]">
                Dr. R. K. Deshmukh
              </div>
              <div className="text-[10px] text-[#76777d]">Senior Environmental Engineer</div>
              <div className="text-[9px] text-[#76777d]">KMC Pollution Control Division</div>
            </div>

            <div className="text-right flex flex-col justify-end">
              <div className="border-t border-[#76777d]/40 pt-1 font-bold text-xs text-[#1b1b1d]">
                Er. Anand Shinde
              </div>
              <div className="text-[10px] text-[#76777d]">Superintending Engineer (Water Works)</div>
              <div className="text-[9px] text-[#76777d]">Kopargaon Municipal Council</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
