import React, { useState } from 'react';
import { useRenziy } from '../state';
import { Property, Unit } from '../types';
import { Search, MapPin, ChevronRight, UserMinus, Plus, Edit2, Check, X, DollarSign, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function LandlordProperties() {
  const { properties, units, addTenantToUnit, updateUnit } = useRenziy();
  const [search, setSearch] = useState('');
  const [activePropertyId, setActivePropertyId] = useState<string>('prop-1');
  const [filterMode, setFilterMode] = useState<'all' | 'commercial' | 'residential'>('all');

  // Edit Unit Mode State
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editRentAmount, setEditRentAmount] = useState<number>(0);
  const [editTenantName, setEditTenantName] = useState<string>('');

  // Find active property info
  const activeProperty = properties.find(p => p.id === activePropertyId) || properties[0];

  // Filter properties based on search & filter mode
  const filteredProperties = properties.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.address.toLowerCase().includes(search.toLowerCase());
    
    if (filterMode === 'all') return matchesSearch;
    if (filterMode === 'commercial') {
      // Landmark Plaza acts as our commercial property
      return matchesSearch && p.name.includes('Plaza');
    }
    // residential properties
    return matchesSearch && !p.name.includes('Plaza');
  });

  // Load the units for the chosen active property
  const activePropertyUnits = units.filter(u => u.propertyId === activePropertyId);

  // Compute stats
  const totalPropertyYield = activePropertyUnits.reduce((sum, u) => sum + u.rentAmount, 0);

  const startEditingUnit = (u: Unit) => {
    setEditingUnitId(u.id);
    setEditRentAmount(u.rentAmount);
    setEditTenantName(u.tenantName || '');
  };

  const saveEditUnit = (unitId: string) => {
    updateUnit(unitId, editTenantName, editRentAmount, editTenantName ? 'Occupied' : 'Vacant');
    setEditingUnitId(null);
  };

  const handleEvictTenant = (unitId: string) => {
    if (confirm("Are you sure you want to disconnect this tenant's active association?")) {
      updateUnit(unitId, '', undefined, 'Vacant');
    }
  };

  return (
    <div className="bg-[#fcf8fb] min-h-screen text-[#1b1b1d] pb-24 md:pb-12">
      {/* Search & Filter section header */}
      <section className="mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#73777f] h-4 w-4" />
          <input 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#c3c6cf] rounded-xl focus:outline-none focus:border-[#002645] focus:ring-2 focus:ring-[#002645]/10 text-sm font-semibold"
            placeholder="Search properties or addresses..." 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button 
            onClick={() => setFilterMode('all')}
            className={`px-4 py-2 bg-white border border-[#c3c6cf] rounded-full text-xs font-bold whitespace-nowrap hover:bg-[#eae7ea] transition-all cursor-pointer ${filterMode === 'all' && 'bg-[#002645] text-white hover:bg-[#002645]/90 border-transparent'}`}
          >
            All Status
          </button>
          <button 
            onClick={() => setFilterMode('residential')}
            className={`px-4 py-2 bg-white border border-[#c3c6cf] rounded-full text-xs font-bold whitespace-nowrap hover:bg-[#eae7ea] transition-all cursor-pointer ${filterMode === 'residential' && 'bg-[#002645] text-white hover:bg-[#002645]/90 border-transparent'}`}
          >
            Residential Portfolio
          </button>
          <button 
            onClick={() => setFilterMode('commercial')}
            className={`px-4 py-2 bg-white border border-[#c3c6cf] rounded-full text-xs font-bold whitespace-nowrap hover:bg-[#eae7ea] transition-all cursor-pointer ${filterMode === 'commercial' && 'bg-[#002645] text-white hover:bg-[#002645]/90 border-transparent'}`}
          >
            Commercial Plaza
          </button>
        </div>
      </section>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Properties layout list */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <h2 className="text-xs font-bold text-[#73777f] uppercase tracking-wider px-1">Your Portfolio</h2>
          
          <div className="space-y-4">
            {filteredProperties.map(p => {
              const isSelected = p.id === activePropertyId;
              const propUnits = units.filter(u => u.propertyId === p.id);
              const occUnits = propUnits.filter(u => u.status === 'Occupied').length;

              return (
                <div 
                  key={p.id}
                  onClick={() => {
                    setActivePropertyId(p.id);
                    setEditingUnitId(null);
                  }}
                  className={`group bg-white p-4 rounded-3xl cursor-pointer transition-all border-2 duration-300 hover:scale-[1.01] ${isSelected ? 'border-[#002645] shadow-md' : 'border-[#e4e2e4] hover:border-slate-300 shadow-sm'}`}
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0">
                      <img 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        alt={p.name} 
                        src={p.imageUrl} 
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <h3 className="font-bold text-[#002645] text-sm md:text-base">{p.name}</h3>
                        <div className="flex items-center gap-1 text-[#43474e] mt-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-[#73777f]" />
                          <span className="text-[11px] font-medium leading-none line-clamp-1">{p.address}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-dashed border-[#e4e2e4]">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-100 text-[#5a2c00] rounded-full">
                          {occUnits} / {p.unitsCount} Units Occupied
                        </span>
                        <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${isSelected ? 'text-[#002645] translate-x-1' : 'text-[#73777f]'}`} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {filteredProperties.length === 0 && (
              <p className="text-center text-xs text-[#73777f] py-12 bg-white rounded-3xl border border-[#e4e2e4] font-semibold">
                No properties match your filter queries.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Units detail directory grid */}
        <div className="lg:col-span-7">
          {activeProperty && (
            <div className="bg-white rounded-3xl shadow-sm border border-[#e4e2e4] overflow-hidden">
              {/* Directory Header Details */}
              <div className="p-6 border-b border-[#e4e2e4] bg-[#f0edef]/30 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                <div>
                  <span className="text-[10px] font-bold text-[#73777f] uppercase tracking-wider">Unit Directory</span>
                  <h2 className="text-xl font-bold text-[#002645] mt-1">{activeProperty.name} Units</h2>
                </div>
                <div className="text-left sm:text-right bg-white p-3 rounded-xl border border-[#e4e2e4] shadow-xs shrink-0 flex items-center gap-3">
                  <div className="bg-orange-500/10 p-2 rounded-lg">
                    <Sparkles className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-[#73777f] uppercase leading-none">Portfolio yield</p>
                    <p className="text-base font-extrabold text-[#002645] mt-1">KES {totalPropertyYield.toLocaleString()}/mo</p>
                  </div>
                </div>
              </div>

              {/* Units Table list responsive */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#e4e2e4]">
                      <th className="px-6 py-3.5 text-xs font-bold uppercase text-[#73777f] tracking-wider">Unit #</th>
                      <th className="px-6 py-3.5 text-xs font-bold uppercase text-[#73777f] tracking-wider">Occupancy</th>
                      <th className="px-6 py-3.5 text-xs font-bold uppercase text-[#73777f] tracking-wider">Rent Sum</th>
                      <th className="px-6 py-3.5 text-xs font-bold uppercase text-[#73777f] tracking-wider">Tenant</th>
                      <th className="px-6 py-3.5 text-xs font-bold uppercase text-[#73777f] tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0edef]">
                    {activePropertyUnits.map(u => {
                      const isEditing = editingUnitId === u.id;

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Unit ID */}
                          <td className="px-6 py-4 font-bold text-[#002645] text-sm">
                            {u.unitNumber}
                          </td>

                          {/* Occupancy Indicator */}
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <select 
                                className="bg-[#f6f3f5] p-1.5 rounded-lg text-xs font-bold border-none"
                                value={editTenantName ? 'Occupied' : 'Vacant'}
                                onChange={(e) => {
                                  if (e.target.value === 'Vacant') setEditTenantName('');
                                }}
                              >
                                <option value="Occupied">Occupied</option>
                                <option value="Vacant">Vacant</option>
                              </select>
                            ) : (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${u.status === 'Occupied' ? 'bg-orange-100 text-orange-950' : 'bg-red-50 text-red-750'}`}>
                                {u.status}
                              </span>
                            )}
                          </td>

                          {/* Rent Amount */}
                          <td className="px-6 py-4 font-semibold text-xs text-[#1b1b1d]">
                            {isEditing ? (
                              <div className="flex items-center border border-[#c3c6cf] rounded-lg bg-white px-2 max-w-[90px]">
                                <span className="text-xs text-[#73777f] font-bold mr-1">KES</span>
                                <input 
                                  type="number"
                                  className="w-full bg-transparent border-none p-1 text-xs font-bold text-[#002645] focus:outline-none"
                                  value={editRentAmount}
                                  onChange={(e) => setEditRentAmount(Number(e.target.value))}
                                />
                              </div>
                            ) : (
                              `KES ${u.rentAmount.toLocaleString()}/mo`
                            )}
                          </td>

                          {/* Tenant name details */}
                          <td className="px-6 py-4 text-xs font-semibold">
                            {isEditing ? (
                              <input 
                                className="bg-[#f6f3f5] p-1.5 rounded-lg text-xs font-semibold focus:outline-none border-none w-full max-w-[120px]"
                                placeholder="name e.g. Marcus"
                                value={editTenantName}
                                onChange={(e) => setEditTenantName(e.target.value)}
                              />
                            ) : (
                              u.tenantName ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-[#002645]/10 flex items-center justify-center text-[#002645] text-[10px] font-bold overflow-hidden shrink-0">
                                    {u.tenantAvatar ? (
                                      <img className="w-full h-full object-cover" src={u.tenantAvatar} alt={u.tenantName} />
                                    ) : (
                                      u.tenantName.substring(0, 2).toUpperCase()
                                    )}
                                  </div>
                                  <span className="text-[#1b1b1d] leading-none font-semibold truncate max-w-[100px]">{u.tenantName}</span>
                                </div>
                              ) : (
                                <span className="text-[#73777f] italic font-normal">Vacant</span>
                              )
                            )}
                          </td>

                          {/* Action Items */}
                          <td className="px-6 py-4 text-right">
                            {isEditing ? (
                              <div className="flex gap-2 justify-end">
                                <button 
                                  onClick={() => saveEditUnit(u.id)}
                                  className="p-1 rounded bg-orange-100 text-orange-950 hover:bg-orange-200"
                                  title="Save alterations"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button 
                                  onClick={() => setEditingUnitId(null)}
                                  className="p-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                                  title="Cancel changes"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-end items-center gap-2">
                                <button 
                                  onClick={() => startEditingUnit(u)}
                                  className="p-1 rounded-md text-[#43474e] hover:text-[#002645] hover:bg-slate-100 transition-colors"
                                  title="Modify status or rent"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                {u.status === 'Occupied' && (
                                  <button 
                                    onClick={() => handleEvictTenant(u.id)}
                                    className="p-1 rounded-md text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors"
                                    title="Disconnect resident connection"
                                  >
                                    <UserMinus className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
