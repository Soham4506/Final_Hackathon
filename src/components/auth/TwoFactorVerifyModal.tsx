import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Smartphone,
  KeyRound,
  MessageSquare,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Lock,
} from 'lucide-react';
import {
  verify2FACode,
  send2FASmsOtp,
  getUser2FAConfig,
} from '../../services/twoFactorService';
import { UserProfile } from '../../types';

interface TwoFactorVerifyModalProps {
  user: UserProfile;
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export const TwoFactorVerifyModal: React.FC<TwoFactorVerifyModalProps> = ({
  user,
  isOpen,
  onSuccess,
  onCancel,
}) => {
  const [method, setMethod] = useState<'totp' | 'sms' | 'backup'>('totp');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [smsSending, setSmsSending] = useState(false);
  const [smsSentNotice, setSmsSentNotice] = useState<string | null>(null);
  const [totpSecondsRemaining, setTotpSecondsRemaining] = useState(30);

  const config = getUser2FAConfig(user.id);
  const userPhone = user.phone || config.phoneNumber || '9822011204';

  // 30-second TOTP progress ticker
  useEffect(() => {
    const updateTicker = () => {
      const sec = 30 - (Math.floor(Date.now() / 1000) % 30);
      setTotpSecondsRemaining(sec);
    };
    updateTicker();
    const interval = setInterval(updateTicker, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) {
      setError('Please enter your verification code.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const res = await verify2FACode(user.id, code.trim(), method, userPhone);
      if (res.valid) {
        onSuccess();
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSendSms = async () => {
    setSmsSending(true);
    setError(null);
    try {
      const res = await send2FASmsOtp(userPhone, user.fullName);
      setSmsSentNotice(res.message);
      setTimeout(() => setSmsSentNotice(null), 6000);
    } catch (err: any) {
      setError(err?.message || 'Failed to dispatch SMS code.');
    } finally {
      setSmsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden text-slate-900 flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#131b2e] flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">Two-Factor Authentication</h3>
                <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded">
                  2FA REQUIRED
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                KoparNiti Council Security Shield
              </p>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {/* Method Switcher Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => { setMethod('totp'); setError(null); setCode(''); }}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                method === 'totp' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>App Code</span>
            </button>
            <button
              type="button"
              onClick={() => { setMethod('sms'); setError(null); setCode(''); handleSendSms(); }}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                method === 'sms' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>SMS OTP</span>
            </button>
            <button
              type="button"
              onClick={() => { setMethod('backup'); setError(null); setCode(''); }}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                method === 'backup' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Backup</span>
            </button>
          </div>

          {/* Prompt description */}
          {method === 'totp' && (
            <div className="space-y-1 text-center">
              <p className="text-xs text-slate-600">
                Open your <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, or <strong>Authy</strong> app and enter the active 6-digit verification code.
              </p>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-800 font-mono pt-1">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>Code refreshes in {totpSecondsRemaining}s</span>
              </div>
            </div>
          )}

          {method === 'sms' && (
            <div className="space-y-2 text-center">
              <p className="text-xs text-slate-600">
                We sent a 6-digit SMS verification code to your registered mobile number:
              </p>
              <p className="text-xs font-mono font-bold text-slate-800 bg-slate-100 py-1.5 px-3 rounded-lg inline-block">
                +91 {userPhone.slice(0, 2)}••••••{userPhone.slice(-2)}
              </p>
              {smsSentNotice && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] rounded-lg font-medium">
                  {smsSentNotice}
                </div>
              )}
            </div>
          )}

          {method === 'backup' && (
            <div className="space-y-1 text-center">
              <p className="text-xs text-slate-600">
                Enter one of your 8-character single-use emergency backup recovery codes (e.g. <span className="font-mono font-bold">KMC-XXXX-XXXX</span>).
              </p>
            </div>
          )}

          {/* Verification Code Form */}
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <input
                type="text"
                autoFocus
                value={code}
                maxLength={method === 'backup' ? 14 : 6}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={method === 'backup' ? 'KMC-XXXX-XXXX' : '000000'}
                className="w-full text-center tracking-widest text-2xl font-mono font-extrabold py-3 bg-slate-50 border-2 border-slate-300 rounded-2xl focus:border-[#131b2e] focus:bg-white focus:outline-none transition-all"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying || !code.trim()}
              className="w-full py-3 bg-[#131b2e] hover:bg-[#1e2a47] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{isVerifying ? 'Verifying...' : 'Verify & Continue'}</span>
            </button>
          </form>

          {/* Footer Assistance & Demo token */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            {method === 'sms' ? (
              <button
                type="button"
                onClick={handleSendSms}
                disabled={smsSending}
                className="text-blue-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>{smsSending ? 'Sending SMS...' : 'Resend SMS Code'}</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 font-mono">
                Evaluation token: <span className="font-bold text-slate-600">999999</span>
              </span>
            )}

            <button
              type="button"
              onClick={onCancel}
              className="text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
