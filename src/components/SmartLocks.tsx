import React, { useState } from 'react';
import { useRenziy } from '../state';
import { Unit } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Key, 
  Search, 
  AlertCircle,
  FileText,
  Clock,
  CheckCircle2,
  Signal,
  Cpu,
  RefreshCw,
  Sliders,
  X,
  LockKeyhole
} from 'lucide-react';

export default function SmartLocks() {
  const { units, payments, tenantBalance, toggleUnitLock } = useRenziy();

  // Filters and UI Controls
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unsettled' | 'locked'>('all');

  // Modal State for Toggling Lock
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [lockReason, setLockReason] = useState('Rent payment overdue (Pending M-Pesa settlement)');
  const [isSubmitModeLock, setIsSubmitModeLock] = useState(true);

  // Simulated IoT Hardware connection status
  const [transmitting, setTransmitting] = useState(false);
  const [transmissionSteps, setTransmissionSteps] = useState<string[]>([]);
  const [transmissionProgress, setTransmissionProgress] = useState(0);

  // Compute stats helper
  // Is tenant overdue? Helper function to join logic
  const isTenantOverdue = (unit: Unit) => {
    if (!unit.tenantName) return false;
    // Alex Smith balance
    if ((unit.tenantName === 'Alex Smith' || unit.tenantName === 'Alex') && tenantBalance > 0) {
      return true;
    }
    // General payment check for "Pending" or "Overdue" status matching tenant
    const hasUnsettledLedger = payments.some(
      p => p.tenantName === unit.tenantName && p.status === 'Pending'
    );
    return hasUnsettledLedger;
  };

  const getOverdueAmount = (unit: Unit) => {
    if (!unit.tenantName) return 0;
    if (unit.tenantName === 'Alex Smith' || unit.tenantName === 'Alex') {
      return tenantBalance;
    }
    const matchingPayment = payments.find(
      p => p.tenantName === unit.tenantName && p.status === 'Pending'
    );
    return matchingPayment ? matchingPayment.amount : 0;
  };

  // Filter Units based on search & filter mode
  const filteredUnits = units.filter(u => {
    // Only locked or occupied units with smart lock compatibility
    const matchesSearch = 
      u.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.tenantName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.propertyName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Lock constraint or occupancy status
    if (filterMode === 'all') return matchesSearch;
    if (filterMode === 'locked') return matchesSearch && u.isLocked;
    if (filterMode === 'unsettled') return matchesSearch && isTenantOverdue(u);

    return matchesSearch;
  });

  // Stats
  const totalIoTUnits = units.filter(u => u.status === 'Occupied').length;
  const totalLockedUnits = units.filter(u => u.isLocked).length;
  const totalOverdueUnits = units.filter(u => isTenantOverdue(u)).length;
  const signalStrength = "Excellent (98%)";

  // Simulate Lock trigger pipeline
  const executeSmartLockChange = async (unit: Unit, engageLock: boolean) => {
    setSelectedUnit(null); // Close base modal
    setTransmitting(true);
    setTransmissionProgress(0);
    setTransmissionSteps([]);

    const steps = [
      "Securing encrypted websocket endpoint...",
      "Performing remote SSH auth on smart deadbolt...",
      engageLock 
        ? "Transmitting 256-bit Lockout instruction bytecode..." 
        : "Sending remote release command string...",
      "Awaiting physical locking hub callback telemetry...",
      engageLock 
        ? "🔒 Hardware Lock Successfully Engaged." 
        : "🔑 Safe Release Token verified. Door Unlocked."
    ];

    for (let i = 0; i < steps.length; i++) {
      // Delay for realistic physical IoT transmission effect
      await new Promise(resolve => setTimeout(resolve, i === 4 ? 1100 : 700));
      setTransmissionSteps(prev => [...prev, steps[i]]);
      setTransmissionProgress(Math.round(((i + 1) / steps.length) * 100));
    }

    // Call state update
    await toggleUnitLock(unit.id, engageLock, engageLock ? lockReason : undefined);
    
    // Keep dialog open briefly then close
    await new Promise(resolve => setTimeout(resolve, 800));
    setTransmitting(false);
  };

  const handleOpenLockConfig = (unit: Unit, shouldLock: boolean) => {
    if (!shouldLock) {
      // Direct release without reason prompt
      executeSmartLockChange(unit, false);
    } else {
      setSelectedUnit(unit);
      setIsSubmitModeLock(true);
      // Auto fill customized reason based on tenant
      const debt = getOverdueAmount(unit);
      setLockReason(`Rent payment overdue (Balance: $${debt.toLocaleString()}). Settle via Renziy platform to unlock.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="bg-white border border-[#e4e2e4] p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#002645] flex items-center gap-2">
            <LockKeyhole className="h-6 w-6 text-[#002645]" />
            <span>Renziy IoT Smart Locks</span>
          </h1>
          <p className="text-xs text-[#73777f] mt-1.5 max-w-2xl leading-relaxed">
            Protect your property from delayed rent payments. Engage secure remote smart lock protocols to restrict door access for tenants who fail to settle rent, or instantly safe-release locks upon payment acknowledgment via M-Pesa.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-center">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div className="text-left font-mono">
            <span className="text-[10px] font-bold text-[#73777f] uppercase tracking-wider block">IoT Network Gate</span>
            <span className="text-xs font-black text-[#002645]">{signalStrength}</span>
          </div>
        </div>
      </header>

      {/* Analytics Cards */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl shadow-xs border border-[#e4e2e4] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#73777f] uppercase tracking-wider">Total IoT Locks</span>
            <span className="text-3xl font-extrabold text-[#002645] mt-1.5 block">{totalIoTUnits}</span>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-700">
            <Cpu className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl shadow-xs border border-red-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Overdue Tenants</span>
            <span className="text-3xl font-extrabold text-red-600 mt-1.5 block">{totalOverdueUnits}</span>
          </div>
          <div className="p-3 bg-red-50 rounded-xl text-red-600">
            <AlertCircle className="h-6 w-6 animate-pulse" />
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl shadow-xs border border-amber-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Active Lockouts</span>
            <span className="text-3xl font-extrabold text-amber-800 mt-1.5 block">{totalLockedUnits}</span>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-800">
            <Lock className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 bg-[#002645] text-white rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#87a7ce] uppercase tracking-wider">System Status</span>
            <span className="text-md font-bold mt-1.5 block text-green-400 flex items-center gap-1.5">
              <Signal className="h-4 w-4" /> Ready & Armed
            </span>
          </div>
          <div className="p-2.5 bg-white/10 rounded-xl text-[#67f9b3]">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
      </section>

      {/* Filter and Search Controller Row */}
      <section className="bg-white border border-[#e4e2e4] py-4 px-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#73777f] h-4 w-4" />
          <input 
            className="w-full pl-9 pr-4 py-2 bg-[#f6f3f5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002645]/15 text-xs font-semibold placeholder:text-gray-400"
            placeholder="Search tenant or apartment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex bg-[#f0edef] p-1 rounded-lg self-stretch sm:self-auto">
          <button 
            onClick={() => setFilterMode('all')}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-md transition-all ${filterMode === 'all' ? 'bg-[#002645] text-white shadow-xs' : 'text-[#43474e] hover:text-[#002645]'}`}
          >
            All Occupied
          </button>
          <button 
            onClick={() => setFilterMode('unsettled')}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${filterMode === 'unsettled' ? 'bg-red-600 text-white shadow-xs' : 'text-[#43474e] hover:text-red-600'}`}
          >
            Late Rent Only
            {totalOverdueUnits > 0 && (
              <span className={`inline-flex items-center justify-center w-4 h-4 text-[9px] font-black rounded-full ${filterMode === 'unsettled' ? 'bg-white text-red-600' : 'bg-red-600 text-white'}`}>
                {totalOverdueUnits}
              </span>
            )}
          </button>
          <button 
            onClick={() => setFilterMode('locked')}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-md transition-all ${filterMode === 'locked' ? 'bg-amber-600 text-white shadow-xs' : 'text-[#43474e] hover:text-amber-600'}`}
          >
            Locked Units ({totalLockedUnits})
          </button>
        </div>
      </section>

      {/* Main Units List */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredUnits.map(unit => {
          const isOverdue = isTenantOverdue(unit);
          const overdueDebt = getOverdueAmount(unit);

          return (
            <div 
              key={unit.id}
              className={`bg-white rounded-2xl border transition-all ${
                unit.isLocked 
                  ? 'border-amber-300 shadow-sm ring-1 ring-amber-300/30' 
                  : isOverdue 
                    ? 'border-red-200 hover:border-red-300' 
                    : 'border-[#e4e2e4] hover:border-[#1a3c5e]/30'
              } overflow-hidden flex flex-col justify-between`}
            >
              {/* Card Banner Status */}
              <div className={`px-4 py-2.5 flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wide ${
                unit.isLocked 
                  ? 'bg-amber-500/10 text-amber-800' 
                  : isOverdue 
                    ? 'bg-red-50 text-red-700' 
                    : 'bg-emerald-50 text-emerald-800'
              }`}>
                <div className="flex items-center gap-1">
                  <Signal className="h-3.5 w-3.5" />
                  <span>Lock Controller Hub</span>
                </div>
                <div>
                  {unit.isLocked ? "LOCKOUT ACTIVE" : "SECURE & UNLOCKED"}
                </div>
              </div>

              {/* Main Info */}
              <div className="p-5 flex-1 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xs font-black text-[#73777f] uppercase tracking-wider">{unit.propertyName}</h3>
                    <p className="text-xl font-bold text-[#002645] mt-0.5">Unit {unit.unitNumber}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    unit.isLocked 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {unit.isLocked ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
                  </div>
                </div>

                {/* Tenant Area */}
                <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-[#f0edef]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#002645]/10 overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs text-[#002645]">
                      {unit.tenantAvatar ? (
                        <img src={unit.tenantAvatar} alt={unit.tenantName} className="w-full h-full object-cover" />
                      ) : (
                        unit.tenantName?.substring(0, 2).toUpperCase() || 'NA'
                      )}
                    </div>
                    <div className="leading-tight">
                      <p className="font-bold text-xs text-[#1b1b1d]">{unit.tenantName || "Unassigned Tenant"}</p>
                      <p className="text-[10px] text-[#73777f]">Registered Citizen</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-left">
                    <div>
                      <span className="text-[9px] text-[#73777f] font-bold uppercase tracking-wider block">Monthly Rent</span>
                      <span className="text-xs font-black text-[#002645]">${unit.rentAmount}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#73777f] font-bold uppercase tracking-wider block">Overdue Balance</span>
                      <span className={`text-xs font-black ${overdueDebt > 0 ? 'text-red-600' : 'text-[#002645]'}`}>
                        ${overdueDebt.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Overdue Alert banner inside card */}
                {isOverdue && !unit.isLocked && (
                  <div className="flex items-start gap-2 p-2.5 bg-red-50 text-red-700 rounded-xl text-[11px] leading-relaxed border border-red-100">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                    <p>
                      Tenant is delaying rent payment. <strong>${overdueDebt.toLocaleString()}</strong> is overdue. You may toggle lock safely to prompt instant settlement.
                    </p>
                  </div>
                )}

                {unit.isLocked && (
                  <div className="flex items-start gap-2 p-2.5 bg-amber-50 text-amber-800 rounded-xl text-[11px] leading-relaxed border border-amber-200">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
                    <div>
                      <p className="font-bold uppercase text-[9px] tracking-wide text-amber-800">Lockout Reason:</p>
                      <p className="italic text-[11px] mt-0.5">"{unit.lockReason || "Unpaid rent balance"}"</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                {unit.isLocked ? (
                  <button 
                    onClick={() => handleOpenLockConfig(unit, false)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Unlock className="h-4.5 w-4.5" />
                    <span>Deactivate Lockout</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => handleOpenLockConfig(unit, true)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isOverdue 
                        ? 'bg-[#002645] text-white hover:bg-red-700' 
                        : 'bg-white border border-[#c3c6cf] text-[#73777f] hover:bg-red-50 hover:text-red-700 hover:border-red-200'
                    }`}
                  >
                    <Lock className="h-4.5 w-4.5" />
                    <span>Restrict Access</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredUnits.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white border border-[#e4e2e4] rounded-3xl space-y-3">
            <Lock className="h-10 w-10 text-gray-300 mx-auto" />
            <p className="text-sm font-semibold text-[#73777f]">No house units matched this lockout filter parameter.</p>
          </div>
        )}
      </section>

      {/* MODAL 1: Confirm Lock Configuration */}
      <AnimatePresence>
        {selectedUnit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUnit(null)}
              className="absolute inset-0 bg-[#002645]/40 backdrop-blur-xs"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 border border-[#e4e2e4] shadow-xl relative z-10 space-y-4"
            >
              <button 
                onClick={() => setSelectedUnit(null)}
                className="absolute top-4 right-4 text-[#73777f] hover:text-[#002645] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="text-left">
                <h3 className="text-xl font-bold text-[#002645] flex items-center gap-2">
                  <ShieldAlert className="h-5 text-red-600 w-5 animate-pulse" />
                  <span>Configure Smart Lockout</span>
                </h3>
                <p className="text-xs text-[#73777f] mt-1">
                  You are locking <strong>Unit {selectedUnit.unitNumber}</strong> occupied by <strong>{selectedUnit.tenantName}</strong>. This restricts their digital keypad/physical badge access until unlocked.
                </p>
              </div>

              <div className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-[#002645] tracking-wider block">Lock Reason Warning (Visible to Tenant)</label>
                  <textarea 
                    rows={3}
                    className="w-full bg-[#f6f3f5] rounded-xl p-3 text-xs border-none focus:outline-none focus:ring-2 focus:ring-red-500/20 text-[#1b1b1d] font-semibold leading-relaxed"
                    value={lockReason}
                    onChange={(e) => setLockReason(e.target.value)}
                    placeholder="Enter the lockout notice reason..."
                  />
                  <p className="text-[10px] text-[#73777f]">This note will be rendered prominently inside the tenant's app portal.</p>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedUnit(null)}
                    className="w-1/2 py-3 border border-[#c3c6cf] text-[#43474e] rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancel Action
                  </button>
                  <button 
                    onClick={() => executeSmartLockChange(selectedUnit, true)}
                    className="w-1/2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Lock className="h-4 w-4" />
                    <span>Engage Lockout</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Simulated Transmitting Status Overlay */}
      <AnimatePresence>
        {transmitting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#002645]/85 backdrop-blur-md" />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl w-full max-w-md p-8 border border-[#c3c6cf] shadow-2xl relative z-10 text-center space-y-6"
            >
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center bg-indigo-50 rounded-full">
                <RefreshCw className="h-8 w-8 text-indigo-700 animate-spin" />
              </div>

              <div>
                <h3 className="text-lg font-black text-[#002645]">Renziy IoT Remote Link</h3>
                <p className="text-xs text-[#73777f] mt-1">Transmitting real-time encryption packet over Cellular-Bridge</p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#f0edef] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-indigo-700 h-full transition-all duration-300" 
                  style={{ width: `${transmissionProgress}%` }}
                />
              </div>

              {/* Step Logs Console */}
              <div className="bg-[#002645] p-4 rounded-xl text-left font-mono text-[10px] space-y-1.5 text-green-300 h-32 overflow-y-auto">
                {transmissionSteps.map((step, idx) => (
                  <p key={idx} className="flex items-center gap-1.5">
                    <span className="text-emerald-500">▶</span> {step}
                  </p>
                ))}
                {transmissionSteps.length < 5 && (
                  <p className="text-[#87a7ce] animate-pulse">Communicating with residential gateway...</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
