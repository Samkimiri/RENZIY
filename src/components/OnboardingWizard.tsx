import React, { useState, useRef } from 'react';
import { useRenziy } from '../state';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Home, 
  ArrowRight, 
  Sparkles, 
  ShieldAlert, 
  CheckCircle2, 
  Camera, 
  Coins, 
  ChevronRight, 
  X, 
  Award, 
  Dribbble, 
  Gamepad2, 
  Trash2, 
  Flame, 
  Heart, 
  Bolt, 
  Star, 
  Zap, 
  ShieldCheck
} from 'lucide-react';

interface OnboardingWizardProps {
  onClose?: () => void;
}

const PRESET_AVATARS = [
  { id: 'av-1', name: 'The Arch-Mogul', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDRxmlZiyPxhMA9KhxxEY-ZornwU45XOarKthi5rZwjaUXVYAzK1Rptwz3XSUMih-aX7N40cr2Ki-5KZvD7pUHT8xTTKjuQMyyucNGma4FaFJirfRO8Nmxdo7wvHhgJnJDxwkPMa5NOJdwGCIEP9IoZoEnvk7HAYZ8jfseOFIDZ7L5DKDb2LTYFaZymzBJ-SYm2ragI8Q_dxp6yzf6AjtEmLdC6yZGqnU2ZCun5dcEqufGWVNNfnsQoC1JyHXHZfKXLK1rfwMLmEMPm' },
  { id: 'av-2', name: 'The Tech Nomad', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBY1CTvj3PmtB3-LR_p1s4FNqaP67e_JoWovsuzRp3hatwF4Yg7LrghoPHFR3QODAlxjD9QQF_sIEDYVU0fbJWPhNa9W2QSz2JRCYA5eMWJxLkMcl5HZUURA8kXnfeVXbb8RDc4AW9wvm_SmqyHEv3RQTjcPXHaNL0e2CgaBh6Y4LbLxHaykUfOjEK0DWINHnO5M6EI-CV5VHBoeBuiVQ-kXneHEpi0m6_MM0suuhUZbRzMc1qz4fBdIKQaFE10mTnPsr6OA7lENt6E' },
  { id: 'av-3', name: 'The Asset Tycoon', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAMwnvNKfivoGNvNC9N5regRXFoTzJgjvygw0djDO-V3kLxr0Hy8prK6Rf3M7eqjVCcsY4Apprti87A1_xX0S9aIJUnk6pTxgqAHsoeDAdjAJ7elxN6Qy-ESwviqRsDX6d6JgEdcqtVRI5xDlnVAeMQTUI_xej9xSBYkSlgfc36PkFJ4ZuitjAA9R5PSRRVX9At_QfcjBLMS_Ux_m71L3CiwKnebuz0RO-Esm93lzAa_uC_pu6gvY1OJGjhmsKN0dNjOdLycbyWgiqE' },
  { id: 'av-4', name: 'The Prime Resident', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOcbVtz4Nz5aTDAR2DZW9Pg9F6e65oPi6Td2jZ84CEwLXgn5HrvYocGZaVvLRdcS9eUaqLENJ27o2RqpElz14uBPV47JROuDd4JkbKG4lK3vapbE6KOkie8PQbaMTqlvURqdmEzyOUTLS-bssVrQp56st-qoqgO1NFNrdLvXPdL5SwnjZzSChp5a_s4toIffdm_8W02EPKg7MLqi3poWL6UDKib0nkwFBjpcLb7YMRsPtiVkMFt4jFzqbDf0SOuGuynYq7GjnWhyHB' },
  { id: 'av-5', name: 'The Horizon Voyager', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCJHVo0ItxDNtrPxpJuxF999eQZucYzjmp0FkGpIYOanfo6M9-A4ZOJA5WDXwl3BJercA3TJr8HMQkC8qclrIRXsfWq9vQzKlZdn4H2RnsJMW-LvnTIi1V3Fb8LBlHwPSSqo4081zjw-TzQh7BUvrgMTA9Mtiz4FrjXNpgFKC_-sKBl3GcZ6SQhn2r72tpsFvWeu_lHBz6EmHHBcVpZ0k3ZCEE7I2yt_X3nz4ZUt4T1WZejTYSTS-UCBLF2frZjOSESxO1iWRb2BTnR' },
];

export default function OnboardingWizard({ onClose }: OnboardingWizardProps) {
  const { setRole, setUsername, updateTenantAvatar, units } = useRenziy();

  // Wizard active step: 1 (Class Selection), 2 (Character Stats/Inputs), 3 (RPG Stat Allocation), 4 (Loot Claim), 5 (Portal Entry)
  const [step, setStep] = useState(1);
  const [selectedClass, setSelectedClass] = useState<'landlord' | 'tenant'>('tenant');
  
  // Custom inputs
  const [charName, setCharName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState(PRESET_AVATARS[3].url);
  const [customAvatarUploaded, setCustomAvatarUploaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // RPG Stat Points
  const [availablePoints, setAvailablePoints] = useState(10);
  const [stats, setStats] = useState({
    statA: 4, // Landlord: ROI Focus / Tenant: Cash Buffer
    statB: 3, // Landlord: Automation Level / Tenant: Fixer Speed
    statC: 3, // Landlord: Smart Locks Power / Tenant: IoT Grace
  });

  // Rewards state
  const [isChestOpen, setIsChestOpen] = useState(false);
  const [rewardRP, setRewardRP] = useState(0);

  // Validation
  const isPhoneValid = /^(07|01|7|1)\d{8}$/.test(phone.replace(/\s/g, ''));

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 10) {
      setPhone(val);
    }
  };

  // Drag & drop file handlers
  const handleAvatarFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Invalid image format! Please drop a physical image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setSelectedAvatarUrl(result);
      setCustomAvatarUploaded(true);
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
      handleAvatarFile(file);
    }
  };

  // Dynamic stat modifications
  const adjustStat = (statKey: 'statA' | 'statB' | 'statC', amount: number) => {
    const currentVal = stats[statKey];
    if (amount > 0 && availablePoints > 0) {
      setStats(prev => ({ ...prev, [statKey]: currentVal + 1 }));
      setAvailablePoints(p => p - 1);
    } else if (amount < 0 && currentVal > 1) {
      setStats(prev => ({ ...prev, [statKey]: currentVal - 1 }));
      setAvailablePoints(p => p + 1);
    }
  };

  // Launch chest reward animation
  const handleOpenChest = () => {
    setIsChestOpen(true);
    let currentScore = 0;
    const interval = setInterval(() => {
      currentScore += 10;
      setRewardRP(currentScore);
      if (currentScore >= 150) {
        clearInterval(interval);
      }
    }, 45);
  };

  // Complete onboarding
  const handleFinalLaunch = async () => {
    const finalName = charName.trim() || (selectedClass === 'tenant' ? 'Alex Smith' : 'John Doe');
    setUsername(finalName);
    setRole(selectedClass);

    // Save stats & RP to local storage for display inside the dashboards
    localStorage.setItem('renziy_game_stats', JSON.stringify({
      class: selectedClass,
      stats,
      rpBalance: 150,
      level: 1,
      badge: selectedClass === 'tenant' ? 'Legendary Resident' : 'High-Rise Arch-Mogul',
      phone: phone || '0712345678'
    }));

    // If it's a tenant, also auto-update the default occupied unit (Apt 4B) to hold this custom avatar & name!
    if (selectedClass === 'tenant') {
      try {
        const defaultTenantUnit = units?.find(u => u.id === 'unit-1-4b' || u.unitNumber === 'Apt 4B');
        if (defaultTenantUnit) {
          // Keep it on sync with global server State if possible
          await updateTenantAvatar(defaultTenantUnit.id, selectedAvatarUrl);
        }
      } catch (err) {
        console.warn("Could not sync avatar to Unit 4B, using local fallback state", err);
      }
      localStorage.setItem('renziy_custom_avatar', selectedAvatarUrl);
    } else {
      localStorage.setItem('renziy_custom_avatar', selectedAvatarUrl);
    }

    if (onClose) {
      onClose();
    }
  };

  return (
    <div id="gamified-onboarding-wrapper" className="fixed inset-0 z-50 overflow-y-auto bg-[#030b14] text-slate-100 flex items-center justify-center font-sans p-2 md:p-6 select-none selection:bg-emerald-500 selection:text-white">
      {/* Dynamic Ambient Blur Backgrounds */}
      <div className="absolute top-10 left-1/4 w-80 h-80 rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 rounded-full bg-[#002645]/40 blur-[130px] pointer-events-none" />

      {/* Main Glassmorphic Panel */}
      <div className="w-full max-w-2xl bg-slate-900/80 backdrop-blur-xl rounded-[32px] border border-slate-800 shadow-[0_0_60px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col justify-between" style={{ minHeight: '620px' }}>
        
        {/* Dynamic header / progress indicators */}
        <div className="p-6 md:p-8 pb-3 flex justify-between items-center border-b border-slate-800/60 shrink-0">
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-emerald-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
              Renziy Character Portal
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i < step 
                    ? 'w-4 bg-emerald-500' 
                    : i === step 
                      ? 'w-8 bg-emerald-500 shadow-[0_0_8px_#059669]' 
                      : 'w-2 bg-slate-800'
                }`}
              />
            ))}
          </div>

          {onClose && (
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          )}
        </div>

        {/* Dynamic Step Contents */}
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-center overflow-y-auto">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: CLASS SELECTION */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 text-center md:text-left"
              >
                <div className="space-y-1">
                  <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center md:justify-start gap-2">
                    Choose Your <span className="text-emerald-400">Real Estate Class</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Select your class path inside the Renziy operating system. This defines your starting workflow and interface views.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  
                  {/* Landlord Option */}
                  <div 
                    onClick={() => setSelectedClass('landlord')}
                    className={`p-5 rounded-2xl cursor-pointer transition-all border-2 flex flex-col justify-between group relative overflow-hidden ${
                       selectedClass === 'landlord' 
                        ? 'border-emerald-500 bg-emerald-950/20 shadow-[0_0_30px_rgba(5,150,105,0.15)]' 
                        : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                    }`}
                    style={{ minHeight: '230px' }}
                  >
                    {/* Glow badge */}
                    {selectedClass === 'landlord' && (
                      <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                        Selected Role
                      </div>
                    )}
                    
                    <div className="space-y-3 text-left">
                      <div className={`p-3 rounded-xl w-fit ${selectedClass === 'landlord' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-extrabold text-lg text-white">Landlord Arch-Tycoon</h3>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          For property owners, asset managers, and developers. Drive yield yield logs and orchestrate smart locks.
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-800/80 pt-3 mt-3 text-left">
                       <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block mb-1.5">Class Buffs & Perks</span>
                      <div className="flex gap-2 flex-wrap">
                        <span className="text-[9px] font-black px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-500/20 rounded-md">
                          💥 Passive Yield +15%
                        </span>
                        <span className="text-[9px] font-black px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-500/20 rounded-md">
                          🔑 Lock Control
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tenant Option */}
                  <div 
                    onClick={() => setSelectedClass('tenant')}
                    className={`p-5 rounded-2xl cursor-pointer transition-all border-2 flex flex-col justify-between group relative overflow-hidden ${
                      selectedClass === 'tenant' 
                        ? 'border-emerald-500 bg-emerald-950/20 shadow-[0_0_30px_rgba(5,150,105,0.15)]' 
                        : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                    }`}
                    style={{ minHeight: '230px' }}
                  >
                    {/* Glow badge */}
                    {selectedClass === 'tenant' && (
                      <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                        Selected Role
                      </div>
                    )}

                    <div className="space-y-3 text-left">
                      <div className={`p-3 rounded-xl w-fit ${selectedClass === 'tenant' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        <Home className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-extrabold text-lg text-white">Sovereign Tenant</h3>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          For house residents and tenants. Trigger fast M-Pesa STK push checkouts, repair orders, and smart locks codes.
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-800/80 pt-3 mt-3 text-left">
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block mb-1.5">Class Perks & Buffs</span>
                      <div className="flex gap-2 flex-wrap">
                        <span className="text-[9px] font-black px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-500/20 rounded-md">
                          ⚡ M-Pesa STK +25% Spd
                        </span>
                        <span className="text-[9px] font-black px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-500/20 rounded-md">
                          🛡️ Tech Dispatch
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* STEP 2: CHARACTER CUSTOMIZATION (Inputs + Avatar choosing/drag-and-drop) */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="space-y-1">
                  <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
                    <Sparkles className="h-5 w-5 text-emerald-400" />
                    <span>Configure Character Identity</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Input your credentials to synchronize across secure ledger databases.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1 text-left">
                  {/* Personal specifications */}
                  <div className="space-y-3.5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 px-1 block">
                        Character Codename / Full Name
                      </label>
                      <input 
                        type="text"
                        placeholder={selectedClass === 'tenant' ? 'Alex Smith' : 'John Doe'}
                        value={charName}
                        onChange={(e) => setCharName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 px-1 block">
                        Kenyan Contact Line (M-Pesa STK link)
                      </label>
                      <div className="flex bg-slate-950 border border-slate-800 rounded-xl focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 overflow-hidden transition-all">
                        <span className="bg-slate-900 border-r border-slate-850 px-3.5 py-3 text-xs font-bold text-emerald-400">
                          +254
                        </span>
                        <input 
                          type="text"
                          placeholder="712345678"
                          value={phone}
                          onChange={handlePhoneInputChange}
                          className="w-full bg-transparent px-3 py-3 text-xs font-bold text-white focus:outline-none border-none"
                        />
                      </div>
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[9px] text-slate-500">M-Pesa validation number format</span>
                        {phone && (
                          <span className={`text-[9px] font-bold ${isPhoneValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPhoneValid ? '✓ Signal secured' : '✗ Must be 9-10 digits (e.g. 712345678)'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Avatar Picker & Drop Zone */}
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 block">
                      Choose Avatar Style
                    </label>

                    {/* Pre-built quick options */}
                    <div className="flex gap-2.5 overflow-x-auto pb-1">
                      {PRESET_AVATARS.map((av) => (
                        <div 
                          key={av.id}
                          onClick={() => {
                            setSelectedAvatarUrl(av.url);
                            setCustomAvatarUploaded(false);
                          }}
                          className={`w-10 h-10 rounded-full shrink-0 overflow-hidden border-2 cursor-pointer transition-all ${
                            selectedAvatarUrl === av.url && !customAvatarUploaded
                              ? 'border-emerald-500 scale-110 shadow-[0_0_8px_#059669]' 
                              : 'border-slate-800 opacity-60 hover:opacity-100'
                          }`}
                          title={av.name}
                        >
                          <img src={av.url} alt={av.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      ))}
                    </div>

                    {/* Drag-and-drop Image Area */}
                    <div
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={onDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                        isDragging 
                          ? 'border-emerald-500 bg-emerald-950/20' 
                          : customAvatarUploaded 
                            ? 'border-emerald-500/30 bg-emerald-950/5' 
                            : 'border-slate-800 hover:border-slate-700 bg-slate-950/50 hover:bg-slate-950'
                      }`}
                      style={{ minHeight: '105px' }}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAvatarFile(file);
                        }} 
                        accept="image/*" 
                        className="hidden" 
                      />

                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-800 shrink-0 bg-slate-900">
                          <img src={selectedAvatarUrl} alt="Avatar profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="text-left text-[10px] leading-relaxed">
                          <p className="font-bold text-white flex items-center gap-1">
                            <Camera className="h-3 w-3 text-emerald-400" />
                            <span>Upload Avatar Photo</span>
                          </p>
                          <p className="text-slate-500 mt-0.5">Drag &amp; drop profile picture file (Drag-and-Drop / Browse)</p>
                          {customAvatarUploaded && (
                            <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/25 px-1.5 py-0.2 rounded mt-1 inline-block">
                              Custom avatar processed!
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: RPG STATISTICS ALLOCATION */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center md:text-left space-y-1">
                  <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight flex items-center justify-center md:justify-start gap-1.5">
                    <Award className="h-5.5 w-5.5 text-amber-400" />
                    <span>Distribute Class Stats Points</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    You have <span className="text-amber-400 font-extrabold">{availablePoints} Skill Points</span> left. Customize your portal starting advantages!
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  
                  {/* STAT A */}
                  <div className="bg-slate-950/80 border border-slate-850 p-4.5 rounded-2xl relative flex flex-col justify-between text-left space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-black text-emerald-400 tracking-wider">
                          {selectedClass === 'landlord' ? '🛡️ Revenue Yield' : '🛡️ Rent Buffer'}
                        </span>
                        <span className="text-lg font-black text-white">{stats.statA}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-snug">
                        {selectedClass === 'landlord' 
                          ? 'Increases overall asset value and unlocks premium annual return multipliers.' 
                          : 'Improves your financial threshold score and delays automatic arrears flag logs.'}
                      </p>
                    </div>

                    <div className="flex gap-2 items-center justify-between pt-1">
                      <button 
                        onClick={() => adjustStat('statA', -1)}
                        disabled={stats.statA <= 1}
                        className="px-3.5 py-1.5 font-black bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-850 rounded-xl text-xs active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
                        style={{ minWidth: '36px', minHeight: '36px' }}
                      >
                        -
                      </button>
                      <span className="text-[10px] text-slate-500 font-bold">Allocated</span>
                      <button 
                        onClick={() => adjustStat('statA', 1)}
                        disabled={availablePoints <= 0}
                        className="px-3.5 py-1.5 font-black bg-slate-900 border border-slate-800 text-emerald-400 hover:bg-slate-850 rounded-xl text-xs active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
                        style={{ minWidth: '36px', minHeight: '36px' }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* STAT B */}
                  <div className="bg-slate-950/80 border border-slate-850 p-4.5 rounded-2xl relative flex flex-col justify-between text-left space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-black text-emerald-400 tracking-wider">
                          {selectedClass === 'landlord' ? '⚡ Automation Spd' : '⚡ Fixer Speed'}
                        </span>
                        <span className="text-lg font-black text-white">{stats.statB}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-snug">
                        {selectedClass === 'landlord' 
                          ? 'Automates property invoices generation and expedites client notifications.' 
                          : 'Increases technician response rate, getting operations online faster.'}
                      </p>
                    </div>

                    <div className="flex gap-2 items-center justify-between pt-1">
                      <button 
                        onClick={() => adjustStat('statB', -1)}
                        disabled={stats.statB <= 1}
                        className="px-3.5 py-1.5 font-black bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-850 rounded-xl text-xs active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
                        style={{ minWidth: '36px', minHeight: '36px' }}
                      >
                        -
                      </button>
                      <span className="text-[10px] text-slate-500 font-bold">Allocated</span>
                      <button 
                        onClick={() => adjustStat('statB', 1)}
                        disabled={availablePoints <= 0}
                        className="px-3.5 py-1.5 font-black bg-slate-900 border border-slate-800 text-emerald-400 hover:bg-slate-850 rounded-xl text-xs active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
                        style={{ minWidth: '36px', minHeight: '36px' }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* STAT C */}
                  <div className="bg-slate-950/80 border border-slate-850 p-4.5 rounded-2xl relative flex flex-col justify-between text-left space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-black text-emerald-400 tracking-wider">
                          {selectedClass === 'landlord' ? '🔮 IoT Authority' : '🔮 IoT Privilege'}
                        </span>
                        <span className="text-lg font-black text-white">{stats.statC}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-snug">
                        {selectedClass === 'landlord' 
                          ? 'Grants overall override capability over locks and enhances encryption.' 
                          : 'Provides automated override privileges and smart unlocks log triggers.'}
                      </p>
                    </div>

                    <div className="flex gap-2 items-center justify-between pt-1">
                      <button 
                        onClick={() => adjustStat('statC', -1)}
                        disabled={stats.statC <= 1}
                        className="px-3.5 py-1.5 font-black bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-850 rounded-xl text-xs active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
                        style={{ minWidth: '36px', minHeight: '36px' }}
                      >
                        -
                      </button>
                      <span className="text-[10px] text-slate-500 font-bold">Allocated</span>
                      <button 
                        onClick={() => adjustStat('statC', 1)}
                        disabled={availablePoints <= 0}
                        className="px-3.5 py-1.5 font-black bg-slate-900 border border-slate-800 text-emerald-400 hover:bg-slate-850 rounded-xl text-xs active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
                        style={{ minWidth: '36px', minHeight: '36px' }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                </div>

                {/* RPG Stats Advice Helper */}
                {availablePoints > 0 ? (
                  <p className="text-xs text-amber-400/90 bg-amber-950/20 border border-amber-500/20 rounded-xl p-3 text-center">
                    📢 Allocate the remaining <span className="font-extrabold">{availablePoints} skill points</span> to advance to the final launch ceremony!
                  </p>
                ) : (
                  <p className="text-xs text-emerald-400/90 bg-emerald-950/25 border border-emerald-500/20 rounded-xl p-3 text-center">
                    🏆 Stats optimized! Click next to claim your premium pioneer starter pack.
                  </p>
                )}
              </motion.div>
            )}

            {/* STEP 4: LOOT REWARDS SEQUENCE */}
            {step === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center space-y-6 py-4 flex flex-col items-center"
              >
                <div className="space-y-1 max-w-md">
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">
                    Claim Your <span className="text-emerald-400 font-black">Pioneer Level 1 Box</span>!
                  </h2>
                  <p className="text-xs text-slate-400 leading-normal">
                    Open your starter box to claim exclusive Pioneer RP (Renziy Points) and unlock database integration.
                  </p>
                </div>

                {/* Gamified Box Animation Stage */}
                <div className="relative w-44 h-44 flex items-center justify-center pt-2">
                  {!isChestOpen ? (
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleOpenChest}
                      className="cursor-pointer relative group"
                    >
                      {/* Radiating highlight shadow */}
                      <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/30 transition-all animate-pulse" />
                      
                      <div className="w-28 h-28 bg-[#1e2d40] border-4 border-emerald-500 rounded-3xl flex items-center justify-center text-emerald-400 shadow-[0_0_30px_#059669] relative z-10 animate-bounce">
                        <Award className="h-16 w-16 text-emerald-400" />
                      </div>
                      
                      <span className="absolute bottom-[-16px] left-1/2 -translate-x-1/2 text-[10px] font-black uppercase text-emerald-400 tracking-widest bg-[#030b14] border border-emerald-500/40 px-3 py-1 rounded-full shrink-0 group-hover:brightness-110">
                        Click to Open Chest
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-3 flex flex-col items-center"
                    >
                      <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex flex-col items-center justify-center relative animate-pulse shadow-[0_0_20px_rgba(52,211,153,0.3)]">
                        <Coins className="h-10 w-10 text-emerald-400 mb-0.5" />
                        <span className="text-[11px] font-black">{rewardRP} RP</span>
                      </div>

                      <div className="space-y-1 text-center">
                        <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center justify-center gap-1">
                          <ShieldCheck className="h-4 w-4" />
                          <span>Pioneer Active Loot Unlocked!</span>
                        </span>
                        <p className="text-[10px] text-slate-400">
                          Badge Secured: <span className="font-bold text-white uppercase">{selectedClass === 'tenant' ? 'Pioneer Resident' : 'Pioneer Landlord'}</span>
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {!isChestOpen && (
                  <button 
                    onClick={handleOpenChest}
                    className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:brightness-110 active:scale-95 text-xs text-black font-extrabold rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>Click Here to Unlock Box</span>
                    <Flame className="h-4 w-4 animate-pulse" />
                  </button>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Wizard Footer Controls */}
        <div className="p-6 md:p-8 pt-3 border-t border-slate-800/60 flex justify-between items-center shrink-0">
          {step > 1 && step < 4 ? (
            <button 
              onClick={() => setStep(step - 1)}
              className="px-5 py-2.5 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-xs text-slate-300 font-bold rounded-xl transition-all cursor-pointer"
              style={{ minHeight: '40px' }}
            >
              Back Unit
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button 
              onClick={() => setStep(step + 1)}
              disabled={step === 2 && (!charName.trim() || !isPhoneValid)}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-700 active:scale-95 disabled:bg-slate-800 disabled:text-slate-500 disabled:pointer-events-none text-black font-black uppercase text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              style={{ minHeight: '40px' }}
            >
              <span>Continue Journey</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : step === 3 ? (
            <button 
              onClick={() => setStep(4)}
              disabled={availablePoints > 0}
              className="px-6 py-2.5 bg-amber-400 hover:brightness-105 active:scale-95 disabled:bg-slate-800 disabled:text-slate-500 disabled:pointer-events-none text-black font-black uppercase text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 animate-pulse"
              style={{ minHeight: '40px' }}
            >
              <span>Finish Stat Setup</span>
              <Sparkles className="h-4 w-4" />
            </button>
          ) : (
            step === 4 && (
              <button 
                onClick={handleFinalLaunch}
                disabled={!isChestOpen}
                className={`px-8 py-3 font-black uppercase text-xs rounded-xl shadow-xl transition-all cursor-pointer flex items-center gap-2 ${
                  isChestOpen 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95' 
                    : 'bg-slate-800 text-slate-500 pointer-events-none'
                }`}
                style={{ minHeight: '44px' }}
              >
                <span>Initialize Portal Realm</span>
                <Home className="h-4 w-4" />
              </button>
            )
          )}
        </div>

      </div>
    </div>
  );
}
