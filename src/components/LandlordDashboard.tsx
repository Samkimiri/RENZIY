import React, { useState } from 'react';
import { useRenziy } from '../state';
import { Property, Unit, Payment, MaintenanceRequest } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, Users2, CreditCard, ChevronRight, Plus, Wrench, ShieldAlert, CheckCircle2, Clock, Filter, X, ArrowUpRight, DollarSign, ArrowRightLeft, Lock, Coins } from 'lucide-react';

export default function LandlordDashboard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const {
    properties,
    units,
    payments,
    maintenanceRequests,
    recordPayment,
    addProperty,
    addTenantToUnit,
    tenantBalance,
    members,
    registerMember,
    rentalApplications,
    approveRentalApplication,
    declineRentalApplication
  } = useRenziy();

  // Dialog Overlays State
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Form Field States
  const [newPropName, setNewPropName] = useState('');
  const [newPropAddress, setNewPropAddress] = useState('');
  const [newPropUnits, setNewPropUnits] = useState(4);

  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantPhone, setNewTenantPhone] = useState('');
  const [newTenantEmail, setNewTenantEmail] = useState('');

  const [paymentUnitId, setPaymentUnitId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentTenantName, setPaymentTenantName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'M-Pesa' | 'Card'>('M-Pesa');

  // Table filter options
  const [paymentFilter, setPaymentFilter] = useState<'All' | 'Paid' | 'Pending'>('All');

  const currentUserEmail = localStorage.getItem('renziy_user_email') || 'john@renziy.app';
  const ownsProperty = (property: Property) => (
    property.ownerEmail ? property.ownerEmail === currentUserEmail : currentUserEmail === 'john@renziy.app'
  );
  const portfolioProperties = properties.filter(ownsProperty);
  const portfolioPropertyIds = portfolioProperties.map(property => property.id);
  const portfolioPropertyNames = portfolioProperties.map(property => property.name);
  const portfolioUnits = units.filter(unit => portfolioPropertyIds.includes(unit.propertyId));
  const portfolioPayments = payments.filter(payment => portfolioPropertyNames.includes(payment.propertyName));
  const portfolioMaintenanceRequests = maintenanceRequests.filter(request => portfolioPropertyNames.includes(request.propertyName));
  const portfolioRentalApplications = rentalApplications.filter(application => (
    portfolioPropertyIds.includes(application.propertyId) ||
    portfolioPropertyNames.includes(application.propertyName) ||
    application.ownerEmail === currentUserEmail
  ));
  const portfolioMembers = members.filter(member => (
    member.role === 'landlord'
      ? member.email === currentUserEmail
      : !member.propertyName || portfolioPropertyNames.includes(member.propertyName)
  ));

  // Compute live Landlord Metrics
  const totalProperties = portfolioProperties.length;
  const totalUnits = portfolioUnits.length;
  const totalMembers = portfolioMembers.length;
  const occupiedUnits = portfolioUnits.filter(u => u.status === 'Occupied').length;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  // Total collected rent
  const totalCollected = portfolioPayments
    .filter(p => p.status === 'Paid')
    .reduce((sum, p) => sum + p.amount, 0);

  // Outstanding rent (Pending/Overdue from payments database)
  const totalOutstanding = portfolioPayments
    .filter(p => p.status === 'Pending' || p.status === 'Overdue')
    .reduce((sum, p) => sum + p.amount, 0);

  // Maintenance metrics
  const activeRequests = portfolioMaintenanceRequests.filter(r => r.status !== 'Resolved');
  const emergencyCount = activeRequests.filter(r => r.urgency === 'Emergency').length;
  const openCount = activeRequests.filter(r => r.status === 'Submitted' || r.status === 'Acknowledged').length;
  const inProgressCount = activeRequests.filter(r => r.status === 'In Progress').length;
  const pendingRentalApplicationCount = portfolioRentalApplications.filter(application => application.status !== 'Approved' && application.status !== 'Declined').length;

  // Filtered Payments list
  const filteredPayments = portfolioPayments.filter(p => {
    if (paymentFilter === 'All') return true;
    return p.status === paymentFilter;
  });

  const handleCreateProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropName || !newPropAddress) return;
    addProperty({
      name: newPropName,
      address: newPropAddress,
      unitsCount: Number(newPropUnits),
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0-lP6mcA6HIE4LbzTr765rwiEop89MIpJdvoyF11DN-epOhG7wzLR2vlsvvbIs-eHfUJNUdibFBNajQHHbWzJeqHMFacPNozVQz5c_cpg8uv7fiB71TnE1n_AKhKhic2o8RClwzPHlK1tGsw0MkRGgTOyoCDxd_DliMftNntarn6QL0T4rOntvVbWuKWKfj7-n8nt8R7oxKRysKqzqbaLI_o1dRnqkJ-65xCIUfuKl4jxyeydhAO2IpAgSOxBrOIkfgdT45kPYn1w',
      ownerEmail: currentUserEmail
    });
    setNewPropName('');
    setNewPropAddress('');
    setNewPropUnits(4);
    setShowPropertyModal(false);
  };

  const handleRegisterTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitId || !newTenantName || !newTenantPhone || !newTenantEmail) return;
    const selectedUnit = portfolioUnits.find(u => u.id === selectedUnitId);
    addTenantToUnit(selectedUnitId, newTenantName);
    await registerMember({
      role: 'tenant',
      name: newTenantName,
      phone: newTenantPhone,
      email: newTenantEmail.toLowerCase(),
      propertyName: selectedUnit?.propertyName,
      unitNumber: selectedUnit?.unitNumber,
      rentAmount: selectedUnit?.rentAmount
    });
    setSelectedUnitId('');
    setNewTenantName('');
    setNewTenantPhone('');
    setNewTenantEmail('');
    setShowTenantModal(false);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount) return;

    // Attempt to locate unit detail for metadata
    const associatedUnit = portfolioUnits.find(u => u.id === paymentUnitId);
    const tenant = paymentTenantName || associatedUnit?.tenantName || 'Anonymous Tenant';
    const propName = associatedUnit?.propertyName || 'General Portfolio';
    const unitNo = associatedUnit?.unitNumber || 'Generic';

    recordPayment({
      tenantName: tenant,
      unitNumber: unitNo,
      propertyName: propName,
      amount: Number(paymentAmount),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Paid',
      paymentMethod
    });

    setPaymentUnitId('');
    setPaymentAmount('');
    setPaymentTenantName('');
    setShowPaymentModal(false);
  };

  return (
    <div className="bg-[#fcf8fb] min-h-screen text-[#1b1b1d] pb-24 md:pb-12">
      {/* Proactive Lock Alerts Banner */}
      {totalOutstanding > 0 && (
        <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-100 rounded-xl text-amber-800">
              <Lock className="h-5 w-5 animate-pulse" />
            </div>
            <div className="leading-relaxed">
              <p className="font-extrabold text-[#002645] text-sm">Actionable Late Rent Detected (KES {totalOutstanding.toLocaleString()} Outstanding)</p>
              <p className="text-xs text-[#73777f] font-semibold mt-0.5">
                Some tenants are overdue on their bills. You can restrict door access remotely to prompt immediate settlement.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('locks')}
            className="self-start md:self-center px-4 py-2 bg-[#002645] hover:bg-[#1a3c5e] text-white text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
          >
            <span>Configure IoT locks</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <h2 className="text-lg font-bold uppercase tracking-wider text-[#002645] mb-4">Portfolio Analytics</h2>
      <section className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="min-w-0 p-5 bg-white rounded-2xl shadow-sm border border-[#e4e2e4] flex flex-col justify-between">
          <span className="text-xs font-bold uppercase text-[#73777f] tracking-wider">Total Properties</span>
          <span className="text-3xl lg:text-4xl font-extrabold text-[#002645] mt-2 block">{totalProperties}</span>
        </div>
        <div className="min-w-0 p-5 bg-white rounded-2xl shadow-sm border border-[#e4e2e4] flex flex-col justify-between">
          <span className="text-xs font-bold uppercase text-[#73777f] tracking-wider">Total Units</span>
          <span className="text-3xl lg:text-4xl font-extrabold text-[#002645] mt-2 block">{totalUnits}</span>
        </div>
        <div className="min-w-0 p-5 bg-white rounded-2xl shadow-sm border border-[#e4e2e4] flex flex-col justify-between">
          <span className="text-xs font-bold uppercase text-[#73777f] tracking-wider">Occupancy Rate</span>
          <span className="text-3xl lg:text-4xl font-extrabold text-emerald-600 mt-2 block">{occupancyRate}%</span>
        </div>
        <div className="min-w-0 p-5 bg-white rounded-2xl shadow-sm border border-emerald-200 flex flex-col justify-between">
          <span className="text-xs font-bold uppercase text-emerald-700 tracking-wider">Platform Members</span>
          <span className="text-3xl lg:text-4xl font-extrabold text-emerald-700 mt-2 block">{totalMembers}</span>
        </div>
        <div className="min-w-0 p-5 bg-white rounded-2xl shadow-sm border border-[#e4e2e4] flex flex-col justify-between">
          <span className="text-xs font-bold uppercase text-[#73777f] tracking-wider">Rent Collected</span>
          <span className="text-2xl lg:text-3xl 2xl:text-4xl font-extrabold text-[#002645] mt-2 block leading-tight break-words tabular-nums">
            KES {totalCollected.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="min-w-0 p-5 bg-white rounded-2xl shadow-sm border border-red-200 flex flex-col justify-between">
          <span className="text-xs font-bold uppercase text-red-600 tracking-wider">Outstanding Rent</span>
          <span className="text-2xl lg:text-3xl 2xl:text-4xl font-extrabold text-red-600 mt-2 block leading-tight break-words tabular-nums">
            KES {totalOutstanding.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </span>
        </div>
      </section>

      {/* Quick Actions Bento Grid */}
      <h2 className="text-lg font-bold uppercase tracking-wider text-[#002645] mb-4">Operations Console</h2>
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => setShowPropertyModal(true)}
            className="flex items-center justify-between p-6 bg-[#002645] text-white rounded-2xl text-left hover:opacity-95 active:scale-95 transition-all group shadow-sm cursor-pointer"
          >
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold uppercase text-[#87a7ce] tracking-widest">New Entry</span>
              <span className="text-xl font-bold mt-1">Add Property</span>
            </div>
            <div className="bg-white/10 p-3 rounded-xl group-hover:bg-white/20 transition-all">
              <Plus className="h-6 w-6 text-white" />
            </div>
          </button>

          <button
            onClick={() => setShowTenantModal(true)}
            className="flex items-center justify-between p-6 bg-white text-[#002645] rounded-2xl text-left hover:bg-slate-50 active:scale-95 transition-all group border border-[#e4e2e4] shadow-sm cursor-pointer"
          >
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold uppercase text-[#73777f] tracking-widest">Tenant Management</span>
              <span className="text-xl font-bold mt-1 text-[#002645]">Register Tenant</span>
            </div>
            <div className="bg-[#002645]/5 p-3 rounded-xl group-hover:bg-[#002645]/15 transition-all">
              <Users2 className="h-6 w-6 text-[#002645]" />
            </div>
          </button>

          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center justify-between p-6 bg-gradient-to-br from-[#1a3c5e] to-[#25527a] text-white rounded-2xl text-left hover:brightness-105 active:scale-95 transition-all group shadow-sm cursor-pointer"
          >
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold uppercase text-slate-200 tracking-widest">Transaction</span>
              <span className="text-xl font-bold mt-1">Record Payment</span>
            </div>
            <div className="bg-white/10 p-3 rounded-xl group-hover:bg-white/20 transition-all">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
          </button>

          <button
            onClick={() => onNavigate('locks')}
            className="flex items-center justify-between p-6 bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-2xl text-left hover:brightness-105 active:scale-95 transition-all group shadow-sm cursor-pointer"
          >
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold uppercase text-amber-100 tracking-widest">Security IoT</span>
              <span className="text-xl font-bold mt-1 font-sans">Smart Locks</span>
            </div>
            <div className="bg-white/10 p-3 rounded-xl group-hover:bg-white/25 transition-all">
              <Lock className="h-6 w-6 text-white" />
            </div>
          </button>
        </div>
      </section>

      <section className="mb-8">
        <div className="bg-white rounded-3xl border border-[#e4e2e4] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#e4e2e4] flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Tenant House Requests</span>
              <h3 className="text-xl font-extrabold text-[#002645] mt-1">Approve units after rent is paid</h3>
              <p className="text-xs text-[#73777f] mt-1">Requests submitted from the tenant marketplace appear here and can be approved once payment is marked as received.</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#E8F4FD] text-[#002645] border border-[#002645]/10 text-[10px] font-black uppercase tracking-wider">
              {pendingRentalApplicationCount} active request{pendingRentalApplicationCount === 1 ? '' : 's'}
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-4">
            {portfolioRentalApplications.slice(0, 6).map(application => (
              <div key={application.id} className="rounded-2xl border border-[#e4e2e4] bg-[#fcf8fb] p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-[#002645]">{application.propertyName}</h4>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                        application.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : application.status === 'Rent Paid'
                            ? 'bg-[#002645] text-white'
                            : application.status === 'Declined'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-800'
                      }`}>
                        {application.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#73777f] font-semibold mt-1">Unit {application.unitNumber} requested by {application.tenantName}</p>
                    <p className="text-[11px] text-[#43474e] mt-1">{application.tenantEmail}{application.tenantPhone ? ` - ${application.tenantPhone}` : ''}</p>
                  </div>
                  <div className="rounded-2xl bg-white border border-[#e4e2e4] p-3 min-w-36">
                    <span className="block text-[9px] font-black uppercase tracking-widest text-[#73777f]">Monthly rent</span>
                    <span className="block text-lg font-black text-[#002645]">KES {application.rentAmount.toLocaleString()}</span>
                    {application.paymentCode && (
                      <span className="block text-[9px] font-bold text-emerald-700 mt-1">{application.paymentCode}</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => approveRentalApplication(application.id)}
                    disabled={application.status !== 'Rent Paid'}
                    className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 transition-all"
                  >
                    Approve Unit
                  </button>
                  <button
                    type="button"
                    onClick={() => declineRentalApplication(application.id)}
                    disabled={application.status === 'Approved' || application.status === 'Declined'}
                    className="flex-1 rounded-xl border border-red-200 px-4 py-2.5 text-xs font-black text-red-700 hover:bg-red-50 disabled:bg-slate-100 disabled:text-slate-400 transition-all"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}

            {portfolioRentalApplications.length === 0 && (
              <div className="xl:col-span-2 rounded-2xl border border-dashed border-[#c3c6cf] bg-[#fcf8fb] p-8 text-center">
                <Users2 className="h-8 w-8 mx-auto text-[#002645]" />
                <h4 className="text-sm font-black text-[#002645] mt-3">No tenant house requests yet</h4>
                <p className="text-xs text-[#73777f] mt-1">When a tenant chooses a unit from the marketplace, the request will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Payout Gateway Setup Indicator */}
      <section className="mb-8">
        <div className="bg-gradient-to-r from-[#002645] to-[#1a3c5e] p-6 rounded-3xl text-left text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Instant Settle Setup</span>
            <h3 className="text-lg font-bold text-white">Landlord Billing & Collections Routing</h3>
            <p className="text-xs text-slate-300">Set active bank routing codes, M-Pesa Shortcodes, or telephone targets to direct cash immediately.</p>
          </div>
          <button
            onClick={() => onNavigate('payouts')}
            className="px-5 py-2.5 bg-emerald-600 text-white font-bold hover:bg-emerald-700 active:scale-95 transition-all text-xs rounded-xl cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <span>Configure payout method</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="mb-8">
        <div className="bg-white rounded-3xl border border-[#e4e2e4] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#e4e2e4] flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Live Member Registry</span>
              <h3 className="text-xl font-extrabold text-[#002645] mt-1">People joining the platform</h3>
              <p className="text-xs text-[#73777f] mt-1">Every completed portal onboarding is stored here with contact and apartment context.</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
              {totalMembers} saved profiles
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
            {portfolioMembers.slice(0, 4).map(member => (
              <div key={member.id} className="p-4 rounded-2xl border border-[#e4e2e4] bg-[#fcf8fb] flex gap-4 items-start">
                <div className="w-12 h-12 rounded-2xl bg-[#002645]/10 overflow-hidden flex items-center justify-center text-[#002645] font-black shrink-0 border border-white shadow-sm">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    member.name.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-extrabold text-[#002645] truncate">{member.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide ${
                      member.role === 'landlord' ? 'bg-[#002645] text-white' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {member.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#43474e] font-semibold mt-1 truncate">{member.email} • {member.phone}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-white rounded-xl p-2 border border-[#e4e2e4]">
                      <span className="block uppercase tracking-wider text-[#73777f] font-bold">Apartment</span>
                      <span className="block text-[#002645] font-black mt-0.5 truncate">{member.unitNumber || member.propertyName || 'Portfolio owner'}</span>
                    </div>
                    <div className="bg-white rounded-xl p-2 border border-[#e4e2e4]">
                      <span className="block uppercase tracking-wider text-[#73777f] font-bold">Joined</span>
                      <span className="block text-[#002645] font-black mt-0.5">{member.joinDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Grid: Maintenance & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

        {/* Maintenance Box */}
        <section className="lg:col-span-4 flex flex-col">
          <div className="p-6 bg-white rounded-2xl shadow-sm border border-[#e4e2e4] flex flex-col justify-between h-full">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-[#002645] flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-[#002645]" />
                  <span>Maintenance overview</span>
                </h3>
                <span className="text-xs font-bold text-[#73777f] uppercase bg-[#f0edef] px-2.5 py-1 rounded-full">
                  {activeRequests.length} Active
                </span>
              </div>

              <div className="space-y-3">
                <div
                  onClick={() => onNavigate('maintenance')}
                  className="flex justify-between items-center p-4 bg-red-50 hover:bg-red-100/50 rounded-xl border border-red-100 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-bold text-red-600">Emergency</span>
                  </div>
                  <span className="text-xl font-extrabold text-red-600">{emergencyCount}</span>
                </div>

                <div
                  onClick={() => onNavigate('maintenance')}
                  className="flex justify-between items-center p-4 bg-[#f6f3f5] hover:bg-[#f0edef] rounded-xl border border-[#e4e2e4] cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-[#002645]" />
                    <span className="text-sm font-semibold text-[#43474e]">Open Tickets</span>
                  </div>
                  <span className="text-xl font-bold text-[#1b1b1d]">{openCount}</span>
                </div>

                <div
                  onClick={() => onNavigate('maintenance')}
                  className="flex justify-between items-center p-4 bg-[#f6f3f5] hover:bg-[#f0edef] rounded-xl border border-[#e4e2e4] cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-[#43474e]" />
                    <span className="text-sm font-semibold text-[#43474e]">In Progress</span>
                  </div>
                  <span className="text-xl font-bold text-[#1b1b1d]">{inProgressCount}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('maintenance')}
              className="w-full mt-6 py-3 text-sm text-[#002645] font-bold border border-[#002645]/20 rounded-xl hover:bg-[#002645]/5 transition-all text-center"
            >
              View Maintenance Pipeline
            </button>
          </div>
        </section>

        {/* Recent Rent Logs */}
        <section className="lg:col-span-8 flex flex-col">
          <div className="p-6 bg-white rounded-2xl shadow-sm border border-[#e4e2e4] flex flex-col justify-between h-full">
            <div>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <h3 className="text-lg font-bold text-[#002645] flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-emerald-500" />
                  <span>Recent Payment Ledgers</span>
                </h3>

                {/* Filter pill selectors */}
                <div className="flex bg-[#f0edef] p-1 rounded-lg self-start">
                  {(['All', 'Paid', 'Pending'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setPaymentFilter(f)}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${paymentFilter === f ? 'bg-[#002645] text-white shadow-xs' : 'text-[#43474e] hover:text-[#002645]'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#e4e2e4]">
                      <th className="pb-3 text-xs font-bold uppercase text-[#73777f] tracking-wider">Tenant</th>
                      <th className="pb-3 text-xs font-bold uppercase text-[#73777f] tracking-wider">Unit / Property</th>
                      <th className="pb-3 text-xs font-bold uppercase text-[#73777f] tracking-wider">Date</th>
                      <th className="pb-3 text-xs font-bold uppercase text-[#73777f] tracking-wider">Amount</th>
                      <th className="pb-3 text-xs font-bold uppercase text-[#73777f] tracking-wider text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0edef]">
                    {filteredPayments.map(p => (
                      <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#002645]/10 flex items-center justify-center text-[#002645] font-extrabold text-xs">
                              {p.tenantName.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-bold text-sm text-[#1b1b1d]">{p.tenantName}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <p className="font-bold text-xs text-[#002645]">{p.unitNumber}</p>
                          <p className="text-[10px] text-[#73777f]">{p.propertyName}</p>
                        </td>
                        <td className="py-4 text-xs font-semibold text-[#43474e]">
                          {p.date}
                        </td>
                        <td className="py-4 font-bold text-sm text-[#002645]">
                          KES {p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 text-right">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold ${
                            p.status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : p.status === 'Pending'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredPayments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-xs text-[#73777f] font-semibold">
                          No logging items recorded under this filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t border-[#e4e2e4] pt-4 mt-4 flex justify-between items-center text-xs text-[#73777f] font-bold">
              <span>Automatic M-Pesa ledger sync is live</span>
              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-ping"></span>
            </div>
          </div>
        </section>
      </div>

      {/* DIALOG OVERLAYS (MODALS) */}

      {/* 1. Add Property Modal */}
      <AnimatePresence>
        {showPropertyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPropertyModal(false)}
              className="absolute inset-0 bg-[#002645]/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 border border-[#e4e2e4] shadow-xl relative z-10"
            >
              <button
                onClick={() => setShowPropertyModal(false)}
                className="absolute top-4 right-4 text-[#73777f] hover:text-[#002645] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-4">
                <h3 className="text-xl font-bold text-[#002645] flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#002645]" />
                  <span>Register Property</span>
                </h3>
                <p className="text-xs text-[#73777f] mt-1">Establish a new asset container in your portfolio.</p>
              </div>

              <form onSubmit={handleCreateProperty} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-[#002645] tracking-wider px-1">Property Name</label>
                  <input
                    className="w-full bg-[#f6f3f5] rounded-xl p-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#002645]/20 text-[#1b1b1d] font-semibold"
                    placeholder="e.g. Oakwood Heights"
                    value={newPropName}
                    onChange={(e) => setNewPropName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-[#002645] tracking-wider px-1">Street Address</label>
                  <input
                    className="w-full bg-[#f6f3f5] rounded-xl p-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#002645]/20 text-[#1b1b1d] font-semibold"
                    placeholder="e.g. 1200 Pine St, Seattle, WA"
                    value={newPropAddress}
                    onChange={(e) => setNewPropAddress(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-[#002645] tracking-wider px-1">Number of Units to Auto-Gen</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    className="w-full bg-[#f6f3f5] rounded-xl p-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#002645]/20 text-[#1b1b1d] font-semibold"
                    value={newPropUnits}
                    onChange={(e) => setNewPropUnits(Number(e.target.value))}
                    required
                  />
                  <p className="text-[10px] text-[#73777f] px-1">Renziy will automatically create these numerical active units.</p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#002645] text-white py-3.5 rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all text-sm mt-4 shadow-sm"
                >
                  Create Property Container
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Add Tenant Modal */}
      <AnimatePresence>
        {showTenantModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTenantModal(false)}
              className="absolute inset-0 bg-[#002645]/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 border border-[#e4e2e4] shadow-xl relative z-10"
            >
              <button
                onClick={() => setShowTenantModal(false)}
                className="absolute top-4 right-4 text-[#73777f] hover:text-[#002645] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-4">
                <h3 className="text-xl font-bold text-[#002645] flex items-center gap-2">
                  <Users2 className="h-5 w-5 text-[#002645]" />
                  <span>Register Tenant</span>
                </h3>
                <p className="text-xs text-[#73777f] mt-1">Onboard a citizen into an available empty portfolio unit.</p>
              </div>

              <form onSubmit={handleRegisterTenant} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-[#002645] tracking-wider px-1">Select Available Unit</label>
                  <select
                    className="w-full bg-[#f6f3f5] rounded-xl p-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#002645]/20 text-[#1b1b1d] font-semibold appearance-none"
                    value={selectedUnitId}
                    onChange={(e) => setSelectedUnitId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Unit --</option>
                    {portfolioUnits.filter(u => u.status === 'Vacant').map(u => (
                      <option key={u.id} value={u.id}>
                        {u.propertyName} - Unit {u.unitNumber} (KES {u.rentAmount.toLocaleString()}/mo)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-[#002645] tracking-wider px-1">Full Name</label>
                  <input
                    className="w-full bg-[#f6f3f5] rounded-xl p-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#002645]/20 text-[#1b1b1d] font-semibold"
                    placeholder="e.g. Jane Doe"
                    value={newTenantName}
                    onChange={(e) => setNewTenantName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-[#002645] tracking-wider px-1">Phone</label>
                    <input
                      className="w-full bg-[#f6f3f5] rounded-xl p-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#002645]/20 text-[#1b1b1d] font-semibold"
                      placeholder="0712345678"
                      value={newTenantPhone}
                      onChange={(e) => setNewTenantPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-[#002645] tracking-wider px-1">Email</label>
                    <input
                      type="email"
                      className="w-full bg-[#f6f3f5] rounded-xl p-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#002645]/20 text-[#1b1b1d] font-semibold"
                      placeholder="tenant@example.com"
                      value={newTenantEmail}
                      onChange={(e) => setNewTenantEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#002645] text-white py-3.5 rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all text-sm mt-4 shadow-sm"
                >
                  Onboard Active Resident
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Record Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPaymentModal(false)}
              className="absolute inset-0 bg-[#002645]/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 border border-[#e4e2e4] shadow-xl relative z-10"
            >
              <button
                onClick={() => setShowPaymentModal(false)}
                className="absolute top-4 right-4 text-[#73777f] hover:text-[#002645] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-4">
                <h3 className="text-xl font-bold text-[#002645] flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-500" />
                  <span>Manual Rent Logging</span>
                </h3>
                <p className="text-xs text-[#73777f] mt-1">Record manual cash, wire, or card collections offline.</p>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-[#002645] tracking-wider px-1">Source Tenant / Apartment</label>
                  <select
                    className="w-full bg-[#f6f3f5] rounded-xl p-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#002645]/20 text-[#1b1b1d] font-semibold appearance-none"
                    value={paymentUnitId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setPaymentUnitId(id);
                      const unit = portfolioUnits.find(u => u.id === id);
                      if (unit) {
                        setPaymentAmount(unit.rentAmount.toString());
                        setPaymentTenantName(unit.tenantName || '');
                      }
                    }}
                    required
                  >
                    <option value="">-- Choose Unit --</option>
                    {portfolioUnits.filter(u => u.status === 'Occupied').map(u => (
                      <option key={u.id} value={u.id}>
                        {u.propertyName} - Room {u.unitNumber} ({u.tenantName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-[#002645] tracking-wider px-1">Tenant Name (Verify)</label>
                  <input
                    className="w-full bg-[#f6f3f5] rounded-xl p-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#002645]/20 text-[#1b1b1d] font-semibold"
                    placeholder="Jane Doe"
                    value={paymentTenantName}
                    onChange={(e) => setPaymentTenantName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-[#002645] tracking-wider px-1">Rent Amount Collected (KES)</label>
                  <input
                    type="number"
                    className="w-full bg-[#f6f3f5] rounded-xl p-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#002645]/20 text-[#1b1b1d] font-semibold"
                    placeholder="185000"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-[#002645] tracking-wider px-1">Payment Channel</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-[#f0edef] rounded-lg">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('M-Pesa')}
                      className={`py-2 text-xs font-bold rounded-md transition-all ${paymentMethod === 'M-Pesa' ? 'bg-[#002645] text-white shadow-xs' : 'text-[#43474e]'}`}
                    >
                      M-Pesa STK
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Card')}
                      className={`py-2 text-xs font-bold rounded-md transition-all ${paymentMethod === 'Card' ? 'bg-[#002645] text-white shadow-xs' : 'text-[#43474e]'}`}
                    >
                      Credit Card (FW)
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-700 active:scale-95 transition-all text-sm mt-4 shadow-sm cursor-pointer"
                >
                  Commit Rent Payment
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FAB Floating action button for landlord dashboard */}
      <button
        onClick={() => setShowPropertyModal(true)}
        className="fixed bottom-24 md:bottom-6 right-4 md:right-6 bg-[#002645] text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
      >
        <Plus className="h-6 w-6 text-white" />
      </button>
    </div>
  );
}
