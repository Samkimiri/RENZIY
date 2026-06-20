import React, { useEffect, useMemo, useState } from 'react';
import { RenziyProvider, useRenziy } from './state';
import LandingPage from './components/LandingPage';
import LandlordDashboard from './components/LandlordDashboard';
import LandlordProperties from './components/LandlordProperties';
import TenantDashboard from './components/TenantDashboard';
import PaymentFlow from './components/PaymentFlow';
import MaintenanceForm from './components/MaintenanceForm';
import MaintenanceHistory from './components/MaintenanceHistory';
import SmartLocks from './components/SmartLocks';
import PayoutSettings from './components/PayoutSettings';
import HousingMarketplace from './components/HousingMarketplace';
import WorkerDashboard from './components/WorkerDashboard';
import { Building2, LayoutDashboard, Building, Wrench, CreditCard, LogOut, Bell, ArrowLeftRight, Lock, Coins, MapPin, HardHat } from 'lucide-react';

function AppContent() {
  const { role, setRole, username, setUsername, notifications, markNotificationsAsRead, units, members } = useRenziy();
  
  // Find tenant avatar dynamically
  const myUnitInfo = role === 'tenant' ? units?.find(u => u.tenantName === username) || (username === 'Alex' || username === 'Alex Smith' ? units?.find(u => u.id === 'unit-1-4b') : undefined) : undefined;
  const tenantAvatar = myUnitInfo?.tenantAvatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOcbVtz4Nz5aTDAR2DZW9Pg9F6e65oPi6Td2jZ84CEwLXgn5HrvYocGZaVvLRdcS9eUaqLENJ27o2RqpElz14uBPV47JROuDd4JkbKG4lK3vapbE6KOkie8PQbaMTqlvURqdmEzyOUTLS-bssVrQp56st-qoqgO1NFNrdLvXPdL5SwnjZzSChp5a_s4toIffdm_8W02EPKg7MLqi3poWL6UDKib0nkwFBjpcLb7YMRsPtiVkMFt4jFzqbDf0SOuGuynYq7GjnWhyHB';

  // Navigation active tab inside dashboards
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Custom quick payment state parameters
  const [expressPayMethod, setExpressPayMethod] = useState<'M-Pesa' | 'Card' | null>(null);

  // Notifications bell dropdown popover
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const unreadNotifCount = notifications.filter(n => n.unread).length;
  const mobileNavButtonClass = (active: boolean) => `min-w-[68px] flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 cursor-pointer transition-all ${active ? 'bg-[#E8F4FD] text-[#002645]' : 'text-[#73777f] hover:bg-[#f6f3f5]'}`;
  const sessionEmail = localStorage.getItem('renziy_user_email') || '';
  const activeMember = useMemo(() => {
    if (role === 'anonymous' || !sessionEmail) return undefined;
    return members.find(member => (
      member.role === role &&
      member.email.toLowerCase() === sessionEmail.toLowerCase() &&
      member.status === 'Active'
    ));
  }, [members, role, sessionEmail]);
  const hasVerifiedAccount = role !== 'anonymous' && Boolean(activeMember);

  useEffect(() => {
    if (role === 'anonymous') return;

    if (!activeMember) {
      localStorage.removeItem('renziy_user_email');
      setRole('anonymous');
      setActiveTab('dashboard');
      setExpressPayMethod(null);
      return;
    }

    if (activeMember.name !== username) {
      setUsername(activeMember.name);
    }
  }, [activeMember, role, setRole, setUsername, username]);

  const handleSignOut = () => {
    localStorage.removeItem('renziy_user_email');
    localStorage.removeItem('renziy_game_stats');
    localStorage.removeItem('renziy_custom_avatar');
    setRole('anonymous');
    setActiveTab('dashboard');
    setExpressPayMethod(null);
  };

  // If there is no verified platform account, keep the user on the account gate.
  if (role === 'anonymous' || !hasVerifiedAccount) {
    return <LandingPage />;
  }

  return (
    <div className="bg-[#E8F4FD] min-h-screen text-[#1b1b1d] font-sans flex flex-col md:flex-row">
      
      {/* SIDEBAR NAVIGATION (Visible on Desktop / MD screens and up) */}
      <aside className="hidden md:flex flex-col w-64 bg-[#002645] text-white p-6 shrink-0 relative justify-between">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-2 pb-6 border-b border-white/10">
            <Building2 className="text-emerald-400 h-6 w-6" />
            <span className="font-extrabold text-2xl tracking-tight text-white">Renziy</span>
          </div>

          {/* Navigation Items (Role-specific) */}
          <nav className="space-y-2">
            <span className="text-[10px] uppercase font-black text-[#87a7ce] tracking-widest px-3 block mb-4">
              Workspace Platform
            </span>

            {role === 'landlord' ? (
              /* Landlord Menu Links */
              <>
                <button 
                  onClick={() => { setActiveTab('dashboard'); setExpressPayMethod(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'dashboard' ? 'bg-[#1a3c5e] text-white shadow-sm' : 'text-[#87a7ce] hover:text-white hover:bg-white/5'}`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard Home</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('properties'); setExpressPayMethod(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'properties' ? 'bg-[#1a3c5e] text-white shadow-sm' : 'text-[#87a7ce] hover:text-white hover:bg-white/5'}`}
                >
                  <Building className="h-4 w-4" />
                  <span>Properties & Units</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('marketplace'); setExpressPayMethod(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'marketplace' ? 'bg-[#1a3c5e] text-white shadow-sm' : 'text-[#87a7ce] hover:text-white hover:bg-white/5'}`}
                >
                  <MapPin className="h-4 w-4" />
                  <span>Housing Market</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('maintenance'); setExpressPayMethod(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'maintenance' ? 'bg-[#1a3c5e] text-white shadow-sm' : 'text-[#87a7ce] hover:text-white hover:bg-white/5'}`}
                >
                  <Wrench className="h-4 w-4" />
                  <span>Maintenance Orders</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('locks'); setExpressPayMethod(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'locks' ? 'bg-[#1a3c5e] text-white shadow-sm' : 'text-[#87a7ce] hover:text-white hover:bg-white/5'}`}
                >
                  <Lock className="h-4 w-4" />
                  <span>IoT Smart Locks</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('payouts'); setExpressPayMethod(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'payouts' ? 'bg-[#1a3c5e] text-white shadow-sm' : 'text-[#87a7ce] hover:text-white hover:bg-white/5'}`}
                >
                  <Coins className="h-4 w-4" />
                  <span>Payout Setup</span>
                </button>
              </>
            ) : role === 'worker' ? (
              <>
                <button
                  onClick={() => { setActiveTab('dashboard'); setExpressPayMethod(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'dashboard' ? 'bg-[#1a3c5e] text-white shadow-sm' : 'text-[#87a7ce] hover:text-white hover:bg-white/5'}`}
                >
                  <HardHat className="h-4 w-4" />
                  <span>Worker Portal</span>
                </button>
                <button
                  onClick={() => { setActiveTab('maintenance_list'); setExpressPayMethod(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'maintenance_list' ? 'bg-[#1a3c5e] text-white shadow-sm' : 'text-[#87a7ce] hover:text-white hover:bg-white/5'}`}
                >
                  <Wrench className="h-4 w-4" />
                  <span>All Repair Tickets</span>
                </button>
              </>
            ) : (
              /* Tenant menu links */
              <>
                <button 
                  onClick={() => { setActiveTab('dashboard'); setExpressPayMethod(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'dashboard' ? 'bg-[#1a3c5e] text-white shadow-sm' : 'text-[#87a7ce] hover:text-white hover:bg-white/5'}`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>My Apartment</span>
                </button>
                <button 
                  onClick={() => { setExpressPayMethod('M-Pesa'); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${expressPayMethod !== null ? 'bg-[#1a3c5e] text-white shadow-sm' : 'text-[#87a7ce] hover:text-white hover:bg-white/5'}`}
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Express Rent Pay</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('marketplace'); setExpressPayMethod(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'marketplace' ? 'bg-[#1a3c5e] text-white shadow-sm' : 'text-[#87a7ce] hover:text-white hover:bg-white/5'}`}
                >
                  <MapPin className="h-4 w-4" />
                  <span>Find Houses</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('request_repair'); setExpressPayMethod(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'request_repair' ? 'bg-[#1a3c5e] text-white shadow-sm' : 'text-[#87a7ce] hover:text-white hover:bg-white/5'}`}
                >
                  <Wrench className="h-4 w-4" />
                  <span>Request Repair</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('maintenance_list'); setExpressPayMethod(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'maintenance_list' ? 'bg-[#1a3c5e] text-white shadow-sm' : 'text-[#87a7ce] hover:text-white hover:bg-white/5'}`}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  <span>Repair History</span>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Desktop Logout Button */}
        <button 
          onClick={handleSignOut}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold text-red-200 hover:text-white hover:bg-red-500/20 transition-all cursor-pointer border border-red-500/10"
        >
          <span>Log Out Session</span>
          <LogOut className="h-4 w-4" />
        </button>
      </aside>

      {/* CORE CONTENT LAYOUT COLUMN */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP STATUS NAVIGATION BAR (Universal) */}
        <header className="min-h-16 bg-white border-b border-[#e4e2e4] px-3 sm:px-4 md:px-10 flex items-center justify-between gap-2 z-30 shrink-0 sticky top-0 shadow-sm">
          {/* Mobile logo description (Hidden on Desktop Sidebar) */}
          <div className="flex items-center gap-2 md:hidden">
            <Building2 className="text-[#002645] h-5 w-5" />
            <span className="font-extrabold text-[#002645] text-lg tracking-tight">Renziy</span>
          </div>

          {/* Desktop Left status indicator */}
          <div className="hidden md:flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-extrabold text-[#73777f] uppercase tracking-wider">
              Secure {role === 'landlord' ? 'Landlord' : role === 'worker' ? 'Worker' : 'Tenant'} Account Active - {username}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 relative">
            <div className="hidden sm:flex bg-[#f0edef] px-3 py-2 rounded-full items-center gap-2 border border-[#e4e2e4] shadow-inner relative select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#059669]" />
              <span className="text-[10px] font-black uppercase tracking-wider text-[#002645]">
                {role === 'landlord' ? 'Landlord Account' : role === 'worker' ? 'Worker Account' : 'Tenant Account'}
              </span>
            </div>

            {/* Notifications Alert Bell Hub */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifMenu(!showNotifMenu);
                  if (!showNotifMenu) markNotificationsAsRead();
                }}
                className="p-2.5 rounded-xl bg-[#f0edef] text-[#002645] hover:bg-[#eae7ea] hover:text-[#002645] transition-all relative cursor-pointer"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full animate-bounce"></span>
                )}
              </button>

              {/* Notification Overlay Popover Dropdown */}
              {showNotifMenu && (
                <div className="absolute right-0 mt-3 w-80 bg-white border border-[#e4e2e4] rounded-2xl shadow-xl z-50 p-4 space-y-3 font-sans">
                  <div className="flex justify-between items-center border-b border-[#f0edef] pb-2">
                    <span className="text-xs font-bold text-[#002645] uppercase tracking-wider">Lodge Alerts</span>
                    <button 
                      onClick={() => setShowNotifMenu(false)}
                      className="text-[10px] text-[#73777f] font-bold hover:underline"
                    >
                      Dismiss
                    </button>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {notifications.map(n => (
                      <div key={n.id} className="text-xs leading-relaxed">
                        <p className="font-bold text-[#1b1b1d]">{n.title}</p>
                        <p className="text-[#43474e] text-[11px] mt-0.5">{n.message}</p>
                        <span className="text-[9px] text-[#73777f] font-semibold mt-0.5 block">{n.date}</span>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <p className="text-center text-xs text-[#73777f] py-4">No logged notification logs found.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Info Card */}
            <div className="hidden sm:flex items-center gap-2.5 pr-1 pl-2.5 border-l border-[#e4e2e4]">
              {/* Profile Avatar Image depending on role */}
              <div className="w-8 h-8 rounded-full bg-[#002645]/10 overflow-hidden flex items-center justify-center shrink-0 border border-[#e4e2e4]">
                <img 
                  alt={username} 
                  className="w-full h-full object-cover" 
                  src={role === 'landlord'
                    ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuAMwnvNKfivoGNvNC9N5regRXFoTzJgjvygw0djDO-V3kLxr0Hy8prK6Rf3M7eqjVCcsY4Apprti87A1_xX0S9aIJUnk6pTxgqAHsoeDAdjAJ7elxN6Qy-ESwviqRsDX6d6JgEdcqtVRI5xDlnVAeMQTUI_xej9xSBYkSlgfc36PkFJ4ZuitjAA9R5PSRRVX9At_QfcjBLMS_Ux_m71L3CiwKnebuz0RO-Esm93lzAa_uC_pu6gvY1OJGjhmsKN0dNjOdLycbyWgiqE' 
                    : role === 'worker'
                      ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuBgHGl0k6f2XkLYjCLHl8a48TXjgy-Id98ps78OnE0wYtLYeuNe_SA4yid2BdyFcW72NvvX3QTFMKW2S31QWeq59noa99dscfJozILMQreMZHQdsc0PHSXD0e5EIvb9TE7fmsbiuZuJjR6Lz4WECW4S19uS50wvYbdJbxdvgGDRylaTrJhQhFiwhN9nARa_9fL6xs8Z2tDwqsJYhESjTEQmF8aARejNImS_FH9kV5YbJu-Ve_Ikaz_vvgOX0gmzBZfj1AodlcycXiGb'
                      : tenantAvatar
                  } 
                />
              </div>
              <div className="hidden lg:block text-left leading-none">
                <p className="text-xs font-black text-[#002645]">{username}</p>
                <p className="text-[9px] font-bold text-[#73777f] tracking-wide mt-1 uppercase">
                  {role === 'landlord' ? 'LANDLORD ADMINISTRATOR' : role === 'worker' ? 'MAINTENANCE WORKER' : 'APT 4B RESIDENT'}
                </p>
              </div>
            </div>

            {/* Mobile quick signout drawer (Hidden on Desktop as sidebar handles it) */}
            <button 
              onClick={handleSignOut}
              className="p-2 rounded-xl text-red-600 hover:bg-red-50 md:hidden"
              title="Sign Out Session"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        {/* WORKSPACE AREA CONTAINER SCREEN ROUTING */}
        <main className="p-3 sm:p-4 md:p-10 pb-28 md:pb-10 flex-1 overflow-y-auto max-w-7xl w-full mx-auto">
          {/* If tenant requested quick payment, show payment flow checkouts */}
          {expressPayMethod !== null ? (
            <PaymentFlow 
              initialMethod={expressPayMethod} 
              onClose={() => setExpressPayMethod(null)} 
            />
          ) : (
            /* Standard Tabs Routing */
            (() => {
              if (role === 'landlord') {
                switch(activeTab) {
                  case 'dashboard':
                    return <LandlordDashboard onNavigate={setActiveTab} />;
                  case 'properties':
                    return <LandlordProperties />;
                  case 'marketplace':
                    return <HousingMarketplace />;
                  case 'maintenance':
                    return <MaintenanceHistory />;
                  case 'locks':
                    return <SmartLocks />;
                  case 'payouts':
                    return <PayoutSettings />;
                  default:
                    return <LandlordDashboard onNavigate={setActiveTab} />;
                }
              } else if (role === 'worker') {
                switch(activeTab) {
                  case 'dashboard':
                    return <WorkerDashboard />;
                  case 'maintenance_list':
                    return <MaintenanceHistory />;
                  default:
                    return <WorkerDashboard />;
                }
              } else {
                switch(activeTab) {
                  case 'dashboard':
                    return <TenantDashboard 
                      onPayRent={(method) => setExpressPayMethod(method)} 
                      onNavigate={setActiveTab}
                    />;
                  case 'request_repair':
                    return <MaintenanceForm onClose={() => setActiveTab('dashboard')} />;
                  case 'marketplace':
                    return <HousingMarketplace />;
                  case 'maintenance_list':
                    return <MaintenanceHistory />;
                  default:
                    return <TenantDashboard onPayRent={(method) => setExpressPayMethod(method)}  onNavigate={setActiveTab} />;
                }
              }
            })()
          )}
        </main>

        {/* MOBILE NAVIGATION BAR TABS (Visible only on SM/XS screens, hidden on MD+) */}
        <nav className="md:hidden border-t border-[#e4e2e4] bg-white h-[76px] fixed bottom-0 left-0 right-0 z-40 flex items-center gap-1 overflow-x-auto px-2 pt-1 pb-2 shadow-lg">
          {role === 'landlord' ? (
            /* Landlord links */
            <>
              <button 
                onClick={() => { setActiveTab('dashboard'); setExpressPayMethod(null); }}
                className={mobileNavButtonClass(activeTab === 'dashboard')}
              >
                <LayoutDashboard className="h-5 w-5" />
                <span className="text-[10px] font-bold">Home</span>
              </button>
              <button 
                onClick={() => { setActiveTab('properties'); setExpressPayMethod(null); }}
                className={mobileNavButtonClass(activeTab === 'properties')}
              >
                <Building className="h-5 w-5" />
                <span className="text-[10px] font-bold">Portfolio</span>
              </button>
              <button 
                onClick={() => { setActiveTab('marketplace'); setExpressPayMethod(null); }}
                className={mobileNavButtonClass(activeTab === 'marketplace')}
              >
                <MapPin className="h-5 w-5" />
                <span className="text-[10px] font-bold">Market</span>
              </button>
              <button 
                onClick={() => { setActiveTab('maintenance'); setExpressPayMethod(null); }}
                className={mobileNavButtonClass(activeTab === 'maintenance')}
              >
                <Wrench className="h-5 w-5" />
                <span className="text-[10px] font-bold">Repairs</span>
              </button>
              <button 
                onClick={() => { setActiveTab('locks'); setExpressPayMethod(null); }}
                className={mobileNavButtonClass(activeTab === 'locks')}
              >
                <Lock className="h-4.5 w-4.5" />
                <span className="text-[9px] font-bold">Locks</span>
              </button>
              <button 
                onClick={() => { setActiveTab('payouts'); setExpressPayMethod(null); }}
                className={mobileNavButtonClass(activeTab === 'payouts')}
              >
                <Coins className="h-4.5 w-4.5" />
                <span className="text-[9px] font-bold">Payouts</span>
              </button>
            </>
          ) : role === 'worker' ? (
            <>
              <button
                onClick={() => { setActiveTab('dashboard'); setExpressPayMethod(null); }}
                className={mobileNavButtonClass(activeTab === 'dashboard')}
              >
                <HardHat className="h-5 w-5" />
                <span className="text-[10px] font-bold">Jobs</span>
              </button>
              <button
                onClick={() => { setActiveTab('maintenance_list'); setExpressPayMethod(null); }}
                className={mobileNavButtonClass(activeTab === 'maintenance_list')}
              >
                <Wrench className="h-5 w-5" />
                <span className="text-[10px] font-bold">Tickets</span>
              </button>
            </>
          ) : (
            /* Tenant links */
            <>
              <button 
                onClick={() => { setActiveTab('dashboard'); setExpressPayMethod(null); }}
                className={mobileNavButtonClass(activeTab === 'dashboard')}
              >
                <LayoutDashboard className="h-5 w-5" />
                <span className="text-[10px] font-bold">Apartment</span>
              </button>
              <button 
                onClick={() => { setExpressPayMethod('M-Pesa'); }}
                className={mobileNavButtonClass(expressPayMethod !== null)}
              >
                <CreditCard className="h-5 w-5" />
                <span className="text-[10px] font-bold">Pay Rent</span>
              </button>
              <button 
                onClick={() => { setActiveTab('marketplace'); setExpressPayMethod(null); }}
                className={mobileNavButtonClass(activeTab === 'marketplace')}
              >
                <MapPin className="h-5 w-5" />
                <span className="text-[10px] font-bold">Houses</span>
              </button>
              <button 
                onClick={() => { setActiveTab('request_repair'); setExpressPayMethod(null); }}
                className={mobileNavButtonClass(activeTab === 'request_repair')}
              >
                <Wrench className="h-5 w-5" />
                <span className="text-[10px] font-bold">Repair</span>
              </button>
              <button 
                onClick={() => { setActiveTab('maintenance_list'); setExpressPayMethod(null); }}
                className={mobileNavButtonClass(activeTab === 'maintenance_list')}
              >
                <ArrowLeftRight className="h-5 w-5" />
                <span className="text-[10px] font-bold">History</span>
              </button>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <RenziyProvider>
      <AppContent />
    </RenziyProvider>
  );
}
