/**
 * Refined data definitions for Renziy Property Management System
 */

export interface Property {
  id: string;
  name: string;
  address: string;
  unitsCount: number;
  imageUrl: string;
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

export interface Unit {
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

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitNumber: string;
  rentAmount: number;
  joinDate: string;
}

export interface PlatformMember {
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

export interface RentalApplication {
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

export interface Payment {
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

export interface MaintenanceRequest {
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

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'maintenance' | 'lease' | 'payment';
  unread: boolean;
}

export type AppUserRole = 'landlord' | 'tenant' | 'worker' | 'anonymous';

export interface SettlementConfig {
  mpesaType: 'Paybill' | 'BuyGoods' | 'PhoneNumber';
  mpesaDetails: string;
  mpesaAccountName: string;
  paybillAccount?: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankRoutingCode: string;
}
