import React, { useState } from 'react';
import { RenziyProvider, useRenziy } from './state';
import LandingPage from './components/LandingPage';
import LandlordDashboard from './components/LandlordDashboard';
import LandlordProperties from './components/LandlordProperties';
import TenantDashboard from './components/TenantDashboard';
import PaymentFlow from './components/PaymentFlow';
import MaintenanceForm from './components/MaintenanceForm';
import MaintenanceHistory from './components/MaintenanceHistory';
import { Building2, LayoutDashboard, Building, Wrench, CreditCard, LogOut, Bell, User, Menu, X, ArrowLeftRight, HelpCircle } from 'lucide-react';

function AppContent() {
  const { role, setRole, username, notifications, markNotificationsAsRead } = useRenziy();
  
  // Navigation active tab inside dashboards
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Custom quick payment state parameters
  const [expressPayMethod, setExpressPayMethod] = useState<'M-Pesa' | 'Card' | null>(null);

  // Notifications bell dropdown popover
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const unreadNotifCount = notifications.filter(n => n.unread).length;

  const handleSignOut = () => {
    setRole('anonymous');
    setActiveTab('dashboard');
    setExpressPayMethod(null);
  };

  // If anonymous guest or not logged in, render the gorgeous splash Landing Page
  if (role === 'anonymous') {
    return <LandingPage />;
  }

  return (
    <div className="bg-[#E8F4FD] min-h-screen text-[#1b1b1d] font-sans flex flex-col md:flex-row">
      
      {/* SIDEBAR NAVIGATION (Visible on Desktop / MD screens and up) */}
      <aside className="hidden md:flex flex-col w-64 bg-[#002645] text-white p-6 shrink-0 relative justify-between">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-2 pb-6 border-b border-white/10">
            <Building2 className="text-[#67f9b3] h-6 w-6" />
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
                  onClick={() => { setActiveTab('maintenance'); setExpressPayMethod(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'maintenance' ? 'bg-[#1a3c5e] text-white shadow-sm' : 'text-[#87a7ce] hover:text-white hover:bg-white/5'}`}
                >
                  <Wrench className="h-4 w-4" />
                  <span>Maintenance Orders</span>
                </button>
              </>
            ) : (
              /* Tenant Menu Links (Alex Smith) */
              <>
                <button 
                  onClick={() => { setActiveTab('dashboard'); setExpressPayMethod(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'dashboard' ? 'bg-[#1a3c5e] text-white shadow-sm' : 'text-[#87a7ce] hover:text-white hover:bg-white/5'}`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Alex's Apartment</span>
                </button>
                <button 
                  onClick={() => { setExpressPayMethod('M-Pesa'); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${expressPayMethod !== null ? 'bg-[#1a3c5e] text-white shadow-sm' : 'text-[#87a7ce] hover:text-white hover:bg-white/5'}`}
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Express Rent Pay</span>
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
        <header className="h-16 bg-white border-b border-[#e4e2e4] px-4 md:px-10 flex items-center justify-between z-30 shrink-0 sticky top-0 shadow-sm">
          {/* Mobile logo description (Hidden on Desktop Sidebar) */}
          <div className="flex items-center gap-2 md:hidden">
            <Building2 className="text-[#002645] h-5 w-5" />
            <span className="font-extrabold text-[#002645] text-lg tracking-tight">Renziy</span>
          </div>

          {/* Desktop Left status indicator */}
          <div className="hidden md:flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-extrabold text-[#73777f] uppercase tracking-wider">
              Secure {role === 'landlord' ? 'Landlord Control' : 'Alex Tenant'} Ledger Active
            </span>
          </div>

          <div className="flex items-center gap-4 relative">
            {/* Quick Demo Mode switcher (Incredibly helpful for users evaluating both sides!) */}
            <button 
              onClick={() => {
                setRole(role === 'landlord' ? 'tenant' : 'landlord');
                setActiveTab('dashboard');
                setExpressPayMethod(null);
              }}
              className="text-[10px] uppercase bg-[#67f9b3]/20 hover:bg-[#67f9b3]/30 text-[#007149] px-3 py-1 rounded-full font-black border border-[#67f9b3]/40 tracking-wider transition-all"
            >
              Switch target to: {role === 'landlord' ? 'Alex (Tenant)' : 'Admin landlord'}
            </button>

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
            <div className="flex items-center gap-2.5 pr-1 pl-2.5 border-l border-[#e4e2e4]">
              {/* Profile Avatar Image depending on role */}
              <div className="w-8 h-8 rounded-full bg-[#002645]/10 overflow-hidden flex items-center justify-center shrink-0 border border-[#e4e2e4]">
                <img 
                  alt={username} 
                  className="w-full h-full object-cover" 
                  src={role === 'landlord' 
                    ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuAMwnvNKfivoGNvNC9N5regRXFoTzJgjvygw0djDO-V3kLxr0Hy8prK6Rf3M7eqjVCcsY4Apprti87A1_xX0S9aIJUnk6pTxgqAHsoeDAdjAJ7elxN6Qy-ESwviqRsDX6d6JgEdcqtVRI5xDlnVAeMQTUI_xej9xSBYkSlgfc36PkFJ4ZuitjAA9R5PSRRVX9At_QfcjBLMS_Ux_m71L3CiwKnebuz0RO-Esm93lzAa_uC_pu6gvY1OJGjhmsKN0dNjOdLycbyWgiqE' 
                    : 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOcbVtz4Nz5aTDAR2DZW9Pg9F6e65oPi6Td2jZ84CEwLXgn5HrvYocGZaVvLRdcS9eUaqLENJ27o2RqpElz14uBPV47JROuDd4JkbKG4lK3vapbE6KOkie8PQbaMTqlvURqdmEzyOUTLS-bssVrQp56st-qoqgO1NFNrdLvXPdL5SwnjZzSChp5a_s4toIffdm_8W02EPKg7MLqi3poWL6UDKib0nkwFBjpcLb7YMRsPtiVkMFt4jFzqbDf0SOuGuynYq7GjnWhyHB'
                  } 
                />
              </div>
              <div className="hidden lg:block text-left leading-none">
                <p className="text-xs font-black text-[#002645]">{username}</p>
                <p className="text-[9px] font-bold text-[#73777f] tracking-wide mt-1 uppercase">
                  {role === 'landlord' ? 'LANDLORD ADMINISTRATOR' : 'APT 4B RESIDENT'}
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
        <main className="p-4 md:p-10 flex-1 overflow-y-auto max-w-7xl w-full mx-auto">
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
                    return <LandlordDashboard onNavigate={(tab) => {
                      if (tab === 'maintenance') {
                        setActiveTab('maintenance');
                      }
                    }} />;
                  case 'properties':
                    return <LandlordProperties />;
                  case 'maintenance':
                    return <MaintenanceHistory />;
                  default:
                    return <LandlordDashboard onNavigate={setActiveTab} />;
                }
              } else {
                switch(activeTab) {
                  case 'dashboard':
                    return <TenantDashboard 
                      onPayRent={(method) => setExpressPayMethod(method)} 
                      onNavigate={(tab) => {
                        if (tab === 'request_repair') {
                          setActiveTab('request_repair');
                        } else if (tab === 'maintenance_list') {
                          setActiveTab('maintenance_list');
                        }
                      }} 
                    />;
                  case 'request_repair':
                    return <MaintenanceForm onClose={() => setActiveTab('dashboard')} />;
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
        <nav className="md:hidden border-t border-[#e4e2e4] bg-white h-16 fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 shadow-lg">
          {role === 'landlord' ? (
            /* Landlord links */
            <>
              <button 
                onClick={() => { setActiveTab('dashboard'); setExpressPayMethod(null); }}
                className={`flex flex-col items-center gap-1 p-1 cursor-pointer ${activeTab === 'dashboard' ? 'text-[#002645]' : 'text-[#73777f]'}`}
              >
                <LayoutDashboard className="h-5 w-5" />
                <span className="text-[10px] font-bold">Home</span>
              </button>
              <button 
                onClick={() => { setActiveTab('properties'); setExpressPayMethod(null); }}
                className={`flex flex-col items-center gap-1 p-1 cursor-pointer ${activeTab === 'properties' ? 'text-[#002645]' : 'text-[#73777f]'}`}
              >
                <Building className="h-5 w-5" />
                <span className="text-[10px] font-bold">Portfolio</span>
              </button>
              <button 
                onClick={() => { setActiveTab('maintenance'); setExpressPayMethod(null); }}
                className={`flex flex-col items-center gap-1 p-1 cursor-pointer ${activeTab === 'maintenance' ? 'text-[#002645]' : 'text-[#73777f]'}`}
              >
                <Wrench className="h-5 w-5" />
                <span className="text-[10px] font-bold">Repairs</span>
              </button>
            </>
          ) : (
            /* Alex Smith tenant links */
            <>
              <button 
                onClick={() => { setActiveTab('dashboard'); setExpressPayMethod(null); }}
                className={`flex flex-col items-center gap-1 p-1 cursor-pointer ${activeTab === 'dashboard' ? 'text-[#002645]' : 'text-[#73777f]'}`}
              >
                <LayoutDashboard className="h-5 w-5" />
                <span className="text-[10px] font-bold">Apartment</span>
              </button>
              <button 
                onClick={() => { setExpressPayMethod('M-Pesa'); }}
                className={`flex flex-col items-center gap-1 p-1 cursor-pointer ${expressPayMethod !== null ? 'text-[#002645]' : 'text-[#73777f]'}`}
              >
                <CreditCard className="h-5 w-5" />
                <span className="text-[10px] font-bold">Pay Rent</span>
              </button>
              <button 
                onClick={() => { setActiveTab('request_repair'); setExpressPayMethod(null); }}
                className={`flex flex-col items-center gap-1 p-1 cursor-pointer ${activeTab === 'request_repair' ? 'text-[#002645]' : 'text-[#73777f]'}`}
              >
                <Wrench className="h-5 w-5" />
                <span className="text-[10px] font-bold">Repair</span>
              </button>
              <button 
                onClick={() => { setActiveTab('maintenance_list'); setExpressPayMethod(null); }}
                className={`flex flex-col items-center gap-1 p-1 cursor-pointer ${activeTab === 'maintenance_list' ? 'text-[#002645]' : 'text-[#73777f]'}`}
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
