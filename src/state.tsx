import React, { createContext, useContext, useState, useEffect } from 'react';
import { Property, Unit, Payment, MaintenanceRequest, Notification, AppUserRole, SettlementConfig, PlatformMember, RentalApplication } from './types';
import { normalizeUnitCount } from './unitLimits';

interface RenziyContextType {
  role: AppUserRole;
  username: string;
  setRole: (role: AppUserRole) => void;
  setUsername: (name: string) => void;
  properties: Property[];
  units: Unit[];
  payments: Payment[];
  maintenanceRequests: MaintenanceRequest[];
  notifications: Notification[];
  members: PlatformMember[];
  rentalApplications: RentalApplication[];
  tenantBalance: number;
  settlementConfig: SettlementConfig;
  addProperty: (property: Omit<Property, 'id'>) => Promise<void>;
  updatePropertyDetails: (propertyId: string, details: Partial<Property>) => Promise<void>;
  addTenantToUnit: (unitId: string, tenantName: string) => Promise<void>;
  updateUnit: (unitId: string, tenantName?: string, rentAmount?: number, status?: Unit['status']) => Promise<void>;
  recordPayment: (payment: Omit<Payment, 'id' | 'code'>) => void;
  addMaintenanceRequest: (request: Omit<MaintenanceRequest, 'id' | 'status' | 'date' | 'tenantName' | 'propertyName' | 'unitNumber'>) => void;
  updateRequestStatus: (requestId: string, status: MaintenanceRequest['status'], workerEmail?: string) => void;
  assignMaintenanceWorker: (requestId: string, workerEmail: string) => Promise<void>;
  clearBalanceAndRecordPayment: (method: 'M-Pesa' | 'Card') => void;
  markNotificationsAsRead: () => void;
  toggleUnitLock: (unitId: string, isLocked: boolean, lockReason?: string) => Promise<void>;
  updateSettlementConfig: (config: Partial<SettlementConfig>) => Promise<void>;
  updateProfileAvatar: (memberId: string, avatarUrl: string, unitId?: string) => Promise<void>;
  updateTenantAvatar: (unitId: string, tenantAvatar: string) => Promise<void>;
  requestPasswordReset: (role: PlatformMember['role'], email: string) => Promise<{ email: string; phone: string; resetCode?: string; expiresAt?: number }>;
  confirmPasswordReset: (role: PlatformMember['role'], email: string, code: string, password: string) => Promise<void>;
  registerMember: (member: Omit<PlatformMember, 'id' | 'joinDate' | 'status'>) => Promise<PlatformMember>;
  submitRentalApplication: (application: Omit<RentalApplication, 'id' | 'requestedAt' | 'status'>) => Promise<RentalApplication>;
  markRentalApplicationPaid: (applicationId: string, method: 'M-Pesa' | 'Card') => Promise<void>;
  approveRentalApplication: (applicationId: string) => Promise<void>;
  declineRentalApplication: (applicationId: string) => Promise<void>;
}

const RenziyContext = createContext<RenziyContextType | undefined>(undefined);
const DEFAULT_OWNER_EMAIL = 'john@renziy.app';
const DEFAULT_OWNER_PHONE = '0743475247';
const DEFAULT_ADMIN: PlatformMember = {
  id: 'member-admin-owner',
  role: 'admin',
  name: 'Renziy Owner',
  phone: '0743475247',
  email: 'admin@renziy.app',
  avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=480&q=80',
  specialty: 'Platform owner',
  joinDate: '2026-07-02',
  status: 'Active'
};
const DEFAULT_WORKER: PlatformMember = {
  id: 'member-worker-default',
  role: 'worker',
  name: 'Mark S.',
  phone: '0743991122',
  email: 'mark@renziy.app',
  avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBgHGl0k6f2XkLYjCLHl8a48TXjgy-Id98ps78OnE0wYtLYeuNe_SA4yid2BdyFcW72NvvX3QTFMKW2S31QWeq59noa99dscfJozILMQreMZHQdsc0PHSXD0e5EIvb9TE7fmsbiuZuJjR6Lz4WECW4S19uS50wvYbdJbxdvgGDRylaTrJhQhFiwhN9nARa_9fL6xs8Z2tDwqsJYhESjTEQmF8aARejNImS_FH9kV5YbJu-Ve_Ikaz_vvgOX0gmzBZfj1AodlcycXiGb',
  specialty: 'Plumbing and general repairs',
  joinDate: '2026-05-23',
  status: 'Active'
};

const authHeaders = () => {
  const token = localStorage.getItem('renziy_session_token');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
};

