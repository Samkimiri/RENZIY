import React, { useState } from 'react';
import { useRenziy } from '../state';
import { motion } from 'motion/react';
import { Building2, Home, ArrowRight, Star, Phone, Mail, Lock, CheckCircle2, ChevronRight, Smartphone, Settings2, BarChart3, HelpCircle, Gamepad2 } from 'lucide-react';
import OnboardingWizard from './OnboardingWizard';

export default function LandingPage() {
  const { setRole, setUsername } = useRenziy();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [userRoleSelection, setUserRoleSelection] = useState<'landlord' | 'tenant'>('landlord');
  
  // Immersive step-by-step onboarding trigger (launches on first layout visit)
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('renziy_game_stats');
  });

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Clear non-digits
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 9) {
      setPhone(val);
    }
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Rather than bypass, trigger the onboarding wizard for custom specs
    setShowOnboarding(true);
  };

  const selectSocialLogin = (roleSel: 'landlord' | 'tenant') => {
    // Open onboarding custom stats wizard pre-selected to their choice
    setShowOnboarding(true);
  };

  if (showOnboarding) {
    return <OnboardingWizard onClose={() => setShowOnboarding(false)} />;
  }

  return (
    <div 
      className="min-h-screen text-slate-100 font-sans overflow-x-hidden pb-12 relative bg-cover bg-center bg-no-repeat bg-fixed bg-slate-950"
      style={{ 
        backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.20), rgba(15, 23, 42, 0.35)), url('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=80')`
      }}
    >
      {/* Top Navbar */}
      <nav className="flex justify-between items-center px-4 md:px-10 h-16 w-full fixed top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 shadow-lg">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="bg-emerald-500/15 p-1.5 rounded-lg border border-emerald-500/20 text-emerald-400">
            <Building2 className="h-5 w-5" />
          </div>
          <span className="font-extrabold text-2xl text-white tracking-tight">Renziy</span>
        </div>
        
        {/* Quick Portal Switchboard Control (The Top Part Selector) */}
        <div className="hidden lg:flex gap-3 items-center bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800 shadow-inner select-none">
          <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider px-3">Gateway Switchboard:</span>
          
          <button 
            onClick={() => selectSocialLogin('landlord')}
            className="text-xs bg-emerald-600 hover:brightness-110 active:scale-95 px-4 py-2 rounded-xl text-white font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            <span>Landlord Executive</span>
          </button>
 
          <button 
            onClick={() => selectSocialLogin('tenant')}
            className="text-xs bg-emerald-600 hover:brightness-110 active:scale-95 px-4 py-2 rounded-xl text-white font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            <span>Tenant Resident</span>
          </button>
        </div>
 
        <div className="flex gap-2 items-center">
          <button 
            onClick={() => {
              const el = document.getElementById('auth-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/15 px-4 py-2 rounded-xl font-bold text-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
          >
            <span>Credentials Log In</span>
            <ArrowRight className="h-3 w-3 text-emerald-400" />
          </button>
        </div>
      </nav>

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative min-h-[660px] flex flex-col lg:flex-row items-center justify-center px-4 md:px-10 max-w-7xl mx-auto gap-12 pt-8 lg:pt-16 pb-12">
          {/* Left Hero Content with Prominent App Name & Gorgeous Typography */}
          <div className="w-full lg:w-1/2 space-y-6 text-center lg:text-left z-10">
            <div className="inline-flex items-center gap-2 bg-emerald-400/15 text-emerald-400 border border-emerald-400/25 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span>Smart African Real Estate Operating System</span>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight tracking-tight drop-shadow-md">
                Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 drop-shadow-[0_2px_15px_rgba(5,150,105,0.35)]">Renziy</span>
              </h1>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-150 tracking-tight leading-none drop-shadow-sm">
                Rent, fully managed.
              </h2>
            </div>
            
            <p className="text-sm md:text-base text-slate-105 max-w-xl mx-auto lg:mx-0 leading-relaxed font-semibold drop-shadow-lg text-slate-100">
              We automate invoicing, streamline rent collections via M-Pesa STK push, log repairs, and secure doors with keyless IoT Smart Locks. Experience premium living at its peak.
            </p>
            
            {/* Professional Gateway Console Card (Single-Click Bypass Access) */}
            <div className="bg-slate-950/75 backdrop-blur-md rounded-3xl p-5 border border-slate-800/80 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-dashed border-slate-800 pb-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Quick Bypass Gateways (Select to enter)
                </span>
                <span className="text-[9px] font-bold text-slate-400">No Password Required</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Landlord Entry Option */}
                <div 
                  onClick={() => selectSocialLogin('landlord')}
                  className="group bg-gradient-to-br from-slate-900 to-slate-950 hover:from-slate-850 hover:to-slate-900 border border-slate-800 hover:border-emerald-400/45 text-white p-4.5 rounded-2xl cursor-pointer hover:shadow-[0_0_20px_rgba(5,150,105,0.1)] hover:scale-[1.02] transition-all relative overflow-hidden flex flex-col justify-between"
                  style={{ minHeight: '145px' }}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <span className="text-[9px] font-bold bg-emerald-500/20 text-[#6ee7b7] px-2 py-0.5 rounded-full uppercase tracking-wide">john doe</span>
                    </div>
                    <h3 className="font-extrabold text-sm tracking-tight text-white block">Landlord Console</h3>
                    <p className="text-[10px] text-slate-300 leading-snug">Manage properties, view annual yield indicators, and authorize Smart Locks.</p>
                  </div>
                  
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                    <span>Enter Portal</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>

                {/* Tenant Entry Option */}
                <div 
                  onClick={() => selectSocialLogin('tenant')}
                  className="group bg-gradient-to-br from-slate-900 to-slate-950 hover:from-slate-850 hover:to-slate-900 border border-slate-800 hover:border-emerald-400/40 text-white p-4.5 rounded-2xl cursor-pointer hover:shadow-[0_0_20px_rgba(5,150,105,0.1)] hover:scale-[1.02] transition-all relative overflow-hidden flex flex-col justify-between"
                  style={{ minHeight: '145px' }}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
                        <Home className="h-5 w-5" />
                      </div>
                      <span className="text-[9px] font-bold bg-emerald-500/20 text-[#6ee7b7] px-2 py-0.5 rounded-full uppercase tracking-wide">alex smith</span>
                    </div>
                    <h3 className="font-extrabold text-sm tracking-tight text-white">Tenant Portal</h3>
                    <p className="text-[10px] text-slate-300 leading-snug">Process direct M-Pesa STK, submit repair photos, or view IoT locks.</p>
                  </div>
                  
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                    <span>Enter Portal</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </div>

              {/* Extra professional helper */}
              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                Want to register a custom dashboard? Scroll to the <a href="#auth-section" className="underline font-bold text-emerald-400 hover:brightness-110">credentials form below</a>.
              </p>
            </div>
          </div>

          {/* Right Hero Image Column representing Nairobi's finest real estate */}
          <div className="w-full lg:w-1/2 relative h-[380px] md:h-[500px] overflow-hidden rounded-[2rem] border border-slate-800 shadow-2xl bg-slate-950 group">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent z-10" />
            <img 
              alt="Modern contemporary luxury rental house architecture" 
              className="w-full h-full object-cover brightness-90 group-hover:scale-105 transition-transform duration-700" 
              src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80" 
            />
            {/* Overlay Card: Social Proof */}
            <div className="absolute bottom-4 left-4 right-4 bg-slate-905/90 backdrop-blur-md p-4 rounded-2xl flex items-center gap-4 border border-slate-800 shadow-2xl z-20">
              <div className="flex -space-x-3">
                <img 
                  className="w-10 h-10 rounded-full border-2 border-slate-950 object-cover" 
                  alt="Young woman tenant"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJHVo0ItxDNtrPxpJuxF999eQZucYzjmp0FkGpIYOanfo6M9-A4ZOJA5WDXwl3BJercA3TJr8HMQkC8qclrIRXsfWq9vQzKlZdn4H2RnsJMW-LvnTIi1V3Fb8LBlHwPSSqo4081zjw-TzQh7BUvrgMTA9Mtiz4FrjXNpgFKC_-sKBl3GcZ6SQhn2r72tpsFvWeu_lHBz6EmHHBcVpZ0k3ZCEE7I2yt_X3nz4ZUt4T1WZejTYSTS-UCBLF2frZjOSESxO1iWRb2BTnR" 
                />
                <img 
                  className="w-10 h-10 rounded-full border-2 border-slate-950 object-cover" 
                  alt="Landlord owner"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRxmlZiyPxhMA9KhxxEY-ZornwU45XOarKthi5rZwjaUXVYAzK1Rptwz3XSUMih-aX7N40cr2Ki-5KZvD7pUHT8xTTKjuQMyyucNGma4FaFJirfRO8Nmxdo7wvHhgJnJDxwkPMa5NOJdwGCIEP9IoZoEnvk7HAYZ8jfseOFIDZ7L5DKDb2LTYFaZymzBJ-SYm2ragI8Q_dxp6yzf6AjtEmLdC6yZGqnU2ZCun5dcEqufGWVNNfnsQoC1JyHXHZfKXLK1rfwMLmEMPm" 
                />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-xs uppercase text-slate-200 tracking-wider">Trusted by 2,000+ Smart Users</span>
                <div className="flex text-amber-400 items-center gap-0.5 mt-0.5">
                  <Star className="h-3 w-3 fill-current" />
                  <Star className="h-3 w-3 fill-current" />
                  <Star className="h-3 w-3 fill-current" />
                  <Star className="h-3 w-3 fill-current" />
                  <Star className="h-3 w-3 fill-current" />
                  <span className="text-xs font-bold text-emerald-400 ml-2">5.0 Star Rating</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Auth Section & Features Section */}
        <section className="py-16 bg-slate-950/70 backdrop-blur-md border-t border-b border-slate-800 px-4 md:px-10" id="auth-section">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Signin Form Card (Transparent Dark Glassmorphic Style) */}
            <div className="lg:col-span-5 bg-slate-900/60 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-slate-800 shadow-2xl flex flex-col justify-between" id="auth-card">
              <div className="space-y-4">
                <div className="flex gap-2 p-1 bg-slate-950/90 rounded-xl border border-slate-800">
                  <button 
                    onClick={() => setUserRoleSelection('landlord')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${userRoleSelection === 'landlord' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                  >
                    I am a Landlord
                  </button>
                  <button 
                    onClick={() => setUserRoleSelection('tenant')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${userRoleSelection === 'tenant' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                  >
                    I am a Tenant
                  </button>
                </div>

                <div className="text-center md:text-left">
                  <h2 className="text-2xl font-extrabold text-white">
                    {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {authMode === 'signin' 
                      ? `Access your secure ${userRoleSelection} dashboards.` 
                      : 'Step into seamless rental automated ledgers.'}
                  </p>
                </div>

                <form className="space-y-4 pt-2 text-left" onSubmit={handleAuthSubmit}>
                  {authMode === 'signup' && (
                    <div className="space-y-1 bg-transparent">
                      <label className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest px-1">KE Phone Number</label>
                      <div className="flex items-center border border-slate-800 rounded-xl p-3 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 bg-slate-950 transition-all">
                        <span className="text-xs font-bold text-[#6ee7b7] pr-3 border-r border-slate-850 mr-3">+254</span>
                        <input 
                          className="w-full bg-transparent border-none p-0 focus:ring-0 text-xs focus:outline-none text-white font-bold" 
                          placeholder="712 345 678" 
                          type="tel"
                          value={phone}
                          onChange={handlePhoneInputChange}
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 bg-transparent">
                  <label className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest px-1">Email address</label>
                    <div className="flex items-center border border-slate-800 rounded-xl p-3 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 bg-slate-950 transition-all">
                      <Mail className="h-4 w-4 text-slate-500 mr-3" />
                      <input 
                        className="w-full bg-transparent border-none p-0 focus:ring-0 text-xs focus:outline-none text-white font-bold" 
                        placeholder="yourname@domain.com" 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1 bg-transparent">
                    <label className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest px-1">Password</label>
                    <div className="flex items-center border border-slate-800 rounded-xl p-3 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 bg-slate-950 transition-all">
                      <Lock className="h-4 w-4 text-slate-500 mr-3" />
                      <input 
                        className="w-full bg-transparent border-none p-0 focus:ring-0 text-xs focus:outline-none text-white font-bold" 
                        placeholder="••••••••" 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-500 hover:bg-emerald-700 text-black py-3 rounded-xl font-black active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 shadow-lg cursor-pointer animate-pulse"
                  >
                    {loading ? (
                      <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <span>{authMode === 'signin' ? 'Sign In and Enter' : 'Get Started'}</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-500"><span className="bg-[#0b1423] px-3">or join instantly via</span></div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={() => selectSocialLogin(userRoleSelection)}
                    className="w-full border border-slate-800 bg-slate-950 py-3 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-900 active:scale-95 transition-all text-xs text-white font-bold cursor-pointer"
                  >
                    <Gamepad2 className="h-4 w-4 text-emerald-400 animate-pulse" />
                    <span>Launch Onboarding Quest</span>
                  </button>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-850 text-center mt-6">
                <span className="text-xs text-slate-400">
                  {authMode === 'signin' ? "Don't have an account? " : "Already registered? "}
                  <button 
                    onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                    className="text-emerald-400 font-bold hover:underline"
                  >
                    {authMode === 'signin' ? 'Sign up' : 'Log in'}
                  </button>
                </span>
              </div>
            </div>

            {/* Right Side: Bento Info Grid with Dark Theme Adjustments */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4" id="features">
              {/* Feature 1: M-Pesa */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-3xl flex flex-col justify-between overflow-hidden relative group border border-slate-800 hover:border-emerald-500/30 transition-all">
                <div className="z-10 space-y-3 text-left">
                  <div className="bg-emerald-500/10 w-fit p-2.5 rounded-xl border border-emerald-500/20">
                    <Smartphone className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">M-Pesa Core STK</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Instantly trigger live STK pushes to tenant smart devices. Fast reconciliation directly connected to mobile money infrastructure.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs text-emerald-400 font-bold gap-1 cursor-pointer">
                  <span>Learn mechanics</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </div>

              {/* Feature 2: Smart Maintenance */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-3xl flex flex-col justify-between group border border-slate-800 hover:border-emerald-500/30 transition-all">
                <div className="space-y-3 text-left">
                  <div className="bg-emerald-500/10 w-fit p-2.5 rounded-xl border border-emerald-500/20">
                    <Settings2 className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Rapid Technicians</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Tenants snap smartphone images of fixtures. Dispatch notifications automate, allowing real-time tracking of vetted repair operations.
                  </p>
                </div>
                <div className="mt-4 flex -space-x-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 border-2 border-slate-900 flex items-center justify-center text-[10px] text-white font-bold">JD</div>
                  <div className="w-7 h-7 rounded-full bg-emerald-600 border-2 border-slate-900 flex items-center justify-center text-[10px] text-white font-bold">MS</div>
                  <div className="w-7 h-7 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-[8px] text-white font-bold">+12</div>
                </div>
              </div>

              {/* Feature 3: Giant overview card */}
              <div className="sm:col-span-2 bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 border border-slate-800">
                <div className="w-full md:w-1/3 h-36 rounded-2xl overflow-hidden shrink-0 border border-slate-800/80">
                  <img 
                    alt="Analytics real-time dashboard mockup" 
                    className="w-full h-full object-cover brightness-85" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJHVsPCNM8vlseW-5euYjPmlM_McDvTlrK8z0cySc4WNEFSJsFxtY-QyxDqwZuYa9qEmv-7PNAghGwePs1A0kz8RpIxqHRLtc24OvMCBsydO7gdo5JqnVkDjaZz-1k50jOZl78NdWspdcVQyQdtK010umxl767zDMIuGC6wxPwmjaDLOfiTxBGxixIlSTGwUL-Ad6cSlbgp-7NbDPwNQelha3Rh_4hM1d_vfiMnW6I6ctnVP8uD_ltZILFWkLaKG47Mgcr5swe6Z8h" 
                  />
                </div>
                <div className="w-full md:w-2/3 space-y-2 text-left">
                  <div className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <BarChart3 className="h-3 w-3" /> Real-time Operating Logs
                  </div>
                  <h3 className="text-lg font-bold text-white">Visual Performance Panels</h3>
                  <p className="text-xs text-slate-405 leading-relaxed">
                    Simulate and optimize yields based on occupancy levels. Instantly access transaction archives, track historic repair states, and lock down accounts.
                  </p>
                  <div className="flex gap-2 pt-1 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-1 bg-slate-950 text-slate-300 border border-slate-850 rounded-full">ROI projections</span>
                    <span className="text-[10px] font-bold px-2 py-1 bg-slate-950 text-slate-300 border border-slate-850 rounded-full font-mono">Unlock Speed optimization</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Split Section - Two Gorgeous Columns */}
        <section className="py-16 px-4 md:px-10 max-w-7xl mx-auto flex flex-col md:flex-row gap-6" id="solutions">
          <div className="flex-1 bg-slate-900/60 backdrop-blur-md p-8 md:p-10 rounded-[2rem] space-y-6 flex flex-col justify-between border border-slate-800">
            <div className="space-y-4 text-left">
              <span className="text-emerald-400 text-xs font-black uppercase tracking-wider">Passive Multipliers</span>
              <h2 className="text-3xl font-extrabold text-white">Rent Control: Landlords</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Log and monitor historic rental cycles, draft legal lock terms, find premium residents and manage high-yield assets with automated payouts.
              </p>
              <ul className="space-y-2.5 pt-2">
                <li className="flex items-center gap-2.5 text-xs font-semibold text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Verified Financial Ledgers</span>
                </li>
                <li className="flex items-center gap-2.5 text-xs font-semibold text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>IoT Cloud Permissions Config</span>
                </li>
              </ul>
            </div>
            <button 
              onClick={() => {
                setUserRoleSelection('landlord');
                setAuthMode('signup');
                document.getElementById('auth-card')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-emerald-600 text-white px-6 py-3.5 rounded-xl font-black hover:bg-emerald-700 active:scale-95 transition-all text-center text-xs uppercase tracking-wider cursor-pointer shadow-lg"
            >
              Configure Asset Portfolio
            </button>
          </div>

          <div className="flex-1 bg-slate-900/60 backdrop-blur-md p-8 md:p-10 rounded-[2rem] space-y-6 flex flex-col justify-between border border-slate-800">
            <div className="space-y-4 text-left">
              <span className="text-emerald-400 text-xs font-black uppercase tracking-wider">Convenience Engine</span>
              <h2 className="text-3xl font-extrabold text-white">Seamless Living: Tenants</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Pay direct rent bills in 4 seconds with M-Pesa STK push. Generate dynamic IoT smart locks logs and fast maintenance dispatches with visual indicators.
              </p>
              <ul className="space-y-2.5 pt-2">
                <li className="flex items-center gap-2.5 text-xs font-semibold text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>One-Click Checkout (Phone Money)</span>
                </li>
                <li className="flex items-center gap-2.5 text-xs font-semibold text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Mobile Keyless Access Triggers</span>
                </li>
              </ul>
            </div>
            <button 
              onClick={() => {
                setUserRoleSelection('tenant');
                setAuthMode('signup');
                document.getElementById('auth-card')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-6 py-3.5 rounded-xl font-extrabold active:scale-95 transition-all text-center text-xs uppercase tracking-wider cursor-pointer"
            >
              Sign Up Resident Account
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950/90 text-slate-300 py-12 px-4 md:px-10 mt-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-left">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="text-emerald-500 h-6 w-6" />
              <span className="font-extrabold text-2xl tracking-tight text-white">Renziy</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Empowering real estate owners and modern residents across Africa with world-class cloud technologies.
            </p>
          </div>
          
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500">Product</h4>
            <a href="#" className="block text-xs text-slate-400 hover:text-white transition-colors">Properties</a>
            <a href="#" className="block text-xs text-slate-400 hover:text-white transition-colors">For Landlords</a>
            <a href="#" className="block text-xs text-slate-400 hover:text-white transition-colors">For Tenants</a>
          </div>
 
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500">Company</h4>
            <a href="#" className="block text-xs text-slate-400 hover:text-white transition-colors">About Us</a>
            <a href="#" className="block text-xs text-slate-400 hover:text-white transition-colors">Contact</a>
            <a href="#" className="block text-xs text-slate-400 hover:text-white transition-colors">Privacy Policy</a>
          </div>
 
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500">Safety & Compliance</h4>
            <p className="text-xs text-slate-405 leading-relaxed">
              Renziy encrypts financial details using AES-256 secure vaults. PCI-DSS and M-Pesa verified.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
          © 2026 Renziy Technologies. All rights reserved. Built with trust in Nairobi.
        </div>
      </footer>
    </div>
  );
}
