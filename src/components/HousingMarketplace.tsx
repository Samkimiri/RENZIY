import React, { useMemo, useState } from 'react';
import { useRenziy } from '../state';
import { Property } from '../types';
import { Building2, CheckCircle2, CreditCard, Home, MapPin, MessageCircle, Navigation, Phone, Search, SlidersHorizontal } from 'lucide-react';

const KENYA_LOCATION_DATA = [
  { county: 'Baringo', constituencies: ['Baringo Central', 'Baringo North', 'Eldama Ravine', 'Mogotio', 'Tiaty'], locations: ['Kabarnet', 'Eldama Ravine', 'Marigat', 'Mogotio'] },
  { county: 'Bomet', constituencies: ['Bomet Central', 'Bomet East', 'Chepalungu', 'Konoin', 'Sotik'], locations: ['Bomet Town', 'Sotik', 'Longisa', 'Mogogosiek'] },
  { county: 'Bungoma', constituencies: ['Bumula', 'Kabuchai', 'Kanduyi', 'Kimilili', 'Mt Elgon', 'Sirisia', 'Tongaren', 'Webuye East', 'Webuye West'], locations: ['Bungoma Town', 'Webuye', 'Kimilili', 'Chwele'] },
  { county: 'Busia', constituencies: ['Budalangi', 'Butula', 'Funyula', 'Matayos', 'Nambale', 'Teso North', 'Teso South'], locations: ['Busia Town', 'Malaba', 'Port Victoria', 'Nambale'] },
  { county: 'Elgeyo-Marakwet', constituencies: ['Keiyo North', 'Keiyo South', 'Marakwet East', 'Marakwet West'], locations: ['Iten', 'Kapsowar', 'Chebiemit', 'Tambach'] },
  { county: 'Embu', constituencies: ['Manyatta', 'Mbeere North', 'Mbeere South', 'Runyenjes'], locations: ['Embu Town', 'Runyenjes', 'Siakago', 'Kiritiri'] },
  { county: 'Garissa', constituencies: ['Balambala', 'Dadaab', 'Fafi', 'Garissa Township', 'Ijara', 'Lagdera'], locations: ['Garissa Town', 'Dadaab', 'Hulugho', 'Modogashe'] },
  { county: 'Homa Bay', constituencies: ['Homa Bay Town', 'Kabondo Kasipul', 'Karachuonyo', 'Kasipul', 'Mbita', 'Ndhiwa', 'Rangwe', 'Suba'], locations: ['Homa Bay Town', 'Mbita', 'Oyugis', 'Ndhiwa'] },
  { county: 'Isiolo', constituencies: ['Isiolo North', 'Isiolo South'], locations: ['Isiolo Town', 'Garbatulla', 'Merti', 'Kinna'] },
  { county: 'Kajiado', constituencies: ['Kajiado Central', 'Kajiado East', 'Kajiado North', 'Kajiado South', 'Kajiado West'], locations: ['Kitengela', 'Ongata Rongai', 'Ngong', 'Kiserian', 'Kajiado Town'] },
  { county: 'Kakamega', constituencies: ['Butere', 'Khwisero', 'Lugari', 'Lurambi', 'Malava', 'Matungu', 'Mumias East', 'Mumias West', 'Navakholo', 'Shinyalu'], locations: ['Kakamega Town', 'Mumias', 'Butere', 'Malava'] },
  { county: 'Kericho', constituencies: ['Ainamoi', 'Belgut', 'Bureti', 'Kipkelion East', 'Kipkelion West', 'Soin Sigowet'], locations: ['Kericho Town', 'Litein', 'Kipkelion', 'Londiani'] },
  { county: 'Kiambu', constituencies: ['Gatundu North', 'Gatundu South', 'Githunguri', 'Juja', 'Kabete', 'Kiambaa', 'Kiambu', 'Kikuyu', 'Lari', 'Limuru', 'Ruiru', 'Thika Town'], locations: ['Ruiru', 'Thika', 'Kikuyu', 'Kiambu Town', 'Juja', 'Ruaka', 'Limuru'] },
  { county: 'Kilifi', constituencies: ['Ganze', 'Kaloleni', 'Kilifi North', 'Kilifi South', 'Magarini', 'Malindi', 'Rabai'], locations: ['Kilifi Town', 'Malindi', 'Mtwapa', 'Mariakani', 'Watamu'] },
  { county: 'Kirinyaga', constituencies: ['Gichugu', 'Kirinyaga Central', 'Mwea', 'Ndia'], locations: ['Kerugoya', 'Kutus', 'Sagana', 'Wanguru'] },
  { county: 'Kisii', constituencies: ['Bobasi', 'Bomachoge Borabu', 'Bomachoge Chache', 'Bonchari', 'Kitutu Chache North', 'Kitutu Chache South', 'Nyaribari Chache', 'Nyaribari Masaba', 'South Mugirango'], locations: ['Kisii Town', 'Ogembo', 'Suneka', 'Keroka'] },
  { county: 'Kisumu', constituencies: ['Kisumu Central', 'Kisumu East', 'Kisumu West', 'Muhoroni', 'Nyakach', 'Nyando', 'Seme'], locations: ['Kisumu CBD', 'Milimani', 'Mamboleo', 'Kondele', 'Ahero', 'Maseno'] },
  { county: 'Kitui', constituencies: ['Kitui Central', 'Kitui East', 'Kitui Rural', 'Kitui South', 'Kitui West', 'Mwingi Central', 'Mwingi North', 'Mwingi West'], locations: ['Kitui Town', 'Mwingi', 'Mutomo', 'Kwa Vonza'] },
  { county: 'Kwale', constituencies: ['Kinango', 'Lunga Lunga', 'Matuga', 'Msambweni'], locations: ['Ukunda', 'Diani', 'Kwale Town', 'Msambweni'] },
  { county: 'Laikipia', constituencies: ['Laikipia East', 'Laikipia North', 'Laikipia West'], locations: ['Nanyuki', 'Nyahururu', 'Rumuruti', 'Doldol'] },
  { county: 'Lamu', constituencies: ['Lamu East', 'Lamu West'], locations: ['Lamu Town', 'Mpeketoni', 'Hindi', 'Witu'] },
  { county: 'Machakos', constituencies: ['Kathiani', 'Machakos Town', 'Masinga', 'Matungulu', 'Mavoko', 'Mwala', 'Yatta'], locations: ['Machakos Town', 'Athi River', 'Syokimau', 'Mlolongo', 'Kangundo Road'] },
  { county: 'Makueni', constituencies: ['Kaiti', 'Kibwezi East', 'Kibwezi West', 'Kilome', 'Makueni', 'Mbooni'], locations: ['Wote', 'Makindu', 'Emali', 'Sultan Hamud'] },
  { county: 'Mandera', constituencies: ['Banissa', 'Lafey', 'Mandera East', 'Mandera North', 'Mandera South', 'Mandera West'], locations: ['Mandera Town', 'Elwak', 'Rhamu', 'Takaba'] },
  { county: 'Marsabit', constituencies: ['Laisamis', 'Moyale', 'North Horr', 'Saku'], locations: ['Marsabit Town', 'Moyale', 'Sololo', 'Laisamis'] },
  { county: 'Meru', constituencies: ['Buuri', 'Central Imenti', 'Igembe Central', 'Igembe North', 'Igembe South', 'North Imenti', 'South Imenti', 'Tigania East', 'Tigania West'], locations: ['Meru Town', 'Maua', 'Nkubu', 'Timau'] },
  { county: 'Migori', constituencies: ['Awendo', 'Kuria East', 'Kuria West', 'Nyatike', 'Rongo', 'Suna East', 'Suna West', 'Uriri'], locations: ['Migori Town', 'Rongo', 'Awendo', 'Isebania'] },
  { county: 'Mombasa', constituencies: ['Changamwe', 'Jomvu', 'Kisauni', 'Likoni', 'Mvita', 'Nyali'], locations: ['Nyali', 'Bamburi', 'Mtwapa', 'Mombasa CBD', 'Likoni', 'Tudor'] },
  { county: 'Muranga', constituencies: ['Gatanga', 'Kandara', 'Kangema', 'Kigumo', 'Kiharu', 'Maragua', 'Mathioya'], locations: ['Muranga Town', 'Kenol', 'Kangari', 'Kandara'] },
  { county: 'Nairobi', constituencies: ['Dagoretti North', 'Dagoretti South', 'Embakasi Central', 'Embakasi East', 'Embakasi North', 'Embakasi South', 'Embakasi West', 'Kamukunji', 'Kasarani', 'Kibra', 'Langata', 'Makadara', 'Mathare', 'Roysambu', 'Ruaraka', 'Starehe', 'Westlands'], locations: ['Kilimani', 'Westlands', 'Kileleshwa', 'Lavington', 'South B', 'South C', 'Roysambu', 'Kasarani', 'Embakasi', 'Karen', 'Ruaka border'] },
  { county: 'Nakuru', constituencies: ['Bahati', 'Gilgil', 'Kuresoi North', 'Kuresoi South', 'Molo', 'Naivasha', 'Nakuru Town East', 'Nakuru Town West', 'Njoro', 'Rongai', 'Subukia'], locations: ['Nakuru CBD', 'Milimani', 'Naivasha', 'Gilgil', 'Njoro', 'Molo'] },
  { county: 'Nandi', constituencies: ['Aldai', 'Chesumei', 'Emgwen', 'Mosop', 'Nandi Hills', 'Tinderet'], locations: ['Kapsabet', 'Nandi Hills', 'Kabiyet', 'Lessos'] },
  { county: 'Narok', constituencies: ['Kilgoris', 'Narok East', 'Narok North', 'Narok South', 'Narok West', 'Emurua Dikirr'], locations: ['Narok Town', 'Kilgoris', 'Suswa', 'Ololulunga'] },
  { county: 'Nyamira', constituencies: ['Borabu', 'Kitutu Masaba', 'North Mugirango', 'West Mugirango'], locations: ['Nyamira Town', 'Keroka', 'Ekerenyo', 'Nyansiongo'] },
  { county: 'Nyandarua', constituencies: ['Kinangop', 'Kipipiri', 'Ndaragwa', 'Ol Jorok', 'Ol Kalou'], locations: ['Ol Kalou', 'Engineer', 'Njabini', 'Ndaragwa'] },
  { county: 'Nyeri', constituencies: ['Kieni', 'Mathira', 'Mukurweini', 'Nyeri Town', 'Othaya', 'Tetu'], locations: ['Nyeri Town', 'Karatina', 'Othaya', 'Mweiga'] },
  { county: 'Samburu', constituencies: ['Samburu East', 'Samburu North', 'Samburu West'], locations: ['Maralal', 'Baragoi', 'Wamba', 'Archers Post'] },
  { county: 'Siaya', constituencies: ['Alego Usonga', 'Bondo', 'Gem', 'Rarieda', 'Ugenya', 'Ugunja'], locations: ['Siaya Town', 'Bondo', 'Ugunja', 'Yala'] },
  { county: 'Taita-Taveta', constituencies: ['Mwatate', 'Taveta', 'Voi', 'Wundanyi'], locations: ['Voi', 'Wundanyi', 'Mwatate', 'Taveta'] },
  { county: 'Tana River', constituencies: ['Bura', 'Galole', 'Garsen'], locations: ['Hola', 'Garsen', 'Bura', 'Madogo'] },
  { county: 'Tharaka-Nithi', constituencies: ['Chuka Igambangombe', 'Maara', 'Tharaka'], locations: ['Chuka', 'Chogoria', 'Marimanti', 'Kathwana'] },
  { county: 'Trans Nzoia', constituencies: ['Cherangany', 'Endebess', 'Kiminini', 'Kwanza', 'Saboti'], locations: ['Kitale', 'Kiminini', 'Endebess', 'Maili Tisa'] },
  { county: 'Turkana', constituencies: ['Loima', 'Turkana Central', 'Turkana East', 'Turkana North', 'Turkana South', 'Turkana West'], locations: ['Lodwar', 'Kakuma', 'Lokichogio', 'Lokichar'] },
  { county: 'Uasin Gishu', constituencies: ['Ainabkoi', 'Kapseret', 'Kesses', 'Moiben', 'Soy', 'Turbo'], locations: ['Eldoret CBD', 'Kapseret', 'Langas', 'Kimumu', 'Annex', 'Ziwa'] },
  { county: 'Vihiga', constituencies: ['Emuhaya', 'Hamisi', 'Luanda', 'Sabatia', 'Vihiga'], locations: ['Mbale', 'Luanda', 'Chavakali', 'Hamisi'] },
  { county: 'Wajir', constituencies: ['Eldas', 'Tarbaj', 'Wajir East', 'Wajir North', 'Wajir South', 'Wajir West'], locations: ['Wajir Town', 'Habaswein', 'Griftu', 'Eldas'] },
  { county: 'West Pokot', constituencies: ['Kapenguria', 'Kacheliba', 'Pokot South', 'Sigor'], locations: ['Kapenguria', 'Makutano', 'Chepareria', 'Ortum'] }
];

