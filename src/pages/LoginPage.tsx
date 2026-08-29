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
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const LoginPage: React.FC = () => {
  const { login, language, setLanguage, isSupabaseLive, zones, departments } = useCivic();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [selectedRole, setSelectedRole] = useState<UserRole>('citizen');
  
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

  const proceedWithLocalAuth = (roleToUse: UserRole, name?: string) => {
    const derivedName = name || email.split('@')[0].replace(/[\._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Municipal Officer';
    const userObj: UserProfile = {
      id: `usr-${Date.now()}`,
      role: roleToUse,
      fullName: derivedName,
      phone: phone || '9822000000',
      wardId: roleToUse === 'citizen' ? wardId : undefined,
      departmentId: roleToUse === 'officer' ? departmentId : undefined,
      employeeId: roleToUse !== 'citizen' ? employeeId || 'KMC-001' : undefined,
      isVerified: true,
    };

    login(roleToUse, userObj);
    navigate(roleToUse === 'citizen' ? '/citizen-portal' : '/');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.toLowerCase().includes('api key')) {
            setAuthError('Invalid Supabase Anon Key in .env. Please copy your anon public key from Supabase Dashboard -> Project Settings -> API.');
          } else {
            setAuthError(error.message);
          }
          setIsLoading(false);
          return;
        }

        if (data.user) {
          // Fetch the user's profile from the database
          let profile: any = null;
          const { data: profileData, error: profileErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (!profileErr && profileData) {
            profile = profileData;
          } else {
            // Profile may not exist yet (trigger race condition) — retry once after a short delay
            await new Promise((res) => setTimeout(res, 500));
            const { data: retryData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();
            profile = retryData;
          }

          // CRITICAL: Always default to 'citizen' if no profile role found.
          // Never use selectedRole as fallback — that caused the officer bug.
          const role: UserRole = (profile?.role as UserRole) || 'citizen';
          const userObj: UserProfile = {
            id: data.user.id,
            role,
            fullName: profile?.full_name || data.user.email?.split('@')[0] || 'Citizen',
            phone: profile?.phone || '',
            address: profile?.address || 'Kopargaon',
            wardId: profile?.ward_id,
            departmentId: profile?.department_id,
            employeeId: profile?.employee_id,
            isVerified: profile?.is_verified ?? true,
          };

          login(role, userObj);
          navigate(role === 'citizen' ? '/citizen-portal' : '/');
          return;
        }
      } catch (err: any) {
        console.warn('Supabase auth attempt failed:', err);
      }
    }

    // Direct local authentication fallback
    setTimeout(() => {
      let resolvedRole = selectedRole;
      const lowerEmail = email.toLowerCase();
      if (lowerEmail.includes('citizen') || lowerEmail.includes('pawar')) resolvedRole = 'citizen';
      else if (lowerEmail.includes('admin') || lowerEmail.includes('chief')) resolvedRole = 'admin';
      else if (lowerEmail.includes('officer') || lowerEmail.includes('deshmukh')) resolvedRole = 'officer';

      proceedWithLocalAuth(resolvedRole);
      setIsLoading(false);
    }, 300);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setAuthError('Please fill in all required fields.');
      setIsLoading(false);
      return;
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.toLowerCase().includes('api key')) {
            setAuthError('Invalid Supabase Anon Key in .env. Copy anon public key from Supabase Dashboard -> Project Settings -> API.');
          } else {
            setAuthError(error.message);
          }
          setIsLoading(false);
          return;
        }

        if (data.user) {
          // The handle_new_user() trigger auto-creates a profile with role='citizen'.
          // We need to update it with the user-selected role and additional details.
          // First, wait briefly for the trigger to execute.
          await new Promise((res) => setTimeout(res, 300));

          // Upsert the profile: if trigger already created it, update it; otherwise insert.
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: data.user.id,
            role: selectedRole,
            full_name: fullName.trim(),
            phone: phone.trim(),
            ward_id: selectedRole === 'citizen' ? wardId : null,
            department_id: selectedRole === 'officer' ? departmentId : null,
            employee_id: selectedRole !== 'citizen' ? employeeId.trim() : null,
            is_verified: true,
          }, { onConflict: 'id' });

          if (profileError) {
            console.warn('Profile upsert error:', profileError);
            // Profile may have been created by trigger with default citizen role.
            // Fetch whatever exists and use that.
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();

            if (existingProfile) {
              const role = (existingProfile.role as UserRole) || 'citizen';
              const userObj: UserProfile = {
                id: data.user.id,
                role,
                fullName: existingProfile.full_name || fullName.trim(),
                phone: existingProfile.phone || phone.trim(),
                wardId: existingProfile.ward_id,
                departmentId: existingProfile.department_id,
                employeeId: existingProfile.employee_id,
                isVerified: existingProfile.is_verified ?? true,
              };
              login(role, userObj);
              navigate(role === 'citizen' ? '/citizen-portal' : '/');
              return;
            }
          }

          const userObj: UserProfile = {
            id: data.user.id,
            role: selectedRole,
            fullName: fullName.trim(),
            phone: phone.trim(),
            wardId: selectedRole === 'citizen' ? wardId : undefined,
            departmentId: selectedRole === 'officer' ? departmentId : undefined,
            employeeId: selectedRole !== 'citizen' ? employeeId.trim() : undefined,
            isVerified: true,
          };

          login(selectedRole, userObj);
          navigate(selectedRole === 'citizen' ? '/citizen-portal' : '/');
          return;
        }
      } catch (err: any) {
        console.warn('Supabase signup attempt failed:', err);
      }
    }

    // Direct local registration fallback
    setTimeout(() => {
      proceedWithLocalAuth(selectedRole, fullName.trim());
      setIsLoading(false);
    }, 300);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'mr' : 'en');
  };

  return (
    <div className="min-h-screen bg-[#131b2e] flex flex-col justify-between text-slate-100 font-sans p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Top Municipal Crest */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-white/20 shadow-md shrink-0 p-1">
            <Building2 className="w-6 h-6 text-[#131b2e]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-white tracking-tight">Kopargaon MC</span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded">
                MUNICIPAL COMMAND
              </span>
            </div>
            <p className="text-xs text-[#7c839b]">KMC Operational Intelligence Node</p>
          </div>
        </div>

        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1 bg-[#1e2a47] hover:bg-[#2a3a5e] text-white border border-white/15 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
        >
          <Languages size={13} />
          <span>{language === 'en' ? 'मराठी' : 'English'}</span>
        </button>
      </div>

      {/* Main Login Card with KMC Clean White Aesthetic */}
      <div className="max-w-md w-full mx-auto my-8 bg-white border border-[#76777d]/20 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 space-y-5 text-[#1b1b1d]">
        {/* Banner Title */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 bg-slate-100 text-[#131b2e] border border-slate-300 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            <Activity size={12} className="text-emerald-600" />
            <span>कोपरगाव नगरपरिषद • Portal Login</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1b1b1d] tracking-tight">
            {mode === 'signin' ? 'Sign In to Your Account' : 'Register New Account'}
          </h1>
          <p className="text-xs text-[#57657b]">
            {mode === 'signin'
              ? 'Enter your municipal or citizen credentials to continue.'
              : 'Create an account to report civic issues and track municipal dispatches.'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="bg-[#f0edef] p-1 rounded-xl border border-[#76777d]/15 flex text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setAuthError('');
            }}
            className={`flex-1 py-2 font-bold rounded-lg transition-all ${
              mode === 'signin'
                ? 'bg-[#131b2e] text-white shadow-xs'
                : 'text-[#57657b] hover:text-[#1b1b1d]'
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
            className={`flex-1 py-2 font-bold rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-[#131b2e] text-white shadow-xs'
                : 'text-[#57657b] hover:text-[#1b1b1d]'
            }`}
          >
            Register
          </button>
        </div>

        {/* Role Selector Pill */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-[#76777d] uppercase tracking-wider">
            Target Role
          </label>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setSelectedRole('citizen')}
              className={`py-2 px-2 rounded-xl font-bold border transition-all text-center ${
                selectedRole === 'citizen'
                  ? 'bg-[#131b2e] text-white border-[#131b2e] shadow-xs'
                  : 'bg-[#f6f3f5] text-[#57657b] border-[#76777d]/20 hover:border-[#131b2e]'
              }`}
            >
              Citizen
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('officer')}
              className={`py-2 px-2 rounded-xl font-bold border transition-all text-center ${
                selectedRole === 'officer'
                  ? 'bg-[#131b2e] text-white border-[#131b2e] shadow-xs'
                  : 'bg-[#f6f3f5] text-[#57657b] border-[#76777d]/20 hover:border-[#131b2e]'
              }`}
            >
              Officer
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('admin')}
              className={`py-2 px-2 rounded-xl font-bold border transition-all text-center ${
                selectedRole === 'admin'
                  ? 'bg-[#131b2e] text-white border-[#131b2e] shadow-xs'
                  : 'bg-[#f6f3f5] text-[#57657b] border-[#76777d]/20 hover:border-[#131b2e]'
              }`}
            >
              Admin
            </button>
          </div>
        </div>

        {/* SIGN IN FORM */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4 text-xs">
            <div>
              <label className="block text-[#1b1b1d] font-semibold mb-1">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-3 text-[#76777d]" />
                <input
                  type="email"
                  required
                  placeholder="name@kopargaon.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#f6f3f5] border border-[#76777d]/20 rounded-xl pl-10 pr-3 py-2.5 text-[#1b1b1d] placeholder:text-[#76777d]/70 focus:outline-none focus:border-[#131b2e] focus:ring-1 focus:ring-[#131b2e] font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#1b1b1d] font-semibold mb-1">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3 text-[#76777d]" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#f6f3f5] border border-[#76777d]/20 rounded-xl pl-10 pr-3 py-2.5 text-[#1b1b1d] placeholder:text-[#76777d]/70 focus:outline-none focus:border-[#131b2e] focus:ring-1 focus:ring-[#131b2e] font-medium"
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
                  className="mt-1 px-3 py-1.5 bg-[#131b2e] hover:bg-[#1e2a47] text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-colors"
                >
                  <KeyRound size={13} className="text-emerald-400" />
                  <span>Continue in Local Session Mode →</span>
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#131b2e] hover:bg-[#1e2a47] text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all"
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
              <label className="block text-[#1b1b1d] font-semibold mb-1">Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-3 text-[#76777d]" />
                <input
                  type="text"
                  required
                  placeholder="Your Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#f6f3f5] border border-[#76777d]/20 rounded-xl pl-10 pr-3 py-2.5 text-[#1b1b1d] placeholder:text-[#76777d]/70 focus:outline-none focus:border-[#131b2e] focus:ring-1 focus:ring-[#131b2e] font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#1b1b1d] font-semibold mb-1">Mobile Phone</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-3 text-[#76777d]" />
                  <input
                    type="tel"
                    required
                    placeholder="9822000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#f6f3f5] border border-[#76777d]/20 rounded-xl pl-9 pr-3 py-2.5 text-[#1b1b1d] placeholder:text-[#76777d]/70 focus:outline-none focus:border-[#131b2e] focus:ring-1 focus:ring-[#131b2e] font-medium"
                  />
                </div>
              </div>

              {selectedRole === 'citizen' ? (
                <div>
                  <label className="block text-[#1b1b1d] font-semibold mb-1">Ward / Zone</label>
                  <select
                    value={wardId}
                    onChange={(e) => setWardId(e.target.value)}
                    className="w-full bg-[#f6f3f5] border border-[#76777d]/20 rounded-xl px-3 py-2.5 text-[#1b1b1d] focus:outline-none focus:border-[#131b2e] focus:ring-1 focus:ring-[#131b2e] font-medium"
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
                  <label className="block text-[#1b1b1d] font-semibold mb-1">Department</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full bg-[#f6f3f5] border border-[#76777d]/20 rounded-xl px-3 py-2.5 text-[#1b1b1d] focus:outline-none focus:border-[#131b2e] focus:ring-1 focus:ring-[#131b2e] font-medium"
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
              <label className="block text-[#1b1b1d] font-semibold mb-1">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-3 text-[#76777d]" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#f6f3f5] border border-[#76777d]/20 rounded-xl pl-10 pr-3 py-2.5 text-[#1b1b1d] placeholder:text-[#76777d]/70 focus:outline-none focus:border-[#131b2e] focus:ring-1 focus:ring-[#131b2e] font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#1b1b1d] font-semibold mb-1">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3 text-[#76777d]" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#f6f3f5] border border-[#76777d]/20 rounded-xl pl-10 pr-3 py-2.5 text-[#1b1b1d] placeholder:text-[#76777d]/70 focus:outline-none focus:border-[#131b2e] focus:ring-1 focus:ring-[#131b2e] font-medium"
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
                  className="mt-1 px-3 py-1.5 bg-[#131b2e] hover:bg-[#1e2a47] text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-colors"
                >
                  <KeyRound size={13} className="text-emerald-400" />
                  <span>Continue with Local Account →</span>
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#131b2e] hover:bg-[#1e2a47] text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all"
            >
              <ShieldCheck size={14} />
              <span>{isLoading ? 'Creating Account...' : 'Register & Enter Command'}</span>
            </button>
          </form>
        )}

        {/* Footer Status */}
        <div className="pt-3 border-t border-[#76777d]/15 flex items-center justify-between text-[11px] text-[#76777d]">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isSupabaseLive ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-500'
              }`}
            />
            <span>{isSupabaseLive ? 'Supabase Live' : 'Active Local Session'}</span>
          </div>
          <span className="font-mono text-[10px]">Track 2 Node</span>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-5xl w-full mx-auto text-center text-xs text-[#7c839b]">
        © 2026 Kopargaon Municipal Council (कोपरगाव नगरपरिषद). All rights reserved.
      </div>
    </div>
  );
};
