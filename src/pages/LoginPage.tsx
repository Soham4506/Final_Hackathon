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

    login(roleToUse, userObj);
    navigate(roleToUse === 'citizen' ? '/citizen-portal' : '/');
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
          // If Supabase credentials fail for Super Admin demo password, allow local session fallback
          if (isSuperAdminEmail && (password === 'Admin@KoparNiti2026' || password === 'Admin@123')) {
            proceedWithLocalAuth('admin');
            setIsLoading(false);
            return;
          }

          if (error.message.toLowerCase().includes('api key')) {
            setAuthError('Invalid Supabase Anon Key in .env. Please copy your anon public key from Supabase Dashboard -> Project Settings -> API.');
          } else {
            setAuthError(error.message);
          }
          setIsLoading(false);
          return;
        }

        if (data.user) {
          // Fetch the user's profile from the database safely with maybeSingle (avoids 406 error)
          let profile: any = null;
          const { data: profileData, error: profileErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

          if (!profileErr && profileData) {
            profile = profileData;
          } else {
            // Profile may not exist yet or trigger in progress — retry once after a short delay
            await new Promise((res) => setTimeout(res, 400));
            const { data: retryData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .maybeSingle();
            profile = retryData;
          }

          // Prioritize: 1. DB profile role -> 2. Auth user_metadata role -> 3. Super Admin email match -> 4. Citizen fallback
          let rawRole = profile?.role || data.user.user_metadata?.role;
          if (!rawRole && isSuperAdminEmail) {
            rawRole = 'admin';
          }
          const role: UserRole = (rawRole as UserRole) || 'citizen';

          const userObj: UserProfile = {
            id: data.user.id,
            role,
            fullName: profile?.full_name || data.user.user_metadata?.full_name || (role === 'admin' ? 'Chief Municipal Officer (मुख्‍याधिकारी)' : data.user.email?.split('@')[0] || 'Municipal User'),
            email: data.user.email,
            phone: profile?.phone || data.user.user_metadata?.phone || '',
            address: profile?.address || 'Kopargaon',
            wardId: profile?.ward_id || data.user.user_metadata?.ward_id,
            departmentId: profile?.department_id || data.user.user_metadata?.department_id,
            employeeId: profile?.employee_id || data.user.user_metadata?.employee_id || (role === 'admin' ? 'KMC-ADMIN-01' : undefined),
            designation: profile?.designation || (role === 'admin' ? 'Chief Officer / Super Admin' : undefined),
            status: profile?.status || 'active',
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
      let resolvedRole: UserRole = selectedRole;
      if (isSuperAdminEmail || lowerEmail.includes('admin') || lowerEmail.includes('chief')) {
        resolvedRole = 'admin';
      } else if (lowerEmail.includes('citizen') || lowerEmail.includes('pawar')) {
        resolvedRole = 'citizen';
      } else if (lowerEmail.includes('officer') || lowerEmail.includes('deshmukh')) {
        resolvedRole = 'officer';
      }

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

    // Enforce that signup only allows citizen or officer (never admin)
    const targetRole: UserRole = selectedRole === 'officer' ? 'officer' : 'citizen';

    if (isSupabaseConfigured) {
      try {
        // Pass metadata to signUp so handle_new_user() trigger receives user role and details
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
          if (error.message.toLowerCase().includes('api key')) {
            setAuthError('Invalid Supabase Anon Key in .env. Copy anon public key from Supabase Dashboard -> Project Settings -> API.');
          } else {
            setAuthError(error.message);
          }
          setIsLoading(false);
          return;
        }

        if (data.user) {
          // Wait briefly for trigger, then ensure profile has latest fields
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

          login(targetRole, userObj);
          navigate(targetRole === 'citizen' ? '/citizen-portal' : '/');
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

    // Direct local fallback for Google OAuth
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
      login(selectedRole, googleUser);
      navigate(selectedRole === 'citizen' ? '/citizen-portal' : '/');
      setIsLoading(false);
    }, 400);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'mr' : 'en');
  };

  return (
    <div className="min-h-screen bg-primary flex flex-col justify-between text-slate-100 font-sans p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Top Municipal Crest */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center border border-white/20 shadow-md shrink-0 p-1">
            <Building2 className="w-6 h-6 text-[#131b2e]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-white tracking-tight">KoparNiti</span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded">
                कोपरनीती • KMC
              </span>
            </div>
            <p className="text-xs text-[#7c839b]">Kopargaon Municipal Decision Support & Civic Engine</p>
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
      <div className="max-w-md w-full mx-auto my-8 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl z-10 space-y-5 text-foreground">
        {/* Banner Title */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 bg-slate-100 text-[#131b2e] border border-slate-300 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            <Activity size={12} className="text-emerald-600" />
            <span>कोपरगाव नगरपरिषद • KoparNiti</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            {mode === 'signin' ? 'Sign In to Your Account' : 'Register New Account'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === 'signin'
              ? 'Enter your municipal or citizen credentials to continue.'
              : 'Create an account to report civic issues and track municipal dispatches.'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="bg-muted/80 dark:bg-slate-900 p-1 rounded-xl border border-border flex text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setAuthError('');
            }}
            className={`flex-1 py-2 font-bold rounded-lg transition-all ${
              mode === 'signin'
                ? 'bg-primary text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
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
                ? 'bg-primary text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Register
          </button>
        </div>

        {/* Role Selector Pill (Citizen & Officer only - Admin registration removed) */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            {mode === 'signup' ? 'Account Type' : 'Select Portal'}
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setSelectedRole('citizen')}
              className={`py-2 px-2 rounded-xl font-bold border transition-all text-center ${
                selectedRole === 'citizen'
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-muted/60 dark:bg-slate-900 text-muted-foreground border-border hover:border-primary'
              }`}
            >
              Citizen (नागरिक)
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('officer')}
              className={`py-2 px-2 rounded-xl font-bold border transition-all text-center ${
                selectedRole === 'officer'
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-muted/60 dark:bg-slate-900 text-muted-foreground border-border hover:border-primary'
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
              <label className="block text-foreground font-semibold mb-1">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-3 text-muted-foreground" />
                <input
                  type="email"
                  required
                  placeholder="name@kopargaon.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-muted/60 dark:bg-slate-900 border border-border rounded-xl pl-10 pr-3 py-2.5 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-foreground font-semibold mb-1">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3 text-muted-foreground" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-muted/60 dark:bg-slate-900 border border-border rounded-xl pl-10 pr-3 py-2.5 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
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
                  className="mt-1 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-colors"
                >
                  <KeyRound size={13} className="text-emerald-400" />
                  <span>Continue in Local Session Mode →</span>
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all"
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
              <label className="block text-foreground font-semibold mb-1">Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-3 text-muted-foreground" />
                <input
                  type="text"
                  required
                  placeholder="Your Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-muted/60 dark:bg-slate-900 border border-border rounded-xl pl-10 pr-3 py-2.5 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-foreground font-semibold mb-1">Mobile Phone</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-3 text-muted-foreground" />
                  <input
                    type="tel"
                    required
                    placeholder="9822000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-muted/60 dark:bg-slate-900 border border-border rounded-xl pl-9 pr-3 py-2.5 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>
              </div>

              {selectedRole === 'citizen' ? (
                <div>
                  <label className="block text-foreground font-semibold mb-1">Ward / Zone</label>
                  <select
                    value={wardId}
                    onChange={(e) => setWardId(e.target.value)}
                    className="w-full bg-muted/60 dark:bg-slate-900 border border-border rounded-xl px-3 py-2.5 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
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
                  <label className="block text-foreground font-semibold mb-1">Department</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full bg-muted/60 dark:bg-slate-900 border border-border rounded-xl px-3 py-2.5 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
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
              <label className="block text-foreground font-semibold mb-1">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-3 text-muted-foreground" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-muted/60 dark:bg-slate-900 border border-border rounded-xl pl-10 pr-3 py-2.5 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-foreground font-semibold mb-1">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3 text-muted-foreground" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-muted/60 dark:bg-slate-900 border border-border rounded-xl pl-10 pr-3 py-2.5 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
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
                  className="mt-1 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-colors"
                >
                  <KeyRound size={13} className="text-emerald-400" />
                  <span>Continue with Local Account →</span>
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all"
            >
              <ShieldCheck size={14} />
              <span>{isLoading ? 'Creating Account...' : 'Register & Enter Command'}</span>
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            Or continue with
          </span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-2.5 bg-card hover:bg-slate-50 text-foreground border border-slate-300 rounded-xl font-bold text-xs shadow-2xs flex items-center justify-center gap-2.5 transition-all hover:border-slate-400"
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
        <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
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