const KENYA_COUNTIES = KENYA_LOCATION_DATA.map(item => item.county);

const DEFAULT_AMENITIES = ['Water', 'Security', 'Parking', 'Wi-Fi ready', 'Near public transport'];

const getLocationQuery = (property: Property) => {
  return property.mapQuery || [property.name, property.specificLocation, property.neighborhood, property.constituency, property.town, property.county || property.address, 'Kenya']
    .filter(Boolean)
    .join(', ');
};

const mapUrlFor = (property: Property) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getLocationQuery(property))}`;
const embedUrlFor = (property: Property) => `https://www.google.com/maps?q=${encodeURIComponent(getLocationQuery(property))}&output=embed`;
const formatKes = (amount: number) => `KES ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const normalizeKenyaPhone = (phone?: string) => {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('254')) return digits;
  if (digits.startsWith('0')) return `254${digits.slice(1)}`;
  return digits;
};

export default function HousingMarketplace() {
  const {
    role,
    username,
    properties,
    units,
    members,
    rentalApplications,
    updatePropertyDetails,
    submitRentalApplication,
    markRentalApplicationPaid
  } = useRenziy();
  const [county, setCounty] = useState('All');
  const [constituency, setConstituency] = useState('All');
  const [specificLocation, setSpecificLocation] = useState('All');
  const [query, setQuery] = useState('');
  const [maxRent, setMaxRent] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [editingPropertyId, setEditingPropertyId] = useState(properties[0]?.id || '');
  const sessionEmail = localStorage.getItem('renziy_user_email') || '';
  const editableProperties = role === 'landlord'
    ? properties.filter(property => property.ownerEmail?.toLowerCase() === sessionEmail.toLowerCase())
    : properties;
  const defaultEditableProperty = editableProperties[0];
  const [formState, setFormState] = useState({
    county: defaultEditableProperty?.county || 'Nairobi',
    constituency: defaultEditableProperty?.constituency || '',
    town: defaultEditableProperty?.town || '',
    neighborhood: defaultEditableProperty?.neighborhood || '',
    specificLocation: defaultEditableProperty?.specificLocation || '',
    contactPhone: defaultEditableProperty?.contactPhone || '',
    description: defaultEditableProperty?.description || '',
    amenities: defaultEditableProperty?.amenities?.join(', ') || DEFAULT_AMENITIES.join(', '),
    mapQuery: defaultEditableProperty?.mapQuery || '',
    availableForMarketplace: defaultEditableProperty?.availableForMarketplace ?? true
  });

  const selectedProperty = editableProperties.find(property => property.id === editingPropertyId) || defaultEditableProperty;
  const selectedCountyData = KENYA_LOCATION_DATA.find(item => item.county === formState.county) || KENYA_LOCATION_DATA.find(item => item.county === county);
  const filterCountyData = KENYA_LOCATION_DATA.find(item => item.county === county);
  const constituencyOptions = county === 'All'
    ? Array.from(new Set(KENYA_LOCATION_DATA.flatMap(item => item.constituencies))).sort()
    : filterCountyData?.constituencies || [];
  const locationOptions = county === 'All'
    ? Array.from(new Set(KENYA_LOCATION_DATA.flatMap(item => item.locations))).sort()
    : filterCountyData?.locations || [];
  const currentTenant = members.find(member => member.role === 'tenant' && member.email.toLowerCase() === sessionEmail.toLowerCase());

  const marketplaceListings = useMemo(() => {
    return properties
      .map(property => {
        const propertyUnits = units.filter(unit => unit.propertyId === property.id);
        const vacantUnits = propertyUnits.filter(unit => unit.status === 'Vacant');
        const lowestRent = vacantUnits.length ? Math.min(...vacantUnits.map(unit => unit.rentAmount)) : 0;
        return { property, propertyUnits, vacantUnits, lowestRent };
      })
      .filter(({ property, vacantUnits, lowestRent }) => {
        const listed = property.availableForMarketplace !== false;
        const countyMatch = county === 'All' || (property.county || '').toLowerCase() === county.toLowerCase();
        const constituencyMatch = constituency === 'All' || (property.constituency || '').toLowerCase() === constituency.toLowerCase();
        const locationMatch = specificLocation === 'All' || [property.specificLocation, property.neighborhood, property.town, property.address].join(' ').toLowerCase().includes(specificLocation.toLowerCase());
        const text = [
          property.name,
          property.address,
          property.county,
          property.constituency,
          property.town,
          property.neighborhood,
          property.specificLocation,
          property.description,
          property.mapQuery,
          property.contactPhone,
          ...(property.amenities || []),
          ...vacantUnits.map(unit => `${unit.unitNumber} ${unit.rentAmount}`)
        ].join(' ').toLowerCase();
        const queryMatch = !query || text.includes(query.toLowerCase());
        const rentMatch = !maxRent || lowestRent <= Number(maxRent);
        return listed && vacantUnits.length > 0 && countyMatch && constituencyMatch && locationMatch && queryMatch && rentMatch;
      });
  }, [properties, units, county, constituency, specificLocation, query, maxRent]);

  const handleSelectProperty = (property: Property) => {
    setEditingPropertyId(property.id);
    setFormState({
      county: property.county || 'Nairobi',
      constituency: property.constituency || '',
      town: property.town || '',
      neighborhood: property.neighborhood || '',
      specificLocation: property.specificLocation || '',
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
      constituency: formState.constituency,
      town: formState.town,
      neighborhood: formState.neighborhood,
      specificLocation: formState.specificLocation,
      contactPhone: formState.contactPhone,
      description: formState.description,
      amenities: formState.amenities.split(',').map(item => item.trim()).filter(Boolean),
      mapQuery: formState.mapQuery || [selectedProperty.name, formState.specificLocation, formState.neighborhood, formState.constituency, formState.town, formState.county, 'Kenya'].filter(Boolean).join(', '),
      availableForMarketplace: formState.availableForMarketplace
    });
  };

  const getOwnerPhone = (property: Property) => {
    const owner = members.find(member => member.role === 'landlord' && member.email === property.ownerEmail);
    return owner?.phone || property.contactPhone || '';
  };

  const getApplicationForUnit = (unitId: string) => {
    const tenantEmail = currentTenant?.email || localStorage.getItem('renziy_user_email') || '';
    return rentalApplications.find(application => (
      application.unitId === unitId &&
      application.tenantEmail === tenantEmail &&
      application.status !== 'Declined'
    ));
  };

  const whatsappUrlFor = (property: Property, unitId: string) => {
    const unit = units.find(item => item.id === unitId);
    const phone = normalizeKenyaPhone(getOwnerPhone(property));
    const message = `Hello, I am ${username}. I want to rent ${property.name} - Unit ${unit?.unitNumber || ''} at ${formatKes(unit?.rentAmount || 0)} per month. I have sent a Renziy portal request for approval after rent payment.`;
    return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : '';
  };

  const handleChooseUnit = async (property: Property, unitId: string) => {
    const unit = units.find(item => item.id === unitId);
    if (!unit || !currentTenant) return;

    const existingApplication = getApplicationForUnit(unitId);
    try {
      if (!existingApplication) {
        await submitRentalApplication({
          propertyId: property.id,
          propertyName: property.name,
          unitId: unit.id,
          unitNumber: unit.unitNumber,
          rentAmount: unit.rentAmount,
          ownerEmail: property.ownerEmail,
          ownerPhone: getOwnerPhone(property),
          tenantName: username,
          tenantEmail: currentTenant.email,
          tenantPhone: currentTenant.phone
        });
      }
      setRequestMessage(`Request sent for ${property.name} - Unit ${unit.unitNumber}.`);
    } catch (err) {
      setRequestMessage(err instanceof Error ? err.message : 'This unit could not be requested right now.');
      return;
    }

    const whatsappUrl = whatsappUrlFor(property, unitId);
    if (whatsappUrl) {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
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
                Tenants can choose where they want to live and search vacant houses across Kenya while landlords publish apartment details, amenities, contacts, and map locations from the same Renziy workspace.
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
              {editableProperties.map(property => (
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
              {editableProperties.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#c3c6cf] bg-[#fcf8fb] p-4 text-xs font-semibold text-[#73777f]">
                  No properties are attached to this landlord account yet.
                </div>
              )}
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
                  onChange={(event) => setFormState(prev => ({ ...prev, county: event.target.value, constituency: '', specificLocation: '' }))}
                  className="w-full bg-[#f6f3f5] border border-[#e4e2e4] rounded-xl p-3 text-sm font-bold text-[#002645] focus:outline-none focus:ring-2 focus:ring-[#002645]/10"
                >
                  {KENYA_COUNTIES.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#73777f]">Constituency</span>
                <select
                  value={formState.constituency}
                  onChange={(event) => setFormState(prev => ({ ...prev, constituency: event.target.value }))}
                  className="w-full bg-[#f6f3f5] border border-[#e4e2e4] rounded-xl p-3 text-sm font-bold text-[#002645] focus:outline-none focus:ring-2 focus:ring-[#002645]/10"
                >
                  <option value="">Select constituency</option>
                  {(selectedCountyData?.constituencies || []).map(item => <option key={item} value={item}>{item}</option>)}
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
                <span className="text-[10px] font-black uppercase tracking-widest text-[#73777f]">Specific Location</span>
                <input
                  list="specific-location-suggestions"
                  value={formState.specificLocation}
                  onChange={(event) => setFormState(prev => ({ ...prev, specificLocation: event.target.value }))}
                  className="w-full bg-[#f6f3f5] border border-[#e4e2e4] rounded-xl p-3 text-sm font-bold text-[#002645] focus:outline-none focus:ring-2 focus:ring-[#002645]/10"
                  placeholder="Road, mall, stage, estate, school..."
                />
                <datalist id="specific-location-suggestions">
                  {(selectedCountyData?.locations || []).map(item => <option key={item} value={item} />)}
                </datalist>
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

      {role === 'tenant' && (
        <section className="mb-5 md:mb-6 bg-white rounded-2xl md:rounded-3xl border border-emerald-100 p-4 md:p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Tenant house search</span>
              <h2 className="text-xl font-black text-[#002645] mt-1">Choose the place you want to live</h2>
              <p className="text-sm text-[#73777f] mt-1 max-w-2xl">
                Search by any Kenya county, constituency, town, estate, road, landmark, rent range, or exact map area. The results update to show vacant homes you can contact or open on Google Maps.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 md:min-w-80">
              <div className="rounded-2xl bg-[#E8F4FD] p-3 text-center">
                <span className="block text-xl font-black text-[#002645]">{KENYA_COUNTIES.length}</span>
                <span className="text-[9px] font-black uppercase tracking-wider text-[#73777f]">Counties</span>
              </div>
              <div className="rounded-2xl bg-[#E8F4FD] p-3 text-center">
                <span className="block text-xl font-black text-[#002645]">{constituencyOptions.length}</span>
                <span className="text-[9px] font-black uppercase tracking-wider text-[#73777f]">Areas</span>
              </div>
              <div className="rounded-2xl bg-[#E8F4FD] p-3 text-center">
                <span className="block text-xl font-black text-emerald-700">{marketplaceListings.length}</span>
                <span className="text-[9px] font-black uppercase tracking-wider text-[#73777f]">Matches</span>
              </div>
            </div>
          </div>
          {requestMessage && (
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
              {requestMessage}
            </div>
          )}
        </section>
      )}

      <section className="mb-5 md:mb-6 bg-white rounded-2xl md:rounded-3xl border border-[#e4e2e4] p-3 sm:p-4 md:p-5 shadow-sm">
        <div className="flex flex-col xl:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#73777f]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#f6f3f5] border border-[#e4e2e4] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#002645]/10" placeholder="Search desired county, constituency, estate, road, landmark..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <select
              value={county}
              onChange={(event) => {
                setCounty(event.target.value);
                setConstituency('All');
                setSpecificLocation('All');
              }}
              className="w-full xl:w-44 px-4 py-3 rounded-xl bg-[#f6f3f5] border border-[#e4e2e4] text-sm font-bold text-[#002645] focus:outline-none"
            >
              <option value="All">All counties</option>
              {KENYA_COUNTIES.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={constituency} onChange={(event) => setConstituency(event.target.value)} className="w-full xl:w-52 px-4 py-3 rounded-xl bg-[#f6f3f5] border border-[#e4e2e4] text-sm font-bold text-[#002645] focus:outline-none">
              <option value="All">All constituencies</option>
              {constituencyOptions.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={specificLocation} onChange={(event) => setSpecificLocation(event.target.value)} className="w-full xl:w-48 px-4 py-3 rounded-xl bg-[#f6f3f5] border border-[#e4e2e4] text-sm font-bold text-[#002645] focus:outline-none">
              <option value="All">All locations</option>
              {locationOptions.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
            <div className="relative">
              <SlidersHorizontal className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#73777f]" />
              <input type="number" value={maxRent} onChange={(event) => setMaxRent(event.target.value)} className="w-full xl:w-40 pl-10 pr-4 py-3 rounded-xl bg-[#f6f3f5] border border-[#e4e2e4] text-sm font-bold text-[#002645] focus:outline-none" placeholder="Max rent" />
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
                        <span>{property.specificLocation || property.neighborhood || property.address}, {property.constituency || property.town || property.county || 'Kenya'}</span>
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
                    <span className="block text-lg font-black text-[#002645]">{formatKes(lowestRent)}</span>
                    <span className="text-[10px] font-semibold text-[#73777f]">Monthly rent. First month required before approval.</span>
                  </div>
                  <div className="rounded-2xl bg-[#f6f3f5] p-3">
                    <span className="text-[9px] uppercase tracking-widest text-[#73777f] font-black">County</span>
                    <span className="block text-lg font-black text-[#002645]">{property.county || 'Kenya'}</span>
                  </div>
                  <div className="rounded-2xl bg-[#f6f3f5] p-3 sm:col-span-2">
                    <span className="text-[9px] uppercase tracking-widest text-[#73777f] font-black">Constituency / location</span>
                    <span className="block text-sm font-black text-[#002645] mt-1">{property.constituency || 'Not provided'} - {property.specificLocation || property.neighborhood || 'Specific location pending'}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[9px] uppercase tracking-widest text-emerald-700 font-black">Choose a vacant unit</span>
                      <p className="text-[11px] text-[#43474e] font-semibold mt-0.5">Rent is shown as monthly rent. The first payment locks the request for owner approval.</p>
                    </div>
                    <CreditCard className="h-4 w-4 text-emerald-700 shrink-0" />
                  </div>
                  <div className="space-y-2">
                    {vacantUnits.map(unit => {
                      const application = getApplicationForUnit(unit.id);
                      const whatsappUrl = whatsappUrlFor(property, unit.id);
                      return (
                        <div key={unit.id} className="rounded-xl bg-white border border-emerald-100 p-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-black text-[#002645]">Unit {unit.unitNumber}</p>
                              <p className="text-xs font-bold text-emerald-700">{formatKes(unit.rentAmount)} / month</p>
                              <p className="text-[10px] text-[#73777f] font-semibold">First payment due: {formatKes(unit.rentAmount)}</p>
                            </div>
                            {role === 'tenant' && (
                              <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleChooseUnit(property, unit.id)}
                                  disabled={!currentTenant}
                                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-black text-white hover:bg-emerald-700 disabled:bg-slate-300 transition-all"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  {application ? 'WhatsApp Owner' : 'Request + WhatsApp'}
                                </button>
                                {application?.status === 'Awaiting Rent' && (
                                  <button
                                    type="button"
                                    onClick={() => markRentalApplicationPaid(application.id, 'M-Pesa')}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#002645]/20 px-3 py-2 text-[10px] font-black text-[#002645] hover:bg-[#E8F4FD] transition-all"
                                  >
                                    Mark Rent Paid
                                  </button>
                                )}
                                {application && application.status !== 'Awaiting Rent' && (
                                  <span className="inline-flex items-center justify-center rounded-xl bg-[#E8F4FD] px-3 py-2 text-[10px] font-black text-[#002645]">
                                    {application.status}
                                  </span>
                                )}
                                {!whatsappUrl && (
                                  <span className="text-[10px] font-bold text-amber-700">Owner phone needed</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
