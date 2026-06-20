import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";

interface Property {
  id: string;
  name: string;
  address: string;
  unitsCount: number;
  imageUrl?: string;
  county?: string;
  constituency?: string;
  town?: string;
  neighborhood?: string;
  specificLocation?: string;
  description?: string;
  amenities?: string[];
  contactPhone?: string;
  mapQuery?: string;
  availableForMarketplace?: boolean;
  ownerEmail?: string;
}

interface Unit {
  id: string;
  propertyId: string;
  propertyName: string;
  unitNumber: string;
  rentAmount: number;
  status: 'Occupied' | 'Vacant';
  tenantName?: string;
  tenantAvatar?: string;
  isLocked?: boolean;
  lockReason?: string;
}

interface Payment {
  id: string;
  tenantName: string;
  unitNumber: string;
  propertyName: string;
  date: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  paymentMethod: 'M-Pesa' | 'Card';
  code: string;
}

interface MaintenanceRequest {
  id: string;
  title: string;
  category: string;
  urgency: 'Low' | 'Med' | 'High' | 'Emergency';
  description: string;
  status: 'Submitted' | 'Acknowledged' | 'In Progress' | 'Resolved';
  date: string;
  photos: string[];
  technicianName?: string;
  technicianEmail?: string;
  technicianPhone?: string;
  technicianAvatar?: string;
  arrivalTime?: string;
  propertyName: string;
  unitNumber: string;
  tenantName: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  type: string;
  unread: boolean;
}

interface PlatformMember {
  id: string;
  role: 'landlord' | 'tenant' | 'worker';
  name: string;
  phone: string;
  email: string;
  password?: string;
  avatarUrl?: string;
  propertyName?: string;
  unitNumber?: string;
  rentAmount?: number;
  specialty?: string;
  joinDate: string;
  status: 'Active' | 'Pending Review';
}

interface RentalApplication {
  id: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitNumber: string;
  rentAmount: number;
  ownerEmail?: string;
  ownerPhone?: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone?: string;
  requestedAt: string;
  status: 'Awaiting Rent' | 'Rent Paid' | 'Approved' | 'Declined';
  paymentCode?: string;
  approvedAt?: string;
}

interface SettlementConfig {
  mpesaType: 'Paybill' | 'BuyGoods' | 'PhoneNumber';
  mpesaDetails: string;
  mpesaAccountName: string;
  paybillAccount?: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankRoutingCode: string;
}

