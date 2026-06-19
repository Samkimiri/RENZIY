import React, { useState } from 'react';
import { useRenziy } from '../state';
import { ArrowRight, Smartphone, CreditCard, Wrench, ShieldAlert, Sparkles, CheckCircle2, ChevronRight, Bell, Calendar, HelpCircle, Clock, Lock, Unlock, AlertTriangle, Camera, X, Home } from 'lucide-react';
import { motion } from 'motion/react';

export default function TenantDashboard({
  onPayRent,
  onNavigate
}: {
  onPayRent: (method: 'M-Pesa' | 'Card') => void;
  onNavigate: (tab: string) => void;
}) {
  const {
    username,
    notifications,
    tenantBalance,
    maintenanceRequests,
    markNotificationsAsRead,
    units,
    updateTenantAvatar,
    members
  } = useRenziy();

  const currentTenantAccount = members.find(member => member.role === 'tenant' && member.name === username);
  // Find active unit for the signed-in account. Only the demo tenant falls back to Apt 4B.
  const myUnit = units?.find(u => u.tenantName === username) || (username === 'Alex' || username === 'Alex Smith' ? units?.find(u => u.id === 'unit-1-4b') : undefined);
  const isLocked = myUnit?.isLocked;

  // Filter tickets dynamically matched by signed-in tenant.
  const alexTickets = maintenanceRequests.filter(
    r => r.tenantName === username || ((username === 'Alex' || username === 'Alex Smith') && (r.tenantName === 'Alex Smith' || r.tenantName === 'Alex'))
  );

  // Unread count
  const unreadCount = notifications.filter(n => n.unread).length;

  // Photo upload states
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [showUploadPanel, setShowUploadPanel] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Please select a valid image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPhotoPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleSaveAvatar = async () => {
    if (photoPreview && myUnit) {
      await updateTenantAvatar(myUnit.id, photoPreview);
      setPhotoPreview(null);
      setShowUploadPanel(false);
    }
  };

  if (!myUnit) {
    return (
      <div className="bg-[#E8F4FD] min-h-screen text-[#1b1b1d] pb-24 md:pb-12">
        <div className="bg-white rounded-3xl border border-[#e4e2e4] shadow-sm p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Tenant account created
              </span>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-[#002645]">Welcome, {username}.</h1>
                <p className="text-sm text-[#43474e] mt-2 max-w-2xl leading-relaxed">
                  Your tenant profile is active. A landlord still needs to assign your account to a property and unit before rent balances, smart locks, and maintenance records appear here.
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-[#f6f3f5] border border-[#e4e2e4] p-4 min-w-full md:min-w-64">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#73777f]">Account summary</p>
              <p className="text-sm font-black text-[#002645] mt-2">{currentTenantAccount?.email || 'Tenant email saved'}</p>
              <p className="text-xs font-semibold text-[#73777f] mt-1">{currentTenantAccount?.unitNumber || 'Unit pending assignment'}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => onNavigate('marketplace')}
            className="text-left bg-[#002645] text-white rounded-3xl p-6 border border-[#1a3c5e] shadow-sm hover:bg-[#1a3c5e] transition-all"
          >
            <Home className="h-6 w-6 text-emerald-400" />
            <h2 className="text-xl font-black mt-4">Find rental houses</h2>
            <p className="text-sm text-[#b7cee8] mt-2">Browse available homes by county, town, rent, and Google Maps location.</p>
          </button>
          <div className="bg-white rounded-3xl p-6 border border-[#e4e2e4] shadow-sm">
            <Bell className="h-6 w-6 text-[#002645]" />
            <h2 className="text-xl font-black text-[#002645] mt-4">Waiting for landlord link</h2>
            <p className="text-sm text-[#73777f] mt-2">Once linked to a unit, this dashboard will show only your rent, repairs, lock status, and documents.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="bg-red-50/75 min-h-screen text-[#1b1b1d] pb-24 md:pb-12 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-xl w-full p-8 border border-red-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold bg-red-100 text-red-800 px-3 py-1 rounded-full uppercase tracking-wider">
              Smart IoT Lockout Engaged
            </span>
            <h2 className="text-2xl font-black text-[#002645] mt-2">Apartment Access Restricted</h2>
            <p className="text-xs text-[#73777f]">
              Access has been restricted for <strong>{myUnit?.propertyName} — Unit {myUnit?.unitNumber}</strong>.
            </p>
          </div>

          {/* Alert Message Box */}
          <div className="p-4 bg-red-50 text-red-800 rounded-2xl text-xs font-semibold text-left border border-red-100 space-y-1">
            <span className="font-extrabold text-[10px] uppercase text-red-600 tracking-wider">Notice from Landlord:</span>
            <p className="italic leading-relaxed">"{myUnit?.lockReason || "Unpaid rent balance has exceeded maturity term."}"</p>
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#73777f] block">Outstanding Invoice Rent Balance</span>
              <span className="text-3xl font-black text-red-600">KES {tenantBalance.toLocaleString()}</span>
            </div>
            <div className="space-y-2 w-full sm:w-auto self-stretch flex flex-col justify-center">
              <button
                onClick={() => onPayRent('M-Pesa')}
                className="w-full sm:w-auto bg-[#002645] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>Pay via M-Pesa</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => onPayRent('Card')}
                className="w-full sm:w-auto bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-black hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>Pay via Card</span>
                <CreditCard className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="text-[10px] text-[#73777f] leading-relaxed">
            Upon receipt validation, the M-Pesa STK trigger automatically transmits a safe-release telemetry token to unlock your physical front-door deadbolt.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#E8F4FD] min-h-screen text-[#1b1b1d] pb-24 md:pb-12">
      {/* Top Greeting */}
      <div className="mb-6 bg-white p-6 rounded-3xl border border-[#e4e2e4] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          {/* Tenant Avatar with interactive edit option */}
          <div className="relative group shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-[#002645]/10 bg-slate-100 shadow-sm transition-all duration-300 group-hover:border-[#002645]/40 relative">
              <img
                src={myUnit?.tenantAvatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOcbVtz4Nz5aTDAR2DZW9Pg9F6e65oPi6Td2jZ84CEwLXgn5HrvYocGZaVvLRdcS9eUaqLENJ27o2RqpElz14uBPV47JROuDd4JkbKG4lK3vapbE6KOkie8PQbaMTqlvURqdmEzyOUTLS-bssVrQp56st-qoqgO1NFNrdLvXPdL5SwnjZzSChp5a_s4toIffdm_8W02EPKg7MLqi3poWL6UDKib0nkwFBjpcLb7YMRsPtiVkMFt4jFzqbDf0SOuGuynYq7GjnWhyHB'}
                alt={username}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Clickable camera badge overlay */}
            <button
              onClick={() => setShowUploadPanel(true)}
              className="absolute -bottom-1 -right-1 p-2 bg-[#002645] hover:bg-[#002645]/90 text-white rounded-full border border-white shadow-md active:scale-90 transition-all cursor-pointer flex items-center justify-center z-10"
              style={{ width: '36px', height: '36px' }}
              title="Upload Photo / Avatar"
            >
              <Camera className="h-4.5 w-4.5" />
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-[#002645] tracking-tight">
                Welcome back, {username}.
              </h1>
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F4FD] text-[#002645] border border-[#002645]/15">
                Verified Tenant
              </span>
            </div>
            <p className="text-sm text-[#43474e] mt-1">Here is what is happening with your home today.</p>
            <button
              onClick={() => setShowUploadPanel(true)}
              className="text-xs font-bold text-[#002645] hover:underline flex items-center gap-1 mt-2"
            >
              Update profile photo &rarr;
            </button>
          </div>
        </div>

        {/* Help indicators */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <span className="bg-slate-50 px-4 py-2.5 rounded-2xl border border-[#e4e2e4] text-xs font-extrabold text-[#002645] flex items-center gap-1.5 shadow-xs">
            🏢 {myUnit?.propertyName || 'Oakwood Heights'}
          </span>
          <span className="bg-[#002645]/5 px-4 py-2.5 rounded-2xl border border-[#002645]/10 text-xs font-bold text-[#002645] flex items-center gap-1.5 shadow-xs">
            🚪 Unit {myUnit?.unitNumber || 'Apt 4B'}
          </span>
        </div>
      </div>

      {/* Main Split Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mb-8">

        {/* Balance Card Outstanding */}
        <div className="lg:col-span-12 xl:col-span-6 bg-[#002645] text-white p-6 md:p-8 rounded-3xl relative overflow-hidden flex flex-col justify-between shadow-md border border-[#1a3c5e]">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-44 h-44 bg-white/5 rounded-full blur-xl pointer-events-none" />

          <div className="z-10">
            <div className="inline-flex items-center gap-1.5 text-[10px] bg-white/10 text-emerald-400 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
              <Sparkles className="h-3 w-3" /> Rent Invoice Alert
            </div>

            <p className="text-sm text-[#87a7ce] font-semibold mt-4">Current Outstanding Balance</p>
            {tenantBalance > 0 ? (
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mt-1 text-white">
                KES {tenantBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h2>
            ) : (
              <div className="mt-2 flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-8 w-8 shrink-0" />
                <span className="text-2xl font-extrabold">Account Fully Paid!</span>
              </div>
            )}
            <p className="text-xs text-[#87a7ce] font-medium mt-2">Due on June 1st, 2026. Auto-generated monthly billing.</p>
          </div>

          {tenantBalance > 0 ? (
            <div className="mt-8 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 z-10">
              <p className="text-xs text-slate-300">Choose M-Pesa STK push or Credit Card for instant receipt delivery.</p>
              <button
                onClick={() => onPayRent('M-Pesa')}
                className="w-full sm:w-auto bg-emerald-600 text-white px-6 py-3 rounded-xl font-black hover:bg-emerald-700 active:scale-95 transition-all text-sm shrink-0 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <span>Pay Rent</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="mt-8 pt-4 border-t border-white/10 flex justify-between items-center text-xs text-emerald-400/90 font-bold z-10">
              <span>Thank you for being a wonderful tenant!</span>
              <span>Next cycle billing: Nov 1, 2026</span>
            </div>
          )}
        </div>

        {/* Rent payment timer/countdown card with Smart Lock Warnings */}
        <div className="lg:col-span-12 md:col-span-6 xl:col-span-3 bg-white rounded-3xl p-6 border border-[#e4e2e4] shadow-sm flex flex-col justify-between relative overflow-hidden">
          {tenantBalance > 0 && (
            <div className="absolute top-0 right-0 h-16 w-16 bg-red-500/10 rounded-bl-full pointer-events-none flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping absolute" />
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 absolute" />
            </div>
          )}

          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold uppercase text-[#002645] tracking-wider">Due Countdown</h3>
            <span className="text-xs font-bold text-[#73777f] flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> June 1st
            </span>
          </div>

          <div className="my-5 text-center flex flex-col items-center">
            <span className={`text-5xl font-extrabold font-sans tracking-tight ${tenantBalance > 0 ? 'text-red-500 animate-pulse' : 'text-emerald-600'}`}>
              5
            </span>
            <span className="text-[10px] uppercase font-black tracking-wider text-[#73777f] mt-1.5">Days left to Pay</span>

            {tenantBalance > 0 ? (
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100 uppercase tracking-wide">
                <AlertTriangle className="h-3 w-3 shrink-0" /> Overdue: 26 Days
              </span>
            ) : (
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 uppercase tracking-wide">
                <CheckCircle2 className="h-3 w-3 shrink-0" /> Fully Clear
              </span>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 text-left">
            {tenantBalance > 0 ? (
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-red-600 flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Lockout Risk: High
                </p>
                <p className="text-[10px] text-[#73777f] leading-snug">
                  Unsettled cycle will trigger automatic IoT Smart Lock restricting keypad access. Settle now to avert lock.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-emerald-700 flex items-center gap-1">
                  <Unlock className="h-3 w-3" /> IoT Lock Status: Secure
                </p>
                <p className="text-[10px] text-[#73777f] leading-snug">
                  No lockout constraints active. Rent settled. Thank you!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Circular Lease Overview countdown gauge */}
        <div className="lg:col-span-12 md:col-span-6 xl:col-span-3 bg-white rounded-3xl p-6 border border-[#e4e2e4] shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold uppercase text-[#002645] tracking-wider">Lease Overview</h3>
            <span className="text-xs font-bold text-[#73777f] flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> 12 Months
            </span>
          </div>

          <div className="my-4 flex justify-center items-center relative">
            {/* Custom SVG Circular Meter */}
            <svg className="w-32 h-32 transform -rotate-90">
              <circle cx="64" cy="64" r="54" stroke="#f0edef" strokeWidth="8" fill="none" />
              <circle
                cx="64"
                cy="64"
                r="54"
                stroke="#002645"
                strokeWidth="10"
                fill="none"
                strokeDasharray="339"
                strokeDashoffset="113"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-lg font-black text-[#002645]">245</span>
              <span className="text-[9px] uppercase font-bold text-[#73777f] tracking-wide">Days Left</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs font-bold text-[#002645]">Ends on May 15, 2027</p>
            <p className="text-[10px] text-[#73777f] mt-0.5">Renewals open 60 days prior to expiration.</p>
          </div>
        </div>
      </div>

      {/* Under half elements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

        {/* Left column: Notifications Logs & Payment Actions */}
        <div className="lg:col-span-5 flex flex-col gap-6">

          {/* Notifications Box */}
          <div className="bg-white rounded-3xl p-6 border border-[#e4e2e4] shadow-sm flex-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-extrabold uppercase text-[#002645] tracking-wider flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <span>Alert Feed</span>
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markNotificationsAsRead}
                    className="text-[10px] font-bold text-emerald-500 hover:underline"
                  >
                    Mark read ({unreadCount})
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {notifications.map(n => {
                  const isLockWarning = n.title.includes('Lockout') || n.title.includes('CRITICAL') || n.message.toLowerCase().includes('lock');
                  return (
                    <div
                      key={n.id}
                      className={`flex gap-3 items-start border-b border-[#f0edef] pb-3 last:border-0 last:pb-3 ${isLockWarning ? 'bg-red-50/70 p-3.5 rounded-2xl border border-red-100/60' : ''}`}
                    >
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.unread ? 'bg-emerald-500' : 'bg-transparent'}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          {isLockWarning && <ShieldAlert className="h-4 w-4 text-red-600 animate-pulse shrink-0" />}
                          <h4 className={`text-xs font-bold ${isLockWarning ? 'text-red-700' : 'text-[#1b1b1d]'}`}>{n.title}</h4>
                        </div>
                        <p className={`text-[11px] mt-0.5 leading-relaxed ${isLockWarning ? 'text-red-900 font-medium' : 'text-[#43474e]'}`}>{n.message}</p>
                        <span className="text-[9px] text-[#73777f] font-semibold mt-1 block">{n.date}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-center text-[10px] text-[#73777f] font-semibold mt-4">
              Synced securely with landlord portal
            </div>
          </div>

          {/* Quick Pay Box Options */}
          {tenantBalance > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-[#e4e2e4] shadow-sm">
              <h3 className="text-xs font-bold uppercase text-[#002645] tracking-wider mb-4">Express Checkout</h3>

              <div className="space-y-3">
                <button
                  onClick={() => onPayRent('M-Pesa')}
                  className="w-full flex items-center justify-between p-4 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-950 rounded-2xl cursor-pointer border border-emerald-500/30 transition-all font-black text-xs"
                >
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5" />
                    <span>Lodge M-Pesa STK Push</span>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </button>

                <button
                  onClick={() => onPayRent('Card')}
                  className="w-full flex items-center justify-between p-4 bg-[#f0edef] hover:bg-[#eae7ea] text-[#002645] rounded-2xl cursor-pointer border border-[#c3c6cf] transition-all font-bold text-xs"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5" />
                    <span>Pay with Credit/Debit Card</span>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right column: active repair requests checklist */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-white rounded-3xl p-6 border border-[#e4e2e4] shadow-sm h-full flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-extrabold uppercase text-[#002645] tracking-wider flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-[#002645]" />
                  <span>Maintenance Orders</span>
                </h3>
                <button
                  onClick={() => onNavigate('request_repair')}
                  className="text-xs font-bold bg-[#002645] text-white px-3.5 py-2 rounded-xl hover:opacity-90 active:scale-95 transition-all text-center shrink-0 flex items-center gap-1 shadow-sm"
                >
                  Request Repair (+)
                </button>
              </div>

              <div className="space-y-4">
                {alexTickets.map(r => {
                  const hasPhoto = r.photos.length > 0;
                  return (
                    <div key={r.id} className="p-4 bg-slate-50/50 rounded-2xl border border-[#e4e2e4] hover:border-slate-300 transition-colors">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              r.urgency === 'High' || r.urgency === 'Emergency'
                                ? 'bg-red-100 text-red-800'
                                : r.urgency === 'Med'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              ● {r.urgency} Urgency
                            </span>
                            <span className="text-[10px] font-bold text-[#73777f] uppercase bg-[#f0edef] px-2 py-0.5 rounded-full">
                              {r.category}
                            </span>
                          </div>

                          <h4 className="font-bold text-sm text-[#002645] pt-1">{r.title}</h4>
                          <p className="text-xs text-[#43474e] leading-relaxed line-clamp-2">{r.description}</p>
                        </div>

                        {/* Status label mark */}
                        <div className="text-right shrink-0">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold ${
                            r.status === 'Resolved'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : r.status === 'In Progress'
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {r.status}
                          </span>
                        </div>
                      </div>

                      {/* Photo preview gallery row inside card if present */}
                      {hasPhoto && (
                        <div className="mt-4 flex gap-2 items-center">
                          {r.photos.map((p, idx) => (
                            <img
                              key={idx}
                              src={p}
                              alt="Leaking sink evidence"
                              className="w-14 h-14 rounded-lg object-cover border border-[#e4e2e4]"
                            />
                          ))}

                          {r.technicianName && (
                            <div className="ml-auto flex items-center gap-2 bg-[#002645]/5 p-1.5 rounded-xl border border-[#002645]/10">
                              <img
                                src={r.technicianAvatar}
                                alt={r.technicianName}
                                className="w-7 h-7 rounded-lg object-cover"
                              />
                              <div>
                                <p className="text-[9px] font-bold text-[#002645] leading-none">Technician</p>
                                <p className="text-[10px] font-extrabold text-[#002645] mt-1 pr-1">{r.technicianName}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {alexTickets.length === 0 && (
                  <p className="text-center text-xs text-[#73777f] py-8 font-semibold">
                    No active maintenance tickets filed yet.
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => onNavigate('maintenance_list')}
              className="w-full mt-6 py-3 text-sm text-[#002645] font-bold border border-[#002645]/20 rounded-xl hover:bg-[#002645]/5 transition-all text-center"
            >
              Request Pipeline History
            </button>
          </div>
        </div>
      </div>

      {/* Upload Panel Overlay Modal */}
      {showUploadPanel && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-md p-6 border border-[#e4e2e4] shadow-2xl relative space-y-5"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-[#002645]" />
                <h3 className="font-extrabold text-[#002645] text-lg">Upload Tenant Photo</h3>
              </div>
              <button
                onClick={() => {
                  setShowUploadPanel(false);
                  setPhotoPreview(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors flex items-center justify-center"
                style={{ minWidth: '32px', minHeight: '32px' }}
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <p className="text-xs text-[#73777f] leading-relaxed">
              Upload a clear profile photo or avatar of yourself. This is synchronized across the smart lock details and landlord information system.
            </p>

            {/* Drop Zone */}
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 ${
                isDragging
                  ? 'border-[#002645] bg-[#E8F4FD]'
                  : photoPreview
                    ? 'border-[#007149]/30 bg-emerald-50/20'
                    : 'border-[#c3c6cf] hover:border-[#002645] bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              {photoPreview ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#007149]/40 bg-white shadow-sm">
                    <img
                      src={photoPreview}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-[#007149] bg-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                    File selected successfully
                  </span>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
                    <Camera className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#002645]">Drag &amp; drop profile photo here</p>
                    <p className="text-[10px] text-[#73777f] mt-0.5">or click to browse local files (Drag-and-Drop &amp; Click support)</p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => {
                  setShowUploadPanel(false);
                  setPhotoPreview(null);
                }}
                className="px-4 py-2 border border-[#c3c6cf] hover:bg-slate-50 text-xs font-bold text-[#43474e] rounded-xl transition-all cursor-pointer flex items-center justify-center"
                style={{ minHeight: '40px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAvatar}
                disabled={!photoPreview}
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  photoPreview
                    ? 'bg-[#002645] hover:brightness-110 active:scale-95'
                    : 'bg-slate-300 pointer-events-none'
                }`}
                style={{ minHeight: '40px' }}
              >
                <span>Save New Photo</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
