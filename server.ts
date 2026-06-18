import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

interface Property {
  id: string;
  name: string;
  address: string;
  unitsCount: number;
  imageUrl?: string;
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
  status: 'Paid' | 'Pending';
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
    address: '1200 Pine St, Seattle, WA',
    unitsCount: 12,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMxFypFJhzOCuTAq-LcLtvR4Y7ZY9bY54rSM8H5Fph0ckllantEW12QMfxkKgv07Su36d4tFLU3AqPcLAg7Uj-BF4VrVmqEQtJTgcSdEOVOJR7FN14v_XogFaT2Gh3ZDnn-3pdKTnjX7MMoWaR3HgkJfPnUgLFsheBufag0UlCJfG5PFlA5TI0pYMNgmvP6PIXX1tp8LQmTtcB59pPvkG6Eh3F9Kgp-60KmmEDPmeQYry0nEDmGA89799YSjmtXbz-EJn_uGWto2ku'
  },
  {
    id: 'prop-2',
    name: 'Harbor View Villas',
    address: '45 Marine Dr, Bremerton, WA',
    unitsCount: 8,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0-lP6mcA6HIE4LbzTr765rwiEop89MIpJdvoyF11DN-epOhG7wzLR2vlsvvbIs-eHfUJNUdibFBNajQHHbWzJeqHMFacPNozVQz5c_cpg8uv7fiB71TnE1n_AKhKhic2o8RClwzPHlK1tGsw0MkRGgTOyoCDxd_DliMftNntarn6QL0T4rOntvVbWuKWKfj7-n8nt8R7oxKRysKqzqbaLI_o1dRnqkJ-65xCIUfuKl4jxyeydhAO2IpAgSOxBrOIkfgdT45kPYn1w'
  },
  {
    id: 'prop-3',
    name: 'The Landmark Plaza',
    address: '800 5th Ave, Seattle, WA',
    unitsCount: 24,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDeFWF3TQaKiLEBRJtArgPXu09QtvyqQs-gb3Zt7iYlExPtNsZbIyaRrqyH-ukWCzFv775NWuT8V7XiXreNauV2xQTQdHb02QW_oN7OP1jp1g7Q4rJabYd5OQaedPKghFW7rMjA694Z2xEjSk44lalS6SdzWfG0I8_cLy9cCtqUZ2tP3vBmMM48q3UOStup7tWS9k1qdRLWjO2VFDULs8B0ngFXh-V-Gqp2JwMn5DH6oKY48I-GpOgw6M5_Xr0K1Gx7vkKDB417LOey'
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
  { id: 'unit-3-2', propertyId: 'prop-3', propertyName: 'The Landmark Plaza', unitNumber: 'Suite B', rentAmount: 450000, status: 'Vacant' }
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

const app = express();
const PORT = 3000;

app.use(express.json());

  // API Routes
  app.get("/api/settlement", (req, res) => {
    res.json(settlementConfig);
  });

  app.post("/api/settlement", (req, res) => {
    settlementConfig = { ...settlementConfig, ...req.body };
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
    const newProperty: Property = { id, name, address, unitsCount, imageUrl };
    properties.push(newProperty);

    // Auto generate internal units
    const generatedUnits: Unit[] = Array.from({ length: unitsCount }).map((_, index) => {
      const unitNum = `${100 + index + 1}`;
      return {
        id: `unit-${id}-${unitNum}`,
        propertyId: id,
        propertyName: name,
        unitNumber: unitNum,
        rentAmount: 1500 + index * 100,
        status: index % 3 === 0 ? 'Vacant' : 'Occupied',
        tenantName: index % 3 === 0 ? undefined : ['Marcus Holloway', 'Sarah Jenkins', 'Jane Doe'][index % 3]
      };
    });
    units.push(...generatedUnits);

    res.json({ property: newProperty, addedUnits: generatedUnits });
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
        updatedUnit = {
          ...u,
          rentAmount: rentAmount !== undefined ? Number(rentAmount) : u.rentAmount,
          status: status || (tenantName ? 'Occupied' : 'Vacant'),
          tenantName: tenantName || undefined,
          tenantAvatar: tenantName ? u.tenantAvatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOcbVtz4Nz5aTDAR2DZW9Pg9F6e65oPi6Td2jZ84CEwLXgn5HrvYocGZaVvLRdcS9eUaqLENJ27o2RqpElz14uBPV47JROuDd4JkbKG4lK3vapbE6KOkie8PQbaMTqlvURqdmEzyOUTLS-bssVrQp56st-qoqgO1NFNrdLvXPdL5SwnjZzSChp5a_s4toIffdm_8W02EPKg7MLqi3poWL6UDKib0nkwFBjpcLb7YMRsPtiVkMFt4jFzqbDf0SOuGuynYq7GjnWhyHB' : undefined
        };
        return updatedUnit;
      }
      return u;
    });

    if (!updatedUnit) {
      return res.status(404).json({ error: "Unit not found" });
    }

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

    const hash = Math.random().toString(36).substring(2, 10).toUpperCase();
    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      tenantName,
      unitNumber: unitNumber || 'G-01',
      propertyName: propertyName || 'Portfolio Central',
      date: date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amount: Number(amount),
      status: status || 'Paid',
      paymentMethod,
      code: `${paymentMethod === 'M-Pesa' ? 'MPESA' : 'CARD'}-REC-${hash}`
    };

    payments.unshift(newPayment);

    // If tenant recorded Alex paying his rent, clear Alex's balance too!
    if (tenantName === 'Alex Smith' || tenantName === 'Alex') {
      tenantBalance = 0;
    }

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

    const tName = tenantName || 'Alex Smith';
    const activeUnit = units.find(u => u.tenantName === tName) || units[4]; // Default Apt 4B

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
      propertyName: activeUnit?.propertyName || 'Oakwood Heights',
      unitNumber: activeUnit?.unitNumber || 'Apt 4B'
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

    res.json(newRequest);
  });

  app.patch("/api/maintenance/:id", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    let foundRequest: MaintenanceRequest | null = null;
    maintenanceRequests = maintenanceRequests.map(r => {
      if (r.id === id) {
        let techObj = {};
        if (status === 'In Progress' && !r.technicianName) {
          techObj = {
            technicianName: 'Mark S.',
            technicianAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBgHGl0k6f2XkLYjCLHl8a48TXjgy-Id98ps78OnE0wYtLYeuNe_SA4yid2BdyFcW72NvvX3QTFMKW2S31QWeq59noa99dscfJozILMQreMZHQdsc0PHSXD0e5EIvb9TE7fmsbiuZuJjR6Lz4WECW4S19uS50wvYbdJbxdvgGDRylaTrJhQhFiwhN9nARa_9fL6xs8Z2tDwqsJYhESjTEQmF8aARejNImS_FH9kV5YbJu-Ve_Ikaz_vvgOX0gmzBZfj1AodlcycXiGb',
            arrivalTime: '3:30 PM'
          };
        }
        foundRequest = { ...r, status, ...techObj };
        return foundRequest;
      }
      return r;
    });

    if (!foundRequest) {
      return res.status(404).json({ error: "Maintenance Request not found" });
    }

    // Notify client if tenant was Alex Smith
    const reqObj = foundRequest as MaintenanceRequest;
    if (reqObj.tenantName === 'Alex Smith' || reqObj.tenantName === 'Alex') {
      notifications.unshift({
        id: `notif-${Date.now()}`,
        title: 'Repair Status Updated',
        message: `Your repair "${reqObj.title}" is now marked as ${status}.`,
        date: 'Just now',
        type: 'maintenance',
        unread: true
      });
    }

    res.json(foundRequest);
  });

  app.get("/api/notifications", (req, res) => {
    res.json(notifications);
  });

  app.post("/api/notifications/read", (req, res) => {
    notifications = notifications.map(n => ({ ...n, unread: false }));
    res.json({ success: true });
  });

  app.get("/api/balance", (req, res) => {
    res.json({ tenantBalance });
  });

  app.post("/api/balance/pay", (req, res) => {
    const { method } = req.body;
    if (!method) {
      return res.status(400).json({ error: "Missing payment method details" });
    }

    const originalAmount = tenantBalance;
    tenantBalance = 0;

    // Auto-release smart lock for Alex Smith upon rent settlement!
    units = units.map(u => {
      if (u.tenantName === 'Alex Smith' || u.tenantName === 'Alex') {
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
      tenantName: 'Alex Smith',
      unitNumber: 'Apt 4B',
      propertyName: 'Oakwood Heights',
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
      message: `Successfully processed ${method} rent payment of $${originalAmount.toLocaleString()}.`,
      date: 'Just now',
      type: 'payment',
      unread: true
    });

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