export const RenziyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation Role and Logged in user info
  const [role, setRoleState] = useState<AppUserRole>(() => {
    const saved = localStorage.getItem('renziy_role');
    return (saved as AppUserRole) || 'anonymous';
  });
  
  const [username, setUsernameState] = useState<string>(() => {
    return localStorage.getItem('renziy_username') || 'Alex';
  });

  // Base Properties
  const [properties, setProperties] = useState<Property[]>(() => {
    const saved = localStorage.getItem('renziy_properties');
    if (saved) {
      return (JSON.parse(saved) as Property[]).map(property => (
        property.ownerEmail === DEFAULT_OWNER_EMAIL ? { ...property, contactPhone: DEFAULT_OWNER_PHONE } : property
      ));
    }
    return [
      {
        id: 'prop-1',
        name: 'Oakwood Heights',
        address: 'Kilimani, Nairobi',
        unitsCount: 12,
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMxFypFJhzOCuTAq-LcLtvR4Y7ZY9bY54rSM8H5Fph0ckllantEW12QMfxkKgv07Su36d4tFLU3AqPcLAg7Uj-BF4VrVmqEQtJTgcSdEOVOJR7FN14v_XogFaT2Gh3ZDnn-3pdKTnjX7MMoWaR3HgkJfPnUgLFsheBufag0UlCJfG5PFlA5TI0pYMNgmvP6PIXX1tp8LQmTtcB59pPvkG6Eh3F9Kgp-60KmmEDPmeQYry0nEDmGA89799YSjmtXbz-EJn_uGWto2ku',
        county: 'Nairobi',
        constituency: 'Dagoretti North',
        town: 'Kilimani',
        neighborhood: 'Near Yaya Centre',
        specificLocation: 'Yaya Centre, Argwings Kodhek Road',
        description: 'Managed apartments close to shopping, transport, schools, and everyday services.',
        amenities: ['Security', 'Parking', 'Water', 'Wi-Fi ready', 'Near public transport'],
        contactPhone: '0743475247',
        mapQuery: 'Kilimani Nairobi Kenya',
        availableForMarketplace: true,
        ownerEmail: 'john@renziy.app'
      },
      {
        id: 'prop-2',
        name: 'Harbor View Villas',
        address: 'Nyali, Mombasa',
        unitsCount: 8,
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0-lP6mcA6HIE4LbzTr765rwiEop89MIpJdvoyF11DN-epOhG7wzLR2vlsvvbIs-eHfUJNUdibFBNajQHHbWzJeqHMFacPNozVQz5c_cpg8uv7fiB71TnE1n_AKhKhic2o8RClwzPHlK1tGsw0MkRGgTOyoCDxd_DliMftNntarn6QL0T4rOntvVbWuKWKfj7-n8nt8R7oxKRysKqzqbaLI_o1dRnqkJ-65xCIUfuKl4jxyeydhAO2IpAgSOxBrOIkfgdT45kPYn1w',
        county: 'Mombasa',
        constituency: 'Nyali',
        town: 'Nyali',
        neighborhood: 'Near Links Road',
        specificLocation: 'Links Road near City Mall',
        description: 'Coastal rental homes with quick access to beach areas, malls, and public transport.',
        amenities: ['Security', 'Parking', 'Balcony', 'Water', 'Near beach'],
        contactPhone: '0743475247',
        mapQuery: 'Nyali Mombasa Kenya',
        availableForMarketplace: true,
        ownerEmail: 'john@renziy.app'
      },
      {
        id: 'prop-3',
        name: 'The Landmark Plaza',
        address: 'Westlands, Nairobi',
        unitsCount: 24,
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDeFWF3TQaKiLEBRJtArgPXu09QtvyqQs-gb3Zt7iYlExPtNsZbIyaRrqyH-ukWCzFv775NWuT8V7XiXreNauV2xQTQdHb02QW_oN7OP1jp1g7Q4rJabYd5OQaedPKghFW7rMjA694Z2xEjSk44lalS6SdzWfG0I8_cLy9cCtqUZ2tP3vBmMM48q3UOStup7tWS9k1qdRLWjO2VFDULs8B0ngFXh-V-Gqp2JwMn5DH6oKY48I-GpOgw6M5_Xr0K1Gx7vkKDB417LOey',
        county: 'Nairobi',
        constituency: 'Westlands',
        town: 'Westlands',
        neighborhood: 'Near Waiyaki Way',
        specificLocation: 'Westlands business district',
        description: 'Mixed-use units for tenants who want quick access to Nairobi business corridors.',
        amenities: ['Lift access', 'Security', 'Backup power', 'Parking', 'CBD access'],
        contactPhone: '0743475247',
        mapQuery: 'Westlands Nairobi Kenya',
        availableForMarketplace: true,
        ownerEmail: 'john@renziy.app'
      },
      {
        id: 'prop-4',
        name: "Le'Mac Residences",
        address: 'Waiyaki Way, Westlands, Nairobi',
        unitsCount: 10,
        imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
        county: 'Nairobi',
        constituency: 'Westlands',
        town: 'Westlands',
        neighborhood: 'Near ABC Place',
        specificLocation: 'Waiyaki Way, Westlands',
        description: "High-rise Westlands homes inspired by Le'Mac's mixed-use residential tower profile, with city access, lift service, and lifestyle amenities.",
        amenities: ['Lift access', 'Gym', 'Backup power', 'Security', 'Parking'],
        contactPhone: '0743475247',
        mapQuery: "Le'Mac Westlands Nairobi Kenya",
        availableForMarketplace: true,
        ownerEmail: 'john@renziy.app'
      },
      {
        id: 'prop-5',
        name: 'Greenpark Athi River Homes',
        address: 'Athi River, Machakos',
        unitsCount: 16,
        imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
        county: 'Machakos',
        constituency: 'Mavoko',
        town: 'Athi River',
        neighborhood: 'Near Mombasa Road',
        specificLocation: 'Greenpark Estate area, Athi River',
        description: 'Family-friendly homes inspired by the well-known Greenpark development corridor near Nairobi, with quieter living and road access.',
        amenities: ['Parking', 'Garden court', 'Security', 'Water', 'Family estate'],
        contactPhone: '0743475247',
        mapQuery: 'Greenpark Athi River Machakos Kenya',
        availableForMarketplace: true,
        ownerEmail: 'john@renziy.app'
      },
      {
        id: 'prop-6',
        name: 'Madaraka City Flats',
        address: 'Madaraka Estate, Nairobi',
        unitsCount: 14,
        imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
        county: 'Nairobi',
        constituency: 'Langata',
        town: 'Madaraka',
        neighborhood: 'Near Nyayo National Stadium',
        specificLocation: 'Ole Sangale Road, Madaraka',
        description: 'Practical city flats inspired by Madaraka Estate, close to CBD routes, universities, stadium access, and everyday services.',
        amenities: ['Near CBD', 'Public transport', 'Water', 'Security', 'Schools nearby'],
        contactPhone: '0743475247',
        mapQuery: 'Madaraka Estate Nairobi Kenya',
        availableForMarketplace: true,
        ownerEmail: 'john@renziy.app'
      },
      {
        id: 'prop-7',
        name: 'Nyali Beach Apartments',
        address: 'Nyali, Mombasa',
        unitsCount: 12,
        imageUrl: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80',
        county: 'Mombasa',
        constituency: 'Nyali',
        town: 'Nyali',
        neighborhood: 'Near Nyali Beach',
        specificLocation: 'Nyali beach residential belt',
        description: 'Coastal apartments inspired by Nyali, with quick access to malls, beach roads, and resort-style residential services.',
        amenities: ['Near beach', 'Balcony', 'Parking', 'Security', 'Water'],
        contactPhone: '0743475247',
        mapQuery: 'Nyali Beach Mombasa Kenya',
        availableForMarketplace: true,
        ownerEmail: 'john@renziy.app'
      }
    ];
  });

  // Base Units
  const [units, setUnits] = useState<Unit[]>(() => {
    const saved = localStorage.getItem('renziy_units');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'unit-1-101', propertyId: 'prop-1', propertyName: 'Oakwood Heights', unitNumber: '101', rentAmount: 245000, status: 'Occupied', tenantName: 'Marcus Holloway', tenantAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9IoAcZLIY0gg8i6wPLcaY3ygBvaVJvW0PmG_h9U1cLAEnC0k1pah2rUmQdxTTwa2PZ2ZtDP8Qbjz2M8PTiLhaD3eXimlHnDekaQo093rGsmlvzC2rSthGOw2zEnPAvVYQsrYRRKAQ9Gbw7B8zo0HOWZaNpGzs2GKDB0DMjAlrYYqWc8XGfrZe7J-31LzJjZLfre2xMwa0HVge2uvWbsZahdZT1ShrALJgRNBMESkjZV3xRa47RCCNOORnjWwDOBmDJCnFaGCi7do5' },
      { id: 'unit-1-102', propertyId: 'prop-1', propertyName: 'Oakwood Heights', unitNumber: '102', rentAmount: 245000, status: 'Vacant' },
      { id: 'unit-1-201', propertyId: 'prop-1', propertyName: 'Oakwood Heights', unitNumber: '201', rentAmount: 280000, status: 'Occupied', tenantName: 'Sarah Jenkins', tenantAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAeMCNZyBiv-uiHtktmPVRPIpRrze2myHUqEyGKigO5LZgeu3-EP7_Ty-m4mB5GIZTneHA6G-KXG6hVHQz1wC3Gb-bT7Q82sDQKB583GkhdMFG5ZclHw4rl4_BK6sYi_QlxOSprJxAcqXMjWz41BAsUl0DXfLpJUZzgtVSzWKgHFpIf-UO6uiopeFa1h7QMxeZudiyqMMy-3IfrzO_ApWV77rRsYhROsYt2He4hGzWEBLPhQqKpdKovJWb_O96JJmbHQQbiK7HkM2bH' },
      { id: 'unit-1-202', propertyId: 'prop-1', propertyName: 'Oakwood Heights', unitNumber: '202', rentAmount: 280000, status: 'Occupied', tenantName: 'Liam Carter', tenantAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBY1CTvj3PmtB3-LR_p1s4FNqaP67e_JoWovsuzRp3hatwF4Yg7LrghoPHFR3QODAlxjD9QQF_sIEDYVU0fbJWPhNa9W2QSz2JRCYA5eMWJxLkMcl5HZUURA8kXnfeVXbb8RDc4AW9wvm_SmqyHEv3RQTjcPXHaNL0e2CgaBh6Y4LbLxHaykUfOjEK0DWINHnO5M6EI-CV5VHBoeBuiVQ-kXneHEpi0m6_MM0suuhUZbRzMc1qz4fBdIKQaFE10mTnPsr6OA7lENt6E' },
      { id: 'unit-1-4b', propertyId: 'prop-1', propertyName: 'Oakwood Heights', unitNumber: 'Apt 4B', rentAmount: 145000, status: 'Occupied', tenantName: 'Alex Smith', tenantAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOcbVtz4Nz5aTDAR2DZW9Pg9F6e65oPi6Td2jZ84CEwLXgn5HrvYocGZaVvLRdcS9eUaqLENJ27o2RqpElz14uBPV47JROuDd4JkbKG4lK3vapbE6KOkie8PQbaMTqlvURqdmEzyOUTLS-bssVrQp56st-qoqgO1NFNrdLvXPdL5SwnjZzSChp5a_s4toIffdm_8W02EPKg7MLqi3poWL6UDKib0nkwFBjpcLb7YMRsPtiVkMFt4jFzqbDf0SOuGuynYq7GjnWhyHB' },
      
      { id: 'unit-2-1', propertyId: 'prop-2', propertyName: 'Harbor View Villas', unitNumber: 'Unit 1', rentAmount: 195000, status: 'Occupied', tenantName: 'Jane Doe' },
      { id: 'unit-2-2', propertyId: 'prop-2', propertyName: 'Harbor View Villas', unitNumber: 'Unit 2', rentAmount: 195000, status: 'Occupied', tenantName: 'Mark Smith' },
      { id: 'unit-2-3', propertyId: 'prop-2', propertyName: 'Harbor View Villas', unitNumber: 'Unit 3', rentAmount: 210000, status: 'Occupied', tenantName: 'Lucia Rivera' },
      { id: 'unit-2-4', propertyId: 'prop-2', propertyName: 'Harbor View Villas', unitNumber: 'Unit 4', rentAmount: 210000, status: 'Vacant' },
      
      { id: 'unit-3-1', propertyId: 'prop-3', propertyName: 'The Landmark Plaza', unitNumber: 'Suite A', rentAmount: 450000, status: 'Occupied', tenantName: 'Tom Brown' },
      { id: 'unit-3-2', propertyId: 'prop-3', propertyName: 'The Landmark Plaza', unitNumber: 'Suite B', rentAmount: 450000, status: 'Vacant' },
      { id: 'unit-4-1201', propertyId: 'prop-4', propertyName: "Le'Mac Residences", unitNumber: '1201', rentAmount: 265000, status: 'Vacant' },
      { id: 'unit-4-1603', propertyId: 'prop-4', propertyName: "Le'Mac Residences", unitNumber: '1603', rentAmount: 315000, status: 'Vacant' },
      { id: 'unit-5-b08', propertyId: 'prop-5', propertyName: 'Greenpark Athi River Homes', unitNumber: 'B-08', rentAmount: 95000, status: 'Vacant' },
      { id: 'unit-5-c14', propertyId: 'prop-5', propertyName: 'Greenpark Athi River Homes', unitNumber: 'C-14', rentAmount: 125000, status: 'Vacant' },
      { id: 'unit-6-f12', propertyId: 'prop-6', propertyName: 'Madaraka City Flats', unitNumber: 'F-12', rentAmount: 78000, status: 'Vacant' },
      { id: 'unit-6-g03', propertyId: 'prop-6', propertyName: 'Madaraka City Flats', unitNumber: 'G-03', rentAmount: 88000, status: 'Vacant' },
      { id: 'unit-7-a2', propertyId: 'prop-7', propertyName: 'Nyali Beach Apartments', unitNumber: 'A-2', rentAmount: 135000, status: 'Vacant' },
      { id: 'unit-7-p1', propertyId: 'prop-7', propertyName: 'Nyali Beach Apartments', unitNumber: 'Penthouse 1', rentAmount: 260000, status: 'Vacant' }
    ];
  });

  // Base Recent Payments
  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem('renziy_payments');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'pay-1',
        tenantName: 'Jane Doe',
        unitNumber: 'Unit 1',
        propertyName: 'Harbor View Villas',
        date: 'Oct 12, 2023',
        amount: 185000.00,
        status: 'Paid',
        paymentMethod: 'M-Pesa',
        code: 'MPESA-OCT-JD88'
      },
      {
        id: 'pay-2',
        tenantName: 'Mark Smith',
        unitNumber: 'Unit 2',
        propertyName: 'Harbor View Villas',
        date: 'Oct 11, 2023',
        amount: 240000.00,
        status: 'Paid',
        paymentMethod: 'Card',
        code: 'CARD-OCT-MS22'
      },
      {
        id: 'pay-3',
        tenantName: 'Lucia Rivera',
        unitNumber: 'Unit 3',
        propertyName: 'Harbor View Villas',
        date: 'Oct 10, 2023',
        amount: 160000.00,
        status: 'Pending',
        paymentMethod: 'M-Pesa',
        code: 'MPESA-OCT-LR33'
      },
      {
        id: 'pay-4',
        tenantName: 'Tom Brown',
        unitNumber: 'Suite A',
        propertyName: 'The Landmark Plaza',
        date: 'Oct 09, 2023',
        amount: 125000.00,
        status: 'Paid',
        paymentMethod: 'Card',
        code: 'CARD-OCT-TB05'
      }
    ];
  });

  // Base Maintenance Tickets
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>(() => {
    const saved = localStorage.getItem('renziy_maintenance');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'req-1',
        title: 'Leaking Kitchen Sink',
        category: 'Plumbing',
        urgency: 'High',
        description: 'Water dripping from the main faucet gasket inside of the wood drawer under the sink.',
        status: 'In Progress',
        date: '2026-05-25',
        photos: [
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAMUjzaEq6ab_V_3MYMo4C6cZFsDjDbKIg_8Pat8Qld5o4TaYVhsmYYTTv0OmwgZ-4I8RGO3LgwQbmryvRw-JuQxSzRcimztLBcV-zJz6kl0MtiWfMS4IkNGZvo3yRxoALnLPBHHAsj8PmXMuQdx4lExUq6yqEyHjSqyVCrfKAqh3sKlD3ZhkMaYXItTe2XwFYBEknIP8pYnQgskVaBzn34fRnBlH2KL3P1Tph3-VjQ8taeHBuXdcS1q2xubjz3yb7Z-H2_bLb0ODzo'
        ],
        technicianName: 'Mark S.',
        technicianEmail: 'mark@renziy.app',
        technicianPhone: '0743991122',
        technicianAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBgHGl0k6f2XkLYjCLHl8a48TXjgy-Id98ps78OnE0wYtLYeuNe_SA4yid2BdyFcW72NvvX3QTFMKW2S31QWeq59noa99dscfJozILMQreMZHQdsc0PHSXD0e5EIvb9TE7fmsbiuZuJjR6Lz4WECW4S19uS50wvYbdJbxdvgGDRylaTrJhQhFiwhN9nARa_9fL6xs8Z2tDwqsJYhESjTEQmF8aARejNImS_FH9kV5YbJu-Ve_Ikaz_vvgOX0gmzBZfj1AodlcycXiGb',
        arrivalTime: '2:00 PM',
        propertyName: 'Oakwood Heights',
        unitNumber: 'Apt 4B',
        tenantName: 'Alex Smith'
      },
      {
        id: 'req-2',
        title: 'Filter Replacement',
        category: 'HVAC',
        urgency: 'Low',
        description: 'Routine filter change requested for the central HVAC in the hallway.',
        status: 'Submitted',
        date: '2026-05-26',
        photos: [],
        propertyName: 'Oakwood Heights',
        unitNumber: 'Apt 4B',
        tenantName: 'Alex Smith'
      },
      {
        id: 'req-3',
        title: 'Hallway Light Flickering',
        category: 'Electrical',
        urgency: 'Med',
        description: 'The overhead lights near the entrance are flickering on and off intermittently.',
        status: 'Acknowledged',
        date: '2026-05-24',
        photos: [],
        propertyName: 'Oakwood Heights',
        unitNumber: 'Apt 201',
        tenantName: 'Sarah Jenkins'
      }
    ];
  });

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('renziy_notifications');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'notif-lockout-alert',
        title: 'Critical Door Lockout Warning',
        message: 'Your rent payment of KES 145,000 is now overdue. Continued failure to settle this balance will result in your unit smart lock being engaged remotely.',
        date: 'Just now',
        type: 'payment',
        unread: true
      },
      {
        id: 'notif-1',
        title: 'Maintenance Update',
        message: 'A technician (Mark S.) has been assigned to your sink repair.',
        date: '2 hours ago',
        type: 'maintenance',
        unread: true
      },
      {
        id: 'notif-2',
        title: 'Lease Document',
        message: 'Your signed lease renewal is now available in your documents.',
        date: 'Yesterday',
        type: 'lease',
        unread: true
      }
    ];
  });

  const [members, setMembers] = useState<PlatformMember[]>(() => {
    const saved = localStorage.getItem('renziy_members');
    if (saved) {
      const savedMembers = (JSON.parse(saved) as PlatformMember[]).map(member => (
        member.role === 'landlord' && member.email === DEFAULT_OWNER_EMAIL ? { ...member, phone: DEFAULT_OWNER_PHONE } : member
      ));
      const withAdmin = savedMembers.some(member => member.role === 'admin' && member.email === DEFAULT_ADMIN.email)
        ? savedMembers
        : [DEFAULT_ADMIN, ...savedMembers];
      return withAdmin.some(member => member.role === 'worker' && member.email === DEFAULT_WORKER.email)
        ? withAdmin
        : [DEFAULT_WORKER, ...withAdmin];
    }
    return [
      DEFAULT_ADMIN,
      {
        id: 'member-landlord-default',
        role: 'landlord',
        name: 'John Doe',
        phone: '0743475247',
        email: 'john@renziy.app',
        avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDRxmlZiyPxhMA9KhxxEY-ZornwU45XOarKthi5rZwjaUXVYAzK1Rptwz3XSUMih-aX7N40cr2Ki-5KZvD7pUHT8xTTKjuQMyyucNGma4FaFJirfRO8Nmxdo7wvHhgJnJDxwkPMa5NOJdwGCIEP9IoZoEnvk7HAYZ8jfseOFIDZ7L5DKDb2LTYFaZymzBJ-SYm2ragI8Q_dxp6yzf6AjtEmLdC6yZGqnU2ZCun5dcEqufGWVNNfnsQoC1JyHXHZfKXLK1rfwMLmEMPm',
        propertyName: 'Oakwood Heights',
        joinDate: '2026-05-20',
        status: 'Active'
      },
      {
        id: 'member-tenant-default',
        role: 'tenant',
        name: 'Alex Smith',
        phone: '0712456789',
        email: 'alex@renziy.app',
        avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOcbVtz4Nz5aTDAR2DZW9Pg9F6e65oPi6Td2jZ84CEwLXgn5HrvYocGZaVvLRdcS9eUaqLENJ27o2RqpElz14uBPV47JROuDd4JkbKG4lK3vapbE6KOkie8PQbaMTqlvURqdmEzyOUTLS-bssVrQp56st-qoqgO1NFNrdLvXPdL5SwnjZzSChp5a_s4toIffdm_8W02EPKg7MLqi3poWL6UDKib0nkwFBjpcLb7YMRsPtiVkMFt4jFzqbDf0SOuGuynYq7GjnWhyHB',
        propertyName: 'Oakwood Heights',
        unitNumber: 'Apt 4B',
        rentAmount: 145000,
        joinDate: '2026-05-22',
        status: 'Active'
      },
      {
        id: 'member-worker-default',
        role: 'worker',
        name: 'Mark S.',
        phone: '0743991122',
        email: 'mark@renziy.app',
        avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBgHGl0k6f2XkLYjCLHl8a48TXjgy-Id98ps78OnE0wYtLYeuNe_SA4yid2BdyFcW72NvvX3QTFMKW2S31QWeq59noa99dscfJozILMQreMZHQdsc0PHSXD0e5EIvb9TE7fmsbiuZuJjR6Lz4WECW4S19uS50wvYbdJbxdvgGDRylaTrJhQhFiwhN9nARa_9fL6xs8Z2tDwqsJYhESjTEQmF8aARejNImS_FH9kV5YbJu-Ve_Ikaz_vvgOX0gmzBZfj1AodlcycXiGb',
        specialty: 'Plumbing and general repairs',
        joinDate: '2026-05-23',
        status: 'Active'
      }
    ];
  });

  const [rentalApplications, setRentalApplications] = useState<RentalApplication[]>(() => {
    const saved = localStorage.getItem('renziy_rental_applications');
    if (saved) return JSON.parse(saved);
    return [];
  });

  // Tenant Balance
  const [tenantBalance, setTenantBalance] = useState<number>(() => {
    const saved = localStorage.getItem('renziy_balance');
    return saved ? Number(saved) : 145000;
  });

  // Landlord Settlement Config
  const [settlementConfig, setSettlementConfig] = useState<SettlementConfig>(() => {
    const saved = localStorage.getItem('renziy_settlement');
    if (saved) return JSON.parse(saved);
    return {
      mpesaType: 'Paybill',
      mpesaDetails: '174379',
      mpesaAccountName: 'RENZIY APP MANAGEMENT',
      paybillAccount: 'RENT',
      bankName: 'Equity Bank',
      bankAccountName: 'Renziy Real Estate Ltd',
      bankAccountNumber: '1234567890123',
      bankRoutingCode: 'EQTYKE'
    };
  });
  const [passwordResetChallenges, setPasswordResetChallenges] = useState<Record<string, { code: string; expiresAt: number }>>({});

  const publishSharedDataChange = () => {
    localStorage.setItem('renziy_shared_data_version', Date.now().toString());
  };

  const refreshSharedData = async () => {
    try {
      const [
        propsRes,
        unitsRes,
        paymentsRes,
        maintRes,
        notifsRes,
        membersRes,
        rentalApplicationsRes,
        balRes,
        settRes
      ] = await Promise.all([
        fetch('/api/properties'),
        fetch('/api/units'),
        fetch('/api/payments'),
        fetch('/api/maintenance'),
        fetch('/api/notifications'),
        fetch('/api/members'),
        fetch('/api/rental-applications'),
        fetch('/api/balance'),
        fetch('/api/settlement')
      ]);

      if (propsRes.ok) setProperties(await propsRes.json());
      if (unitsRes.ok) setUnits(await unitsRes.json());
      if (paymentsRes.ok) setPayments(await paymentsRes.json());
      if (maintRes.ok) setMaintenanceRequests(await maintRes.json());
      if (notifsRes.ok) setNotifications(await notifsRes.json());
      if (membersRes.ok) setMembers(await membersRes.json());
      if (rentalApplicationsRes.ok) setRentalApplications(await rentalApplicationsRes.json());
      if (balRes.ok) {
        const balData = await balRes.json();
        setTenantBalance(balData.tenantBalance);
      }
      if (settRes.ok) setSettlementConfig(await settRes.json());
    } catch (err) {
      console.warn("Shared Renziy data refresh unavailable, using local state:", err);
    }
  };

  const syncAfterMutation = async () => {
    await refreshSharedData();
    publishSharedDataChange();
  };

  // Fetch all initial states from physical server storage
  useEffect(() => {
    refreshSharedData();
  }, []);

  useEffect(() => {
    if (role === 'anonymous') return;

    const handleSharedDataChange = (event: StorageEvent) => {
      if (event.key === 'renziy_shared_data_version') {
        refreshSharedData();
      }
    };

    const refreshId = window.setInterval(refreshSharedData, 5000);
    window.addEventListener('focus', refreshSharedData);
    window.addEventListener('storage', handleSharedDataChange);
    return () => {
      window.clearInterval(refreshId);
      window.removeEventListener('focus', refreshSharedData);
      window.removeEventListener('storage', handleSharedDataChange);
    };
  }, [role]);

  // Soft-sync State to Local Storage for immediate UI responsive rendering
  useEffect(() => {
    localStorage.setItem('renziy_role', role);
    localStorage.setItem('renziy_username', username);
    localStorage.setItem('renziy_properties', JSON.stringify(properties));
    localStorage.setItem('renziy_units', JSON.stringify(units));
    localStorage.setItem('renziy_payments', JSON.stringify(payments));
    localStorage.setItem('renziy_maintenance', JSON.stringify(maintenanceRequests));
    localStorage.setItem('renziy_notifications', JSON.stringify(notifications));
    localStorage.setItem('renziy_members', JSON.stringify(members));
    localStorage.setItem('renziy_rental_applications', JSON.stringify(rentalApplications));
    localStorage.setItem('renziy_balance', tenantBalance.toString());
    localStorage.setItem('renziy_settlement', JSON.stringify(settlementConfig));
  }, [role, username, properties, units, payments, maintenanceRequests, notifications, members, rentalApplications, tenantBalance, settlementConfig]);

  // Set Role Context
  const setRole = (newRole: AppUserRole) => {
    setRoleState(newRole);
  };

  const setUsername = (name: string) => {
    setUsernameState(name);
  };

  // Add Property (backend-coupled API post)
  const addProperty = async (newProp: Omit<Property, 'id'>) => {
    // Optimistic fallback
    const id = `prop-${Date.now()}`;
    const unitsCount = normalizeUnitCount(newProp.unitsCount);
    const property: Property = { ...newProp, id, unitsCount };
    setProperties(prev => [...prev, property]);
    const generatedUnits: Unit[] = Array.from({ length: unitsCount }).map((_, index) => {
      const unitNumber = `${100 + index + 1}`;
      return {
        id: `unit-${id}-${unitNumber}`,
        propertyId: id,
        propertyName: newProp.name,
        unitNumber,
        rentAmount: 15000 + index * 1000,
        status: 'Vacant'
      };
    });
    setUnits(prev => [...prev, ...generatedUnits]);

    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ ...newProp, unitsCount })
      });
      if (res.ok) {
        await syncAfterMutation();
      }
    } catch (err) {
      console.warn("Express API unreachable. Operating in local mode:", err);
    }
  };

  const updatePropertyDetails = async (propertyId: string, details: Partial<Property>) => {
    setProperties(prev => prev.map(property => (
      property.id === propertyId ? { ...property, ...details } : property
    )));
    if (details.name) {
      setUnits(prev => prev.map(unit => (
        unit.propertyId === propertyId ? { ...unit, propertyName: details.name as string } : unit
      )));
    }

    try {
      const res = await fetch(`/api/properties/${propertyId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(details)
      });
      if (res.ok) {
        await syncAfterMutation();
      }
    } catch (err) {
      console.warn("Express API property update unavailable, using local saved listing details:", err);
    }
  };

  // Add Tenant to a Unit (backend-coupled API post)
  const addTenantToUnit = async (unitId: string, tenantName: string) => {
    // Optimistic UI updates
    setUnits(prev => prev.map(u => {
      if (u.id === unitId) {
        return {
          ...u,
          status: 'Occupied',
          tenantName,
          tenantAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOcbVtz4Nz5aTDAR2DZW9Pg9F6e65oPi6Td2jZ84CEwLXgn5HrvYocGZaVvLRdcS9eUaqLENJ27o2RqpElz14uBPV47JROuDd4JkbKG4lK3vapbE6KOkie8PQbaMTqlvURqdmEzyOUTLS-bssVrQp56st-qoqgO1NFNrdLvXPdL5SwnjZzSChp5a_s4toIffdm_8W02EPKg7MLqi3poWL6UDKib0nkwFBjpcLb7YMRsPtiVkMFt4jFzqbDf0SOuGuynYq7GjnWhyHB'
        };
      }
      return u;
    }));

    try {
      const res = await fetch('/api/units/assign', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ unitId, tenantName })
      });
      if (res.ok) {
        await syncAfterMutation();
      }
    } catch (err) {
      console.warn("Express API unreachable:", err);
    }
  };

  // Update Unit Details
  const updateUnit = async (unitId: string, tenantName?: string, rentAmount?: number, status?: Unit['status']) => {
    setUnits(prev => prev.map(u => {
      if (u.id === unitId) {
        const shouldUpdateTenant = tenantName !== undefined;
        const nextStatus = status !== undefined
          ? status
          : shouldUpdateTenant
            ? (tenantName ? 'Occupied' : 'Vacant')
            : u.status;
        return {
          ...u,
          rentAmount: rentAmount !== undefined ? rentAmount : u.rentAmount,
          status: nextStatus,
          tenantName: shouldUpdateTenant ? (tenantName || undefined) : nextStatus === 'Vacant' ? undefined : u.tenantName,
          tenantAvatar: shouldUpdateTenant
            ? (tenantName ? u.tenantAvatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOcbVtz4Nz5aTDAR2DZW9Pg9F6e65oPi6Td2jZ84CEwLXgn5HrvYocGZaVvLRdcS9eUaqLENJ27o2RqpElz14uBPV47JROuDd4JkbKG4lK3vapbE6KOkie8PQbaMTqlvURqdmEzyOUTLS-bssVrQp56st-qoqgO1NFNrdLvXPdL5SwnjZzSChp5a_s4toIffdm_8W02EPKg7MLqi3poWL6UDKib0nkwFBjpcLb7YMRsPtiVkMFt4jFzqbDf0SOuGuynYq7GjnWhyHB' : undefined)
            : nextStatus === 'Vacant' ? undefined : u.tenantAvatar
        };
      }
      return u;
    }));

    try {
      const res = await fetch('/api/units/update', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ unitId, tenantName, rentAmount, status })
      });
      if (res.ok) {
        await syncAfterMutation();
      }
    } catch (err) {
      console.warn("Express API unreachable:", err);
    }
  };

  // Record a payment (backend-coupled API post)
  const recordPayment = async (p: Omit<Payment, 'id' | 'code'>) => {
    // Optimistic UI updates
    const paymentHash = Math.random().toString(36).substring(2, 10).toUpperCase();
    const newPayment: Payment = {
      ...p,
      id: `pay-${Date.now()}`,
      code: `${p.paymentMethod === 'M-Pesa' ? 'MPESA' : 'CARD'}-REC-${paymentHash}`
    };
    setPayments(prev => [newPayment, ...prev]);
    if (p.tenantName === username || ((username === 'Alex' || username === 'Alex Smith') && (p.tenantName === 'Alex Smith' || p.tenantName === 'Alex'))) {
      setTenantBalance(0);
    }

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(p)
      });
      if (res.ok) {
        await syncAfterMutation();
      }
    } catch (err) {
      console.warn("Express API unreachable:", err);
    }
  };

  // File repair ticket (backend-coupled API post)
  const addMaintenanceRequest = async (req: Omit<MaintenanceRequest, 'id' | 'status' | 'date' | 'tenantName' | 'propertyName' | 'unitNumber'>) => {
    // Optimistic local state updates
    const activeUnit = units.find(u => u.tenantName === username) || ((username === 'Alex' || username === 'Alex Smith') ? units.find(u => u.id === 'unit-1-4b') : undefined);
    const newRequest: MaintenanceRequest = {
      ...req,
      id: `req-${Date.now()}`,
      status: 'Submitted',
      date: new Date().toISOString().split('T')[0],
      tenantName: username,
      propertyName: activeUnit?.propertyName || 'Pending assignment',
      unitNumber: activeUnit?.unitNumber || 'Pending assignment'
    };
    setMaintenanceRequests(prev => [newRequest, ...prev]);

    setNotifications(prev => [
      {
        id: `notif-${Date.now()}`,
        title: 'Request Received',
        message: `Your maintenance request "${req.title}" has been successfully logged.`,
        date: 'Just now',
        type: 'maintenance',
        unread: true
      },
      ...prev
    ]);

    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ ...req, tenantName: username })
      });
      if (res.ok) {
        await syncAfterMutation();
      }
    } catch (err) {
      console.warn("Express API unreachable:", err);
    }
  };

  // Adjust Status of a maintenance ticket (backend-coupled PATCH API)
  const updateRequestStatus = async (requestId: string, status: MaintenanceRequest['status'], workerEmail?: string) => {
    const worker = workerEmail ? members.find(member => member.role === 'worker' && member.email === workerEmail) : undefined;
    // Optimistic adjustments
    setMaintenanceRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        const techObj = worker ? {
          technicianName: worker.name,
          technicianEmail: worker.email,
          technicianPhone: worker.phone,
          technicianAvatar: worker.avatarUrl,
          arrivalTime: '3:30 PM'
        } : {};
        return { ...r, status, ...techObj };
      }
      return r;
    }));

    try {
      const res = await fetch(`/api/maintenance/${requestId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status, workerEmail })
      });
      if (res.ok) {
        await syncAfterMutation();
      }
    } catch (err) {
      console.warn("Express API unreachable:", err);
    }
  };

  const assignMaintenanceWorker = async (requestId: string, workerEmail: string) => {
    const worker = members.find(member => member.role === 'worker' && member.email === workerEmail);
    if (!worker) return;

    let assignedRequest: MaintenanceRequest | undefined;
    setMaintenanceRequests(prev => prev.map(request => {
      if (request.id === requestId) {
        assignedRequest = {
          ...request,
          status: request.status === 'Submitted' ? 'Acknowledged' : request.status,
          technicianName: worker.name,
          technicianEmail: worker.email,
          technicianPhone: worker.phone,
          technicianAvatar: worker.avatarUrl,
          arrivalTime: '3:30 PM'
        };
        return assignedRequest;
      }
      return request;
    }));

    setNotifications(prev => [
      {
        id: `notif-worker-${Date.now()}`,
        title: 'Worker Assigned',
        message: `${worker.name} has been contacted for the repair request.`,
        date: 'Just now',
        type: 'maintenance',
        unread: true
      },
      ...prev
    ]);

    try {
      const res = await fetch(`/api/maintenance/${requestId}/assign-worker`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ workerEmail })
      });
      if (res.ok) {
        await syncAfterMutation();
      }
    } catch (err) {
      console.warn("Express API worker assignment unavailable, using local workflow:", err);
    }
  };

  // Pay rent wizard completion (coupled to backend balance/pay route)
  const clearBalanceAndRecordPayment = async (method: 'M-Pesa' | 'Card') => {
    const originalAmount = tenantBalance;
    setTenantBalance(0);

    const activeUnit = units.find(u => u.tenantName === username) || ((username === 'Alex' || username === 'Alex Smith') ? units.find(u => u.id === 'unit-1-4b') : undefined);
    const paymentHash = Math.random().toString(36).substring(2, 10).toUpperCase();
    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      tenantName: username,
      unitNumber: activeUnit?.unitNumber || 'Pending assignment',
      propertyName: activeUnit?.propertyName || 'Pending assignment',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amount: originalAmount,
      status: 'Paid',
      paymentMethod: method,
      code: `${method === 'M-Pesa' ? 'FLW-MP' : 'FLW-RE'}-${paymentHash}`
    };
    setPayments(prev => [newPayment, ...prev]);

    setNotifications(prev => [
      {
        id: `notif-${Date.now()}`,
        title: 'Rent Paid Successfully',
        message: `Successfully processed ${method} rent payment of KES ${originalAmount.toLocaleString()}.`,
        date: 'Just now',
        type: 'payment',
        unread: true
      },
      ...prev
    ]);

    try {
      const res = await fetch('/api/balance/pay', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ method, tenantName: username })
      });
      if (res.ok) {
        await syncAfterMutation();
      }
    } catch (err) {
      console.warn("Express API unreachable:", err);
    }
  };

  const toggleUnitLock = async (unitId: string, isLocked: boolean, lockReason?: string) => {
    // Optimistic UI update
    setUnits(prev => prev.map(u => {
      if (u.id === unitId) {
        return {
          ...u,
          isLocked,
          lockReason: isLocked ? (lockReason || "Rent payment overdue") : undefined
        };
      }
      return u;
    }));

    // Trigger a live notification
    const matchedUnit = units.find(u => u.id === unitId);
    if (matchedUnit && matchedUnit.tenantName) {
      setNotifications(prev => [
        {
          id: `notif-${Date.now()}`,
          title: isLocked ? 'Smart Lock Engaged' : 'Smart Lock Released',
          message: isLocked
            ? `Your unit ${matchedUnit.unitNumber} at ${matchedUnit.propertyName} has been locked. Reason: ${lockReason || "Rent payment overdue"}.`
            : `Your unit ${matchedUnit.unitNumber} at ${matchedUnit.propertyName} has been unlocked.`,
          date: 'Just now',
          type: 'payment',
          unread: true
        },
        ...prev
      ]);
    }

    try {
      const res = await fetch('/api/units/lock', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ unitId, isLocked, lockReason })
      });
      if (res.ok) {
        await syncAfterMutation();
      }
    } catch (err) {
      console.warn("Express API smart lock sync failed, using fallback:", err);
    }
  };

  const markNotificationsAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));

    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: authHeaders()
      });
      if (res.ok) {
        const notifsRes = await fetch('/api/notifications');
        if (notifsRes.ok) setNotifications(await notifsRes.json());
      }
    } catch (err) {
      console.warn("Express API unreachable:", err);
    }
  };

  const updateSettlementConfig = async (newConfig: Partial<SettlementConfig>) => {
    let finalConfig: SettlementConfig | null = null;
    setSettlementConfig(prev => {
      finalConfig = { ...prev, ...newConfig };
      return finalConfig;
    });

    try {
      const res = await fetch('/api/settlement', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(newConfig)
      });
      if (res.ok) {
        await syncAfterMutation();
      }
    } catch (err) {
      console.warn("Express API unreachable:", err);
    }
  };

  const updateTenantAvatar = async (unitId: string, tenantAvatar: string) => {
    // Optimistic UI update
    setUnits(prev => prev.map(u => {
      if (u.id === unitId) {
        return {
          ...u,
          tenantAvatar
        };
      }
      return u;
    }));

    try {
      const res = await fetch('/api/units/update-avatar', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ unitId, tenantAvatar })
      });
      if (res.ok) {
        await syncAfterMutation();
      }
    } catch (err) {
      console.warn("Express API unit avatar update failed:", err);
    }
  };

  const updateProfileAvatar = async (memberId: string, avatarUrl: string, unitId?: string) => {
    let updatedMember: PlatformMember | undefined;

    setMembers(prev => prev.map(member => {
      if (member.id !== memberId) return member;
      updatedMember = { ...member, avatarUrl };
      return updatedMember;
    }));

    if (updatedMember?.role === 'tenant' && unitId) {
      setUnits(prev => prev.map(unit => (
        unit.id === unitId ? { ...unit, tenantAvatar: avatarUrl } : unit
      )));
    }

    if (updatedMember?.role === 'worker') {
      setMaintenanceRequests(prev => prev.map(request => (
        request.technicianEmail?.toLowerCase() === updatedMember?.email.toLowerCase()
          ? { ...request, technicianAvatar: avatarUrl }
          : request
      )));
    }

    try {
      const res = await fetch('/api/members/avatar', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ memberId, avatarUrl, unitId })
      });
      if (res.ok) {
        await syncAfterMutation();
      }
    } catch (err) {
      console.warn("Express API profile avatar update failed:", err);
    }
  };

  const maskEmail = (value: string) => {
    const [name, domain] = value.split('@');
    if (!name || !domain) return value;
    return `${name.slice(0, 2)}${'*'.repeat(Math.max(name.length - 2, 2))}@${domain}`;
  };

  const maskPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.length > 4 ? `${digits.slice(0, 3)}****${digits.slice(-2)}` : value;
  };

  const resetKey = (role: PlatformMember['role'], email: string) => `${role}:${email.trim().toLowerCase()}`;

  const requestPasswordReset = async (role: PlatformMember['role'], email: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ role, email: normalizedEmail })
      });
      if (res.ok) {
        const data = await res.json();
        return data.delivery as { email: string; phone: string; resetCode?: string; expiresAt?: number };
      }

      const data = await res.json().catch(() => null);
      throw new Error(data?.error || 'Password reset code could not be sent.');
    } catch (err) {
      if (err instanceof Error && err.message !== 'Failed to fetch') {
        throw err;
      }
      console.warn("Express API password reset unavailable, using local reset code:", err);
      const matchingMember = members.find(member => (
        member.role === role &&
        member.email.toLowerCase() === normalizedEmail
      ));

      if (!matchingMember) {
        throw new Error('No matching account was found for that role and email address.');
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000;
      setPasswordResetChallenges(prev => ({
        ...prev,
        [resetKey(role, normalizedEmail)]: { code, expiresAt }
      }));
      return {
        email: maskEmail(matchingMember.email),
        phone: maskPhone(matchingMember.phone),
        resetCode: code,
        expiresAt
      };
    }
  };

  const confirmPasswordReset = async (role: PlatformMember['role'], email: string, code: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const res = await fetch('/api/auth/confirm-password-reset', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ role, email: normalizedEmail, code, password })
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(prev => prev.map(member => member.id === data.member.id ? data.member : member));
        await syncAfterMutation();
        return;
      }

      const data = await res.json().catch(() => null);
      throw new Error(data?.error || 'Password reset failed.');
    } catch (err) {
      if (err instanceof Error && err.message !== 'Failed to fetch') {
        throw err;
      }

      const key = resetKey(role, normalizedEmail);
      const challenge = passwordResetChallenges[key];
      if (!challenge || challenge.expiresAt < Date.now() || challenge.code !== code.trim()) {
        throw new Error('The reset code is invalid or expired.');
      }

      setMembers(prev => prev.map(member => (
        member.role === role && member.email.toLowerCase() === normalizedEmail
          ? { ...member, password }
          : member
      )));
      setPasswordResetChallenges(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const registerMember = async (member: Omit<PlatformMember, 'id' | 'joinDate' | 'status'>) => {
    const newMember: PlatformMember = {
      ...member,
      id: `member-${Date.now()}`,
      joinDate: new Date().toISOString().split('T')[0],
      status: 'Active'
    };

    setMembers(prev => [newMember, ...prev.filter(m => m.email !== member.email || m.role !== member.role)]);
    if (newMember.role === 'tenant' && newMember.propertyName && newMember.unitNumber) {
      setUnits(prev => prev.map(unit => (
        unit.propertyName === newMember.propertyName && unit.unitNumber === newMember.unitNumber
          ? {
              ...unit,
              status: 'Occupied',
              tenantName: newMember.name,
              tenantAvatar: newMember.avatarUrl || unit.tenantAvatar
            }
          : unit
      )));
    }
    setNotifications(prev => [
      {
        id: `notif-member-${Date.now()}`,
        title: 'New Platform Member',
        message: `${member.name} joined Renziy as a ${member.role}.`,
        date: 'Just now',
        type: 'lease',
        unread: true
      },
      ...prev
    ]);

    try {
      const res = await fetch(member.password ? '/api/auth/register' : '/api/members', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(newMember)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          localStorage.setItem('renziy_session_token', data.token);
        }
        const savedMember = data.member || data;
        setMembers(prev => [savedMember, ...prev.filter(m => m.id !== newMember.id && (m.email !== member.email || m.role !== member.role))]);
        await syncAfterMutation();
        return savedMember;
      }
    } catch (err) {
      console.warn("Express API member registry unavailable, using local durable registry:", err);
    }

    return newMember;
  };

  const submitRentalApplication = async (application: Omit<RentalApplication, 'id' | 'requestedAt' | 'status'>) => {
    const requestedUnit = units.find(unit => unit.id === application.unitId && unit.propertyId === application.propertyId);
    const hasActiveRequest = rentalApplications.some(item => (
      item.unitId === application.unitId &&
      item.tenantEmail === application.tenantEmail &&
      item.status !== 'Declined'
    ));
    if (!requestedUnit || requestedUnit.status !== 'Vacant' || requestedUnit.rentAmount !== application.rentAmount || hasActiveRequest) {
      throw new Error('This unit is no longer available for a new request.');
    }

    const newApplication: RentalApplication = {
      ...application,
      id: `rent-app-${Date.now()}`,
      requestedAt: new Date().toISOString(),
      status: 'Awaiting Rent'
    };

    setRentalApplications(prev => [
      newApplication,
      ...prev.filter(item => !(item.unitId === application.unitId && item.tenantEmail === application.tenantEmail && item.status !== 'Declined'))
    ]);
    setNotifications(prev => [
      {
        id: `notif-rental-${Date.now()}`,
        title: 'New House Request',
        message: `${application.tenantName} requested ${application.propertyName} - Unit ${application.unitNumber}.`,
        date: 'Just now',
        type: 'lease',
        unread: true
      },
      ...prev
    ]);

    try {
      const res = await fetch('/api/rental-applications', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(newApplication)
      });
      if (res.ok) {
        const savedApplication = await res.json();
        setRentalApplications(prev => [
          savedApplication,
          ...prev.filter(item => item.id !== newApplication.id && !(item.unitId === application.unitId && item.tenantEmail === application.tenantEmail && item.status !== 'Declined'))
        ]);
        await syncAfterMutation();
        return savedApplication;
      }
      setRentalApplications(prev => prev.filter(item => item.id !== newApplication.id));
      throw new Error('Rental request could not be saved by the server.');
    } catch (err) {
      if (err instanceof Error && err.message === 'Rental request could not be saved by the server.') {
        throw err;
      }
      console.warn("Express API rental application sync unavailable, using local workflow:", err);
    }

    return newApplication;
  };

  const markRentalApplicationPaid = async (applicationId: string, method: 'M-Pesa' | 'Card') => {
    const application = rentalApplications.find(item => item.id === applicationId);
    if (!application || application.status !== 'Awaiting Rent') return;

    const paymentHash = Math.random().toString(36).substring(2, 10).toUpperCase();
    const paymentCode = `${method === 'M-Pesa' ? 'MPESA' : 'CARD'}-HOLD-${paymentHash}`;
    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      tenantName: application.tenantName,
      unitNumber: application.unitNumber,
      propertyName: application.propertyName,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amount: application.rentAmount,
      status: 'Paid',
      paymentMethod: method,
      code: paymentCode
    };

    setRentalApplications(prev => prev.map(item => (
      item.id === applicationId ? { ...item, status: 'Rent Paid', paymentCode } : item
    )));
    setPayments(prev => [newPayment, ...prev]);
    setNotifications(prev => [
      {
        id: `notif-rental-paid-${Date.now()}`,
        title: 'House Request Rent Paid',
        message: `${application.tenantName} paid KES ${application.rentAmount.toLocaleString()} for ${application.propertyName} - Unit ${application.unitNumber}.`,
        date: 'Just now',
        type: 'payment',
        unread: true
      },
      ...prev
    ]);

    try {
      const res = await fetch(`/api/rental-applications/${applicationId}/pay`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ method, paymentCode })
      });
      if (res.ok) {
        await syncAfterMutation();
      }
    } catch (err) {
      console.warn("Express API rental payment sync unavailable, using local workflow:", err);
    }
  };

  const approveRentalApplication = async (applicationId: string) => {
    const application = rentalApplications.find(item => item.id === applicationId);
    if (!application || application.status !== 'Rent Paid') return;
    const requestedUnit = units.find(unit => unit.id === application.unitId);
    if (!requestedUnit || requestedUnit.status !== 'Vacant') return;

    setRentalApplications(prev => prev.map(item => (
      item.id === applicationId ? { ...item, status: 'Approved', approvedAt: new Date().toISOString() } : item
    )));
    setUnits(prev => prev.map(unit => (
      unit.id === application.unitId
        ? { ...unit, status: 'Occupied', tenantName: application.tenantName }
        : unit
    )));
    setMembers(prev => prev.map(member => (
      member.email === application.tenantEmail && member.role === 'tenant'
        ? { ...member, propertyName: application.propertyName, unitNumber: application.unitNumber, rentAmount: application.rentAmount }
        : member
    )));
    setNotifications(prev => [
      {
        id: `notif-rental-approved-${Date.now()}`,
        title: 'Unit Approved',
        message: `${application.propertyName} - Unit ${application.unitNumber} has been approved for ${application.tenantName}.`,
        date: 'Just now',
        type: 'lease',
        unread: true
      },
      ...prev
    ]);

    try {
      const res = await fetch(`/api/rental-applications/${applicationId}/approve`, { method: 'POST', headers: authHeaders() });
      if (res.ok) {
        await syncAfterMutation();
      }
    } catch (err) {
      console.warn("Express API rental approval sync unavailable, using local workflow:", err);
    }
  };

  const declineRentalApplication = async (applicationId: string) => {
    setRentalApplications(prev => prev.map(item => (
      item.id === applicationId ? { ...item, status: 'Declined' } : item
    )));

    try {
      const res = await fetch(`/api/rental-applications/${applicationId}/decline`, { method: 'POST', headers: authHeaders() });
      if (res.ok) {
        await syncAfterMutation();
      }
    } catch (err) {
      console.warn("Express API rental decline sync unavailable, using local workflow:", err);
    }
  };

  return (
    <RenziyContext.Provider
      value={{
        role,
        username,
        setRole,
        setUsername,
        properties,
        units,
        payments,
        maintenanceRequests,
        notifications,
        members,
        rentalApplications,
        tenantBalance,
        settlementConfig,
        addProperty,
        updatePropertyDetails,
        addTenantToUnit,
        updateUnit,
        recordPayment,
        addMaintenanceRequest,
        updateRequestStatus,
        assignMaintenanceWorker,
        clearBalanceAndRecordPayment,
        markNotificationsAsRead,
        toggleUnitLock,
        updateSettlementConfig,
        updateProfileAvatar,
        updateTenantAvatar,
        requestPasswordReset,
        confirmPasswordReset,
        registerMember,
        submitRentalApplication,
        markRentalApplicationPaid,
        approveRentalApplication,
        declineRentalApplication
      }}
    >
      {children}
    </RenziyContext.Provider>
  );
};

export const useRenziy = () => {
  const context = useContext(RenziyContext);
  if (context === undefined) {
    throw new Error('useRenziy must be used within a RenziyProvider');
  }
  return context;
};
