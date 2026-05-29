import React, { useState } from 'react';
import { useRenziy } from '../state';
import { motion } from 'motion/react';
import { Wrench, ArrowLeft, Camera, Trash2, Shield, Sparkles, HelpCircle } from 'lucide-react';

export default function MaintenanceForm({ onClose }: { onClose: () => void }) {
  const { addMaintenanceRequest } = useRenziy();

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Plumbing');
  const [urgency, setUrgency] = useState<'Low' | 'Med' | 'High' | 'Emergency'>('High');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  // Simulated preset damage photos (tenants can select these to preview)
  const PRESET_PHOTOS = [
    {
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAMUjzaEq6ab_V_3MYMo4C6cZFsDjDbKIg_8Pat8Qld5o4TaYVhsmYYTTv0OmwgZ-4I8RGO3LgwQbmryvRw-JuQxSzRcimztLBcV-zJz6kl0MtiWfMS4IkNGZvo3yRxoALnLPBHHAsj8PmXMuQdx4lExUq6yqEyHjSqyVCrfKAqh3sKlD3ZhkMaYXItTe2XwFYBEknIP8pYnQgskVaBzn34fRnBlH2KL3P1Tph3-VjQ8taeHBuXdcS1q2xubjz3yb7Z-H2_bLb0ODzo',
      name: 'Leaky faucet pipe'
    },
    {
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCJHVsPCNM8vlseW-5euYjPmlM_McDvTlrK8z0cySc4WNEFSJsFxtY-QyxDqwZuYa9qEmv-7PNAghGwePs1A0kz8RpIxqHRLtc24OvMCBsydO7gdo5JqnVkDjaZz-1k50jOZl78NdWspdcVQyQdtK010umxl767zDMIuGC6wxPwmjaDLOfiTxBGxixIlSTGwUL-Ad6cSlbgp-7NbDPwNQelha3Rh_4hM1d_vfiMnW6I6ctnVP8uD_ltZILFWkLaKG47Mgcr5swe6Z8h',
      name: 'Exposed wire'
    }
  ];

  const handleAddPresetPhoto = (url: string) => {
    if (photos.includes(url)) return;
    if (photos.length >= 3) {
      alert("Renziy supports up to 3 evidence files per ticket.");
      return;
    }
    setPhotos(prev => [...prev, url]);
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    addMaintenanceRequest({
      title,
      category,
      urgency,
      description,
      photos
    });

    onClose();
  };

  return (
    <div className="bg-[#E8F4FD] min-h-screen text-[#1b1b1d] py-12 px-4 md:px-10 flex items-center justify-center relative">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl bg-white p-6 md:p-8 rounded-3xl border border-[#e4e2e4] shadow-md relative"
      >
        {/* Back navigation */}
        <button 
          onClick={onClose}
          className="absolute top-6 left-6 flex items-center gap-1.5 text-xs font-bold text-[#002645] hover:opacity-80 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        <div className="text-center mb-6 pt-6">
          <span className="text-[10px] uppercase font-bold text-[#73777f] tracking-widest">Resident Maintenance Center</span>
          <h2 className="text-2xl font-black text-[#002645] mt-1">Request Repair</h2>
          <p className="text-xs text-[#43474e] mt-1 font-semibold">Report damage or mechanical issues for prompt certified tech resolution.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Issue Subject */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-[#002645] tracking-wider px-1">Repair Subject / Title</label>
            <input 
              className="w-full bg-[#f6f3f5] rounded-xl p-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#002645]/20 text-[#1b1b1d] font-semibold"
              placeholder="e.g. Leaking kitchen faucet"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#002645] tracking-wider px-1">Category</label>
              <select 
                className="w-full bg-[#f6f3f5] rounded-xl p-3 text-xs border-none focus:outline-none focus:ring-2 focus:ring-[#002645]/20 text-[#1b1b1d] font-bold appearance-none"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Plumbing">Plumbing (Leak, Gasket, Clog)</option>
                <option value="Electrical">Electrical (Flicker, Socket, Switch)</option>
                <option value="HVAC">HVAC (Heating, Air filtration)</option>
                <option value="Carpentry">Carpentry / Locks (Door, Drawer)</option>
                <option value="Appliance">Appliance (Fridge, Stove, Microwave)</option>
              </select>
            </div>

            {/* Urgency */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#002645] tracking-wider px-1">Urgency Tier</label>
              <div className="flex bg-[#f0edef] p-1 rounded-xl gap-1">
                {(['Low', 'Med', 'High', 'Emergency'] as const).map(tier => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setUrgency(tier)}
                    className={`flex-1 py-2 text-center rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      urgency === tier 
                        ? 'bg-[#002645] text-white shadow-xs' 
                        : 'text-[#43474e] hover:bg-slate-200/50'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description Text area */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-[#002645] tracking-wider px-1">Describe Damage in Detail</label>
            <textarea 
              rows={3}
              className="w-full bg-[#f6f3f5] rounded-xl p-3 text-xs border-none focus:outline-none focus:ring-2 focus:ring-[#002645]/25 text-[#1b1b1d] font-semibold"
              placeholder="Please explain the issue. Mention specific location and what happened..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Evidence Attachment Section */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-[#002645] tracking-wider px-1 block">Evidence Photo Gallery (Max 3)</label>
            
            <div className="flex gap-3 flex-wrap">
              {/* Active Photos Render */}
              {photos.map((p, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden group border border-[#e4e2e4]">
                  <img src={p} alt="Fault proof" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute inset-0 bg-red-600/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {/* Photo placeholder click simulator picker */}
              {photos.length < 3 && (
                <div className="p-1 border border-dashed border-[#c3c6cf] rounded-xl flex items-center gap-2">
                  <div className="w-16 h-16 bg-[#f6f3f5] rounded-xl flex flex-col items-center justify-center text-[#73777f] select-none text-[8px] font-bold">
                    <Camera className="h-4 w-4 mb-1" />
                    <span>Evidence</span>
                  </div>
                  
                  {/* Provide instant preset simulated snaps */}
                  <div className="flex flex-col gap-1 pr-1">
                    <span className="text-[8px] text-[#73777f] font-bold leading-none">Simulate photo upload:</span>
                    <div className="flex gap-1">
                      {PRESET_PHOTOS.map((pres, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleAddPresetPhoto(pres.url)}
                          className="text-[9px] font-extrabold px-1.5 py-0.5 bg-[#002645]/5 text-[#002645] hover:bg-[#002645]/15 rounded"
                        >
                          +{pres.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <button 
            type="submit"
            className="w-full bg-[#002645] text-white py-4 rounded-xl font-bold hover:opacity-95 active:scale-95 transition-all text-sm mt-4 shadow-sm"
          >
            Submit Support Ticket
          </button>
        </form>

        {/* Security / Technician Promises footer */}
        <div className="mt-6 pt-5 border-t border-[#f0edef] grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 bg-slate-50 rounded-xl">
            <Shield className="h-4 w-4 text-orange-500 mx-auto mb-1" />
            <p className="text-[9px] font-black text-[#002645] leading-none uppercase">Certified Techs</p>
            <p className="text-[8px] text-[#73777f] mt-1">Background checked Only</p>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl">
            <Wrench className="h-4 w-4 text-[#002645] mx-auto mb-1" />
            <p className="text-[9px] font-black text-[#002645] leading-none uppercase">Fast Response</p>
            <p className="text-[8px] text-[#73777f] mt-1">Under 24 hour dispatch</p>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl">
            <Sparkles className="h-4 w-4 text-orange-500 mx-auto mb-1" />
            <p className="text-[9px] font-black text-[#002645] leading-none uppercase">Full Protect</p>
            <p className="text-[8px] text-[#73777f] mt-1">Free resident coverage</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
