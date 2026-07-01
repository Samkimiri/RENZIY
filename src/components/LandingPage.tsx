import React, { useEffect, useMemo, useState } from 'react';
import { useRenziy } from '../state';
import { rememberLocalLogin, verifyLocalLogin } from '../authMemory';
import { ArrowRight, BarChart3, Building2, CheckCircle2, Eye, EyeOff, HardHat, HelpCircle, Home, Lock, Mail, MapPin, Phone, ShieldCheck, Smartphone, UserRound } from 'lucide-react';

type AccountMode = 'signin' | 'signup' | 'reset';
type AccountRole = 'admin' | 'landlord' | 'tenant' | 'worker';

const defaultAvatar = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOcbVtz4Nz5aTDAR2DZW9Pg9F6e65oPi6Td2jZ84CEwLXgn5HrvYocGZaVvLRdcS9eUaqLENJ27o2RqpElz14uBPV47JROuDd4JkbKG4lK3vapbE6KOkie8PQbaMTqlvURqdmEzyOUTLS-bssVrQp56st-qoqgO1NFNrdLvXPdL5SwnjZzSChp5a_s4toIffdm_8W02EPKg7MLqi3poWL6UDKib0nkwFBjpcLb7YMRsPtiVkMFt4jFzqbDf0SOuGuynYq7GjnWhyHB';

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const accountRoleLabel = (role: AccountRole) => (
  role === 'admin' ? 'Owner' : role === 'tenant' ? 'Tenant' : role === 'landlord' ? 'Landlord' : 'Worker'
);

