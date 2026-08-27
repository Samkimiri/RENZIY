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
  membersLoaded: boolean;
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
  clearBalanceAndRecordPayment: (method: 'M-Pesa' | 'Card') => Promise<{ payment: Payment; originalAmount: number }>;
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

const authHeaders = () => {
  const token = localStorage.getItem('renziy_session_token');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
};

// The server is the only source of truth for whether a write succeeded -
// this throws with its error message so callers can surface a real failure
// instead of an optimistic update silently standing in for one.
const readErrorMessage = async (res: Response, fallback: string) => {
  const data = await res.json().catch(() => null);
  return (data && typeof data.error === 'string') ? data.error : fallback;
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

  // All business data below is a cache of server state, populated by
  // refreshSharedData() - it is never seeded from or persisted to
  // localStorage. Duplicating it locally previously meant a failed write
  // could leave the UI showing state the server never agreed to (e.g. a
  // "successful" payment that was never recorded), and stale copies could
  // resurface after the real data changed elsewhere.
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [members, setMembers] = useState<PlatformMember[]>([]);
  // False until the first post-login fetch settles. Code that decides
  // "this account doesn't exist" (see App.tsx) must wait for this - members
  // starts empty, so checking membership before the first load would kick
  // out every freshly-logged-in user.
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [rentalApplications, setRentalApplications] = useState<RentalApplication[]>([]);
  const [tenantBalance, setTenantBalance] = useState<number>(0);
  const [settlementConfig, setSettlementConfig] = useState<SettlementConfig>({
    mpesaType: 'Paybill',
    mpesaDetails: '',
    mpesaAccountName: '',
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankRoutingCode: ''
  });

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
        fetch('/api/properties', { headers: authHeaders() }),
        fetch('/api/units', { headers: authHeaders() }),
        fetch('/api/payments', { headers: authHeaders() }),
        fetch('/api/maintenance', { headers: authHeaders() }),
        fetch('/api/notifications', { headers: authHeaders() }),
        fetch('/api/members', { headers: authHeaders() }),
        fetch('/api/rental-applications', { headers: authHeaders() }),
        fetch('/api/balance', { headers: authHeaders() }),
        fetch('/api/settlement', { headers: authHeaders() })
      ]);

      if (propsRes.ok) setProperties(await propsRes.json());
      if (unitsRes.ok) setUnits(await unitsRes.json());
      if (paymentsRes.ok) setPayments(await paymentsRes.json());
      if (maintRes.ok) setMaintenanceRequests(await maintRes.json());
      if (notifsRes.ok) setNotifications(await notifsRes.json());
      if (membersRes.ok) setMembers(await membersRes.json());
      setMembersLoaded(true);
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

    // Refresh immediately on login - without this, `members` stays empty
    // until the first 5s interval tick, and the "no matching member yet"
    // check elsewhere would bounce a freshly-logged-in user back out.
    refreshSharedData();

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

  // Only session/UI preference state is persisted locally - business data
  // (properties, units, payments, etc.) always comes fresh from the server.
  useEffect(() => {
    localStorage.setItem('renziy_role', role);
    localStorage.setItem('renziy_username', username);
  }, [role, username]);

  // Set Role Context
  const setRole = (newRole: AppUserRole) => {
    // Reset the membership gate synchronously (same batch as the role
    // change) whenever entering a logged-in role. Child components' effects
    // run before this provider's own [role] effect refetches, so if this
    // reset happened later instead, a stale `membersLoaded=true` from a
    // previous (e.g. pre-login, unauthenticated) fetch would let the
    // "no matching member found yet" check fire immediately and sign the
    // user right back out before the fresh fetch had a chance to resolve.
    if (newRole !== 'anonymous') {
      setMembersLoaded(false);
    }
    setRoleState(newRole);
  };

  const setUsername = (name: string) => {
    setUsernameState(name);
  };

  // Add Property (backend-coupled API post)
  const addProperty = async (newProp: Omit<Property, 'id'>) => {
    const unitsCount = normalizeUnitCount(newProp.unitsCount);
    const res = await fetch('/api/properties', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ...newProp, unitsCount })
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Could not save this property.'));
    }
    const { property, addedUnits } = await res.json();
    setProperties(prev => [...prev, property]);
    setUnits(prev => [...prev, ...addedUnits]);
    await syncAfterMutation();
  };

  const updatePropertyDetails = async (propertyId: string, details: Partial<Property>) => {
    const res = await fetch(`/api/properties/${propertyId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(details)
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Could not update this property.'));
    }
    const updatedProperty = await res.json();
    setProperties(prev => prev.map(property => (property.id === propertyId ? updatedProperty : property)));
    await syncAfterMutation();
  };

  // Add Tenant to a Unit (backend-coupled API post)
  const addTenantToUnit = async (unitId: string, tenantName: string) => {
    const res = await fetch('/api/units/assign', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ unitId, tenantName })
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Could not assign this tenant.'));
    }
    const updatedUnit = await res.json();
    setUnits(prev => prev.map(u => (u.id === unitId ? updatedUnit : u)));
    await syncAfterMutation();
  };

  // Update Unit Details
  const updateUnit = async (unitId: string, tenantName?: string, rentAmount?: number, status?: Unit['status']) => {
    const res = await fetch('/api/units/update', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ unitId, tenantName, rentAmount, status })
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Could not update this unit.'));
    }
    const updatedUnit = await res.json();
    setUnits(prev => prev.map(u => (u.id === unitId ? updatedUnit : u)));
    await syncAfterMutation();
  };

  // Record a payment (backend-coupled API post)
  const recordPayment = async (p: Omit<Payment, 'id' | 'code'>) => {
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(p)
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Could not record this payment.'));
    }
    const newPayment = await res.json();
    setPayments(prev => [newPayment, ...prev]);
    await syncAfterMutation();
  };

  // File repair ticket (backend-coupled API post)
  const addMaintenanceRequest = async (req: Omit<MaintenanceRequest, 'id' | 'status' | 'date' | 'tenantName' | 'propertyName' | 'unitNumber'>) => {
    const res = await fetch('/api/maintenance', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ...req, tenantName: username })
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Could not submit this repair request.'));
    }
    const newRequest = await res.json();
    setMaintenanceRequests(prev => [newRequest, ...prev]);
    await syncAfterMutation();
  };

  // Adjust Status of a maintenance ticket (backend-coupled PATCH API)
  const updateRequestStatus = async (requestId: string, status: MaintenanceRequest['status'], workerEmail?: string) => {
    const res = await fetch(`/api/maintenance/${requestId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status, workerEmail })
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Could not update this repair request.'));
    }
    const updatedRequest = await res.json();
    setMaintenanceRequests(prev => prev.map(r => (r.id === requestId ? updatedRequest : r)));
    await syncAfterMutation();
  };

  const assignMaintenanceWorker = async (requestId: string, workerEmail: string) => {
    const res = await fetch(`/api/maintenance/${requestId}/assign-worker`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ workerEmail })
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Could not assign a worker to this request.'));
    }
    const updatedRequest = await res.json();
    setMaintenanceRequests(prev => prev.map(request => (request.id === requestId ? updatedRequest : request)));
    await syncAfterMutation();
  };

  // Pay rent wizard completion (coupled to backend balance/pay route)
  const clearBalanceAndRecordPayment = async (method: 'M-Pesa' | 'Card') => {
    const res = await fetch('/api/balance/pay', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ method, tenantName: username })
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Could not process this payment.'));
    }
    const { payment, originalAmount } = await res.json();
    setPayments(prev => [payment, ...prev]);
    setTenantBalance(prev => prev - originalAmount);
    await syncAfterMutation();
    return { payment, originalAmount };
  };

  const toggleUnitLock = async (unitId: string, isLocked: boolean, lockReason?: string) => {
    const res = await fetch('/api/units/lock', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ unitId, isLocked, lockReason })
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Could not update this smart lock.'));
    }
    const updatedUnit = await res.json();
    setUnits(prev => prev.map(u => (u.id === unitId ? updatedUnit : u)));
    await syncAfterMutation();
  };

  const markNotificationsAsRead = async () => {
    const res = await fetch('/api/notifications/read', {
      method: 'POST',
      headers: authHeaders()
    });
    if (!res.ok) return;
    const notifsRes = await fetch('/api/notifications', { headers: authHeaders() });
    if (notifsRes.ok) setNotifications(await notifsRes.json());
  };

  const updateSettlementConfig = async (newConfig: Partial<SettlementConfig>) => {
    const res = await fetch('/api/settlement', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(newConfig)
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Could not update payout settings.'));
    }
    setSettlementConfig(await res.json());
    await syncAfterMutation();
  };

  const updateTenantAvatar = async (unitId: string, tenantAvatar: string) => {
    const res = await fetch('/api/units/update-avatar', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ unitId, tenantAvatar })
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Could not update this photo.'));
    }
    const updatedUnit = await res.json();
    setUnits(prev => prev.map(u => (u.id === unitId ? updatedUnit : u)));
    await syncAfterMutation();
  };

  const updateProfileAvatar = async (memberId: string, avatarUrl: string, unitId?: string) => {
    const res = await fetch('/api/members/avatar', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ memberId, avatarUrl, unitId })
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Could not update this profile photo.'));
    }
    const { member: updatedMember, unit: updatedUnit, maintenanceRequests: updatedRequests } = await res.json();
    setMembers(prev => prev.map(member => (member.id === memberId ? updatedMember : member)));
    if (updatedUnit) {
      setUnits(prev => prev.map(unit => (unit.id === updatedUnit.id ? updatedUnit : unit)));
    }
    if (updatedRequests) {
      setMaintenanceRequests(updatedRequests);
    }
    await syncAfterMutation();
  };

  const requestPasswordReset = async (role: PlatformMember['role'], email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const res = await fetch('/api/auth/request-password-reset', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ role, email: normalizedEmail })
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Password reset code could not be sent.'));
    }
    const data = await res.json();
    return data.delivery as { email: string; phone: string; resetCode?: string; expiresAt?: number };
  };

  const confirmPasswordReset = async (role: PlatformMember['role'], email: string, code: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const res = await fetch('/api/auth/confirm-password-reset', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ role, email: normalizedEmail, code, password })
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Password reset failed.'));
    }
    const data = await res.json();
    setMembers(prev => prev.map(member => member.id === data.member.id ? data.member : member));
    await syncAfterMutation();
  };

  const registerMember = async (member: Omit<PlatformMember, 'id' | 'joinDate' | 'status'>) => {
    const res = await fetch(member.password ? '/api/auth/register' : '/api/members', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(member)
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Could not create this account.'));
    }
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('renziy_session_token', data.token);
    }
    const savedMember: PlatformMember = data.member || data;
    setMembers(prev => [savedMember, ...prev.filter(m => m.email !== savedMember.email || m.role !== savedMember.role)]);
    await syncAfterMutation();
    return savedMember;
  };

  const submitRentalApplication = async (application: Omit<RentalApplication, 'id' | 'requestedAt' | 'status'>) => {
    const res = await fetch('/api/rental-applications', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(application)
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'This unit is no longer available for a new request.'));
    }
    const savedApplication = await res.json();
    setRentalApplications(prev => [savedApplication, ...prev]);
    await syncAfterMutation();
    return savedApplication;
  };

  const markRentalApplicationPaid = async (applicationId: string, method: 'M-Pesa' | 'Card') => {
    const res = await fetch(`/api/rental-applications/${applicationId}/pay`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ method })
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Could not process this rental payment.'));
    }
    const updatedApplication = await res.json();
    setRentalApplications(prev => prev.map(item => (item.id === applicationId ? updatedApplication : item)));
    await syncAfterMutation();
  };

  const approveRentalApplication = async (applicationId: string) => {
    const res = await fetch(`/api/rental-applications/${applicationId}/approve`, { method: 'POST', headers: authHeaders() });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Could not approve this rental request.'));
    }
    const updatedApplication = await res.json();
    setRentalApplications(prev => prev.map(item => (item.id === applicationId ? updatedApplication : item)));
    await syncAfterMutation();
  };

  const declineRentalApplication = async (applicationId: string) => {
    const res = await fetch(`/api/rental-applications/${applicationId}/decline`, { method: 'POST', headers: authHeaders() });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Could not decline this rental request.'));
    }
    const updatedApplication = await res.json();
    setRentalApplications(prev => prev.map(item => (item.id === applicationId ? updatedApplication : item)));
    await syncAfterMutation();
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
        membersLoaded,
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
