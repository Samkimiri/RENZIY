import React, { useState } from 'react';
import { useRenziy } from '../state';
import { motion } from 'motion/react';
import { Building2, Home, ArrowRight, Star, Phone, Mail, Lock, CheckCircle2, ChevronRight, Smartphone, Settings2, BarChart3, HelpCircle } from 'lucide-react';

export default function LandingPage() {
  const { setRole, setUsername } = useRenziy();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [userRoleSelection, setUserRoleSelection] = useState<'landlord' | 'tenant'>('landlord');

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Clear non-digits
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 9) {
      setPhone(val);
    }
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !phone) return;
    
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Simulate logging in
      if (userRoleSelection === 'tenant') {
        setUsername('Alex');
        setRole('tenant');
      } else {
        setUsername('John Doe');
        setRole('landlord');
      }
    }, 1200);
  };

  const selectSocialLogin = (roleSel: 'landlord' | 'tenant') => {
    if (roleSel === 'tenant') {
      setUsername('Alex');
      setRole('tenant');
    } else {
      setUsername('John Doe');
      setRole('landlord');
    }
  };

  return (
    <div className="bg-[#fcf8fb] min-h-screen text-[#1b1b1d] font-sans overflow-x-hidden pb-12">
      {/* Top Navbar */}
      <nav className="flex justify-between items-center px-4 md:px-10 h-16 w-full fixed top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#e4e2e4]">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <Building2 className="text-[#002645] h-6 w-6" />
          <span className="font-bold text-2xl text-[#002645] tracking-tight">Renziy</span>
        </div>
        
        <div className="hidden md:flex gap-8 items-center">
          <a href="#features" className="text-[#43474e] hover:text-[#002645] font-semibold text-sm transition-colors">Features</a>
          <a href="#solutions" className="text-[#43474e] hover:text-[#002645] font-semibold text-sm transition-colors">Solutions</a>
          <span className="h-4 w-[1px] bg-[#c3c6cf]"></span>
          <button 
            onClick={() => setUserRoleSelection(userRoleSelection === 'landlord' ? 'tenant' : 'landlord')}
            className="text-xs uppercase bg-[#1a3c5e]/10 text-[#002645] px-3 py-1 rounded-full font-bold inline-flex items-center gap-1 hover:bg-[#1a3c5e]/20 transition-all"
          >
            Mode: {userRoleSelection === 'landlord' ? 'Landlord Setup' : 'Tenant Setup'}
          </button>
        </div>

        <button 
          onClick={() => {
            const el = document.getElementById('auth-section');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-[#002645] text-white px-5 py-2 rounded-lg font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-sm"
        >
          Sign In
        </button>
      </nav>

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative min-h-[660px] flex flex-col lg:flex-row items-center justify-center px-4 md:px-10 max-w-7xl mx-auto gap-12 pt-8 lg:pt-16 pb-12">
          <div className="w-full lg:w-1/2 space-y-6 text-center lg:text-left z-10">
            <div className="inline-flex items-center bg-[#67f9b3]/20 text-[#007149] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              🏆 Smart African Real Estate OS
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#002645] leading-tight tracking-tight">
              Rent, managed.
            </h1>
            <p className="text-base md:text-lg text-[#43474e] max-w-xl mx-auto lg:mx-0 leading-relaxed">
              The modern operating system for African real estate. Seamless payments, automated maintenance, and verified tenant matching—all in one smart portal.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button 
                onClick={() => {
                  setUserRoleSelection('landlord');
                  setAuthMode('signup');
                  setTimeout(() => {
                    document.getElementById('auth-card')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className="bg-[#006c45] text-white px-8 py-4 rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Building2 className="h-5 w-5" />
                List Property
              </button>
              <button 
                onClick={() => {
                  setUserRoleSelection('tenant');
                  setAuthMode('signup');
                  setTimeout(() => {
                    document.getElementById('auth-card')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className="border-2 border-[#002645] text-[#002645] px-8 py-4 rounded-xl font-bold bg-[#002645]/5 hover:bg-[#002645]/10 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Home className="h-5 w-5" />
                Find a Home
              </button>
            </div>
          </div>

          <div className="w-full lg:w-1/2 relative h-[380px] md:h-[500px] overflow-hidden rounded-3xl border border-[#e4e2e4] shadow-md bg-white">
            <img 
              alt="Modern apartment Nairobi" 
              className="w-full h-full object-cover grayscale-xs brightness-95" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA8OSU7gARFUwtgCuXMynp7hCPLRxI5r6CyXmwAZ4A-OI0ORgow7mBJ28UqfNmZHQ9dqDJLLKXcPrTDYic8zHTrGl8hcvBkHOHqK4omC4ZgzqjItbdVmvW8R9jRKYyYFxR5l4viC6KumuLTvonMWnthAApxU3DqBZmp4nJf9v2fllHfc9JSmwsUcA6OEbIKmNPPPednXejEKVOCW3EkCmvLgtfeiLzADFl3pj6gkUIYOHiEvxOcyb-osYZC8QfIHaiUcDagXUDCRPWR" 
            />
            {/* Overlay Card: Social Proof */}
            <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl flex items-center gap-4 border border-[#e4e2e4] shadow-lg">
              <div className="flex -space-x-3">
                <img 
                  className="w-10 h-10 rounded-full border-2 border-white object-cover" 
                  alt="Young woman tenant"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJHVo0ItxDNtrPxpJuxF999eQZucYzjmp0FkGpIYOanfo6M9-A4ZOJA5WDXwl3BJercA3TJr8HMQkC8qclrIRXsfWq9vQzKlZdn4H2RnsJMW-LvnTIi1V3Fb8LBlHwPSSqo4081zjw-TzQh7BUvrgMTA9Mtiz4FrjXNpgFKC_-sKBl3GcZ6SQhn2r72tpsFvWeu_lHBz6EmHHBcVpZ0k3ZCEE7I2yt_X3nz4ZUt4T1WZejTYSTS-UCBLF2frZjOSESxO1iWRb2BTnR" 
                />
                <img 
                  className="w-10 h-10 rounded-full border-2 border-white object-cover" 
                  alt="Landlord owner"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRxmlZiyPxhMA9KhxxEY-ZornwU45XOarKthi5rZwjaUXVYAzK1Rptwz3XSUMih-aX7N40cr2Ki-5KZvD7pUHT8xTTKjuQMyyucNGma4FaFJirfRO8Nmxdo7wvHhgJnJDxwkPMa5NOJdwGCIEP9IoZoEnvk7HAYZ8jfseOFIDZ7L5DKDb2LTYFaZymzBJ-SYm2ragI8Q_dxp6yzf6AjtEmLdC6yZGqnU2ZCun5dcEqufGWVNNfnsQoC1JyHXHZfKXLK1rfwMLmEMPm" 
                />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xs uppercase text-[#002645] tracking-wider">Trusted by 2,000+ Landlords</span>
                <div className="flex text-amber-500 items-center gap-0.5 mt-0.5">
                  <Star className="h-3 w-3 fill-current" />
                  <Star className="h-3 w-3 fill-current" />
                  <Star className="h-3 w-3 fill-current" />
                  <Star className="h-3 w-3 fill-current" />
                  <Star className="h-3 w-3 fill-current" />
                  <span className="text-xs font-bold text-[#43474e] ml-2">5.0 Star Rating</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Auth Section & Features Section */}
        <section className="py-16 bg-[#f6f3f5] border-t border-b border-[#e4e2e4] px-4 md:px-10" id="auth-section">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Signin Form Card */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 md:p-8 border border-[#e4e2e4] shadow-sm flex flex-col justify-between" id="auth-card">
              <div className="space-y-4">
                <div className="flex gap-2 p-1 bg-[#f0edef] rounded-lg">
                  <button 
                    onClick={() => setUserRoleSelection('landlord')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${userRoleSelection === 'landlord' ? 'bg-[#002645] text-white shadow-sm' : 'text-[#43474e] hover:bg-[#eae7ea]'}`}
                  >
                    I am a Landlord
                  </button>
                  <button 
                    onClick={() => setUserRoleSelection('tenant')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${userRoleSelection === 'tenant' ? 'bg-[#002645] text-white shadow-sm' : 'text-[#43474e] hover:bg-[#eae7ea]'}`}
                  >
                    I am a Tenant
                  </button>
                </div>

                <div className="text-center md:text-left">
                  <h2 className="text-2xl font-bold text-[#002645]">
                    {authMode === 'signin' ? 'Welcome back' : 'Create Account'}
                  </h2>
                  <p className="text-xs text-[#43474e] mt-1">
                    {authMode === 'signin' 
                      ? `Access your ${userRoleSelection} dashboards or records.` 
                      : 'Simplify property management with secure rent controls.'}
                  </p>
                </div>

                <form className="space-y-4 pt-2" onSubmit={handleAuthSubmit}>
                  {authMode === 'signup' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-[#002645] tracking-wider px-1">KE Phone Number</label>
                      <div className="flex items-center border border-[#c3c6cf] rounded-xl p-3 focus-within:border-[#002645] focus-within:ring-2 focus-within:ring-[#002645]/10 bg-white transition-all">
                        <span className="text-sm font-bold text-[#002645] pr-3 border-r border-[#c3c6cf] mr-3">+254</span>
                        <input 
                          className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm focus:outline-none" 
                          placeholder="712 345 678" 
                          type="tel"
                          value={phone}
                          onChange={handlePhoneInputChange}
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-[#002645] tracking-wider px-1">Email address</label>
                    <div className="flex items-center border border-[#c3c6cf] rounded-xl p-3 focus-within:border-[#002645] focus-within:ring-2 focus-within:ring-[#002645]/10 bg-white transition-all">
                      <Mail className="h-4 w-4 text-[#73777f] mr-3" />
                      <input 
                        className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm focus:outline-none" 
                        placeholder="yourname@domain.com" 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-[#002645] tracking-wider px-1">Password</label>
                    <div className="flex items-center border border-[#c3c6cf] rounded-xl p-3 focus-within:border-[#002645] focus-within:ring-2 focus-within:ring-[#002645]/10 bg-white transition-all">
                      <Lock className="h-4 w-4 text-[#73777f] mr-3" />
                      <input 
                        className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm focus:outline-none" 
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
                    className="w-full bg-[#002645] text-white py-3 rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 shadow-sm"
                  >
                    {loading ? (
                      <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <span>{authMode === 'signin' ? 'Sign In' : 'Get Started'}</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#c3c6cf]"></div></div>
                  <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-[#73777f] font-semibold">or join instantly via</span></div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={() => selectSocialLogin(userRoleSelection)}
                    className="w-full border border-[#c3c6cf] bg-white py-3 rounded-xl flex items-center justify-center gap-3 hover:bg-[#f6f3f5] active:scale-95 transition-all text-sm font-semibold"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                    </svg>
                    <span>Connect with Demo Account</span>
                  </button>
                </div>
              </div>

              <div className="pt-6 border-t border-[#e4e2e4] text-center mt-6">
                <span className="text-xs text-[#43474e]">
                  {authMode === 'signin' ? "Don't have an account? " : "Already registered? "}
                  <button 
                    onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                    className="text-[#002645] font-bold hover:underline"
                  >
                    {authMode === 'signin' ? 'Sign up' : 'Log in'}
                  </button>
                </span>
              </div>
            </div>

            {/* Right Side: Bento Info Grid */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4" id="features">
              {/* Feature 1: M-Pesa */}
              <div className="bg-[#1a3c5e] text-white p-6 rounded-2xl flex flex-col justify-between overflow-hidden relative group border border-[#c3c6cf]/10">
                <div className="z-10 space-y-3">
                  <div className="bg-[#87a7ce]/25 w-fit p-2.5 rounded-xl">
                    <Smartphone className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold">M-Pesa Integration</h3>
                  <p className="text-xs text-[#87a7ce] leading-relaxed">
                    Collect and track rent payments automatically with instant reconciliation and background banking synchronization.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs text-emerald-400 font-bold gap-1 cursor-pointer">
                  <span>Learn more</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </div>

              {/* Feature 2: Smart Maintenance */}
              <div className="bg-[#67f9b3]/20 text-[#006c45] p-6 rounded-2xl flex flex-col justify-between group border border-[#006c45]/10">
                <div className="space-y-3">
                  <div className="bg-[#002112]/10 w-fit p-2.5 rounded-xl">
                    <Settings2 className="h-5 w-5 text-[#006c45]" />
                  </div>
                  <h3 className="text-lg font-bold">Smart Maintenance</h3>
                  <p className="text-xs text-[#007149] leading-relaxed">
                    Residents can log requests with images. Manage workflows and dispatch certified technicians with live scheduling.
                  </p>
                </div>
                <div className="mt-4 flex -space-x-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">JD</div>
                  <div className="w-7 h-7 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">MS</div>
                  <div className="w-7 h-7 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white font-bold">+12</div>
                </div>
              </div>

              {/* Feature 3: Giant overview card */}
              <div className="sm:col-span-2 bg-white rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 border border-[#e4e2e4] shadow-sm">
                <div className="w-full md:w-1/3 h-36 rounded-xl overflow-hidden shrink-0">
                  <img 
                    alt="Analytics real-time" 
                    className="w-full h-full object-cover" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJHVsPCNM8vlseW-5euYjPmlM_McDvTlrK8z0cySc4WNEFSJsFxtY-QyxDqwZuYa9qEmv-7PNAghGwePs1A0kz8RpIxqHRLtc24OvMCBsydO7gdo5JqnVkDjaZz-1k50jOZl78NdWspdcVQyQdtK010umxl767zDMIuGC6wxPwmjaDLOfiTxBGxixIlSTGwUL-Ad6cSlbgp-7NbDPwNQelha3Rh_4hM1d_vfiMnW6I6ctnVP8uD_ltZILFWkLaKG47Mgcr5swe6Z8h" 
                  />
                </div>
                <div className="w-full md:w-2/3 space-y-2">
                  <div className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-[#002645] bg-[#e4e2e4] px-2 py-0.5 rounded-full">
                    <BarChart3 className="h-3 w-3" /> Real-time Analytics
                  </div>
                  <h3 className="text-lg font-bold text-[#002645]">Powerful Dashboard Insights</h3>
                  <p className="text-xs text-[#43474e] leading-relaxed">
                    Track overall occupancy rates, annual yield, tax reports, and outstanding arrears instantly inside deep financial panels.
                  </p>
                  <div className="flex gap-2 pt-1 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-1 bg-[#f0edef] rounded-full text-[#002645]">ROI tracking</span>
                    <span className="text-[10px] font-bold px-2 py-1 bg-[#f0edef] rounded-full text-[#002645]">Asset performance</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Split Section */}
        <section className="py-16 px-4 md:px-10 max-w-7xl mx-auto flex flex-col md:flex-row gap-6" id="solutions">
          <div className="flex-1 bg-[#E8F4FD] p-8 md:p-10 rounded-3xl space-y-6 flex flex-col justify-between border border-[#c3c6cf]/10">
            <div className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-extrabold text-[#002645]">I am a Landlord</h2>
              <p className="text-sm text-[#43474e] leading-relaxed">
                Streamline your entire property business. Automate invoicing, find vetted tenants, log rental history, and protect your investments.
              </p>
              <ul className="space-y-2 pt-2">
                <li className="flex items-center gap-2 text-xs font-bold text-[#002645]">
                  <CheckCircle2 className="h-4 w-4 text-[#006c45] shrink-0" />
                  <span>Verified Rent Records</span>
                </li>
                <li className="flex items-center gap-2 text-xs font-bold text-[#002645]">
                  <CheckCircle2 className="h-4 w-4 text-[#006c45] shrink-0" />
                  <span>Draft Secure Legal Agreements</span>
                </li>
              </ul>
            </div>
            <button 
              onClick={() => {
                setUserRoleSelection('landlord');
                setAuthMode('signup');
                document.getElementById('auth-card')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-[#002645] text-white px-6 py-3.5 rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all text-center"
            >
              Get Started for Free
            </button>
          </div>

          <div className="flex-1 bg-[#e4e2e4] p-8 md:p-10 rounded-3xl space-y-6 flex flex-col justify-between border border-[#c3c6cf]/10">
            <div className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-extrabold text-[#002645]">I am a Tenant</h2>
              <p className="text-sm text-[#43474e] leading-relaxed">
                Simplify your household. Rent payments via M-Pesa STK, request repairs within seconds, and build your digital renting score with secure credit.
              </p>
              <ul className="space-y-2 pt-2">
                <li className="flex items-center gap-2 text-xs font-bold text-[#002645]">
                  <CheckCircle2 className="h-4 w-4 text-[#006c45] shrink-0" />
                  <span>One-Click M-Pesa STK Push</span>
                </li>
                <li className="flex items-center gap-2 text-xs font-bold text-[#002645]">
                  <CheckCircle2 className="h-4 w-4 text-[#006c45] shrink-0" />
                  <span>Repairs & Technician Logs</span>
                </li>
              </ul>
            </div>
            <button 
              onClick={() => {
                setUserRoleSelection('tenant');
                setAuthMode('signup');
                document.getElementById('auth-card')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="border-2 border-[#002645] text-[#002645] bg-[#002645]/5 hover:bg-[#002645]/10 px-6 py-3.5 rounded-xl font-bold active:scale-95 transition-all text-center"
            >
              Find a Home
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#002645] text-white py-12 px-4 md:px-10 mt-12 border-t border-[#1a3c5e]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="text-emerald-400 h-6 w-6" />
              <span className="font-extrabold text-2xl tracking-tight">Renziy</span>
            </div>
            <p className="text-xs text-[#87a7ce] leading-relaxed">
              Empowering real estate owners and modern residents across Africa with world-class cloud technologies.
            </p>
          </div>
          
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#87a7ce]">Product</h4>
            <a href="#" className="block text-xs text-[#c3c6cf] hover:text-white transition-colors">Properties</a>
            <a href="#" className="block text-xs text-[#c3c6cf] hover:text-white transition-colors">For Landlords</a>
            <a href="#" className="block text-xs text-[#c3c6cf] hover:text-white transition-colors">For Tenants</a>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#87a7ce]">Company</h4>
            <a href="#" className="block text-xs text-[#c3c6cf] hover:text-white transition-colors">About Us</a>
            <a href="#" className="block text-xs text-[#c3c6cf] hover:text-white transition-colors">Contact</a>
            <a href="#" className="block text-xs text-[#c3c6cf] hover:text-white transition-colors">Privacy Policy</a>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#87a7ce]">Safety & Compliance</h4>
            <p className="text-xs text-[#c3c6cf] leading-relaxed">
              Renziy encrypts financial details using AES-256 secure vaults. PCI-DSS and M-Pesa verified.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-[#1a3c5e]/50 text-center text-xs text-[#87a7ce]">
          © 2026 Renziy Technologies. All rights reserved. Built with trust in Nairobi.
        </div>
      </footer>
    </div>
  );
}
