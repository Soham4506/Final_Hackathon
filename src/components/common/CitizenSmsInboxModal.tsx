import React, { useState, useEffect } from 'react';
import { SMSAlertService, SmsMessage } from '../../services/smsAlertService';
import {
  MessageSquare,
  X,
  Smartphone,
  CheckCheck,
  Trash2,
  Send,
  Building,
  Sparkles,
  ShieldCheck,
  Clock,
  ChevronRight,
} from 'lucide-react';

interface CitizenSmsInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneFilter?: string;
}

export const CitizenSmsInboxModal: React.FC<CitizenSmsInboxModalProps> = ({
  isOpen,
  onClose,
  phoneFilter,
}) => {
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'filtered'>('all');

  const reloadMessages = () => {
    const list = SMSAlertService.getSmsInbox(activeTab === 'filtered' ? phoneFilter : undefined);
    setMessages(list);
  };

  useEffect(() => {
    if (isOpen) {
      reloadMessages();
    }
  }, [isOpen, activeTab, phoneFilter]);

  const handleClear = () => {
    SMSAlertService.clearSmsInbox();
    setMessages([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#76777d]/20 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Smartphone Header Bar */}
        <div className="p-4 bg-[#131b2e] text-white flex justify-between items-center border-b border-white/10">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Citizen Mobile SMS Alert Gateway
              </h3>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                LIVE SMS DISPATCH CHANNEL (KMC-GOV)
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Smartphone Screen Simulator */}
        <div className="p-4 bg-[#f2f4f8] flex-1 overflow-y-auto space-y-3 min-h-[350px]">
          {/* Top Info Banner */}
          <div className="p-2.5 bg-white rounded-xl border border-[#76777d]/15 text-xs flex items-center justify-between text-[#57657b]">
            <div className="flex items-center gap-1.5">
              <Building size={14} className="text-[#131b2e]" />
              <span className="font-bold text-[#1b1b1d]">Sender: KMC-GOV</span>
            </div>
            <span className="font-mono text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              ⚡ Fast2SMS Real Network Active
            </span>
          </div>

          {messages.length === 0 ? (
            <div className="p-8 text-center text-[#76777d] text-xs space-y-2 bg-white rounded-2xl border border-[#76777d]/15 my-6">
              <MessageSquare size={32} className="mx-auto text-slate-400" />
              <div className="font-bold text-[#1b1b1d]">No SMS Alerts Yet</div>
              <p className="text-[11px] leading-relaxed">
                When you report an issue, dispatch crew, or resolve a ticket, automated lifecycle SMS updates will appear in this citizen phone inbox instantly.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((sms) => (
                <div
                  key={sms.id}
                  className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-2 text-xs"
                >
                  {/* SMS Metadata */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-[#131b2e] text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
                        {sms.senderId}
                      </span>
                      <span className="font-mono text-[10px] text-[#76777d]">
                        To: {sms.recipientPhone}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#76777d] font-mono">
                      {new Date(sms.sentAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* SMS Bubble Body */}
                  <p className="text-[#1b1b1d] leading-relaxed font-sans text-xs bg-[#f8fafc] p-2.5 rounded-xl border border-slate-100">
                    {sms.smsBody}
                  </p>

                  {/* Delivery Status */}
                  <div className="flex items-center justify-between text-[10px] text-emerald-700 font-bold pt-0.5">
                    <span className="uppercase tracking-wider font-mono">
                      Ticket #{sms.ticketNumber} • {sms.stage.replace('_', ' ')}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCheck size={13} /> Delivered to Handset
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-white border-t border-[#76777d]/15 flex items-center justify-between text-xs">
          <button
            onClick={handleClear}
            className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-800 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 size={13} />
            <span>Clear Inbox</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#131b2e] hover:bg-[#1e2a47] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs"
          >
            Close Phone
          </button>
        </div>
      </div>
    </div>
  );
};
