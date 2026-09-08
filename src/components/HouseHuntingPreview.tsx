import React, { useEffect, useMemo, useState } from 'react';
import { Property, Unit } from '../types';
import { ArrowRight, Building2, CheckCircle2, MapPin, Search } from 'lucide-react';

const PREVIEW_LIMIT = 6;
const DEFAULT_AMENITIES = ['Water', 'Security', 'Parking'];

const formatKes = (amount: number) => `KES ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

interface Listing {
  property: Omit<Property, 'ownerEmail'>;
  vacantCount: number;
  lowestRent: number;
}

export default function HouseHuntingPreview({ onApply }: { onApply: () => void }) {
  const [properties, setProperties] = useState<Array<Omit<Property, 'ownerEmail'>>>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/marketplace/listings')
      .then(res => {
        if (!res.ok) throw new Error('Listings unavailable');
        return res.json();
      })
      .then(data => {
        if (cancelled) return;
        setProperties(data.properties || []);
        setUnits(data.units || []);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const listings = useMemo<Listing[]>(() => {
    return properties
      .map(property => {
        const vacantUnits = units.filter(unit => unit.propertyId === property.id);
        const lowestRent = vacantUnits.reduce((lowest, unit) => Math.min(lowest, unit.rentAmount), Number.POSITIVE_INFINITY);
        return { property, vacantCount: vacantUnits.length, lowestRent: Number.isFinite(lowestRent) ? lowestRent : 0 };
      })
      .filter(listing => listing.vacantCount > 0);
  }, [properties, units]);

  const visibleListings = listings.slice(0, PREVIEW_LIMIT);
  const remainingCount = Math.max(listings.length - PREVIEW_LIMIT, 0);
  const totalVacantUnits = listings.reduce((sum, listing) => sum + listing.vacantCount, 0);

  return (
    <section id="house-hunting" className="py-14 px-4 md:px-10 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 text-emerald-300 text-[10px] font-black uppercase tracking-widest">
            <Search className="h-4 w-4" />
            House hunting
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white mt-3">Find your next home in Kenya.</h2>
          <p className="text-sm text-slate-400 leading-relaxed mt-2 max-w-xl">
            Real vacant units from landlords already on Renziy - browse now, sign up as a tenant when you're ready to apply.
          </p>
        </div>
        {status === 'ready' && listings.length > 0 && (
          <div className="bg-slate-950/75 border border-slate-800 rounded-2xl px-4 py-3 text-left sm:text-right shrink-0">
            <span className="block text-2xl font-black text-emerald-400">{totalVacantUnits}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Vacant units listed</span>
          </div>
        )}
      </div>

      {status === 'loading' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-64 rounded-3xl border border-slate-800 bg-slate-950/60 animate-pulse" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="bg-slate-950/82 border border-slate-800 rounded-3xl p-8 text-center">
          <Building2 className="h-8 w-8 mx-auto text-emerald-400" />
          <p className="text-sm text-slate-400 mt-3">Listings could not be loaded right now. Sign up and check the Housing Market tab instead.</p>
        </div>
      )}

      {status === 'ready' && listings.length === 0 && (
        <div className="bg-slate-950/82 border border-slate-800 rounded-3xl p-8 text-center">
          <Building2 className="h-8 w-8 mx-auto text-emerald-400" />
          <h3 className="text-lg font-black text-white mt-3">New listings are added regularly</h3>
          <p className="text-sm text-slate-400 mt-2">Sign up as a tenant to be notified when vacant units go live.</p>
        </div>
      )}

      {status === 'ready' && listings.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleListings.map(({ property, vacantCount, lowestRent }) => (
              <article key={property.id} className="bg-slate-950/82 border border-slate-800 rounded-3xl overflow-hidden flex flex-col">
                <div className="h-40 bg-cover bg-center relative" style={{ backgroundImage: `url('${property.imageUrl}')` }}>
                  <span className="absolute top-3 right-3 rounded-full bg-emerald-500 text-slate-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide">
                    {vacantCount} vacant
                  </span>
                </div>
                <div className="p-4 flex flex-col flex-1 gap-3">
                  <div>
                    <h3 className="text-base font-black text-white">{property.name}</h3>
                    <p className="text-[11px] font-bold text-slate-400 mt-1 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>{property.specificLocation || property.neighborhood || property.address}, {property.county || 'Kenya'}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(property.amenities?.length ? property.amenities : DEFAULT_AMENITIES).slice(0, 3).map(amenity => (
                      <span key={amenity} className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                        <CheckCircle2 className="h-3 w-3" />
                        {amenity}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
                    <div>
                      <span className="block text-[9px] uppercase tracking-widest text-slate-500 font-black">Rent from</span>
                      <span className="block text-base font-black text-emerald-400">{formatKes(lowestRent)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={onApply}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-3 py-2 text-[11px] font-black active:scale-95 transition-all"
                    >
                      Apply Now
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {remainingCount > 0 && (
            <button
              type="button"
              onClick={onApply}
              className="w-full mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 px-4 py-4 text-center transition-all"
            >
              <span className="text-sm font-black text-emerald-300">+{remainingCount} more house{remainingCount === 1 ? '' : 's'} available</span>
              <span className="block text-[11px] font-bold text-slate-400 mt-1">Sign up as a tenant to see the full list and apply</span>
            </button>
          )}
        </>
      )}
    </section>
  );
}
