import React, { useMemo, useState } from 'react';
import { useRenziy } from '../state';
import { Activity, Building2, CreditCard, Home, Search, ShieldCheck, Users2, Wrench } from 'lucide-react';

const formatCurrency = (value: number) => `KES ${value.toLocaleString()}`;

export default function AdminDashboard() {
  const {
    properties,
    units,
    payments,
    maintenanceRequests,
    members,
    rentalApplications,
    notifications,
    tenantBalance,
    settlementConfig
  } = useRenziy();
  const [query, setQuery] = useState('');

  const roleCounts = useMemo(() => ({
    admins: members.filter(member => member.role === 'admin').length,
    landlords: members.filter(member => member.role === 'landlord').length,
    tenants: members.filter(member => member.role === 'tenant').length,
    workers: members.filter(member => member.role === 'worker').length
  }), [members]);

  const paidRevenue = payments
    .filter(payment => payment.status === 'Paid')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const pendingRevenue = payments
    .filter(payment => payment.status !== 'Paid')
    .reduce((sum, payment) => sum + payment.amount, 0) + tenantBalance;
  const occupiedUnits = units.filter(unit => unit.status === 'Occupied').length;
  const occupancyRate = units.length > 0 ? Math.round((occupiedUnits / units.length) * 100) : 0;
  const openRepairs = maintenanceRequests.filter(request => request.status !== 'Resolved');
  const pendingApplications = rentalApplications.filter(application => application.status !== 'Approved' && application.status !== 'Declined');

  const searchableMembers = members.filter(member => {
    const haystack = [
      member.name,
      member.email,
      member.phone,
      member.role,
      member.propertyName,
      member.unitNumber,
      member.specialty
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  const latestPayments = [...payments].slice(0, 6);
  const latestRepairs = [...maintenanceRequests].slice(0, 6);

  return (
    <div className="bg-[#E8F4FD] min-h-screen text-[#1b1b1d] pb-24 md:pb-12">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#002645] text-white px-3 py-1 text-[10px] font-black uppercase tracking-wider">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            App owner control
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-[#002645] mt-3">Admin Site Management</h1>
          <p className="text-sm font-semibold text-[#43474e] mt-2 max-w-3xl">
            Monitor live platform activity, users, properties, maintenance, payments, and tenant movement from one owner workspace.
          </p>
        </div>
        <div className="bg-white border border-[#e4e2e4] rounded-2xl px-4 py-3 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#73777f]">Collection routing</span>
          <p className="text-sm font-black text-[#002645] mt-1">{settlementConfig.mpesaAccountName}</p>
          <p className="text-xs font-semibold text-[#73777f]">{settlementConfig.mpesaType} {settlementConfig.mpesaDetails}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          [Building2, 'Properties', properties.length.toLocaleString(), `${units.length.toLocaleString()} total units`],
          [Home, 'Occupancy', `${occupancyRate}%`, `${occupiedUnits.toLocaleString()} occupied`],
          [CreditCard, 'Collected', formatCurrency(paidRevenue), `${formatCurrency(pendingRevenue)} pending`],
          [Wrench, 'Open Repairs', openRepairs.length.toLocaleString(), `${pendingApplications.length.toLocaleString()} house requests`]
        ].map(([Icon, label, value, meta]) => {
          const IconComponent = Icon as typeof Building2;
          return (
            <div key={label as string} className="bg-white border border-[#e4e2e4] rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#73777f]">{label as string}</span>
                <span className="h-9 w-9 rounded-xl bg-[#E8F4FD] text-[#002645] flex items-center justify-center">
                  <IconComponent className="h-4.5 w-4.5" />
                </span>
              </div>
              <p className="text-2xl font-black text-[#002645] mt-4">{value as string}</p>
              <p className="text-xs font-semibold text-[#73777f] mt-1">{meta as string}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <section className="xl:col-span-2 bg-white border border-[#e4e2e4] rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#73777f]">Platform accounts</span>
              <h2 className="text-xl font-black text-[#002645] mt-1">User Directory</h2>
            </div>
            <label className="flex items-center gap-2 rounded-xl bg-[#f6f3f5] border border-[#e4e2e4] px-3 py-2">
              <Search className="h-4 w-4 text-[#73777f]" />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                className="bg-transparent border-none outline-none text-sm font-semibold text-[#002645] min-w-0"
                placeholder="Search users"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {[
              ['Admins', roleCounts.admins],
              ['Landlords', roleCounts.landlords],
              ['Tenants', roleCounts.tenants],
              ['Workers', roleCounts.workers]
            ].map(([label, count]) => (
              <div key={label as string} className="rounded-xl bg-[#f6f3f5] border border-[#e4e2e4] p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#73777f]">{label as string}</p>
                <p className="text-lg font-black text-[#002645] mt-1">{count as number}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-[#73777f] border-b border-[#f0edef]">
                  <th className="py-3 font-black">Name</th>
                  <th className="py-3 font-black">Role</th>
                  <th className="py-3 font-black">Email</th>
                  <th className="py-3 font-black">Phone</th>
                  <th className="py-3 font-black">Assignment</th>
                  <th className="py-3 font-black">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0edef]">
                {searchableMembers.map(member => (
                  <tr key={member.id} className="text-xs">
                    <td className="py-3 font-black text-[#002645]">{member.name}</td>
                    <td className="py-3">
                      <span className="rounded-full bg-[#E8F4FD] px-2 py-1 font-black uppercase text-[10px] text-[#002645]">{member.role}</span>
                    </td>
                    <td className="py-3 font-semibold text-[#43474e]">{member.email}</td>
                    <td className="py-3 font-semibold text-[#43474e]">{member.phone}</td>
                    <td className="py-3 font-semibold text-[#43474e]">{member.propertyName || member.specialty || 'Platform'}</td>
                    <td className="py-3 font-black text-emerald-700">{member.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white border border-[#e4e2e4] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#73777f]">Live health</span>
              <h2 className="text-xl font-black text-[#002645] mt-1">Activity Feed</h2>
            </div>
            <Activity className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="space-y-3">
            {notifications.slice(0, 8).map(notification => (
              <div key={notification.id} className="rounded-xl bg-[#f6f3f5] border border-[#e4e2e4] p-3">
                <p className="text-xs font-black text-[#002645]">{notification.title}</p>
                <p className="text-[11px] font-semibold text-[#43474e] mt-1 leading-relaxed">{notification.message}</p>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#73777f] mt-2 block">{notification.date}</span>
              </div>
            ))}
            {notifications.length === 0 && (
              <p className="text-sm font-semibold text-[#73777f]">No notifications recorded yet.</p>
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="bg-white border border-[#e4e2e4] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users2 className="h-5 w-5 text-[#002645]" />
            <h2 className="text-xl font-black text-[#002645]">Recent Payments</h2>
          </div>
          <div className="space-y-2">
            {latestPayments.map(payment => (
              <div key={payment.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#e4e2e4] p-3">
                <div>
                  <p className="text-sm font-black text-[#002645]">{payment.tenantName}</p>
                  <p className="text-xs font-semibold text-[#73777f]">{payment.propertyName} - {payment.unitNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-[#002645]">{formatCurrency(payment.amount)}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">{payment.status}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-[#e4e2e4] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="h-5 w-5 text-[#002645]" />
            <h2 className="text-xl font-black text-[#002645]">Repair Queue</h2>
          </div>
          <div className="space-y-2">
            {latestRepairs.map(request => (
              <div key={request.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#e4e2e4] p-3">
                <div>
                  <p className="text-sm font-black text-[#002645]">{request.title}</p>
                  <p className="text-xs font-semibold text-[#73777f]">{request.tenantName} - {request.propertyName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#002645]">{request.urgency}</p>
                  <p className="text-xs font-semibold text-[#73777f]">{request.status}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