// In-memory Database state
let properties: Property[] = [
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

let units: Unit[] = [
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

let payments: Payment[] = [
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

let maintenanceRequests: MaintenanceRequest[] = [
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

let notifications: Notification[] = [
  {
    id: 'notif-lockout-alert',
    title: '⚠️ CRITICAL: Door Lockout Warning',
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

let members: PlatformMember[] = [
  {
    id: 'member-landlord-demo',
    role: 'landlord',
    name: 'John Doe',
    phone: '0743475247',
    email: 'john@renziy.app',
    password: 'demo123',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDRxmlZiyPxhMA9KhxxEY-ZornwU45XOarKthi5rZwjaUXVYAzK1Rptwz3XSUMih-aX7N40cr2Ki-5KZvD7pUHT8xTTKjuQMyyucNGma4FaFJirfRO8Nmxdo7wvHhgJnJDxwkPMa5NOJdwGCIEP9IoZoEnvk7HAYZ8jfseOFIDZ7L5DKDb2LTYFaZymzBJ-SYm2ragI8Q_dxp6yzf6AjtEmLdC6yZGqnU2ZCun5dcEqufGWVNNfnsQoC1JyHXHZfKXLK1rfwMLmEMPm',
    propertyName: 'Oakwood Heights',
    joinDate: '2026-05-20',
    status: 'Active'
  },
  {
    id: 'member-tenant-demo',
    role: 'tenant',
    name: 'Alex Smith',
    phone: '0712456789',
    email: 'alex@renziy.app',
    password: 'demo123',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOcbVtz4Nz5aTDAR2DZW9Pg9F6e65oPi6Td2jZ84CEwLXgn5HrvYocGZaVvLRdcS9eUaqLENJ27o2RqpElz14uBPV47JROuDd4JkbKG4lK3vapbE6KOkie8PQbaMTqlvURqdmEzyOUTLS-bssVrQp56st-qoqgO1NFNrdLvXPdL5SwnjZzSChp5a_s4toIffdm_8W02EPKg7MLqi3poWL6UDKib0nkwFBjpcLb7YMRsPtiVkMFt4jFzqbDf0SOuGuynYq7GjnWhyHB',
    propertyName: 'Oakwood Heights',
    unitNumber: 'Apt 4B',
    rentAmount: 145000,
    joinDate: '2026-05-22',
    status: 'Active'
  },
  {
    id: 'member-worker-demo',
    role: 'worker',
    name: 'Mark S.',
    phone: '0743991122',
    email: 'mark@renziy.app',
    password: 'demo123',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBgHGl0k6f2XkLYjCLHl8a48TXjgy-Id98ps78OnE0wYtLYeuNe_SA4yid2BdyFcW72NvvX3QTFMKW2S31QWeq59noa99dscfJozILMQreMZHQdsc0PHSXD0e5EIvb9TE7fmsbiuZuJjR6Lz4WECW4S19uS50wvYbdJbxdvgGDRylaTrJhQhFiwhN9nARa_9fL6xs8Z2tDwqsJYhESjTEQmF8aARejNImS_FH9kV5YbJu-Ve_Ikaz_vvgOX0gmzBZfj1AodlcycXiGb',
    specialty: 'Plumbing and general repairs',
    joinDate: '2026-05-23',
    status: 'Active'
  }
];

let rentalApplications: RentalApplication[] = [];

let tenantBalance = 145000;

let settlementConfig: SettlementConfig = {
  mpesaType: 'Paybill',
  mpesaDetails: '174379',
  mpesaAccountName: 'RENZIY APP MANAGEMENT',
  paybillAccount: 'RENT',
  bankName: 'Equity Bank',
  bankAccountName: 'Renziy Real Estate Ltd',
  bankAccountNumber: '1234567890123',
  bankRoutingCode: 'EQTYKE'
};

interface PersistedState {
  properties?: Property[];
  units?: Unit[];
  payments?: Payment[];
  maintenanceRequests?: MaintenanceRequest[];
  notifications?: Notification[];
  members?: PlatformMember[];
  rentalApplications?: RentalApplication[];
  tenantBalance?: number;
  settlementConfig?: SettlementConfig;
}

const dataDir = path.join(process.cwd(), ".renziy-data");
const dataFile = path.join(dataDir, "state.json");

const saveState = () => {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    const state: PersistedState = {
      properties,
      units,
      payments,
      maintenanceRequests,
      notifications,
      members,
      rentalApplications,
      tenantBalance,
      settlementConfig
    };
    fs.writeFileSync(dataFile, JSON.stringify(state, null, 2), "utf8");
  } catch (err) {
    console.warn("Unable to persist Renziy state:", err);
  }
};

const loadState = () => {
  try {
    if (!fs.existsSync(dataFile)) return;
    const saved = JSON.parse(fs.readFileSync(dataFile, "utf8")) as PersistedState;
    if (Array.isArray(saved.properties)) properties = saved.properties;
    if (Array.isArray(saved.units)) units = saved.units;
    if (Array.isArray(saved.payments)) payments = saved.payments;
    if (Array.isArray(saved.maintenanceRequests)) maintenanceRequests = saved.maintenanceRequests;
    if (Array.isArray(saved.notifications)) notifications = saved.notifications;
    if (Array.isArray(saved.members)) members = saved.members;
    if (Array.isArray(saved.rentalApplications)) rentalApplications = saved.rentalApplications;
    if (typeof saved.tenantBalance === "number") tenantBalance = saved.tenantBalance;
    if (saved.settlementConfig) settlementConfig = { ...settlementConfig, ...saved.settlementConfig };
  } catch (err) {
    console.warn("Unable to load persisted Renziy state:", err);
  }
};

const ensureSeedData = () => {
  members = members.map(member => (
    member.role === 'landlord' && member.email === 'john@renziy.app'
      ? { ...member, phone: '0743475247' }
      : member
  ));

  properties = properties.map(property => (
    property.ownerEmail === 'john@renziy.app'
      ? { ...property, contactPhone: property.contactPhone || '0743475247' }
      : property
  ));

  if (!members.some(member => member.role === 'worker' && member.email === 'mark@renziy.app')) {
    members.push({
      id: 'member-worker-1',
      name: 'Mark S.',
      role: 'worker',
      phone: '0743991122',
      email: 'mark@renziy.app',
      password: 'demo123',
      avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBgHGl0k6f2XkLYjCLHl8a48TXjgy-Id98ps78OnE0wYtLYeuNe_SA4yid2BdyFcW72NvvX3QTFMKW2S31QWeq59noa99dscfJozILMQreMZHQdsc0PHSXD0e5EIvb9TE7fmsbiuZuJjR6Lz4WECW4S19uS50wvYbdJbxdvgGDRylaTrJhQhFiwhN9nARa_9fL6xs8Z2tDwqsJYhESjTEQmF8aARejNImS_FH9kV5YbJu-Ve_Ikaz_vvgOX0gmzBZfj1AodlcycXiGb',
      specialty: 'Plumbing and general repairs',
      joinDate: '2026-05-23',
      status: 'Active'
    });
  }
};

loadState();
ensureSeedData();
saveState();

const app = express();
const PORT = 3000;

app.use(express.json());

const USER_ROLES = ['landlord', 'tenant', 'worker'] as const;
const PAYMENT_STATUSES = ['Paid', 'Pending', 'Overdue'] as const;
const PAYMENT_METHODS = ['M-Pesa', 'Card'] as const;
const MAINTENANCE_STATUSES = ['Submitted', 'Acknowledged', 'In Progress', 'Resolved'] as const;
const MAINTENANCE_URGENCY = ['Low', 'Med', 'High', 'Emergency'] as const;

const isOneOf = <T extends readonly string[]>(values: T, value: unknown): value is T[number] => (
  typeof value === 'string' && values.includes(value)
);

const getActiveWorker = (workerEmail: unknown) => {
  if (typeof workerEmail !== 'string') return undefined;
  return members.find(member => (
    member.role === 'worker' &&
    member.status === 'Active' &&
    member.email.toLowerCase() === workerEmail.toLowerCase()
  ));
};

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({
      ok: true,
      service: 'Renziy API',
      counts: {
        properties: properties.length,
        units: units.length,
        payments: payments.length,
        maintenanceRequests: maintenanceRequests.length,
        members: members.length,
        rentalApplications: rentalApplications.length
      }
    });
  });

  app.get("/api/settlement", (req, res) => {
    res.json(settlementConfig);
  });

  app.post("/api/settlement", (req, res) => {
    settlementConfig = { ...settlementConfig, ...req.body };
    saveState();
    res.json(settlementConfig);
  });

  app.get("/api/properties", (req, res) => {
    res.json(properties);
  });

  app.post("/api/properties", (req, res) => {
    const { name, address, unitsCount, imageUrl } = req.body;
    if (!name || !address || !unitsCount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const id = `prop-${Date.now()}`;
    const newProperty: Property = { ...req.body, id, name, address, unitsCount, imageUrl };
    properties.push(newProperty);

    // Auto generate internal units
    const generatedUnits: Unit[] = Array.from({ length: unitsCount }).map((_, index) => {
      const unitNum = `${100 + index + 1}`;
      return {
        id: `unit-${id}-${unitNum}`,
        propertyId: id,
        propertyName: name,
        unitNumber: unitNum,
        rentAmount: 15000 + index * 1000,
        status: index % 3 === 0 ? 'Vacant' : 'Occupied',
        tenantName: index % 3 === 0 ? undefined : ['Marcus Holloway', 'Sarah Jenkins', 'Jane Doe'][index % 3]
      };
    });
    units.push(...generatedUnits);

    saveState();
    res.json({ property: newProperty, addedUnits: generatedUnits });
  });

  app.patch("/api/properties/:id", (req, res) => {
    const { id } = req.params;
    let updatedProperty: Property | null = null;

    properties = properties.map(property => {
      if (property.id === id) {
        updatedProperty = { ...property, ...req.body };
        return updatedProperty;
      }
      return property;
    });

    if (!updatedProperty) {
      return res.status(404).json({ error: "Property not found" });
    }

    units = units.map(unit => {
      if (unit.propertyId === id && updatedProperty) {
        return {
          ...unit,
          propertyName: updatedProperty.name
        };
      }
      return unit;
    });

    saveState();
    res.json(updatedProperty);
  });

  app.get("/api/units", (req, res) => {
    res.json(units);
  });

  app.post("/api/units/assign", (req, res) => {
    const { unitId, tenantName } = req.body;
    if (!unitId || !tenantName) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    let updatedUnit: Unit | null = null;
    units = units.map(u => {
      if (u.id === unitId) {
        updatedUnit = {
          ...u,
          status: 'Occupied',
          tenantName,
          tenantAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOcbVtz4Nz5aTDAR2DZW9Pg9F6e65oPi6Td2jZ84CEwLXgn5HrvYocGZaVvLRdcS9eUaqLENJ27o2RqpElz14uBPV47JROuDd4JkbKG4lK3vapbE6KOkie8PQbaMTqlvURqdmEzyOUTLS-bssVrQp56st-qoqgO1NFNrdLvXPdL5SwnjZzSChp5a_s4toIffdm_8W02EPKg7MLqi3poWL6UDKib0nkwFBjpcLb7YMRsPtiVkMFt4jFzqbDf0SOuGuynYq7GjnWhyHB'
        };
        return updatedUnit;
      }
      return u;
    });

    if (!updatedUnit) {
      return res.status(404).json({ error: "Unit not found" });
    }

    saveState();
    res.json(updatedUnit);
  });

  app.post("/api/units/update", (req, res) => {
    const { unitId, tenantName, rentAmount, status } = req.body;
    if (!unitId) {
      return res.status(400).json({ error: "Missing unitId" });
    }

    let updatedUnit: Unit | null = null;
    units = units.map(u => {
      if (u.id === unitId) {
        const shouldUpdateTenant = Object.prototype.hasOwnProperty.call(req.body, "tenantName");
        const nextStatus = status !== undefined
          ? status
          : shouldUpdateTenant
            ? (tenantName ? 'Occupied' : 'Vacant')
            : u.status;
        updatedUnit = {
          ...u,
          rentAmount: rentAmount !== undefined ? Number(rentAmount) : u.rentAmount,
          status: nextStatus,
          tenantName: shouldUpdateTenant ? (tenantName || undefined) : nextStatus === 'Vacant' ? undefined : u.tenantName,
          tenantAvatar: shouldUpdateTenant
            ? (tenantName ? u.tenantAvatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOcbVtz4Nz5aTDAR2DZW9Pg9F6e65oPi6Td2jZ84CEwLXgn5HrvYocGZaVvLRdcS9eUaqLENJ27o2RqpElz14uBPV47JROuDd4JkbKG4lK3vapbE6KOkie8PQbaMTqlvURqdmEzyOUTLS-bssVrQp56st-qoqgO1NFNrdLvXPdL5SwnjZzSChp5a_s4toIffdm_8W02EPKg7MLqi3poWL6UDKib0nkwFBjpcLb7YMRsPtiVkMFt4jFzqbDf0SOuGuynYq7GjnWhyHB' : undefined)
            : nextStatus === 'Vacant' ? undefined : u.tenantAvatar
        };
        return updatedUnit;
      }
      return u;
    });

    if (!updatedUnit) {
      return res.status(404).json({ error: "Unit not found" });
    }

    saveState();
    res.json(updatedUnit);
  });

  app.post("/api/units/update-avatar", (req, res) => {
    const { unitId, tenantAvatar } = req.body;
    if (!unitId || !tenantAvatar) {
      return res.status(400).json({ error: "Missing unitId or tenantAvatar" });
    }

    let updatedUnit: Unit | null = null;
    units = units.map(u => {
      if (u.id === unitId) {
        updatedUnit = {
          ...u,
          tenantAvatar
        };
        return updatedUnit;
      }
      return u;
    });

    if (!updatedUnit) {
      return res.status(404).json({ error: "Unit not found" });
    }

    saveState();
    res.json(updatedUnit);
  });

  app.post("/api/units/lock", (req, res) => {
    const { unitId, isLocked, lockReason } = req.body;
    if (!unitId) {
      return res.status(400).json({ error: "Missing unitId" });
    }

    let updatedUnit: Unit | null = null;
    units = units.map(u => {
      if (u.id === unitId) {
        updatedUnit = {
          ...u,
          isLocked: !!isLocked,
          lockReason: isLocked ? (lockReason || "Rent payment overdue") : undefined
        };
        return updatedUnit;
      }
      return u;
    });

    if (!updatedUnit) {
      return res.status(404).json({ error: "Unit not found" });
    }

    const uObj = updatedUnit as Unit;

    // Trigger a notification to the tenant
    if (uObj.tenantName) {
      notifications.unshift({
        id: `notif-${Date.now()}`,
        title: isLocked ? '🚫 Smart Lock Engaged' : '🔑 Smart Lock Released',
        message: isLocked
          ? `Your unit ${uObj.unitNumber} at ${uObj.propertyName} has been locked by the landlord. Reason: ${uObj.lockReason}. Settle your payments immediately to reactivate.`
          : `Your unit ${uObj.unitNumber} at ${uObj.propertyName} has been unlocked. Thank you for your payment.`,
        date: 'Just now',
        type: 'payment',
        unread: true
      });
    }

    saveState();
    res.json(updatedUnit);
  });

  app.get("/api/payments", (req, res) => {
    res.json(payments);
  });

  app.post("/api/payments", (req, res) => {
    const { tenantName, unitNumber, propertyName, date, amount, status, paymentMethod } = req.body;
    if (!tenantName || !amount || !paymentMethod) {
      return res.status(400).json({ error: "Missing required details" });
    }
    if (!isOneOf(PAYMENT_METHODS, paymentMethod)) {
      return res.status(400).json({ error: "Unsupported payment method" });
    }
    if (status && !isOneOf(PAYMENT_STATUSES, status)) {
      return res.status(400).json({ error: "Unsupported payment status" });
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: "Payment amount must be greater than zero" });
    }

    const hash = Math.random().toString(36).substring(2, 10).toUpperCase();
    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      tenantName,
      unitNumber: unitNumber || 'G-01',
      propertyName: propertyName || 'Portfolio Central',
      date: date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amount: numericAmount,
      status: status || 'Paid',
      paymentMethod,
      code: `${paymentMethod === 'M-Pesa' ? 'MPESA' : 'CARD'}-REC-${hash}`
    };

    payments.unshift(newPayment);

    const payingUnit = units.find(u => u.tenantName === tenantName);
    if (payingUnit?.id === 'unit-1-4b' || tenantName === 'Alex Smith' || tenantName === 'Alex') {
      tenantBalance = 0;
    }

    saveState();
    res.json(newPayment);
  });

  app.get("/api/maintenance", (req, res) => {
    res.json(maintenanceRequests);
  });

  app.post("/api/maintenance", (req, res) => {
    const { title, category, urgency, description, photos, tenantName } = req.body;
    if (!title || !description || !urgency) {
      return res.status(400).json({ error: "Missing repair ticket content" });
    }
    if (!isOneOf(MAINTENANCE_URGENCY, urgency)) {
      return res.status(400).json({ error: "Unsupported repair urgency" });
    }

    const tName = tenantName || 'Unassigned Tenant';
    const activeUnit = units.find(u => u.tenantName === tName);

    const newRequest: MaintenanceRequest = {
      id: `req-${Date.now()}`,
      title,
      category: category || 'Plumbing',
      urgency,
      description,
      status: 'Submitted',
      date: new Date().toISOString().split('T')[0],
      photos: photos || [],
      tenantName: tName,
      propertyName: activeUnit?.propertyName || 'Pending assignment',
      unitNumber: activeUnit?.unitNumber || 'Pending assignment'
    };

    maintenanceRequests.unshift(newRequest);

    // Append notification log
    notifications.unshift({
      id: `notif-${Date.now()}`,
      title: 'Request Received',
      message: `Your maintenance request "${title}" has been successfully logged.`,
      date: 'Just now',
      type: 'maintenance',
      unread: true
    });

    saveState();
    res.json(newRequest);
  });

  app.patch("/api/maintenance/:id", (req, res) => {
    const { id } = req.params;
    const { status, workerEmail } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }
    if (!isOneOf(MAINTENANCE_STATUSES, status)) {
      return res.status(400).json({ error: "Unsupported maintenance status" });
    }

    let foundRequest: MaintenanceRequest | null = null;
    maintenanceRequests = maintenanceRequests.map(r => {
      if (r.id === id) {
        let techObj = {};
        const worker = getActiveWorker(workerEmail);
        if (workerEmail && !worker) {
          return r;
        }
        if (worker) {
          techObj = {
            technicianName: worker.name,
            technicianEmail: worker.email,
            technicianPhone: worker.phone,
            technicianAvatar: worker.avatarUrl,
            arrivalTime: '3:30 PM'
          };
        }
        foundRequest = { ...r, status, ...techObj };
        return foundRequest;
      }
      return r;
    });

    if (!foundRequest) {
      return res.status(workerEmail ? 400 : 404).json({ error: workerEmail ? "Worker not found" : "Maintenance Request not found" });
    }

    const reqObj = foundRequest as MaintenanceRequest;
    notifications.unshift({
      id: `notif-${Date.now()}`,
      title: 'Repair Status Updated',
      message: `Repair "${reqObj.title}" for ${reqObj.tenantName} is now marked as ${status}.`,
      date: 'Just now',
      type: 'maintenance',
      unread: true
    });

    saveState();
    res.json(foundRequest);
  });

  app.post("/api/maintenance/:id/assign-worker", (req, res) => {
    const { id } = req.params;
    const { workerEmail } = req.body;
    const worker = getActiveWorker(workerEmail);
    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }

    let updatedRequest: MaintenanceRequest | null = null;
    maintenanceRequests = maintenanceRequests.map(r => {
      if (r.id === id) {
        updatedRequest = {
          ...r,
          status: r.status === 'Submitted' ? 'Acknowledged' : r.status,
          technicianName: worker.name,
          technicianEmail: worker.email,
          technicianPhone: worker.phone,
          technicianAvatar: worker.avatarUrl,
          arrivalTime: '3:30 PM'
        };
        return updatedRequest;
      }
      return r;
    });

    if (!updatedRequest) {
      return res.status(404).json({ error: "Maintenance Request not found" });
    }

    const reqObj = updatedRequest as MaintenanceRequest;
    notifications.unshift({
      id: `notif-worker-${Date.now()}`,
      title: 'Worker Assigned',
      message: `${worker.name} has been contacted for "${reqObj.title}" at ${reqObj.propertyName} (${reqObj.unitNumber}).`,
      date: 'Just now',
      type: 'maintenance',
      unread: true
    });

    saveState();
    res.json(updatedRequest);
  });

  app.get("/api/notifications", (req, res) => {
    res.json(notifications);
  });

  app.post("/api/notifications/read", (req, res) => {
    notifications = notifications.map(n => ({ ...n, unread: false }));
    saveState();
    res.json({ success: true });
  });

  app.get("/api/members", (req, res) => {
    res.json(members);
  });

  app.post("/api/members", (req, res) => {
    const { role, name, phone, email } = req.body;
    if (!role || !name || !phone || !email) {
      return res.status(400).json({ error: "Missing required member fields" });
    }
    if (!isOneOf(USER_ROLES, role)) {
      return res.status(400).json({ error: "Unsupported member role" });
    }

    const member: PlatformMember = {
      ...req.body,
      id: req.body.id || `member-${Date.now()}`,
      joinDate: req.body.joinDate || new Date().toISOString().split('T')[0],
      status: req.body.status || 'Active'
    };

    members = [member, ...members.filter(m => m.email !== member.email || m.role !== member.role)];
    notifications.unshift({
      id: `notif-member-${Date.now()}`,
      title: 'New Platform Member',
      message: `${member.name} joined Renziy as a ${member.role}.`,
      date: 'Just now',
      type: 'lease',
      unread: true
    });

    saveState();
    res.json(member);
  });

  app.get("/api/rental-applications", (req, res) => {
    res.json(rentalApplications);
  });

  app.post("/api/rental-applications", (req, res) => {
    const { propertyId, propertyName, unitId, unitNumber, rentAmount, tenantName, tenantEmail } = req.body;
    if (!propertyId || !propertyName || !unitId || !unitNumber || !rentAmount || !tenantName || !tenantEmail) {
      return res.status(400).json({ error: "Missing rental request details" });
    }
    const requestedUnit = units.find(unit => unit.id === unitId && unit.propertyId === propertyId);
    if (!requestedUnit) {
      return res.status(404).json({ error: "Requested unit not found" });
    }
    if (requestedUnit.status !== 'Vacant') {
      return res.status(409).json({ error: "Requested unit is no longer vacant" });
    }
    if (Number(rentAmount) !== requestedUnit.rentAmount) {
      return res.status(400).json({ error: "Rental request amount does not match unit rent" });
    }
    const hasActiveRequest = rentalApplications.some(item => (
      item.unitId === unitId &&
      item.tenantEmail === tenantEmail &&
      item.status !== 'Declined'
    ));
    if (hasActiveRequest) {
      return res.status(409).json({ error: "Tenant already has an active request for this unit" });
    }

    const application: RentalApplication = {
      ...req.body,
      id: req.body.id || `rent-app-${Date.now()}`,
      requestedAt: req.body.requestedAt || new Date().toISOString(),
      status: req.body.status || 'Awaiting Rent'
    };

    rentalApplications = [
      application,
      ...rentalApplications.filter(item => !(item.unitId === application.unitId && item.tenantEmail === application.tenantEmail && item.status !== 'Declined'))
    ];

    notifications.unshift({
      id: `notif-rental-${Date.now()}`,
      title: 'New House Request',
      message: `${application.tenantName} requested ${application.propertyName} - Unit ${application.unitNumber}.`,
      date: 'Just now',
      type: 'lease',
      unread: true
    });

    saveState();
    res.json(application);
  });

  app.post("/api/rental-applications/:id/pay", (req, res) => {
    const { id } = req.params;
    const { method, paymentCode } = req.body;
    if (method && !isOneOf(PAYMENT_METHODS, method)) {
      return res.status(400).json({ error: "Unsupported payment method" });
    }
    let application: RentalApplication | undefined;

    rentalApplications = rentalApplications.map(item => {
      if (item.id === id) {
        if (item.status !== 'Awaiting Rent') {
          application = item;
          return item;
        }
        application = {
          ...item,
          status: 'Rent Paid',
          paymentCode: paymentCode || `${method === 'Card' ? 'CARD' : 'MPESA'}-HOLD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
        };
        return application;
      }
      return item;
    });

    if (!application) {
      return res.status(404).json({ error: "Rental request not found" });
    }
    if (application.status !== 'Rent Paid') {
      return res.status(409).json({ error: "Rental request is not awaiting rent" });
    }

    const paidApplication = application as RentalApplication;
    payments.unshift({
      id: `pay-${Date.now()}`,
      tenantName: paidApplication.tenantName,
      unitNumber: paidApplication.unitNumber,
      propertyName: paidApplication.propertyName,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amount: paidApplication.rentAmount,
      status: 'Paid',
      paymentMethod: method || 'M-Pesa',
      code: paidApplication.paymentCode || 'MPESA-HOLD'
    });

    notifications.unshift({
      id: `notif-rental-paid-${Date.now()}`,
      title: 'House Request Rent Paid',
      message: `${paidApplication.tenantName} paid KES ${paidApplication.rentAmount.toLocaleString()} for ${paidApplication.propertyName} - Unit ${paidApplication.unitNumber}.`,
      date: 'Just now',
      type: 'payment',
      unread: true
    });

    saveState();
    res.json(paidApplication);
  });

  app.post("/api/rental-applications/:id/approve", (req, res) => {
    const { id } = req.params;
    let application: RentalApplication | undefined;

    rentalApplications = rentalApplications.map(item => {
      if (item.id === id && item.status === 'Rent Paid') {
        const requestedUnit = units.find(unit => unit.id === item.unitId);
        if (!requestedUnit || requestedUnit.status !== 'Vacant') {
          application = item;
          return item;
        }
        application = {
          ...item,
          status: 'Approved',
          approvedAt: new Date().toISOString()
        };
        return application;
      }
      return item;
    });

    if (!application) {
      return res.status(404).json({ error: "Paid rental request not found" });
    }
    if (application.status !== 'Approved') {
      return res.status(409).json({ error: "Requested unit is no longer available for approval" });
    }

    const approvedApplication = application as RentalApplication;
    units = units.map(unit => (
      unit.id === approvedApplication.unitId
        ? { ...unit, status: 'Occupied', tenantName: approvedApplication.tenantName }
        : unit
    ));
    members = members.map(member => (
      member.email === approvedApplication.tenantEmail && member.role === 'tenant'
        ? { ...member, propertyName: approvedApplication.propertyName, unitNumber: approvedApplication.unitNumber, rentAmount: approvedApplication.rentAmount }
        : member
    ));

    notifications.unshift({
      id: `notif-rental-approved-${Date.now()}`,
      title: 'Unit Approved',
      message: `${approvedApplication.propertyName} - Unit ${approvedApplication.unitNumber} has been approved for ${approvedApplication.tenantName}.`,
      date: 'Just now',
      type: 'lease',
      unread: true
    });

    saveState();
    res.json(approvedApplication);
  });

  app.post("/api/rental-applications/:id/decline", (req, res) => {
    const { id } = req.params;
    let application: RentalApplication | undefined;

    rentalApplications = rentalApplications.map(item => {
      if (item.id === id) {
        application = { ...item, status: 'Declined' };
        return application;
      }
      return item;
    });

    if (!application) {
      return res.status(404).json({ error: "Rental request not found" });
    }

    saveState();
    res.json(application);
  });

  app.get("/api/balance", (req, res) => {
    res.json({ tenantBalance });
  });

  app.post("/api/balance/pay", (req, res) => {
    const { method, tenantName } = req.body;
    if (!method) {
      return res.status(400).json({ error: "Missing payment method details" });
    }
    if (!isOneOf(PAYMENT_METHODS, method)) {
      return res.status(400).json({ error: "Unsupported payment method" });
    }

    const originalAmount = tenantBalance;
    tenantBalance = 0;

    const payingTenantName = tenantName || 'Alex Smith';
    const activeUnit = units.find(u => u.tenantName === payingTenantName) || units.find(u => u.id === 'unit-1-4b');

    // Auto-release smart lock for the paying tenant upon rent settlement.
    units = units.map(u => {
      if (u.id === activeUnit?.id) {
        return {
          ...u,
          isLocked: false,
          lockReason: undefined
        };
      }
      return u;
    });

    const hash = Math.random().toString(36).substring(2, 10).toUpperCase();
    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      tenantName: payingTenantName,
      unitNumber: activeUnit?.unitNumber || 'Pending assignment',
      propertyName: activeUnit?.propertyName || 'Pending assignment',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amount: originalAmount,
      status: 'Paid',
      paymentMethod: method,
      code: `${method === 'M-Pesa' ? 'FLW-MP' : 'FLW-RE'}-${hash}`
    };

    payments.unshift(newPayment);

    notifications.unshift({
      id: `notif-${Date.now()}`,
      title: 'Rent Paid Successfully',
      message: `Successfully processed ${method} rent payment of KES ${originalAmount.toLocaleString()}.`,
      date: 'Just now',
      type: 'payment',
      unread: true
    });

    saveState();
    res.json({ success: true, payment: newPayment, originalAmount });
  });

  // Vite development vs production static routing integration
  async function bootstrap() {
    if (!process.env.VERCEL) {
      if (process.env.NODE_ENV !== "production") {
        const [{ default: react }, { default: tailwindcss }] = await Promise.all([
          import("@vitejs/plugin-react"),
          import("@tailwindcss/vite"),
        ]);
        const vite = await createViteServer({
          configFile: false,
          plugins: [react(), tailwindcss()],
          resolve: {
            alias: {
              '@': path.resolve(process.cwd(), '.'),
            },
          },
          server: { middlewareMode: true },
          appType: "spa",
        });
        app.use(vite.middlewares);
      } else {
        const distPath = path.join(process.cwd(), 'dist');
        app.use(express.static(distPath));
        // Support wildcard SPA routing
        app.get('*', (req, res) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }

      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Renziy Server active and running on http://0.0.0.0:${PORT}`);
      });
    }
  }

  bootstrap().catch((err) => {
    console.error("Failed to start Renziy server:", err);
  });

  export default app;
