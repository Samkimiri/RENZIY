import React, { useEffect, useMemo, useState } from 'react';
import { useRenziy } from '../state';
import { ArrowRight, BarChart3, Building2, CheckCircle2, Home, Lock, Mail, MapPin, Phone, ShieldCheck, Smartphone, UserRound } from 'lucide-react';

type AccountMode = 'signin' | 'signup';
type AccountRole = 'landlord' | 'tenant';
type GoogleCredentialResponse = { credential?: string };
type GoogleProfile = { email?: string; name?: string; picture?: string };

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const defaultAvatar = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOcbVtz4Nz5aTDAR2DZW9Pg9F6e65oPi6Td2jZ84CEwLXgn5HrvYocGZaVvLRdcS9eUaqLENJ27o2RqpElz14uBPV47JROuDd4JkbKG4lK3vapbE6KOkie8PQbaMTqlvURqdmEzyOUTLS-bssVrQp56st-qoqgO1NFNrdLvXPdL5SwnjZzSChp5a_s4toIffdm_8W02EPKg7MLqi3poWL6UDKib0nkwFBjpcLb7YMRsPtiVkMFt4jFzqbDf0SOuGuynYq7GjnWhyHB';

const normalizeEmail = (value: string) => value.trim().toLowerCase();

export default function LandingPage() {
  const { members, registerMember, setRole, setUsername, addProperty } = useRenziy();
  const [authMode, setAuthMode] = useState<AccountMode>('signin');
  const [selectedRole, setSelectedRole] = useState<AccountRole>('tenant');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGooglePanel, setShowGooglePanel] = useState(false);
  const [googleName, setGoogleName] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const googleClientId = (import.meta as unknown as { env?: { VITE_GOOGLE_CLIENT_ID?: string } }).env?.VITE_GOOGLE_CLIENT_ID;

  const accountsForRole = useMemo(
    () => members.filter(member => member.role === selectedRole),
    [members, selectedRole]
  );

  const handlePhoneInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, '');
    setPhone(digits.slice(0, 12));
  };

  const enterAccount = (role: AccountRole, name: string, accountEmail: string) => {
    localStorage.setItem('renziy_user_email', accountEmail);
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
      town: 'Pending update',
      neighborhood: 'Pending update',
      description: 'New landlord portfolio pending property details.',
      amenities: ['Security', 'Water', 'Parking'],
      contactPhone: phone || 'Pending',
      mapQuery: propertyName.trim() || ownerName,
      availableForMarketplace: false,
      ownerEmail
    });
  };

  const continueWithGoogleProfile = async (profile: GoogleProfile) => {
    const cleanEmail = normalizeEmail(profile.email || googleEmail);
    const cleanName = (profile.name || googleName || cleanEmail.split('@')[0] || 'Google User').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFormMessage('Enter a valid Google email address to continue.');
      return;
    }

    setGoogleLoading(true);
    setFormMessage('');

    try {
      const existingAccount = members.find(member => member.email.toLowerCase() === cleanEmail && member.role === selectedRole);
      if (existingAccount) {
        enterAccount(existingAccount.role, existingAccount.name, existingAccount.email);
        return;
      }

      const created = await registerMember({
        role: selectedRole,
        name: cleanName,
        phone: phone || 'Google account',
        email: cleanEmail,
        password: 'google-account',
        avatarUrl: profile.picture || defaultAvatar,
        propertyName: selectedRole === 'landlord' ? propertyName.trim() || 'New landlord portfolio' : propertyName.trim() || 'Pending assignment',
        unitNumber: selectedRole === 'tenant' ? unitNumber.trim() || 'Pending assignment' : undefined,
        rentAmount: selectedRole === 'tenant' ? 0 : undefined
      });

      if (selectedRole === 'landlord') {
        createStarterPortfolio(cleanEmail, cleanName);
      }

      enterAccount(created.role, created.name, created.email);
    } finally {
      setGoogleLoading(false);
    }
  };

  const decodeGoogleCredential = (credential: string): GoogleProfile => {
    try {
      const payload = credential.split('.')[1];
      return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
      return {};
    }
  };

  useEffect(() => {
    if (!googleClientId || window.google?.accounts?.id) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, [googleClientId]);

  const handleGoogleContinue = () => {
    if (!googleClientId || !window.google?.accounts?.id) {
      setShowGooglePanel(true);
      setFormMessage('Google sign-in is available. Enter your Google account details to continue in this preview build.');
      return;
    }

    setGoogleLoading(true);
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async (response) => {
        if (!response.credential) {
          setGoogleLoading(false);
          setFormMessage('Google did not return account details. Please try again.');
          return;
        }
        await continueWithGoogleProfile(decodeGoogleCredential(response.credential));
      }
    });
    window.google.accounts.id.prompt();
    setGoogleLoading(false);
  };

  const handleAuthSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormMessage('');
    setLoading(true);

    const cleanEmail = normalizeEmail(email);
    const existingAccount = members.find(member => member.email.toLowerCase() === cleanEmail && member.role === selectedRole);

    try {
      if (authMode === 'signin') {
        if (!existingAccount) {
          setFormMessage('No account was found for that email and account type. Create the account first.');
          return;
        }

        if (existingAccount.password && existingAccount.password !== password) {
          setFormMessage('The password does not match this account.');
          return;
        }

        enterAccount(existingAccount.role, existingAccount.name, existingAccount.email);
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
        rentAmount: selectedRole === 'tenant' ? 0 : undefined
      });

      if (selectedRole === 'landlord') {
        createStarterPortfolio(cleanEmail, fullName.trim());
      }

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
                Manage rentals with a real Renziy account.
              </h1>
              <p className="text-sm md:text-base text-slate-100 max-w-xl mx-auto lg:mx-0 leading-relaxed font-semibold drop-shadow-lg">
                Create a tenant or landlord account, sign in securely, and access only the workspace connected to that account type.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                ['Separate roles', 'Tenant and landlord accounts stay isolated.'],
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
                {(['tenant', 'landlord'] as AccountRole[]).map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${selectedRole === role ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                  >
                    {role === 'tenant' ? 'Tenant' : 'Landlord'}
                  </button>
                ))}
              </div>

              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                    {selectedRole === 'tenant' ? 'Resident access' : 'Owner access'}
                  </span>
                  <h2 className="text-2xl font-extrabold text-white mt-1">
                    {authMode === 'signin' ? 'Sign in to your account' : 'Create your account'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {authMode === 'signin'
                      ? 'Use the same role you selected when creating the account.'
                      : 'Choose tenant or landlord before submitting.'}
                  </p>
                </div>
                <div className="hidden sm:flex h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 items-center justify-center text-emerald-400">
                  {selectedRole === 'tenant' ? <Home className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
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
                      <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest px-1">{selectedRole === 'tenant' ? 'Apartment / unit' : 'Portfolio name'}</span>
                      <span className="flex items-center border border-slate-800 rounded-xl p-3 focus-within:border-emerald-500 bg-slate-900 transition-all">
                        <MapPin className="h-4 w-4 text-slate-500 mr-3" />
                        <input className="w-full bg-transparent text-xs text-white font-bold focus:outline-none" value={selectedRole === 'tenant' ? unitNumber : propertyName} onChange={event => selectedRole === 'tenant' ? setUnitNumber(event.target.value) : setPropertyName(event.target.value)} placeholder={selectedRole === 'tenant' ? 'Apt 4B or pending' : 'My properties'} />
                      </span>
                    </label>
                  )}
                </div>

                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest px-1">Email address</span>
                  <span className="flex items-center border border-slate-800 rounded-xl p-3 focus-within:border-emerald-500 bg-slate-900 transition-all">
                    <Mail className="h-4 w-4 text-slate-500 mr-3" />
                    <input className="w-full bg-transparent text-xs text-white font-bold focus:outline-none" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" type="email" required />
                  </span>
                </label>

                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest px-1">Password</span>
                  <span className="flex items-center border border-slate-800 rounded-xl p-3 focus-within:border-emerald-500 bg-slate-900 transition-all">
                    <Lock className="h-4 w-4 text-slate-500 mr-3" />
                    <input className="w-full bg-transparent text-xs text-white font-bold focus:outline-none" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter password" type="password" required />
                  </span>
                </label>

                {formMessage && (
                  <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-xs font-bold text-amber-100">
                    {formMessage}
                  </div>
                )}

                <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 py-3 rounded-xl font-black active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer">
                  <span>{loading ? 'Processing...' : authMode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-800" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">or</span>
                <div className="h-px flex-1 bg-slate-800" />
              </div>

              <button
                type="button"
                onClick={handleGoogleContinue}
                disabled={googleLoading}
                className="w-full bg-white hover:bg-slate-100 disabled:bg-slate-300 text-slate-900 py-3 rounded-xl font-black active:scale-95 transition-all flex items-center justify-center gap-3 shadow-lg cursor-pointer"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white border border-slate-200 text-sm font-black">
                  G
                </span>
                <span>{googleLoading ? 'Connecting Google...' : `Continue with Google as ${selectedRole}`}</span>
              </button>

              {showGooglePanel && (
                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-black text-white">Google account details</h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      This preview stores your Google email in Renziy so you can access the selected {selectedRole} workspace.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                      value={googleName}
                      onChange={event => setGoogleName(event.target.value)}
                      placeholder="Google account name"
                    />
                    <input
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                      value={googleEmail}
                      onChange={event => setGoogleEmail(event.target.value)}
                      placeholder="name@gmail.com"
                      type="email"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => continueWithGoogleProfile({ name: googleName, email: googleEmail })}
                    disabled={googleLoading}
                    className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-400 transition-all"
                  >
                    Continue with this Google account
                  </button>
                </div>
              )}

              <div className="mt-5 pt-5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} className="text-xs text-emerald-400 font-bold hover:underline text-left">
                  {authMode === 'signin' ? 'Create a new account' : 'Already have an account? Sign in'}
                </button>
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
            [ShieldCheck, 'Account separation', 'The portal no longer lets a signed-in user jump into another role from the header.']
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
      </main>

      <footer className="bg-slate-950/90 text-slate-300 py-8 px-4 md:px-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-4 text-xs text-slate-500">
          <span>Renziy Property Management</span>
          <span>Corporate tenant and landlord access for Kenya rental operations.</span>
        </div>
      </footer>
    </div>
  );
}
