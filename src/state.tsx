import React, { createContext, useContext, useState, useEffect } from 'react';
import { Property, Unit, Payment, MaintenanceRequest, Notification, AppUserRole } from './types';

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
  tenantBalance: number;
  addProperty: (property: Omit<Property, 'id'>) => void;
  addTenantToUnit: (unitId: string, tenantName: string) => void;
  updateUnit: (unitId: string, tenantName?: string, rentAmount?: number, status?: Unit['status']) => void;
  recordPayment: (payment: Omit<Payment, 'id' | 'code'>) => void;
  addMaintenanceRequest: (request: Omit<MaintenanceRequest, 'id' | 'status' | 'date' | 'tenantName' | 'propertyName' | 'unitNumber'>) => void;
  updateRequestStatus: (requestId: string, status: MaintenanceRequest['status']) => void;
  clearBalanceAndRecordPayment: (method: 'M-Pesa' | 'Card') => void;
  markNotificationsAsRead: () => void;
}

const RenziyContext = createContext<RenziyContextType | undefined>(undefined);

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
    if (saved) return JSON.parse(saved);
    return [
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
  });

  // Base Units
  const [units, setUnits] = useState<Unit[]>(() => {
    const saved = localStorage.getItem('renziy_units');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'unit-1-101', propertyId: 'prop-1', propertyName: 'Oakwood Heights', unitNumber: '101', rentAmount: 2450, status: 'Occupied', tenantName: 'Marcus Holloway', tenantAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9IoAcZLIY0gg8i6wPLcaY3ygBvaVJvW0PmG_h9U1cLAEnC0k1pah2rUmQdxTTwa2PZ2ZtDP8Qbjz2M8PTiLhaD3eXimlHnDekaQo093rGsmlvzC2rSthGOw2zEnPAvVYQsrYRRKAQ9Gbw7B8zo0HOWZaNpGzs2GKDB0DMjAlrYYqWc8XGfrZe7J-31LzJjZLfre2xMwa0HVge2uvWbsZahdZT1ShrALJgRNBMESkjZV3xRa47RCCNOORnjWwDOBmDJCnFaGCi7do5' },
      { id: 'unit-1-102', propertyId: 'prop-1', propertyName: 'Oakwood Heights', unitNumber: '102', rentAmount: 2450, status: 'Vacant' },
      { id: 'unit-1-201', propertyId: 'prop-1', propertyName: 'Oakwood Heights', unitNumber: '201', rentAmount: 2800, status: 'Occupied', tenantName: 'Sarah Jenkins', tenantAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAeMCNZyBiv-uiHtktmPVRPIpRrze2myHUqEyGKigO5LZgeu3-EP7_Ty-m4mB5GIZTneHA6G-KXG6hVHQz1wC3Gb-bT7Q82sDQKB583GkhdMFG5ZclHw4rl4_BK6sYi_QlxOSprJxAcqXMjWz41BAsUl0DXfLpJUZzgtVSzWKgHFpIf-UO6uiopeFa1h7QMxeZudiyqMMy-3IfrzO_ApWV77rRsYhROsYt2He4hGzWEBLPhQqKpdKovJWb_O96JJmbHQQbiK7HkM2bH' },
      { id: 'unit-1-202', propertyId: 'prop-1', propertyName: 'Oakwood Heights', unitNumber: '202', rentAmount: 2800, status: 'Occupied', tenantName: 'Liam Carter', tenantAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBY1CTvj3PmtB3-LR_p1s4FNqaP67e_JoWovsuzRp3hatwF4Yg7LrghoPHFR3QODAlxjD9QQF_sIEDYVU0fbJWPhNa9W2QSz2JRCYA5eMWJxLkMcl5HZUURA8kXnfeVXbb8RDc4AW9wvm_SmqyHEv3RQTjcPXHaNL0e2CgaBh6Y4LbLxHaykUfOjEK0DWINHnO5M6EI-CV5VHBoeBuiVQ-kXneHEpi0m6_MM0suuhUZbRzMc1qz4fBdIKQaFE10mTnPsr6OA7lENt6E' },
      { id: 'unit-1-4b', propertyId: 'prop-1', propertyName: 'Oakwood Heights', unitNumber: 'Apt 4B', rentAmount: 1450, status: 'Occupied', tenantName: 'Alex Smith', tenantAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOcbVtz4Nz5aTDAR2DZW9Pg9F6e65oPi6Td2jZ84CEwLXgn5HrvYocGZaVvLRdcS9eUaqLENJ27o2RqpElz14uBPV47JROuDd4JkbKG4lK3vapbE6KOkie8PQbaMTqlvURqdmEzyOUTLS-bssVrQp56st-qoqgO1NFNrdLvXPdL5SwnjZzSChp5a_s4toIffdm_8W02EPKg7MLqi3poWL6UDKib0nkwFBjpcLb7YMRsPtiVkMFt4jFzqbDf0SOuGuynYq7GjnWhyHB' },
      
      { id: 'unit-2-1', propertyId: 'prop-2', propertyName: 'Harbor View Villas', unitNumber: 'Unit 1', rentAmount: 1950, status: 'Occupied', tenantName: 'Jane Doe' },
      { id: 'unit-2-2', propertyId: 'prop-2', propertyName: 'Harbor View Villas', unitNumber: 'Unit 2', rentAmount: 1950, status: 'Occupied', tenantName: 'Mark Smith' },
      { id: 'unit-2-3', propertyId: 'prop-2', propertyName: 'Harbor View Villas', unitNumber: 'Unit 3', rentAmount: 2100, status: 'Occupied', tenantName: 'Lucia Rivera' },
      { id: 'unit-2-4', propertyId: 'prop-2', propertyName: 'Harbor View Villas', unitNumber: 'Unit 4', rentAmount: 2100, status: 'Vacant' },
      
      { id: 'unit-3-1', propertyId: 'prop-3', propertyName: 'The Landmark Plaza', unitNumber: 'Suite A', rentAmount: 4500, status: 'Occupied', tenantName: 'Tom Brown' },
      { id: 'unit-3-2', propertyId: 'prop-3', propertyName: 'The Landmark Plaza', unitNumber: 'Suite B', rentAmount: 4500, status: 'Vacant' }
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
        amount: 1850.00,
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
        amount: 2400.00,
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
        amount: 1600.00,
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
        amount: 1250.00,
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

  // Tenant Balance
  const [tenantBalance, setTenantBalance] = useState<number>(() => {
    const saved = localStorage.getItem('renziy_balance');
    return saved ? Number(saved) : 1450.00;
  });

  // Fetch all initial states from physical server storage
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const propsRes = await fetch('/api/properties');
        if (propsRes.ok) setProperties(await propsRes.json());

        const unitsRes = await fetch('/api/units');
        if (unitsRes.ok) setUnits(await unitsRes.json());

        const paymentsRes = await fetch('/api/payments');
        if (paymentsRes.ok) setPayments(await paymentsRes.json());

        const maintRes = await fetch('/api/maintenance');
        if (maintRes.ok) setMaintenanceRequests(await maintRes.json());

        const notifsRes = await fetch('/api/notifications');
        if (notifsRes.ok) setNotifications(await notifsRes.json());

        const balRes = await fetch('/api/balance');
        if (balRes.ok) {
          const balData = await balRes.json();
          setTenantBalance(balData.tenantBalance);
        }
      } catch (err) {
        console.error("API backend not reachable yet, operating off local fallback arrays:", err);
      }
    };
    loadAllData();
  }, []);

  // Soft-sync State to Local Storage for immediate UI responsive rendering
  useEffect(() => {
    localStorage.setItem('renziy_role', role);
    localStorage.setItem('renziy_username', username);
    localStorage.setItem('renziy_properties', JSON.stringify(properties));
    localStorage.setItem('renziy_units', JSON.stringify(units));
    localStorage.setItem('renziy_payments', JSON.stringify(payments));
    localStorage.setItem('renziy_maintenance', JSON.stringify(maintenanceRequests));
    localStorage.setItem('renziy_notifications', JSON.stringify(notifications));
    localStorage.setItem('renziy_balance', tenantBalance.toString());
  }, [role, username, properties, units, payments, maintenanceRequests, notifications, tenantBalance]);

  // Set Role Context
  const setRole = (newRole: AppUserRole) => {
    setRoleState(newRole);
    if (newRole === 'tenant') {
      setUsernameState('Alex');
    } else if (newRole === 'landlord') {
      setUsernameState('John Doe');
    }
  };

  const setUsername = (name: string) => {
    setUsernameState(name);
  };

  // Add Property (backend-coupled API post)
  const addProperty = async (newProp: Omit<Property, 'id'>) => {
    // Optimistic fallback
    const id = `prop-${Date.now()}`;
    const property: Property = { ...newProp, id };
    setProperties(prev => [...prev, property]);

    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProp)
      });
      if (res.ok) {
        const propsRes = await fetch('/api/properties');
        if (propsRes.ok) setProperties(await propsRes.json());
        const unitsRes = await fetch('/api/units');
        if (unitsRes.ok) setUnits(await unitsRes.json());
      }
    } catch (err) {
      console.warn("Express API unreachable. Operating in local mode:", err);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId, tenantName })
      });
      if (res.ok) {
        const unitsRes = await fetch('/api/units');
        if (unitsRes.ok) setUnits(await unitsRes.json());
      }
    } catch (err) {
      console.warn("Express API unreachable:", err);
    }
  };

  // Update Unit Details
  const updateUnit = async (unitId: string, tenantName?: string, rentAmount?: number, status?: Unit['status']) => {
    setUnits(prev => prev.map(u => {
      if (u.id === unitId) {
        return {
          ...u,
          rentAmount: rentAmount !== undefined ? rentAmount : u.rentAmount,
          status: status || (tenantName ? 'Occupied' : 'Vacant'),
          tenantName: tenantName || undefined,
          tenantAvatar: tenantName ? u.tenantAvatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOcbVtz4Nz5aTDAR2DZW9Pg9F6e65oPi6Td2jZ84CEwLXgn5HrvYocGZaVvLRdcS9eUaqLENJ27o2RqpElz14uBPV47JROuDd4JkbKG4lK3vapbE6KOkie8PQbaMTqlvURqdmEzyOUTLS-bssVrQp56st-qoqgO1NFNrdLvXPdL5SwnjZzSChp5a_s4toIffdm_8W02EPKg7MLqi3poWL6UDKib0nkwFBjpcLb7YMRsPtiVkMFt4jFzqbDf0SOuGuynYq7GjnWhyHB' : undefined
        };
      }
      return u;
    }));

    try {
      const res = await fetch('/api/units/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId, tenantName, rentAmount, status })
      });
      if (res.ok) {
        const unitsRes = await fetch('/api/units');
        if (unitsRes.ok) setUnits(await unitsRes.json());
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
    if (p.tenantName === 'Alex Smith' || p.tenantName === 'Alex') {
      setTenantBalance(0);
    }

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      });
      if (res.ok) {
        const paymentsRes = await fetch('/api/payments');
        if (paymentsRes.ok) setPayments(await paymentsRes.json());
        const balRes = await fetch('/api/balance');
        if (balRes.ok) {
          const balData = await balRes.json();
          setTenantBalance(balData.tenantBalance);
        }
      }
    } catch (err) {
      console.warn("Express API unreachable:", err);
    }
  };

  // File repair ticket (backend-coupled API post)
  const addMaintenanceRequest = async (req: Omit<MaintenanceRequest, 'id' | 'status' | 'date' | 'tenantName' | 'propertyName' | 'unitNumber'>) => {
    // Optimistic local state updates
    const activeUnit = units.find(u => u.tenantName === 'Alex Smith' || u.tenantName === 'Alex') || units[4]; // Default Apt 4B
    const newRequest: MaintenanceRequest = {
      ...req,
      id: `req-${Date.now()}`,
      status: 'Submitted',
      date: new Date().toISOString().split('T')[0],
      tenantName: username,
      propertyName: activeUnit?.propertyName || 'Oakwood Heights',
      unitNumber: activeUnit?.unitNumber || 'Apt 4B'
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...req, tenantName: username })
      });
      if (res.ok) {
        const maintRes = await fetch('/api/maintenance');
        if (maintRes.ok) setMaintenanceRequests(await maintRes.json());
        const notifsRes = await fetch('/api/notifications');
        if (notifsRes.ok) setNotifications(await notifsRes.json());
      }
    } catch (err) {
      console.warn("Express API unreachable:", err);
    }
  };

  // Adjust Status of a maintenance ticket (backend-coupled PATCH API)
  const updateRequestStatus = async (requestId: string, status: MaintenanceRequest['status']) => {
    // Optimistic adjustments
    setMaintenanceRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        let techObj = {};
        if (status === 'In Progress' && !r.technicianName) {
          techObj = {
            technicianName: 'Mark S.',
            technicianAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBgHGl0k6f2XkLYjCLHl8a48TXjgy-Id98ps78OnE0wYtLYeuNe_SA4yid2BdyFcW72NvvX3QTFMKW2S31QWeq59noa99dscfJozILMQreMZHQdsc0PHSXD0e5EIvb9TE7fmsbiuZuJjR6Lz4WECW4S19uS50wvYbdJbxdvgGDRylaTrJhQhFiwhN9nARa_9fL6xs8Z2tDwqsJYhESjTEQmF8aARejNImS_FH9kV5YbJu-Ve_Ikaz_vvgOX0gmzBZfj1AodlcycXiGb',
            arrivalTime: '3:30 PM'
          };
        }
        return { ...r, status, ...techObj };
      }
      return r;
    }));

    try {
      const res = await fetch(`/api/maintenance/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const maintRes = await fetch('/api/maintenance');
        if (maintRes.ok) setMaintenanceRequests(await maintRes.json());
        const notifsRes = await fetch('/api/notifications');
        if (notifsRes.ok) setNotifications(await notifsRes.json());
      }
    } catch (err) {
      console.warn("Express API unreachable:", err);
    }
  };

  // Pay rent wizard completion (coupled to backend balance/pay route)
  const clearBalanceAndRecordPayment = async (method: 'M-Pesa' | 'Card') => {
    const originalAmount = tenantBalance;
    setTenantBalance(0);

    const paymentHash = Math.random().toString(36).substring(2, 10).toUpperCase();
    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      tenantName: 'Alex Smith',
      unitNumber: 'Apt 4B',
      propertyName: 'Oakwood Heights',
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
        message: `Successfully processed ${method} rent payment of $${originalAmount.toLocaleString()}.`,
        date: 'Just now',
        type: 'payment',
        unread: true
      },
      ...prev
    ]);

    try {
      const res = await fetch('/api/balance/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method })
      });
      if (res.ok) {
        const paymentsRes = await fetch('/api/payments');
        if (paymentsRes.ok) setPayments(await paymentsRes.json());
        const balRes = await fetch('/api/balance');
        if (balRes.ok) {
          const balData = await balRes.json();
          setTenantBalance(balData.tenantBalance);
        }
        const notifsRes = await fetch('/api/notifications');
        if (notifsRes.ok) setNotifications(await notifsRes.json());
      }
    } catch (err) {
      console.warn("Express API unreachable:", err);
    }
  };

  const markNotificationsAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));

    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST'
      });
      if (res.ok) {
        const notifsRes = await fetch('/api/notifications');
        if (notifsRes.ok) setNotifications(await notifsRes.json());
      }
    } catch (err) {
      console.warn("Express API unreachable:", err);
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
        tenantBalance,
        addProperty,
        addTenantToUnit,
        updateUnit,
        recordPayment,
        addMaintenanceRequest,
        updateRequestStatus,
        clearBalanceAndRecordPayment,
        markNotificationsAsRead
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
