import React, { useMemo, useState } from 'react';
import { useRenziy } from '../state';
import { Property } from '../types';
import { Building2, CheckCircle2, Home, MapPin, Navigation, Phone, Search, SlidersHorizontal } from 'lucide-react';

const KENYA_COUNTIES = [
  'Nairobi', 'Mombasa', 'Kiambu', 'Kajiado', 'Machakos', 'Nakuru', 'Kisumu', 'Uasin Gishu',
  'Nyeri', 'Muranga', 'Kirinyaga', 'Meru', 'Embu', 'Laikipia', 'Kilifi', 'Kwale', 'Kisii',
  'Nyamira', 'Kakamega', 'Bungoma', 'Busia', 'Siaya', 'Homa Bay', 'Migori', 'Kericho',
  'Bomet', 'Narok', 'Trans Nzoia', 'Turkana', 'Garissa', 'Isiolo'
];

const DEFAULT_AMENITIES = ['Water', 'Security', 'Parking', 'Wi-Fi ready', 'Near public transport'];

const getLocationQuery = (property: Property) => {
  return property.mapQuery || [property.name, property.neighborhood, property.town, property.county || property.address, 'Kenya']
    .filter(Boolean)
    .join(', ');
};

const mapUrlFor = (property: Property) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getLocationQuery(property))}`;
const embedUrlFor = (property: Property) => `https://www.google.com/maps?q=${encodeURIComponent(getLocationQuery(property))}&output=embed`;

