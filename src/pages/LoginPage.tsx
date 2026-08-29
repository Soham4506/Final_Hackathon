import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCivic } from '../context/CivicContext';
import { UserRole, UserProfile } from '../types';
import {
  Building2,
  Lock,
  Mail,
  User,
  Phone,
  Languages,
  AlertCircle,
  ShieldCheck,
  KeyRound,
  Activity,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { TwoFactorVerifyModal } from '../components/auth/TwoFactorVerifyModal';
import { is2FAEnabledForUser } from '../services/twoFactorService';

export const LoginPage: React.FC = () => {
  const { login, language, setLanguage, isSupabaseLive, zones, departments } = useCivic();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [selectedRole, setSelectedRole] = useState<UserRole>('citizen');
  
  // 2FA Verification Flow State
  const [pending2faUser, setPending2faUser] = useState<{ role: UserRole; user: UserProfile } | null>(null);
  const [show2faModal, setShow2faModal] = useState(false);
  const [enforce2faDemo, setEnforce2faDemo] = useState(false);

  // Sign In Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign Up Form
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [wardId, setWardId] = useState(zones[0]?.id || 'a0000000-0000-0000-0000-000000000001');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || 'b0000000-0000-0000-0000-000000000001');
  const [employeeId, setEmployeeId] = useState('');

  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const finalizeLoginWith2FA = (targetRole: UserRole, targetUser: UserProfile) => {
    const has2FA = is2FAEnabledForUser(targetUser.id) || enforce2faDemo || targetRole === 'admin';
    if (has2FA) {
      setPending2faUser({ role: targetRole, user: targetUser });
      setShow2faModal(true);
      setIsLoading(false);
      return;
    }

    login(targetRole, targetUser);
    navigate(targetRole === 'citizen' ? '/citizen-portal' : '/');
  };

  const proceedWithLocalAuth = (roleToUse: UserRole, name?: string) => {
    let derivedName = name || email.split('@')[0].replace(/[\._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Municipal Officer';
    let designation = 'Citizen';
    let employeeIdVal = undefined;

    if (roleToUse === 'admin' || email.toLowerCase().includes('admin') || email.toLowerCase().includes('chief')) {
      roleToUse = 'admin';
      derivedName = 'Chief Municipal Officer (मुख्‍याधिकारी)';
      designation = 'Chief Officer / Super Admin';
      employeeIdVal = 'KMC-ADMIN-01';
    } else if (roleToUse === 'officer') {
      designation = 'Municipal Officer';
      employeeIdVal = employeeId || 'KMC-OFF-101';
    }

    const userObj: UserProfile = {
      id: roleToUse === 'admin' ? 'usr-super-admin-01' : `usr-${Date.now()}`,
      role: roleToUse,
      fullName: derivedName,
      email: email.trim() || (roleToUse === 'admin' ? 'admin@kopargaon.gov.in' : undefined),
      phone: phone || (roleToUse === 'admin' ? '9822011204' : '9822000000'),
      wardId: roleToUse === 'citizen' ? wardId : undefined,
      departmentId: roleToUse === 'officer' ? departmentId : undefined,
      employeeId: employeeIdVal,
      designation,
      status: 'active',
      isVerified: true,
    };

    finalizeLoginWith2FA(roleToUse, userObj);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);

    const lowerEmail = email.trim().toLowerCase();
    const isSuperAdminEmail = lowerEmail === 'admin@kopargaon.gov.in' || lowerEmail === 'chief.officer@kopargaon.gov.in' || lowerEmail === 'admin@koparniti.gov.in';

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.toLowerCase().includes('invalid login credentials')) {
            setAuthError('Invalid credentials. If using local demo mode, check password or continue with local session below.');
          } else {
            setAuthError(error.message);
          }
          setIsLoading(false);
          return;
        }

        if (data.user) {
          let roleToAssign: UserRole = isSuperAdminEmail ? 'admin' : selectedRole;
          let fullNameToAssign = (data.user.user_metadata?.full_name as string) || (data.user.email?.split('@')[0]) || 'Citizen User';
          let phoneToAssign = (data.user.user_metadata?.phone as string) || '';
          let wardIdToAssign = data.user.user_metadata?.ward_id as string | undefined;
          let departmentIdToAssign = data.user.user_metadata?.department_id as string | undefined;
          let employeeIdToAssign = data.user.user_metadata?.employee_id as string | undefined;

          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .maybeSingle();

            if (profile) {
              roleToAssign = profile.role as UserRole;
              fullNameToAssign = profile.full_name || fullNameToAssign;
              phoneToAssign = profile.phone || phoneToAssign;
              wardIdToAssign = profile.ward_id || wardIdToAssign;
              departmentIdToAssign = profile.department_id || departmentIdToAssign;
              employeeIdToAssign = profile.employee_id || employeeIdToAssign;
            }
          } catch (profileErr) {
            console.warn('Profile fetch note:', profileErr);
          }

          if (isSuperAdminEmail) {
            roleToAssign = 'admin';
          }

          const userObj: UserProfile = {
            id: data.user.id,
            role: roleToAssign,
            fullName: fullNameToAssign,
            email: data.user.email || email.trim(),
            phone: phoneToAssign,
            wardId: wardIdToAssign,
            departmentId: departmentIdToAssign,
            employeeId: employeeIdToAssign,
            designation: roleToAssign === 'admin' ? 'Chief Officer / Super Admin' : (roleToAssign === 'officer' ? 'Municipal Officer' : 'Citizen'),
            status: 'active',
            isVerified: true,
          };

          finalizeLoginWith2FA(roleToAssign, userObj);
          return;
        }
      } catch (err: any) {
        console.warn('Supabase auth attempt notice:', err);
      }
    }

    // Direct local session login fallback
    setTimeout(() => {
      const derivedRole: UserRole = isSuperAdminEmail ? 'admin' : selectedRole;
      proceedWithLocalAuth(derivedRole);
      setIsLoading(false);
    }, 400);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);

    if (!fullName.trim() || !email.trim() || !password) {
      setAuthError('Please fill in all required registration fields.');
      setIsLoading(false);
      return;
    }

    const targetRole: UserRole = selectedRole === 'officer' ? 'officer' : 'citizen';

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone: phone.trim(),
              role: targetRole,
              ward_id: targetRole === 'citizen' ? wardId : null,
              department_id: targetRole === 'officer' ? departmentId : null,
              employee_id: targetRole !== 'citizen' ? employeeId.trim() : null,
            },
          },
        });

        if (error) {
          setAuthError(error.message);
          setIsLoading(false);
          return;
        }

        if (data.user) {
          await new Promise((res) => setTimeout(res, 400));

          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              role: targetRole,
              full_name: fullName.trim(),
              phone: phone.trim(),
              ward_id: targetRole === 'citizen' ? wardId : null,
              department_id: targetRole === 'officer' ? departmentId : null,
              employee_id: targetRole !== 'citizen' ? employeeId.trim() : null,
              is_verified: true,
            }, { onConflict: 'id' });
          } catch (profileErr) {
            console.warn('Profile direct upsert note:', profileErr);
          }

          const userObj: UserProfile = {
            id: data.user.id,
            role: targetRole,
            fullName: fullName.trim(),
            phone: phone.trim(),
            wardId: targetRole === 'citizen' ? wardId : undefined,
            departmentId: targetRole === 'officer' ? departmentId : undefined,
            employeeId: targetRole !== 'citizen' ? employeeId.trim() : undefined,
            isVerified: true,
          };

          finalizeLoginWith2FA(targetRole, userObj);
          return;
        }
      } catch (err: any) {
        console.warn('Supabase signup attempt failed:', err);
      }
    }

    setTimeout(() => {
      proceedWithLocalAuth(selectedRole, fullName.trim());
      setIsLoading(false);
    }, 300);
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setIsLoading(true);

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        });

        if (error) {
          setAuthError(error.message);
          setIsLoading(false);
        }
        return;
      } catch (err: any) {
        console.warn('Supabase Google OAuth initialization failed:', err);
      }
    }

    setTimeout(() => {
      const googleUser: UserProfile = {
        id: `usr-google-${Date.now()}`,
        role: selectedRole,
        fullName: selectedRole === 'citizen' ? 'Google Citizen User' : 'Google Municipal Officer',
        email: 'user.google@gmail.com',
        phone: '9822099999',
        wardId: selectedRole === 'citizen' ? wardId : undefined,
        departmentId: selectedRole === 'officer' ? departmentId : undefined,
        designation: selectedRole === 'citizen' ? 'Citizen' : 'Municipal Officer',
        status: 'active',
        isVerified: true,
      };
      finalizeLoginWith2FA(selectedRole, googleUser);
      setIsLoading(false);
    }, 400);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'mr' : 'en');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1d] via-[#111927] to-[#070b14] flex flex-col justify-between text-slate-100 font-sans p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Subtle ambient lighting & pattern background */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:28px_28px] opacity-40 pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Municipal Crest Header */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] flex items-center justify-center border border-slate-700/60 shadow-lg shrink-0 p-1">
            <Building2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-white tracking-tight">KoparNiti</span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md">
                कोपरनीती • KMC
              </span>
            </div>
            <p className="text-xs text-slate-400">Kopargaon Municipal Decision Support & Civic Engine</p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 bg-[#131b2e] hover:bg-[#1e2a47] text-white border border-slate-700/80 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <Languages size={14} className="text-emerald-400" />
          <span>{language === 'en' ? 'मराठी' : 'English'}</span>
        </button>
      </div>

      {/* Main Login Card with KMC Clean Slate Aesthetic */}
      <div className="max-w-md w-full mx-auto my-8 bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 space-y-5 text-slate-800 relative">
        {/* Banner Title */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 bg-slate-100 text-[#131b2e] border border-slate-200 text-[11px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            <Activity size={12} className="text-emerald-600" />
            <span>कोपरगाव नगरपरिषद • KoparNiti</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {mode === 'signin' ? 'Sign In to Your Account' : 'Register New Account'}
          </h1>
          <p className="text-xs text-slate-500">
            {mode === 'signin'
              ? 'Enter your municipal or citizen credentials to continue.'
              : 'Create an account to report civic issues and track municipal dispatches.'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setAuthError('');
            }}
            className={`flex-1 py-2 font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-[#131b2e] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setAuthError('');
            }}
            className={`flex-1 py-2 font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-[#131b2e] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Register
          </button>
        </div>

        {/* Role Selector Pill */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {mode === 'signup' ? 'Account Type' : 'Select Portal'}
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setSelectedRole('citizen')}
              className={`py-2 px-2 rounded-xl font-bold border transition-all text-center cursor-pointer ${
                selectedRole === 'citizen'
                  ? 'bg-[#131b2e] text-white border-[#131b2e] shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
              }`}
            >
              Citizen (नागरिक)
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('officer')}
              className={`py-2 px-2 rounded-xl font-bold border transition-all text-center cursor-pointer ${
                selectedRole === 'officer'
                  ? 'bg-[#131b2e] text-white border-[#131b2e] shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
              }`}
            >
              Municipal Officer (अधिकारी)
            </button>
          </div>
        </div>

        {/* SIGN IN FORM */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@kopargaon.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#131b2e] focus:bg-white font-medium transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#131b2e] focus:bg-white font-medium transition-colors"
                />
              </div>
            </div>

            {authError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-red-900">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>Authentication Notice</span>
                </div>
                <p className="leading-relaxed text-[11px]">{authError}</p>
                <button
                  type="button"
                  onClick={() => proceedWithLocalAuth(selectedRole)}
                  className="mt-1 px-3 py-1.5 bg-[#131b2e] hover:bg-[#1e2a47] text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <KeyRound size={13} className="text-emerald-400" />
                  <span>Continue in Local Session Mode →</span>
                </button>
              </div>
            )}

            {/* 2FA Quick Enforce Checkbox */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <label className="flex items-center gap-2 text-slate-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={enforce2faDemo}
                  onChange={(e) => setEnforce2faDemo(e.target.checked)}
                  className="rounded text-[#131b2e] focus:ring-[#131b2e]"
                />
                <span className="flex items-center gap-1">
                  <ShieldCheck size={14} className="text-amber-500" />
                  <span>Enforce Two-Factor Authentication (2FA)</span>
                </span>
              </label>
              <span className="text-[10px] font-mono text-slate-400 font-semibold">TOTP / SMS</span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#131b2e] hover:bg-[#1e2a47] text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
            >
              <Lock size={14} />
              <span>{isLoading ? 'Authenticating...' : 'Sign In to Command'}</span>
            </button>
          </form>
        )}

        {/* SIGN UP FORM */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Your Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#131b2e] focus:bg-white font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Mobile Phone</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="9822000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#131b2e] focus:bg-white font-medium"
                  />
                </div>
              </div>

              {selectedRole === 'citizen' ? (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Ward / Zone</label>
                  <select
                    value={wardId}
                    onChange={(e) => setWardId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-[#131b2e] focus:bg-white font-medium"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.code} - {z.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Department</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-[#131b2e] focus:bg-white font-medium"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#131b2e] focus:bg-white font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#131b2e] focus:bg-white font-medium"
                />
              </div>
            </div>

            {authError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-red-900">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>Registration Notice</span>
                </div>
                <p className="leading-relaxed text-[11px]">{authError}</p>
                <button
                  type="button"
                  onClick={() => proceedWithLocalAuth(selectedRole, fullName.trim())}
                  className="mt-1 px-3 py-1.5 bg-[#131b2e] hover:bg-[#1e2a47] text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <KeyRound size={13} className="text-emerald-400" />
                  <span>Continue with Local Account →</span>
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#131b2e] hover:bg-[#1e2a47] text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
            >
              <ShieldCheck size={14} />
              <span>{isLoading ? 'Creating Account...' : 'Register & Enter Command'}</span>
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Or continue with
          </span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs shadow-2xs flex items-center justify-center gap-2.5 transition-all hover:border-slate-300 cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Sign in with Google</span>
        </button>

        {/* Footer Status */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isSupabaseLive ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-500'
              }`}
            />
            <span className="font-medium text-slate-500">{isSupabaseLive ? 'Supabase Live' : 'Active Local Session'}</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">Track 2 Node</span>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-5xl w-full mx-auto text-center text-xs text-slate-500">
        © 2026 Kopargaon Municipal Council (कोपरगाव नगरपरिषद). All rights reserved.
      </div>

      {/* 2FA Verification Modal */}
      {pending2faUser && (
        <TwoFactorVerifyModal
          user={pending2faUser.user}
          isOpen={show2faModal}
          onSuccess={() => {
            login(pending2faUser.role, pending2faUser.user);
            setShow2faModal(false);
            navigate(pending2faUser.role === 'citizen' ? '/citizen-portal' : '/');
          }}
          onCancel={() => {
            setShow2faModal(false);
            setPending2faUser(null);
            setIsLoading(false);
          }}
        />
      )}
    </div>
  );
};
