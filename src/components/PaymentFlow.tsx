import React, { useState, useEffect } from 'react';
import { useRenziy } from '../state';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, CreditCard, ArrowLeft, ShieldCheck, CheckCircle2, ShoppingBag, Download, Landmark, HelpCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';

export default function PaymentFlow({ 
  initialMethod, 
  onClose 
}: { 
  initialMethod: 'M-Pesa' | 'Card';
  onClose: () => void;
}) {
  const { tenantBalance, clearBalanceAndRecordPayment, settlementConfig } = useRenziy();
  const [method, setMethod] = useState<'M-Pesa' | 'Card'>(initialMethod);
  const [step, setStep] = useState<'form' | 'processing' | 'success'>('form');

  // Form Fields
  const [phone, setPhone] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [showCardCvv, setShowCardCvv] = useState(false);

  // Generated Transaction variables
  const [txRef, setTxRef] = useState('');
  const [finalPaidAmount, setFinalPaidAmount] = useState(0);

  // M-Pesa phone formatting +254
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 9) {
      setPhone(val);
    }
  };

  // Card formatting
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length <= 16) {
      // Space every 4 digits
      const matches = val.match(/\d{1,4}/g);
      setCardNumber(matches ? matches.join(' ') : val);
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length <= 4) {
      if (val.length > 2) {
        setCardExpiry(val.substring(0, 2) + '/' + val.substring(2));
      } else {
        setCardExpiry(val);
      }
    }
  };

  // Run mock processing loader
  const triggerPaymentProcessing = (e: React.FormEvent) => {
    e.preventDefault();
    setFinalPaidAmount(tenantBalance);
    
    // Auto-generate transaction reference code
    const randomHash = Math.random().toString(36).substring(2, 10).toUpperCase();
    setTxRef(`${method === 'M-Pesa' ? 'FLW-MP' : 'FLW-RE'}-${randomHash}`);

    setStep('processing');
  };

  // Simulate payment collection timings (waiting for STK pin)
  useEffect(() => {
    if (step === 'processing') {
      const waitTime = method === 'M-Pesa' ? 5000 : 4000;
      const timer = setTimeout(() => {
        // Clear balance in global store
        clearBalanceAndRecordPayment(method);
        // Advance to success page
        setStep('success');
      }, waitTime);

      return () => clearTimeout(timer);
    }
  }, [step, method]);

  return (
    <div className="bg-[#E8F4FD] min-h-screen text-[#1b1b1d] py-12 px-4 md:px-10 flex items-center justify-center relative">
      <AnimatePresence mode="wait">
        
        {/* STEP 1: RENT PAYMENT INPUT FORMS */}
        {step === 'form' && (
          <motion.div 
            key="payment-form-step"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full max-w-lg bg-white p-6 md:p-8 rounded-3xl border border-[#e4e2e4] shadow-md relative"
          >
            {/* Back to dashboard */}
            <button 
              onClick={onClose}
              className="absolute top-6 left-6 flex items-center gap-1.5 text-xs font-bold text-[#002645] hover:opacity-80 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>

            <div className="text-center mb-6 pt-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#73777f]">Secure Ingress Gate</span>
              <h2 className="text-2xl font-black text-[#002645] mt-1">Rent Payment</h2>
              <p className="text-xs text-[#43474e] mt-1 font-semibold">
                Property: <span className="text-[#002645] font-extrabold">Oakwood Heights - Apt 4B</span>
              </p>
            </div>

            {/* Sum Due Card */}
            <div className="bg-[#f0edef]/50 border border-[#e4e2e4] p-4 rounded-2xl mb-6 flex justify-between items-center">
              <div>
                <p className="text-[10px] uppercase font-bold text-[#73777f] tracking-wider">Due rent amount</p>
                <p className="text-xl font-black text-[#002645] mt-0.5">KES {tenantBalance.toLocaleString()}</p>
                <p className="text-[10px] text-[#73777f] font-semibold">Immediate M-Pesa or card processing.</p>
              </div>
              <span className="text-xs font-black uppercase px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-lg">
                Pending
              </span>
            </div>

            {/* Method Toggle Buttons */}
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-[#f0edef] rounded-xl mb-6">
              <button 
                type="button"
                onClick={() => setMethod('M-Pesa')}
                className={`py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${method === 'M-Pesa' ? 'bg-[#002645] text-white shadow-sm' : 'text-[#43474e] hover:bg-slate-200/50'}`}
              >
                <Smartphone className="h-4 w-4" />
                M-Pesa Express
              </button>
              <button 
                type="button"
                onClick={() => setMethod('Card')}
                className={`py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${method === 'Card' ? 'bg-[#002645] text-white shadow-sm' : 'text-[#43474e] hover:bg-slate-200/50'}`}
              >
                <CreditCard className="h-4 w-4" />
                Credit/Debit Card
              </button>
            </div>

            {/* Render targeted method forms */}
            {method === 'M-Pesa' ? (
              /* M-Pesa Form View (Screen 5) */
              <form onSubmit={triggerPaymentProcessing} className="space-y-5">
                <div className="p-4 bg-emerald-50 text-[11px] text-[#002645] rounded-2xl border border-emerald-500/20 space-y-1.5 font-semibold text-left">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold uppercase tracking-wide">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                    <span>Dynamic Checkout Active</span>
                  </div>
                  <p>
                    You will receive an instant Lipa Na M-Pesa STK push prompt on your smartphone to settle rent due directly to the landlord's account: <span className="underline font-bold text-[#002645]">{settlementConfig.mpesaAccountName}</span> ({settlementConfig.mpesaType === 'Paybill' ? `Paybill ${settlementConfig.mpesaDetails}, A/C: ${settlementConfig.paybillAccount || 'RENT'}` : settlementConfig.mpesaType === 'BuyGoods' ? `Till Number ${settlementConfig.mpesaDetails}` : `Business Number ${settlementConfig.mpesaDetails}`}).
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-[#002645] tracking-wider px-1">Safaricom Phone Number</label>
                  <div className="flex items-center border border-[#c3c6cf] rounded-2xl p-4 focus-within:border-[#002645] focus-within:ring-2 focus-within:ring-[#002645]/10 bg-[#fbfbfb] transition-all">
                    <span className="text-sm font-bold text-[#002645] pr-3.5 border-r border-[#c3c6cf] mr-3.5">+254</span>
                    <input 
                      className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-bold text-[#1b1b1d] focus:outline-none" 
                      placeholder="712 345 678" 
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black hover:bg-emerald-700 active:scale-95 transition-all text-sm mt-4 shadow-sm cursor-pointer"
                >
                  Send STK Push
                </button>
              </form>
            ) : (
              /* Credit Card Form View (Screen 8) */
              <form onSubmit={triggerPaymentProcessing} className="space-y-4">
                {/* Physical Card Mockup Display (Highly requested design touch) */}
                <div className="bg-gradient-to-tr from-[#002645] to-[#1a3c5e] p-5 rounded-2xl text-white font-mono space-y-6 shadow-md relative overflow-hidden mb-4">
                  <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold tracking-widest text-[#fff]/80 italic">RE-SECURE VAULT</span>
                    <Landmark className="h-5 w-5 opacity-90 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-300 font-sans leading-none pb-1">Dynamic billing number</p>
                    <p className="text-lg tracking-wider font-extrabold">{cardNumber || '**** **** **** ****'}</p>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-slate-400 font-sans uppercase">Cardholder</p>
                      <p className="text-xs font-bold tracking-tight mt-0.5 truncate max-w-[140px]">{cardName || 'TENANT NAME'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-sans uppercase">Expiry Date</p>
                      <p className="text-xs font-bold mt-0.5">{cardExpiry || '12/28'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-[#002645] tracking-wider px-1">Cardholder Name</label>
                  <input 
                    className="w-full bg-[#f6f3f5] rounded-xl p-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#002645]/20 text-[#1b1b1d] font-semibold"
                    placeholder="Tenant full name"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-[#002645] tracking-wider px-1">Card Number</label>
                  <input 
                    className="w-full bg-[#f6f3f5] rounded-xl p-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#002645]/20 text-[#1b1b1d] font-mono font-bold"
                    placeholder="4111 2222 3333 4444"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-[#002645] tracking-wider px-1">Expiry Date</label>
                    <input 
                      className="w-full bg-[#f6f3f5] rounded-xl p-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#002645]/20 text-[#1b1b1d] font-semibold text-center"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={handleExpiryChange}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-[#002645] tracking-wider px-1">CVV Security</label>
                    <div className="flex items-center bg-[#f6f3f5] rounded-xl focus-within:ring-2 focus-within:ring-[#002645]/20">
                      <input
                        type={showCardCvv ? 'text' : 'password'}
                        maxLength={3}
                        className="w-full bg-transparent rounded-xl p-3 text-sm border-none focus:outline-none text-[#1b1b1d] font-semibold text-center"
                        placeholder="***"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCardCvv(prev => !prev)}
                        className="px-3 text-[#73777f] hover:text-[#002645] transition-colors"
                        aria-label={showCardCvv ? 'Hide CVV' : 'Show CVV'}
                        title={showCardCvv ? 'Hide CVV' : 'Show CVV'}
                      >
                        {showCardCvv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/40 text-[10px] text-emerald-800 rounded-xl border border-emerald-200 text-left space-y-1 font-semibold">
                  <span className="font-extrabold uppercase tracking-widest text-emerald-700 block text-[9px]">Direct Merchant Settlement</span>
                  <span>Funds are settled safely to <span className="underline font-bold text-[#002645]">{settlementConfig.bankAccountName}</span> at <span className="font-bold text-[#002645]">{settlementConfig.bankName}</span> (A/C: {settlementConfig.bankAccountNumber.slice(0, 4) + '****' + settlementConfig.bankAccountNumber.slice(-3)}).</span>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-[#002645] text-white py-4 rounded-xl font-bold hover:opacity-95 active:scale-95 transition-all text-sm mt-4 shadow-sm"
                >
                  Pay Securely KES {(tenantBalance * 100).toLocaleString()}
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <span className="text-[10px] text-[#73777f] font-semibold flex items-center justify-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Secured by Flutterwave, PCI-DSS Level 1 compliant gateway
              </span>
            </div>
          </motion.div>
        )}

        {/* STEP 2: PROCESSING / WAITING FOR PIN DIALOG MODAL */}
        {step === 'processing' && (
          <motion.div 
            key="payment-processing-step"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-white p-8 rounded-3xl border border-[#e4e2e4] shadow-2xl relative text-center z-50 overflow-hidden"
          >
            {/* Spinning Rings (Screen 6 style) */}
            <div className="relative w-36 h-36 mx-auto mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-1 border-dashed border-emerald-500/20 animate-spin" style={{ animationDuration: '24s' }} />
              <div className="absolute w-28 h-28 rounded-full border-2 border-[#002645] border-t-transparent animate-spin" />
              <div className="absolute w-20 h-20 rounded-full border-4 border-emerald-500 border-b-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '2s' }} />
              <div className="w-12 h-12 bg-[#002645] text-white rounded-full flex items-center justify-center">
                <Smartphone className="h-6 w-6 animate-pulse" />
              </div>
            </div>

            <h3 className="text-xl font-black text-[#002645]">
              {method === 'M-Pesa' ? 'Waiting for PIN...' : 'Authorizing Card...'}
            </h3>
            
            <p className="text-xs text-[#43474e] mt-4 leading-relaxed font-semibold max-w-xs mx-auto">
              {method === 'M-Pesa' 
                ? 'Please check your phone for the M-Pesa prompt. Enter your secure PIN to finalize the transaction.'
                : 'Contacting card issuer bank and verifying payment security credentials. Please hold.'
              }
            </p>

            {/* Simulated processing dynamic bars */}
            <div className="w-full bg-[#f0edef] h-1.5 rounded-full overflow-hidden mt-6 mb-2">
              <div className="bg-emerald-500 h-full rounded-full animate-pulse w-2/3" />
            </div>

            <span className="text-[9px] font-bold text-emerald-600 tracking-wider inline-flex items-center gap-1">
              🔒 SECURE TRANSACTION IN PROGRESS
            </span>

            <div className="pt-6 border-t border-[#f0edef] mt-6">
              <button 
                onClick={() => setStep('form')}
                className="text-xs font-bold text-[#73777f] hover:text-[#002645] transition-colors"
              >
                Cancel and return to checkout
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: PAYMENT SUCCESS CONFETTI PAGE */}
        {step === 'success' && (
          <motion.div 
            key="payment-success-step"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            className="w-full max-w-lg bg-white p-6 md:p-8 rounded-3xl border border-[#e4e2e4] shadow-md relative overflow-hidden"
          >
            {/* Simple confetti celebration layout */}
            <div className="absolute inset-0 pointer-events-none opacity-25 overflow-hidden">
              <div className="absolute w-2 h-2 bg-emerald-500 rounded-full top-1/4 left-1/4 animate-ping" style={{ animationDelay: '0.2s' }} />
              <div className="absolute w-2 h-2 bg-yellow-500 rounded-full top-1/3 right-1/4 animate-ping" style={{ animationDelay: '0.6s' }} />
              <div className="absolute w-3 h-3 bg-emerald-500 rounded-full bottom-1/3 left-1/3 animate-ping" style={{ animationDelay: '0.8s' }} />
            </div>

            <div className="text-center pt-6 mb-6">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-black text-[#002645]">Payment Received!</h2>
              <p className="text-xs text-emerald-500 font-bold mt-1">Transaction Completed Successfully</p>
            </div>

            {/* Checkout Invoice Card (Screen 7 style) */}
            <div className="bg-[#f0edef]/30 rounded-2xl p-5 border border-[#e4e2e4] space-y-4 font-sans text-xs">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#002645] border-b border-[#e4e2e4] pb-2">Receipt Details</h4>
              
              <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                <div>
                  <p className="text-[#73777f] font-semibold uppercase text-[9px]">Recipient Property</p>
                  <p className="font-extrabold text-[#002645] mt-0.5">Oakwood Heights (Apt 4B)</p>
                </div>
                <div>
                  <p className="text-[#73777f] font-semibold uppercase text-[9px]">Receipt Total</p>
                  <p className="font-extrabold text-[#002645] mt-0.5">KES {finalPaidAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[#73777f] font-semibold uppercase text-[9px]">Payment Mode</p>
                  <p className="font-extrabold text-[#002645] mt-0.5">{method === 'M-Pesa' ? 'M-Pesa STK' : 'Credit Card (FW)'}</p>
                </div>
                <div>
                  <p className="text-[#73777f] font-semibold uppercase text-[9px]">Authorization Reference</p>
                  <p className="font-mono font-extrabold text-emerald-800 mt-0.5">{txRef}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-dashed border-[#e4e2e4] flex items-center justify-between text-[11px] font-bold">
                <span className="text-[#73777f]">Account Balance Remaining:</span>
                <span className="text-[#007149]">KES 0.00 (Fully Settled)</span>
              </div>
            </div>

            {/* Actions button */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
              <button 
                onClick={() => {
                  alert(`Downloading receipt ${txRef} as secure format PDF...`);
                }}
                className="w-full border border-[#002645]/20 text-[#002645] hover:bg-[#002645]/5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-xs cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Download Receipt (PDF)
              </button>
              
              <button 
                onClick={onClose}
                className="w-full bg-[#002645] text-white py-3 rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all text-center text-xs cursor-pointer"
              >
                Back to Dashboard
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