export default function LandingPage() {
  const { members, registerMember, requestPasswordReset, confirmPasswordReset, setRole, setUsername, addProperty } = useRenziy();
  const [authMode, setAuthMode] = useState<AccountMode>('signin');
  const [selectedRole, setSelectedRole] = useState<AccountRole>('tenant');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetDelivery, setResetDelivery] = useState<{ email: string; phone: string; resetCode?: string; expiresAt?: number } | null>(null);
  const [propertyName, setPropertyName] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const accountsForRole = useMemo(
    () => members.filter(member => member.role === selectedRole),
    [members, selectedRole]
  );

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('renziy_remembered_email');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const handlePhoneInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, '');
    setPhone(digits.slice(0, 12));
  };

  const enterAccount = (role: AccountRole, name: string, accountEmail: string, token?: string) => {
    localStorage.setItem('renziy_user_email', accountEmail);
    if (token) {
      localStorage.setItem('renziy_session_token', token);
    }
    localStorage.removeItem('renziy_game_stats');
    localStorage.removeItem('renziy_custom_avatar');
    setUsername(name);
    setRole(role);
  };

  const createStarterPortfolio = (ownerEmail: string, ownerName: string) => {
    addProperty({
      name: propertyName.trim() || `${ownerName}'s Portfolio`,
      address: 'Address pending verification',
      unitsCount: 1,
      imageUrl: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
      county: 'Nairobi',
      constituency: 'Pending update',
      town: 'Pending update',
      neighborhood: 'Pending update',
      specificLocation: 'Pending update',
      description: 'New landlord portfolio pending property details.',
      amenities: ['Security', 'Water', 'Parking'],
      contactPhone: phone || 'Pending',
      mapQuery: propertyName.trim() || ownerName,
      availableForMarketplace: true,
      ownerEmail
    });
  };

  const handleAuthSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormMessage('');
    setLoading(true);

    const cleanEmail = normalizeEmail(email);
    const existingAccount = members.find(member => member.email.toLowerCase() === cleanEmail && member.role === selectedRole);

    try {
      if (authMode === 'reset') {
        if (!resetDelivery) {
          const delivery = await requestPasswordReset(selectedRole, cleanEmail);
          setResetDelivery(delivery);
          setFormMessage(`Reset code generated for ${delivery.email} and ${delivery.phone}. Enter it below before it expires.`);
          return;
        }

        if (!resetCode.trim()) {
          setFormMessage('Enter the reset code sent to your email and phone.');
          return;
        }
        if (password.length < 6) {
          setFormMessage('Choose a new password with at least 6 characters.');
          return;
        }
        if (password !== confirmPassword) {
          setFormMessage('The new passwords do not match.');
          return;
        }

        await confirmPasswordReset(selectedRole, cleanEmail, resetCode, password);
        const accountName = existingAccount?.name || fullName.trim() || cleanEmail;
        await rememberLocalLogin(selectedRole, cleanEmail, accountName, password);
        setPassword('');
        setConfirmPassword('');
        setResetCode('');
        setResetDelivery(null);
        setAuthMode('signin');
        setFormMessage('Password reset successfully. Sign in with your new password.');
        return;
      }

      if (authMode === 'signin') {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: selectedRole, email: cleanEmail, password })
          });
          if (res.ok) {
            const data = await res.json();
            await rememberLocalLogin(data.member.role, data.member.email, data.member.name, password);
            if (rememberMe) {
              localStorage.setItem('renziy_remembered_email', cleanEmail);
            } else {
              localStorage.removeItem('renziy_remembered_email');
            }
            enterAccount(data.member.role, data.member.name, data.member.email, data.token);
            return;
          }
          const data = await res.json().catch(() => null);
          const localLogin = await verifyLocalLogin(selectedRole, cleanEmail, password);
          if (localLogin) {
            if (rememberMe) {
              localStorage.setItem('renziy_remembered_email', cleanEmail);
            } else {
              localStorage.removeItem('renziy_remembered_email');
            }
            enterAccount(localLogin.role, existingAccount?.name || localLogin.name, localLogin.email);
            return;
          }
          setFormMessage(data?.error || 'The password does not match this account.');
          return;
        } catch (err) {
          console.warn('Server login unavailable:', err);
        }

        const localLogin = await verifyLocalLogin(selectedRole, cleanEmail, password);
        if (localLogin) {
          if (rememberMe) {
            localStorage.setItem('renziy_remembered_email', cleanEmail);
          } else {
            localStorage.removeItem('renziy_remembered_email');
          }
          enterAccount(localLogin.role, existingAccount?.name || localLogin.name, localLogin.email);
          return;
        }

        setFormMessage('The password does not match this account, and the secure login service could not verify it.');
        return;
      }

      if (selectedRole === 'admin') {
        setFormMessage('Owner accounts are created only by the Renziy server. Use the owner sign-in tab.');
        return;
      }

      if (password.length < 6) {
        setFormMessage('Choose a password with at least 6 characters.');
        return;
      }

      if (!fullName.trim()) {
        setFormMessage('Enter the account holder name before creating the account.');
        return;
      }

      if (existingAccount) {
        setFormMessage('This email already has that account type. Please sign in instead.');
        return;
      }

      const created = await registerMember({
        role: selectedRole,
        name: fullName.trim(),
        phone: phone || 'Pending',
        email: cleanEmail,
        password,
        avatarUrl: defaultAvatar,
        propertyName: selectedRole === 'landlord' ? propertyName.trim() || 'New landlord portfolio' : propertyName.trim() || 'Pending assignment',
        unitNumber: selectedRole === 'tenant' ? unitNumber.trim() || 'Pending assignment' : undefined,
        rentAmount: selectedRole === 'tenant' ? 0 : undefined,
        specialty: selectedRole === 'worker' ? propertyName.trim() || 'General maintenance' : undefined
      });

      if (selectedRole === 'landlord') {
        createStarterPortfolio(cleanEmail, fullName.trim());
      }

      await rememberLocalLogin(created.role, created.email, created.name, password);
      enterAccount(created.role, created.name, created.email);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen text-slate-100 font-sans overflow-x-hidden relative bg-cover bg-center bg-no-repeat bg-fixed bg-slate-950"
      style={{
        backgroundImage: "linear-gradient(to bottom, rgba(15, 23, 42, 0.34), rgba(15, 23, 42, 0.78)), url('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=80')"
      }}
    >
      <nav className="flex justify-between items-center gap-3 px-3 sm:px-4 md:px-10 min-h-16 w-full fixed top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800 shadow-lg">
        <button className="flex items-center gap-2.5 cursor-pointer text-left" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="bg-emerald-500/15 p-1.5 rounded-lg border border-emerald-500/20 text-emerald-400">
            <Building2 className="h-5 w-5" />
          </div>
          <span className="font-extrabold text-2xl text-white tracking-tight">Renziy</span>
        </button>

        <button
          onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="bg-white/10 hover:bg-white/20 text-white border border-white/15 px-3 sm:px-4 py-2 rounded-xl font-bold text-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
        >
          <span>Account Login</span>
          <ArrowRight className="h-3 w-3 text-emerald-400" />
        </button>
      </nav>

      <main className="pt-20">
        <section className="relative min-h-[650px] flex flex-col lg:flex-row items-center justify-center px-4 md:px-10 max-w-7xl mx-auto gap-10 pt-8 lg:pt-16 pb-12">
          <div className="w-full lg:w-1/2 space-y-6 text-center lg:text-left z-10">
            <div className="inline-flex max-w-full items-center justify-center gap-2 bg-slate-950/85 text-emerald-100 border border-white/20 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider mb-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md text-center leading-relaxed">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Corporate rental management access</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight tracking-tight drop-shadow-md">
                <span className="block text-white">Manage rentals</span>
                <span className="block text-emerald-400">with a real</span>
                <span className="block">
                  <span className="text-white">Renziy </span>
                  <span className="text-emerald-400">account.</span>
                </span>
              </h1>
              <p className="text-sm md:text-base text-slate-100 max-w-xl mx-auto lg:mx-0 leading-relaxed font-semibold drop-shadow-lg">
                Create a tenant or landlord account, sign in securely, and access only the workspace connected to that account type.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                ['Separate roles', 'Tenant, landlord, and worker accounts stay isolated.'],
                ['Saved profiles', 'New members are stored in the platform registry.'],
                ['Kenya ready', 'Homes, payments, maps, and maintenance in one place.']
              ].map(([title, body]) => (
                <div key={title} className="bg-slate-950/75 border border-slate-800 rounded-2xl p-4 text-left">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 mb-2" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">{title}</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-1">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <div id="auth-section" className="w-full lg:w-1/2">
            <div className="bg-slate-950/88 backdrop-blur-md rounded-[2rem] p-5 md:p-7 border border-slate-800 shadow-2xl">
              <div className="flex gap-2 p-1 bg-slate-900 rounded-2xl border border-slate-800 mb-5">
                {(['tenant', 'landlord', 'worker', 'admin'] as AccountRole[]).map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role);
                      setResetDelivery(null);
                      setResetCode('');
                      setShowPassword(false);
                      setShowConfirmPassword(false);
                      if (role === 'admin' && authMode === 'signup') {
                        setAuthMode('signin');
                      }
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${selectedRole === role ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                  >
                    {accountRoleLabel(role)}
                  </button>
                ))}
              </div>

              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                    {selectedRole === 'admin' ? 'App owner access' : selectedRole === 'tenant' ? 'Resident access' : selectedRole === 'landlord' ? 'Owner access' : 'Worker access'}
                  </span>
                  <h2 className="text-2xl font-extrabold text-white mt-1">
                    {authMode === 'signin' ? 'Sign in to your account' : authMode === 'reset' ? 'Reset your password' : 'Create your account'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {authMode === 'signin'
                      ? 'Use the same role you selected when creating the account.'
                      : authMode === 'reset'
                        ? 'We will send a reset code to the email and phone saved on your account.'
                        : 'Choose tenant, landlord, or worker before submitting.'}
                  </p>
                </div>
                <div className="hidden sm:flex h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 items-center justify-center text-emerald-400">
                  {selectedRole === 'admin' ? <ShieldCheck className="h-6 w-6" /> : selectedRole === 'tenant' ? <Home className="h-6 w-6" /> : selectedRole === 'landlord' ? <Building2 className="h-6 w-6" /> : <HardHat className="h-6 w-6" />}
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleAuthSubmit}>
                {authMode === 'signup' && (
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest px-1">Full name</span>
                    <span className="flex items-center border border-slate-800 rounded-xl p-3 focus-within:border-emerald-500 bg-slate-900 transition-all">
                      <UserRound className="h-4 w-4 text-slate-500 mr-3" />
                      <input className="w-full bg-transparent text-xs text-white font-bold focus:outline-none" value={fullName} onChange={event => setFullName(event.target.value)} placeholder="Your official name" required />
                    </span>
                  </label>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {authMode === 'signup' && (
                    <label className="block space-y-1">
                      <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest px-1">Phone</span>
                      <span className="flex items-center border border-slate-800 rounded-xl p-3 focus-within:border-emerald-500 bg-slate-900 transition-all">
                        <Phone className="h-4 w-4 text-slate-500 mr-3" />
                        <input className="w-full bg-transparent text-xs text-white font-bold focus:outline-none" value={phone} onChange={handlePhoneInputChange} placeholder="0712345678" required />
                      </span>
                    </label>
                  )}

                  {authMode === 'signup' && (
                    <label className="block space-y-1">
                      <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest px-1">{selectedRole === 'tenant' ? 'Apartment / unit' : selectedRole === 'landlord' ? 'Portfolio name' : 'Trade / specialty'}</span>
                      <span className="flex items-center border border-slate-800 rounded-xl p-3 focus-within:border-emerald-500 bg-slate-900 transition-all">
                        <MapPin className="h-4 w-4 text-slate-500 mr-3" />
                        <input className="w-full bg-transparent text-xs text-white font-bold focus:outline-none" value={selectedRole === 'tenant' ? unitNumber : propertyName} onChange={event => selectedRole === 'tenant' ? setUnitNumber(event.target.value) : setPropertyName(event.target.value)} placeholder={selectedRole === 'tenant' ? 'Apt 4B or pending' : selectedRole === 'landlord' ? 'My properties' : 'Plumbing, electrical, HVAC...'} />
                      </span>
                    </label>
                  )}
                </div>

                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest px-1">Email address</span>
                  <span className="flex items-center border border-slate-800 rounded-xl p-3 focus-within:border-emerald-500 bg-slate-900 transition-all">
                    <Mail className="h-4 w-4 text-slate-500 mr-3" />
                    <input className="w-full bg-transparent text-xs text-white font-bold focus:outline-none" value={email} onChange={event => {
                      setEmail(event.target.value);
                      setResetDelivery(null);
                      setResetCode('');
                    }} placeholder="you@example.com" type="email" required />
                  </span>
                </label>

                {(authMode !== 'reset' || resetDelivery) && (
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest px-1">{authMode === 'reset' ? 'New password' : 'Password'}</span>
                    <span className="flex items-center border border-slate-800 rounded-xl p-3 focus-within:border-emerald-500 bg-slate-900 transition-all">
                      <Lock className="h-4 w-4 text-slate-500 mr-3" />
                      <input className="w-full bg-transparent text-xs text-white font-bold focus:outline-none" value={password} onChange={event => setPassword(event.target.value)} placeholder={authMode === 'reset' ? 'New password' : 'Enter password'} type={showPassword ? 'text' : 'password'} required />
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        className="ml-3 text-slate-400 hover:text-white transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </span>
                  </label>
                )}

                {authMode === 'signin' && (
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 cursor-pointer">
                    <span className="flex items-center gap-3">
                      <input
                        checked={rememberMe}
                        onChange={event => setRememberMe(event.target.checked)}
                        type="checkbox"
                        className="h-4 w-4 accent-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-200">Remember me</span>
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Saved email</span>
                  </label>
                )}

                {authMode === 'reset' && resetDelivery && (
                  <>
                    {resetDelivery.resetCode && (
                      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Recovery code</span>
                        <p className="mt-1 text-2xl font-black tracking-widest text-white">{resetDelivery.resetCode}</p>
                        <p className="mt-1 text-[10px] font-bold text-slate-300">
                          Sent to {resetDelivery.email} and {resetDelivery.phone}. This code expires in 10 minutes.
                        </p>
                      </div>
                    )}
                    <label className="block space-y-1">
                      <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest px-1">Reset code</span>
                      <span className="flex items-center border border-slate-800 rounded-xl p-3 focus-within:border-emerald-500 bg-slate-900 transition-all">
                        <Mail className="h-4 w-4 text-slate-500 mr-3" />
                        <input className="w-full bg-transparent text-xs text-white font-bold focus:outline-none" value={resetCode} onChange={event => setResetCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" inputMode="numeric" required />
                      </span>
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest px-1">Confirm new password</span>
                      <span className="flex items-center border border-slate-800 rounded-xl p-3 focus-within:border-emerald-500 bg-slate-900 transition-all">
                        <Lock className="h-4 w-4 text-slate-500 mr-3" />
                        <input className="w-full bg-transparent text-xs text-white font-bold focus:outline-none" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Repeat new password" type={showConfirmPassword ? 'text' : 'password'} required />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(prev => !prev)}
                          className="ml-3 text-slate-400 hover:text-white transition-colors"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                          title={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </span>
                    </label>
                  </>
                )}

                {formMessage && (
                  <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-xs font-bold text-amber-100">
                    {formMessage}
                  </div>
                )}

                <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 py-3 rounded-xl font-black active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer">
                  <span>{loading ? 'Processing...' : authMode === 'signin' ? 'Sign In' : authMode === 'reset' ? resetDelivery ? 'Reset Password' : 'Send Reset Code' : 'Create Account'}</span>
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              <div className="mt-5 pt-5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormMessage('');
                      setResetDelivery(null);
                      setResetCode('');
                      setPassword('');
                      setConfirmPassword('');
                      setShowPassword(false);
                      setShowConfirmPassword(false);
                      if (selectedRole === 'admin' && authMode === 'signin') {
                        setFormMessage('Owner access is created on the server. Sign in with the owner login details.');
                        return;
                      }
                      setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                    }}
                    className="text-xs text-emerald-400 font-bold hover:underline text-left"
                  >
                    {authMode === 'signin' ? 'Create a new account' : 'Already have an account? Sign in'}
                  </button>
                  {authMode !== 'signup' && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormMessage('');
                        setResetDelivery(null);
                        setResetCode('');
                        setPassword('');
                        setConfirmPassword('');
                        setShowPassword(false);
                        setShowConfirmPassword(false);
                        setAuthMode(authMode === 'reset' ? 'signin' : 'reset');
                      }}
                      className="text-xs text-slate-300 font-bold hover:text-white hover:underline text-left"
                    >
                      {authMode === 'reset' ? 'Back to sign in' : 'Forgot password?'}
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">
                  {accountsForRole.length} {selectedRole} account{accountsForRole.length === 1 ? '' : 's'} registered
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 px-4 md:px-10 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            [Smartphone, 'Tenant payments', 'Residents can access rent, M-Pesa actions, repairs, and assigned home details.'],
            [BarChart3, 'Landlord operations', 'Owners can manage properties, residents, maintenance, listings, and settlement setup.'],
            [HardHat, 'Worker dispatch', 'Maintenance teams can receive repair jobs and update progress from their own portal.']
          ].map(([Icon, title, body]) => {
            const IconComponent = Icon as typeof Smartphone;
            return (
              <div key={title as string} className="bg-slate-950/82 border border-slate-800 rounded-3xl p-6">
                <IconComponent className="h-6 w-6 text-emerald-400" />
                <h3 className="text-lg font-black text-white mt-4">{title as string}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">{body as string}</p>
              </div>
            );
          })}
        </section>

        <section id="faq" className="px-4 md:px-10 pb-14 max-w-7xl mx-auto">
          <div className="bg-slate-950/82 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 text-emerald-300 text-[10px] font-black uppercase tracking-widest">
                <HelpCircle className="h-4 w-4" />
                FAQ
              </div>
              <h2 className="text-2xl font-black text-white mt-3">Understand Renziy before you sign in.</h2>
              <p className="text-sm text-slate-400 leading-relaxed mt-2">
                Quick answers about rent payments, landlord tools, worker dispatch, smart locks, and account recovery.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
              {[
                ['Who uses Renziy?', 'Tenants, landlords, and maintenance workers each get a separate workspace.'],
                ['Can tenants pay rent?', 'Tenants can view balances and start M-Pesa or card rent payments from their portal.'],
                ['What can landlords manage?', 'Landlords can manage properties, units, tenants, repairs, locks, and payout details.'],
                ['How does password reset work?', 'A reset code is sent to the email and phone saved on the account.']
              ].map(([question, answer]) => (
                <details key={question} className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <summary className="cursor-pointer text-xs font-black text-white list-none flex items-center justify-between gap-3">
                    <span>{question}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-emerald-400 transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-3">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950/90 text-slate-300 py-8 px-4 md:px-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-4 text-xs text-slate-500">
          <span>Renziy Property Management</span>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <a href="#faq" className="text-emerald-400 font-bold hover:text-emerald-300 hover:underline">FAQs</a>
            <span>Corporate tenant and landlord access for Kenya rental operations.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
