import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Smartphone,
  Copy,
  Check,
  Download,
  AlertTriangle,
  X,
  Lock,
  RefreshCw,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import {
  initiate2FASetup,
  verifyAndActivate2FA,
  disable2FA,
  getUser2FAConfig,
  TwoFactorConfig,
} from '../../services/twoFactorService';
import { UserProfile } from '../../types';

interface TwoFactorSetupModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated?: () => void;
}

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({
  user,
  isOpen,
  onClose,
  onConfigUpdated,
}) => {
  const [currentConfig, setCurrentConfig] = useState<TwoFactorConfig>(getUser2FAConfig(user.id));
  const [step, setStep] = useState<'status' | 'setup_qr' | 'backup_codes'>('status');

  // Setup state
  const [setupData, setSetupData] = useState<{
    secret: string;
    otpauthUrl: string;
    qrCodeUrl: string;
    backupCodes: string[];
    rawBackupCodes: string[];
  } | null>(null);

  const [verifyCode, setVerifyCode] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getUser2FAConfig(user.id);
      setCurrentConfig(cfg);
      if (!cfg.enabled) {
        setStep('setup_qr');
        startSetup();
      } else {
        setStep('status');
      }
    }
  }, [isOpen, user.id]);

  if (!isOpen) return null;

  const startSetup = async () => {
    setVerifyError(null);
    setVerifyCode('');
    const data = await initiate2FASetup({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
    });
    setSetupData(data);
    setStep('setup_qr');
  };

  const handleCopySecret = () => {
    if (!setupData) return;
    navigator.clipboard.writeText(setupData.secret);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleCopyBackupCodes = () => {
    if (!setupData) return;
    navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2500);
  };

  const handleDownloadBackupCodes = () => {
    if (!setupData) return;
    const content = `# KOPARNITI (CIVICPULSE) - EMERGENCY 2FA BACKUP RECOVERY CODES
User: ${user.fullName} (${user.email || user.phone})
Authority: Kopargaon Municipal Council (कोपरगाव नगरपरिषद)
Generated At: ${new Date().toISOString()}

IMPORTANT: Each backup code can only be used ONCE to sign in if you lose access to your Authenticator app.
Keep these codes in a safe, offline location.

--- RECOVERY CODES ---
${setupData.backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KMC_2FA_Backup_Codes_${user.fullName.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConfirmActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupData) return;
    if (!verifyCode.trim()) {
      setVerifyError('Please enter the 6-digit code from your app.');
      return;
    }

    setIsActivating(true);
    setVerifyError(null);

    try {
      const res = await verifyAndActivate2FA(
        user.id,
        setupData.secret,
        verifyCode.trim(),
        setupData.rawBackupCodes,
        'both',
        user.phone
      );

      if (res.success) {
        setStep('backup_codes');
        const updated = getUser2FAConfig(user.id);
        setCurrentConfig(updated);
        onConfigUpdated?.();
      } else {
        setVerifyError(res.message);
      }
    } catch (err: any) {
      setVerifyError(err?.message || 'Activation failed.');
    } finally {
      setIsActivating(false);
    }
  };

  const handleDisable2FA = () => {
    if (window.confirm('Are you sure you want to disable Two-Factor Authentication? Your account security will be lowered.')) {
      disable2FA(user.id);
      const updated = getUser2FAConfig(user.id);
      setCurrentConfig(updated);
      onConfigUpdated?.();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden text-slate-900 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#131b2e] flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Two-Factor Authentication (2FA)</h3>
              <p className="text-xs text-slate-500">Government Standard TOTP & SMS OTP Security</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
          {/* Status View when already enabled */}
          {step === 'status' && (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-900 text-sm">2FA is Currently Active</h4>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Your account requires a 6-digit TOTP app code or SMS OTP on every sign-in.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-mono font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                  PROTECTED
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Account Protection Details</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Primary Method</span>
                    <span className="font-bold text-slate-800">Google / Microsoft Authenticator</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Fallback Channel</span>
                    <span className="font-bold text-slate-800">SMS OTP (+91 {user.phone || '9822011204'})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Activated On</span>
                    <span className="font-mono text-slate-700">
                      {currentConfig.enabledAt ? new Date(currentConfig.enabledAt).toLocaleDateString() : 'Active'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Backup Codes Remaining</span>
                    <span className="font-mono font-bold text-slate-800">
                      {currentConfig.backupCodesHashed.length} single-use codes
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={startSetup}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reconfigure / Re-pair Authenticator</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisable2FA}
                  className="w-full sm:w-auto px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Disable 2FA</span>
                </button>
              </div>
            </div>
          )}

          {/* Setup Step: Scan QR Code & Enter 6-digit Code */}
          {step === 'setup_qr' && setupData && (
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">Step 1: Scan QR Code with Authenticator App</h4>
                <p className="text-xs text-slate-500">
                  Open <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, or <strong>Authy</strong> and tap <strong>+ Add Account</strong>.
                </p>
              </div>

              {/* QR Code and Secret Display */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs shrink-0">
                  <img
                    src={setupData.qrCodeUrl}
                    alt="2FA QR Code"
                    className="w-36 h-36 object-contain"
                  />
                </div>

                <div className="space-y-2 text-xs w-full">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    Cannot scan QR? Enter manual key:
                  </span>
                  <div className="flex items-center gap-2">
                    <code className="bg-slate-100 border border-slate-300 font-mono font-bold text-xs p-2 rounded-lg text-[#131b2e] select-all flex-1 tracking-wider truncate">
                      {setupData.secret}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Copy Secret Key"
                    >
                      {copiedKey ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Account: <span className="font-mono text-slate-600">{user.email || user.fullName}</span> • Issuer: <span className="font-mono text-slate-600">KMC</span>
                  </p>
                </div>
              </div>

              {/* Verification Form */}
              <form onSubmit={handleConfirmActivation} className="space-y-4">
                <div className="space-y-1 text-center">
                  <label className="font-bold text-slate-800 text-xs uppercase tracking-wider block">
                    Step 2: Enter 6-Digit Code from Authenticator
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    placeholder="000000"
                    className="w-48 mx-auto text-center tracking-widest text-xl font-mono font-extrabold py-2.5 bg-white border-2 border-slate-300 rounded-xl focus:border-[#131b2e] focus:outline-none transition-all block"
                  />
                </div>

                {verifyError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center justify-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{verifyError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isActivating || verifyCode.length < 6}
                    className="px-6 py-2.5 bg-[#131b2e] hover:bg-[#1e2a47] disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isActivating ? 'Activating...' : 'Verify & Enable 2FA'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Backup Codes View after activation */}
          {step === 'backup_codes' && setupData && (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-emerald-900 text-sm">Two-Factor Authentication Activated!</h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Save your emergency backup recovery codes below.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Emergency Backup Recovery Codes (8 Total)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyBackupCodes}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedBackup ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedBackup ? 'Copied' : 'Copy All'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadBackupCodes}
                      className="px-2.5 py-1 bg-[#131b2e] hover:bg-[#1e2a47] text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download (.txt)</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center font-mono font-bold text-amber-400 text-xs">
                  {setupData.backupCodes.map((code, index) => (
                    <div key={index} className="p-2 bg-slate-900 border border-slate-800 rounded-lg">
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-[#131b2e] hover:bg-[#1e2a47] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