export default function HousingMarketplace() {
  const { role, properties, units, updatePropertyDetails } = useRenziy();
  const [county, setCounty] = useState('All');
  const [query, setQuery] = useState('');
  const [maxRent, setMaxRent] = useState('');
  const [editingPropertyId, setEditingPropertyId] = useState(properties[0]?.id || '');
  const [formState, setFormState] = useState({
    county: properties[0]?.county || 'Nairobi',
    town: properties[0]?.town || '',
    neighborhood: properties[0]?.neighborhood || '',
    contactPhone: properties[0]?.contactPhone || '',
    description: properties[0]?.description || '',
    amenities: properties[0]?.amenities?.join(', ') || DEFAULT_AMENITIES.join(', '),
    mapQuery: properties[0]?.mapQuery || '',
    availableForMarketplace: properties[0]?.availableForMarketplace ?? true
  });

  const selectedProperty = properties.find(property => property.id === editingPropertyId) || properties[0];

  const marketplaceListings = useMemo(() => {
    return properties
      .map(property => {
        const propertyUnits = units.filter(unit => unit.propertyId === property.id);
        const vacantUnits = propertyUnits.filter(unit => unit.status === 'Vacant');
        const lowestRent = propertyUnits.length ? Math.min(...propertyUnits.map(unit => unit.rentAmount)) : 0;
        return { property, propertyUnits, vacantUnits, lowestRent };
      })
      .filter(({ property, vacantUnits, lowestRent }) => {
        const listed = property.availableForMarketplace !== false;
        const countyMatch = county === 'All' || (property.county || '').toLowerCase() === county.toLowerCase();
        const text = [property.name, property.address, property.county, property.town, property.neighborhood, property.description].join(' ').toLowerCase();
        const queryMatch = !query || text.includes(query.toLowerCase());
        const rentMatch = !maxRent || lowestRent <= Number(maxRent);
        return listed && vacantUnits.length > 0 && countyMatch && queryMatch && rentMatch;
      });
  }, [properties, units, county, query, maxRent]);

  const handleSelectProperty = (property: Property) => {
    setEditingPropertyId(property.id);
    setFormState({
      county: property.county || 'Nairobi',
      town: property.town || '',
      neighborhood: property.neighborhood || '',
      contactPhone: property.contactPhone || '',
      description: property.description || '',
      amenities: property.amenities?.join(', ') || DEFAULT_AMENITIES.join(', '),
      mapQuery: property.mapQuery || '',
      availableForMarketplace: property.availableForMarketplace ?? true
    });
  };

  const handleSubmitListing = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProperty) return;

    await updatePropertyDetails(selectedProperty.id, {
      county: formState.county,
      town: formState.town,
      neighborhood: formState.neighborhood,
      contactPhone: formState.contactPhone,
      description: formState.description,
      amenities: formState.amenities.split(',').map(item => item.trim()).filter(Boolean),
      mapQuery: formState.mapQuery || [selectedProperty.name, formState.neighborhood, formState.town, formState.county, 'Kenya'].filter(Boolean).join(', '),
      availableForMarketplace: formState.availableForMarketplace
    });
  };

  return (
    <div className="bg-[#fcf8fb] min-h-screen text-[#1b1b1d] pb-28 md:pb-12">
      <section className="mb-5 md:mb-6 overflow-hidden rounded-2xl md:rounded-3xl bg-[#002645] text-white border border-[#1a3c5e] shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="p-4 sm:p-5 md:p-8 space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-400/25 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
              <Home className="h-3.5 w-3.5" />
              Kenya Housing Finder
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Find rental homes by county, town, and live map location.</h1>
              <p className="text-sm text-[#b7cee8] mt-2 leading-relaxed">
                Tenants can discover vacant houses across Kenya while landlords publish apartment details, amenities, contacts, and map locations from the same Renziy workspace.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-2xl bg-white/8 border border-white/10 p-3">
                <span className="block text-2xl font-black">{marketplaceListings.length}</span>
                <span className="text-[10px] uppercase tracking-wider text-[#b7cee8] font-bold">Active areas</span>
              </div>
              <div className="rounded-2xl bg-white/8 border border-white/10 p-3">
                <span className="block text-2xl font-black">{marketplaceListings.reduce((sum, item) => sum + item.vacantUnits.length, 0)}</span>
                <span className="text-[10px] uppercase tracking-wider text-[#b7cee8] font-bold">Vacant units</span>
              </div>
              <div className="rounded-2xl bg-white/8 border border-white/10 p-3">
                <span className="block text-2xl font-black">{KENYA_COUNTIES.length}</span>
                <span className="text-[10px] uppercase tracking-wider text-[#b7cee8] font-bold">Counties</span>
              </div>
            </div>
          </div>
          <div className="min-h-[180px] sm:min-h-[220px] lg:min-h-[260px] bg-cover bg-center" style={{ backgroundImage: "linear-gradient(90deg, rgba(0,38,69,0.35), rgba(0,38,69,0.05)), url('https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1400&q=80')" }} />
        </div>
      </section>

      {role === 'landlord' && (
        <section className="mb-8 grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          <div className="lg:col-span-4 bg-white rounded-2xl md:rounded-3xl border border-[#e4e2e4] p-4 shadow-sm">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#73777f] mb-3">Select Apartment Asset</h2>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {properties.map(property => (
                <button
                  key={property.id}
                  type="button"
                  onClick={() => handleSelectProperty(property)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${editingPropertyId === property.id ? 'border-[#002645] bg-[#E8F4FD]' : 'border-[#e4e2e4] hover:border-slate-300 bg-white'}`}
                >
                  <span className="block text-sm font-black text-[#002645]">{property.name}</span>
                  <span className="block text-[11px] text-[#73777f] font-semibold mt-1">{property.county || 'County not set'} - {property.town || property.address}</span>
                  <span className={`mt-2 inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide ${property.availableForMarketplace === false ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-800'}`}>
                    {property.availableForMarketplace === false ? 'Hidden' : 'Published'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmitListing} className="lg:col-span-8 bg-white rounded-2xl md:rounded-3xl border border-[#e4e2e4] p-4 md:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Landlord Listing Studio</span>
                <h2 className="text-xl font-black text-[#002645] mt-1">Publish apartment location details</h2>
                <p className="text-xs text-[#73777f] mt-1">Fill these fields so potential tenants can find your house by county and open the exact area in Google Maps.</p>
              </div>
              <label className="flex items-center gap-2 text-xs font-black text-[#002645] bg-[#f6f3f5] px-3 py-2 rounded-xl">
                <input
                  type="checkbox"
                  checked={formState.availableForMarketplace}
                  onChange={(event) => setFormState(prev => ({ ...prev, availableForMarketplace: event.target.checked }))}
                />
                Listed
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#73777f]">County</span>
                <select
                  value={formState.county}
                  onChange={(event) => setFormState(prev => ({ ...prev, county: event.target.value }))}
                  className="w-full bg-[#f6f3f5] border border-[#e4e2e4] rounded-xl p-3 text-sm font-bold text-[#002645] focus:outline-none focus:ring-2 focus:ring-[#002645]/10"
                >
                  {KENYA_COUNTIES.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#73777f]">Town or Estate</span>
                <input value={formState.town} onChange={(event) => setFormState(prev => ({ ...prev, town: event.target.value }))} className="w-full bg-[#f6f3f5] border border-[#e4e2e4] rounded-xl p-3 text-sm font-bold text-[#002645] focus:outline-none focus:ring-2 focus:ring-[#002645]/10" placeholder="Kilimani, Ruiru, Nyali..." />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#73777f]">Neighborhood / Landmark</span>
                <input value={formState.neighborhood} onChange={(event) => setFormState(prev => ({ ...prev, neighborhood: event.target.value }))} className="w-full bg-[#f6f3f5] border border-[#e4e2e4] rounded-xl p-3 text-sm font-bold text-[#002645] focus:outline-none focus:ring-2 focus:ring-[#002645]/10" placeholder="Near mall, stage, school..." />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#73777f]">Viewing Contact</span>
                <input value={formState.contactPhone} onChange={(event) => setFormState(prev => ({ ...prev, contactPhone: event.target.value }))} className="w-full bg-[#f6f3f5] border border-[#e4e2e4] rounded-xl p-3 text-sm font-bold text-[#002645] focus:outline-none focus:ring-2 focus:ring-[#002645]/10" placeholder="0712345678" />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#73777f]">Google Maps Search Location</span>
                <input value={formState.mapQuery} onChange={(event) => setFormState(prev => ({ ...prev, mapQuery: event.target.value }))} className="w-full bg-[#f6f3f5] border border-[#e4e2e4] rounded-xl p-3 text-sm font-bold text-[#002645] focus:outline-none focus:ring-2 focus:ring-[#002645]/10" placeholder="Apartment name, road, town, county, Kenya" />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#73777f]">Amenities</span>
                <input value={formState.amenities} onChange={(event) => setFormState(prev => ({ ...prev, amenities: event.target.value }))} className="w-full bg-[#f6f3f5] border border-[#e4e2e4] rounded-xl p-3 text-sm font-bold text-[#002645] focus:outline-none focus:ring-2 focus:ring-[#002645]/10" placeholder="Water, security, parking..." />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#73777f]">Description</span>
                <textarea value={formState.description} onChange={(event) => setFormState(prev => ({ ...prev, description: event.target.value }))} className="w-full min-h-24 bg-[#f6f3f5] border border-[#e4e2e4] rounded-xl p-3 text-sm font-semibold text-[#002645] focus:outline-none focus:ring-2 focus:ring-[#002645]/10" placeholder="Describe transport access, building quality, nearby amenities, and ideal tenant." />
              </label>
            </div>

            <button type="submit" className="mt-5 w-full sm:w-auto bg-[#002645] text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#1a3c5e] active:scale-95 transition-all">
              Save Listing Details
            </button>
          </form>
        </section>
      )}

      <section className="mb-5 md:mb-6 bg-white rounded-2xl md:rounded-3xl border border-[#e4e2e4] p-3 sm:p-4 md:p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#73777f]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#f6f3f5] border border-[#e4e2e4] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#002645]/10" placeholder="Search county, estate, apartment, landmark..." />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <select value={county} onChange={(event) => setCounty(event.target.value)} className="w-full sm:min-w-44 px-4 py-3 rounded-xl bg-[#f6f3f5] border border-[#e4e2e4] text-sm font-bold text-[#002645] focus:outline-none">
              <option value="All">All counties</option>
              {KENYA_COUNTIES.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
            <div className="relative">
              <SlidersHorizontal className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#73777f]" />
              <input type="number" value={maxRent} onChange={(event) => setMaxRent(event.target.value)} className="w-full sm:w-44 pl-10 pr-4 py-3 rounded-xl bg-[#f6f3f5] border border-[#e4e2e4] text-sm font-bold text-[#002645] focus:outline-none" placeholder="Max rent" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        {marketplaceListings.map(({ property, vacantUnits, lowestRent }) => (
          <article key={property.id} className="bg-white rounded-2xl md:rounded-3xl border border-[#e4e2e4] overflow-hidden shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-5">
              <div className="md:col-span-2 min-h-44 sm:min-h-56 bg-cover bg-center" style={{ backgroundImage: `url('${property.imageUrl}')` }} />
              <div className="md:col-span-3 p-4 sm:p-5 space-y-4">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-black text-[#002645]">{property.name}</h3>
                      <p className="text-xs font-bold text-[#73777f] mt-1 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{property.neighborhood || property.address}, {property.town || property.county || 'Kenya'}</span>
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide">
                      {vacantUnits.length} vacant
                    </span>
                  </div>
                  <p className="text-sm text-[#43474e] mt-3 leading-relaxed">{property.description || 'Well managed rental property with live rent, maintenance, and access support through Renziy.'}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(property.amenities?.length ? property.amenities : DEFAULT_AMENITIES).slice(0, 5).map(amenity => (
                    <span key={amenity} className="inline-flex items-center gap-1 rounded-full bg-[#E8F4FD] text-[#002645] px-2.5 py-1 text-[10px] font-bold">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      {amenity}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#f6f3f5] p-3">
                    <span className="text-[9px] uppercase tracking-widest text-[#73777f] font-black">Rent from</span>
                    <span className="block text-lg font-black text-[#002645]">KES {lowestRent.toLocaleString()}</span>
                  </div>
                  <div className="rounded-2xl bg-[#f6f3f5] p-3">
                    <span className="text-[9px] uppercase tracking-widest text-[#73777f] font-black">County</span>
                    <span className="block text-lg font-black text-[#002645]">{property.county || 'Kenya'}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <a href={mapUrlFor(property)} target="_blank" rel="noreferrer" className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-[#002645] text-white px-4 py-3 text-xs font-black hover:bg-[#1a3c5e] transition-all">
                    <Navigation className="h-4 w-4" />
                    Open Google Maps
                  </a>
                  <a href={`tel:${property.contactPhone || ''}`} className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl border border-[#c3c6cf] text-[#002645] px-4 py-3 text-xs font-black hover:bg-[#f6f3f5] transition-all">
                    <Phone className="h-4 w-4" />
                    {property.contactPhone || 'Contact landlord'}
                  </a>
                </div>
              </div>
            </div>
            <div className="border-t border-[#e4e2e4] bg-[#f6f3f5]/70 p-3">
              <iframe title={`${property.name} map`} src={embedUrlFor(property)} loading="lazy" className="w-full h-44 sm:h-56 rounded-2xl border border-[#e4e2e4] bg-white" />
            </div>
          </article>
        ))}

        {marketplaceListings.length === 0 && (
          <div className="xl:col-span-2 bg-white rounded-2xl md:rounded-3xl border border-[#e4e2e4] p-6 sm:p-10 text-center">
            <Building2 className="h-10 w-10 mx-auto text-[#002645]" />
            <h3 className="text-xl font-black text-[#002645] mt-4">No matching vacant listings yet</h3>
            <p className="text-sm text-[#73777f] mt-2">Try another county, increase the rent range, or ask a landlord to publish apartment location details.</p>
          </div>
        )}
      </section>
    </div>
  );
}
