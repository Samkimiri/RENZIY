import React from 'react';
import { useRenziy } from '../state';
import { ArrowRight, Smartphone, CreditCard, Wrench, ShieldAlert, Sparkles, CheckCircle2, ChevronRight, Bell, Calendar, HelpCircle } from 'lucide-react';

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
    markNotificationsAsRead 
  } = useRenziy();

  // Filter Alex's tickets
  const alexTickets = maintenanceRequests.filter(
    r => r.tenantName === 'Alex Smith' || r.tenantName === 'Alex'
  );

  // Unread count
  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="bg-[#E8F4FD] min-h-screen text-[#1b1b1d] pb-24 md:pb-12">
      {/* Top Greeting */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#002645] tracking-tight">
            Welcome back, {username}.
          </h1>
          <p className="text-sm text-[#43474e]">Here is what is happening with your home today.</p>
        </div>
        
        {/* Help indicators */}
        <div className="flex gap-2 text-xs font-bold text-[#002645]">
          <span className="bg-white px-3 py-1.5 rounded-full border border-[#e4e2e4] flex items-center gap-1">
            📍 Oakwood Heights — Apt 4B
          </span>
        </div>
      </div>

      {/* Main Split Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mb-8">
        
        {/* Balance Card Outstanding */}
        <div className="lg:col-span-7 bg-[#002645] text-white p-6 md:p-8 rounded-3xl relative overflow-hidden flex flex-col justify-between shadow-md border border-[#1a3c5e]">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-44 h-44 bg-white/5 rounded-full blur-xl pointer-events-none" />
          
          <div className="z-10">
            <div className="inline-flex items-center gap-1.5 text-[10px] bg-white/10 text-emerald-400 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
              <Sparkles className="h-3 w-3" /> Rent Invoice Alert
            </div>
            
            <p className="text-sm text-[#87a7ce] font-semibold mt-4">Current Outstanding Balance</p>
            {tenantBalance > 0 ? (
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mt-1 text-white">
                ${tenantBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h2>
            ) : (
              <div className="mt-2 flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-8 w-8 shrink-0" />
                <span className="text-2xl font-extrabold">Account Fully Paid!</span>
              </div>
            )}
            <p className="text-xs text-[#87a7ce] font-medium mt-2">Due on Oct 1st, 2026. Auto-generated monthly billing.</p>
          </div>

          {tenantBalance > 0 ? (
            <div className="mt-8 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 z-10">
              <p className="text-xs text-slate-300">Choose M-Pesa STK push or Credit Card for instant receipt delivery.</p>
              <button 
                onClick={() => onPayRent('M-Pesa')}
                className="w-full sm:w-auto bg-[#006c45] text-white px-6 py-3 rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all text-sm shrink-0 flex items-center justify-center gap-2 shadow-sm"
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

        {/* Circular Lease Overview countdown gauge */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-[#e4e2e4] shadow-sm flex flex-col justify-between">
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
                    className="text-[10px] font-bold text-blue-600 hover:underline"
                  >
                    Mark read ({unreadCount})
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {notifications.map(n => (
                  <div key={n.id} className="flex gap-3 items-start border-b border-[#f0edef] pb-3 last:border-0 last:pb-0">
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.unread ? 'bg-blue-600' : 'bg-transparent'}`} />
                    <div>
                      <h4 className="text-xs font-bold text-[#1b1b1d]">{n.title}</h4>
                      <p className="text-[11px] text-[#43474e] mt-0.5">{n.message}</p>
                      <span className="text-[9px] text-[#73777f] font-semibold mt-1 block">{n.date}</span>
                    </div>
                  </div>
                ))}
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
                  className="w-full flex items-center justify-between p-4 bg-[#67f9b3]/15 hover:bg-[#67f9b3]/25 text-[#007149] rounded-2xl cursor-pointer border border-[#67f9b3]/40 transition-all font-bold text-xs"
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

        {/* Right column: Alex's Active repair requests checklist */}
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
                                  : 'bg-blue-100 text-blue-800'
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
    </div>
  );
}
