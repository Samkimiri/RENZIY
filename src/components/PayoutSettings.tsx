import React, { useState } from 'react';
import { useRenziy } from '../state';
import { SettlementConfig } from '../types';
import { motion } from 'motion/react';
import { Smartphone, Landmark, CheckCircle, Sparkles, AlertCircle, Save, HelpCircle, ArrowRight, Eye } from 'lucide-react';

export default function PayoutSettings() {
  const { settlementConfig, updateSettlementConfig, role } = useRenziy();

  // Local state for editing form
  const [mpesaType, setMpesaType] = useState<SettlementConfig['mpesaType']>(settlementConfig.mpesaType);
  const [mpesaDetails, setMpesaDetails] = useState(settlementConfig.mpesaDetails);
  const [mpesaAccountName, setMpesaAccountName] = useState(settlementConfig.mpesaAccountName);
  const [paybillAccount, setPaybillAccount] = useState(settlementConfig.paybillAccount || '');
  
  const [bankName, setBankName] = useState(settlementConfig.bankName);
  const [bankAccountName, setBankAccountName] = useState(settlementConfig.bankAccountName);
  const [bankAccountNumber, setBankAccountNumber] = useState(settlementConfig.bankAccountNumber);
  const [bankRoutingCode, setBankRoutingCode] = useState(settlementConfig.bankRoutingCode);

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setShowSuccess(false);

    try {
      await updateSettlementConfig({
        mpesaType,
        mpesaDetails,
        mpesaAccountName,
        paybillAccount: mpesaType === 'Paybill' ? paybillAccount : undefined,
        bankName,
        bankAccountName,
        bankAccountNumber,
        bankRoutingCode
      });
      
      // Visual feedback
      setTimeout(() => {
        setIsSaving(false);
        setShowSuccess(true);
        // Clear message after 3.5 seconds
        setTimeout(() => setShowSuccess(false), 3500);
      }, 700);
    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#E8F4FD]/20 min-h-screen text-[#1b1b1d] pb-24 md:pb-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Intro Banner */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#e4e2e4] shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-left flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50/50 text-emerald-950 rounded-full text-[10px] font-bold uppercase tracking-wide border border-emerald-200/50">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> Settled Directly To You
            </div>
            <h1 className="text-2xl font-black text-[#002645] mt-1">Payment Setup Preferences</h1>
            <p className="text-xs text-[#73777f] leading-relaxed max-w-xl">
              Configure your preferred collections routing here. The details you enter will be rendered dynamically to tenants when they click Pay Rent via the portal to minimize processing frictional delays.
            </p>
          </div>
          <div className="w-16 h-16 bg-[#002645]/5 rounded-2xl flex items-center justify-center text-[#002645] shrink-0 border border-[#002645]/10">
            <Landmark className="h-8 w-8" />
          </div>
        </div>

        {/* Form and Preview Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Settings Parameters Form */}
          <form onSubmit={handleSave} className="lg:col-span-8 bg-white rounded-3xl p-6 border border-[#e4e2e4] shadow-sm space-y-6 text-left">
            <div>
              <h2 className="text-sm font-black uppercase text-[#002645] tracking-wider mb-1 flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-emerald-500" /> M-Pesa Checkout Routing
              </h2>
              <p className="text-[11px] text-[#73777f]">Choose how M-Pesa STK push or till transactions are handled.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-[#43474e] uppercase tracking-wide block mb-1.5">M-Pesa Category Type</label>
                <select
                  value={mpesaType}
                  onChange={(e) => setMpesaType(e.target.value as SettlementConfig['mpesaType'])}
                  className="w-full bg-[#f0edef] border border-[#c3c6cf] rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#002645] focus:ring-1 focus:ring-[#002645]"
                >
                  <option value="Paybill">Paybill Number (e.g. 522522)</option>
                  <option value="BuyGoods">Buy Goods Till Number</option>
                  <option value="PhoneNumber">Phone Number (STK Direct)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#43474e] uppercase tracking-wide block mb-1.5">
                  {mpesaType === 'Paybill' ? 'Paybill Number' : mpesaType === 'BuyGoods' ? 'Till Number' : 'M-Pesa Phone Number'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={mpesaType === 'Paybill' ? 'e.g. 400222' : mpesaType === 'BuyGoods' ? 'e.g. 544321' : 'e.g. +254 722 000000'}
                  value={mpesaDetails}
                  onChange={(e) => setMpesaDetails(e.target.value)}
                  className="w-full bg-white border border-[#c3c6cf] rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#002645] focus:ring-1 focus:ring-[#002645]"
                />
              </div>

              {mpesaType === 'Paybill' && (
                <div>
                  <label className="text-[11px] font-bold text-[#43474e] uppercase tracking-wide block mb-1.5">Default Paybill Account No.</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RENT or Unit Number"
                    value={paybillAccount}
                    onChange={(e) => setPaybillAccount(e.target.value)}
                    className="w-full bg-white border border-[#c3c6cf] rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#002645] focus:ring-1 focus:ring-[#002645]"
                  />
                  <span className="text-[9px] text-[#73777f] font-medium mt-1 block">Account string tenants input during manual M-Pesa payment.</span>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-[#43474e] uppercase tracking-wide block mb-1.5">Registered Collection / Till Business Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RENZIY LTD"
                  value={mpesaAccountName}
                  onChange={(e) => setMpesaAccountName(e.target.value)}
                  className="w-full bg-white border border-[#c3c6cf] rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#002645] focus:ring-1 focus:ring-[#002645]"
                />
              </div>
            </div>

            <hr className="border-[#f0edef] my-4" />

            <div>
              <h2 className="text-sm font-black uppercase text-[#002645] tracking-wider mb-1 flex items-center gap-2">
                <Landmark className="h-4 w-4 text-[#002645]" /> Bank Wire Routing
              </h2>
              <p className="text-[11px] text-[#73777f]">Specify the clearing house details for card-funded direct settlements.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-[#43474e] uppercase tracking-wide block mb-1.5">Associated Bank Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Equity Bank Kenya"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-white border border-[#c3c6cf] rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#002645] focus:ring-1 focus:ring-[#002645]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#43474e] uppercase tracking-wide block mb-1.5">Bank Account Holder Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Renziy Properties"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  className="w-full bg-white border border-[#c3c6cf] rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#002645] focus:ring-1 focus:ring-[#002645]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#43474e] uppercase tracking-wide block mb-1.5">Bank Account Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 102456729312"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  className="w-full bg-white border border-[#c3c6cf] rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#002645] focus:ring-1 focus:ring-[#002645]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#43474e] uppercase tracking-wide block mb-1.5">Swift / Sort Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EQTYKENA"
                  value={bankRoutingCode}
                  onChange={(e) => setBankRoutingCode(e.target.value)}
                  className="w-full bg-white border border-[#c3c6cf] rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#002645] focus:ring-1 focus:ring-[#002645]"
                />
              </div>
            </div>

            {/* Form Save Button */}
            <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[#f0edef]">
              <div className="flex items-center gap-2 text-[11px] text-[#73777f]">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Changes took immediate effect globally. No system restart is required.</span>
              </div>
              
              <div className="flex items-center gap-3">
                {showSuccess && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" /> Preference coordinates saved!
                  </span>
                )}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3 bg-[#002645] text-white hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all text-xs font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? 'Updating...' : 'Save Settings'}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Live Mobile UI Preview */}
          <div className="lg:col-span-4 bg-slate-100 rounded-3xl p-5 border border-[#e4e2e4] flex flex-col gap-4 text-left shadow-inner">
            <div className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-[#002645]" />
              <span className="text-[10px] font-black uppercase text-[#002645] tracking-widest">Live Tenant-Portal view</span>
            </div>

            <p className="text-[11px] text-[#73777f] leading-relaxed">
              Below is how these payout coordinates will appear on a tenant checkout dashboard when M-Pesa is selected:
            </p>

            {/* Simulated Checkout Box */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-[10px] uppercase font-bold text-emerald-800">M-Pesa STK Trigger</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                  <p className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">Method Context</p>
                  <h4 className="text-xs font-bold mt-1 text-[#002645]">{mpesaType === 'Paybill' ? 'LIPA NA M-PESA PAYBILL' : mpesaType === 'BuyGoods' ? 'LIPA NA M-PESA BUY GOODS' : 'STK PHONE PAYMENT'}</h4>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-semibold uppercase">Business Name</span>
                    <span className="font-extrabold text-[#002645] truncate block">{mpesaAccountName || 'RENZIY MANAGEMENT'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-semibold uppercase">{mpesaType === 'Paybill' ? 'Paybill No' : mpesaType === 'BuyGoods' ? 'Till Number' : 'Target Phone'}</span>
                    <span className="font-extrabold text-[#002645] block">{mpesaDetails || '174379'}</span>
                  </div>
                  {mpesaType === 'Paybill' && (
                    <div className="col-span-2">
                       <span className="text-[9px] text-slate-400 block font-semibold uppercase">Account No</span>
                      <span className="font-extrabold text-emerald-700 block">{paybillAccount || 'RENT'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl text-[9px] text-slate-500 leading-snug">
                STK push requests will transmit safe release tokens directly to port 3000 to trigger smart deadbolt.
              </div>
            </div>

            {/* Bank Card funded preview */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-slate-600">Card Gate routing</span>
                <Landmark className="h-3.5 w-3.5 text-slate-500" />
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[9px] text-slate-400 block font-semibold">BANKER</span>
                  <span className="font-bold text-[#002645]">{bankName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-semibold">HOLDER BENEFICIARY</span>
                  <span className="font-bold text-[#002645]">{bankAccountName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-semibold">ACCOUNT & SWIFT</span>
                  <span className="font-mono text-[10px] text-slate-600 mr-2">{bankAccountNumber}</span>
                  <span className="font-mono text-[10px] text-slate-400">({bankRoutingCode})</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
