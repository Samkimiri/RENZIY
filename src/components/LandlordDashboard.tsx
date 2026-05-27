import React, { useState } from 'react';
import { useRenziy } from '../state';
import { Property, Unit, Payment, MaintenanceRequest } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, Users2, CreditCard, ChevronRight, Plus, Wrench, ShieldAlert, CheckCircle2, Clock, Filter, X, ArrowUpRight, DollarSign, ArrowRightLeft, Lock } from 'lucide-react';

export default function LandlordDashboard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { 
    properties, 
    units, 
    payments, 
    maintenanceRequests, 
    recordPayment, 
    addProperty, 
    addTenantToUnit,
    tenantBalance
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

  const [paymentUnitId, setPaymentUnitId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentTenantName, setPaymentTenantName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'M-Pesa' | 'Card'>('M-Pesa');

  // Table filter options
  const [paymentFilter, setPaymentFilter] = useState<'All' | 'Paid' | 'Pending'>('All');

  // Compute live Landlord Metrics
  const totalProperties = properties.length;
  const totalUnits = units.length;
  const occupiedUnits = units.filter(u => u.status === 'Occupied').length;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  
  // Total collected rent
  const totalCollected = payments
    .filter(p => p.status === 'Paid')
    .reduce((sum, p) => sum + p.amount, 0);

  // Outstanding rent (Pending/Overdue from payments database)
  const totalOutstanding = payments
    .filter(p => p.status === 'Pending' || p.status === 'Overdue')
    .reduce((sum, p) => sum + p.amount, 0);

  // Maintenance metrics
  const activeRequests = maintenanceRequests.filter(r => r.status !== 'Resolved');
  const emergencyCount = activeRequests.filter(r => r.urgency === 'Emergency').length;
  const openCount = activeRequests.filter(r => r.status === 'Submitted' || r.status === 'Acknowledged').length;
  const inProgressCount = activeRequests.filter(r => r.status === 'In Progress').length;

  // Filtered Payments list
  const filteredPayments = payments.filter(p => {
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
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0-lP6mcA6HIE4LbzTr765rwiEop89MIpJdvoyF11DN-epOhG7wzLR2vlsvvbIs-eHfUJNUdibFBNajQHHbWzJeqHMFacPNozVQz5c_cpg8uv7fiB71TnE1n_AKhKhic2o8RClwzPHlK1tGsw0MkRGgTOyoCDxd_DliMftNntarn6QL0T4rOntvVbWuKWKfj7-n8nt8R7oxKRysKqzqbaLI_o1dRnqkJ-65xCIUfuKl4jxyeydhAO2IpAgSOxBrOIkfgdT45kPYn1w'
    });
    setNewPropName('');
    setNewPropAddress('');
    setNewPropUnits(4);
    setShowPropertyModal(false);
  };

  const handleRegisterTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitId || !newTenantName) return;
    addTenantToUnit(selectedUnitId, newTenantName);
    setSelectedUnitId('');
    setNewTenantName('');
    setShowTenantModal(false);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount) return;
    
    // Attempt to locate unit detail for metadata
    const associatedUnit = units.find(u => u.id === paymentUnitId);
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
    <div className="bg-[#E8F4FD] min-h-screen text-[#1b1b1d] pb-24 md:pb-12">
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
      <section className="mb-8 grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 bg-white rounded-2xl shadow-sm border border-[#e4e2e4] flex flex-col justify-between">
          <span className="text-xs font-bold uppercase text-[#73777f] tracking-wider">Total Properties</span>
          <span className="text-3xl lg:text-4xl font-extrabold text-[#002645] mt-2 block">{totalProperties}</span>
        </div>
        <div className="p-5 bg-white rounded-2xl shadow-sm border border-[#e4e2e4] flex flex-col justify-between">
          <span className="text-xs font-bold uppercase text-[#73777f] tracking-wider">Total Units</span>
          <span className="text-3xl lg:text-4xl font-extrabold text-[#002645] mt-2 block">{totalUnits}</span>
        </div>
        <div className="p-5 bg-white rounded-2xl shadow-sm border border-[#e4e2e4] flex flex-col justify-between">
          <span className="text-xs font-bold uppercase text-[#73777f] tracking-wider">Occupancy Rate</span>
          <span className="text-3xl lg:text-4xl font-extrabold text-[#006c45] mt-2 block">{occupancyRate}%</span>
        </div>
        <div className="p-5 bg-white rounded-2xl shadow-sm border border-[#e4e2e4] flex flex-col justify-between">
          <span className="text-xs font-bold uppercase text-[#73777f] tracking-wider">Rent Collected</span>
          <span className="text-3xl lg:text-4xl font-extrabold text-[#002645] mt-2 block">
            KES {totalCollected.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="p-5 bg-white rounded-2xl shadow-sm border border-red-200 flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-xs font-bold uppercase text-red-600 tracking-wider">Outstanding Rent</span>
          <span className="text-3xl lg:text-4xl font-extrabold text-red-600 mt-2 block">
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
            className="flex items-center justify-between p-6 bg-[#006c45] text-white rounded-2xl text-left hover:brightness-105 active:scale-95 transition-all group shadow-sm cursor-pointer"
          >
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold uppercase text-emerald-200 tracking-widest">Transaction</span>
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

      {/* Payout Gateway Setup Indicator */}
      <section className="mb-8">
        <div className="bg-gradient-to-r from-[#002645] to-[#1a3c5e] p-6 rounded-3xl text-left text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#67f9b3]">Instant Settle Setup</span>
            <h3 className="text-lg font-bold text-white">Landlord Billing & Collections Routing</h3>
            <p className="text-xs text-slate-300">Set active bank routing codes, M-Pesa Shortcodes, or telephone targets to direct cash immediately.</p>
          </div>
          <button 
            onClick={() => onNavigate('payouts')}
            className="px-5 py-2.5 bg-[#67f9b3] text-[#002645] hover:brightness-110 active:scale-95 transition-all text-xs font-black rounded-xl cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <span>Configure payout method</span>
            <ChevronRight className="h-4 w-4" />
          </button>
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
                  <ArrowRightLeft className="h-5 w-5 text-[#006c45]" />
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
                    {units.filter(u => u.status === 'Vacant').map(u => (
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
                  <CreditCard className="h-5 w-5 text-[#006c45]" />
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
                      const unit = units.find(u => u.id === id);
                      if (unit) {
                        setPaymentAmount(unit.rentAmount.toString());
                        setPaymentTenantName(unit.tenantName || '');
                      }
                    }}
                    required
                  >
                    <option value="">-- Choose Unit --</option>
                    {units.filter(u => u.status === 'Occupied').map(u => (
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
                  className="w-full bg-[#006c45] text-white py-3.5 rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all text-sm mt-4 shadow-sm"
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
        className="fixed bottom-6 right-6 bg-[#002645] text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
      >
        <Plus className="h-6 w-6 text-white" />
      </button>
    </div>
  );
}
