import React, { useState } from 'react';
import { useRenziy } from '../state';
import { MaintenanceRequest } from '../types';
import { motion } from 'motion/react';
import { Wrench, ShieldAlert, CheckCircle2, Clock, Calendar, Filter, User, HelpCircle, ArrowRightCircle } from 'lucide-react';

export default function MaintenanceHistory() {
  const { role, maintenanceRequests, updateRequestStatus } = useRenziy();
  const [filterUrgency, setFilterUrgency] = useState<'All' | 'High-Emergency' | 'Low-Med'>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Resolved'>('All');

  // Realistic starting numbers padding
  const totalCount = maintenanceRequests.length + 9;
  const resolvedCount = maintenanceRequests.filter(r => r.status === 'Resolved').length + 6;
  const activeCount = maintenanceRequests.filter(r => r.status !== 'Resolved').length + 3;

  // Filter requests array block
  const filteredRequests = maintenanceRequests.filter(r => {
    // Urgency filter
    if (filterUrgency === 'High-Emergency') {
      if (r.urgency !== 'High' && r.urgency !== 'Emergency') return false;
    } else if (filterUrgency === 'Low-Med') {
      if (r.urgency !== 'Low' && r.urgency !== 'Med') return false;
    }

    // Status filter
    if (filterStatus === 'Resolved') {
      return r.status === 'Resolved';
    } else if (filterStatus === 'Active') {
      return r.status !== 'Resolved';
    }

    return true;
  });

  return (
    <div className="bg-[#fcf8fb] min-h-screen text-[#1b1b1d] pb-24 md:pb-12 text-sm">
      {/* Hero Stats */}
      <h2 className="text-xs font-bold text-[#73777f] uppercase tracking-wider px-1 mb-4">Pipeline Metrics</h2>
      <section className="mb-6 grid grid-cols-3 gap-4">
        <div className="bg-white border border-[#e4e2e4] p-4 rounded-2xl shadow-xs text-center">
          <p className="text-[10px] font-bold text-[#73777f] uppercase tracking-wider">Total Pipeline Tickets</p>
          <p className="text-2xl font-black text-[#002645] mt-1">{totalCount}</p>
        </div>
        <div className="bg-white border border-[#e4e2e4] p-4 rounded-2xl shadow-xs text-center">
          <p className="text-[10px] font-bold text-[#73777f] uppercase tracking-wider">Active Pipeline</p>
          <p className="text-2xl font-black text-[#002645] mt-1">{activeCount}</p>
        </div>
        <div className="bg-white border border-emerald-100 p-4 rounded-2xl shadow-xs text-center">
          <p className="text-[10px] font-bold text-[#007149] uppercase tracking-wider">Resolved Pipeline</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{resolvedCount}</p>
        </div>
      </section>

      {/* Filtering row options */}
      <div className="bg-white border border-[#e4e2e4] p-4 rounded-2xl mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-[#002645]">
          <Filter className="h-4 w-4" />
          <span>Funnels:</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center w-full md:w-auto">
          {/* Status filter tabs */}
          <div className="flex bg-[#f0edef] p-1 rounded-lg w-full sm:w-auto justify-center">
            {(['All', 'Active', 'Resolved'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilterStatus(tab)}
                className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filterStatus === tab ? 'bg-[#002645] text-white shadow-xs' : 'text-[#43474e] hover:text-[#002645]'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Urgency filter tabs */}
          <div className="flex bg-[#f0edef] p-1 rounded-lg w-full sm:w-auto justify-center">
            <button
              onClick={() => setFilterUrgency('All')}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterUrgency === 'All' ? 'bg-[#002645] text-white' : 'text-[#43474e]'}`}
            >
              All Tiers
            </button>
            <button
              onClick={() => setFilterUrgency('High-Emergency')}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterUrgency === 'High-Emergency' ? 'bg-[#002645] text-white' : 'text-[#43474e]'}`}
            >
              High / Emergency
            </button>
            <button
              onClick={() => setFilterUrgency('Low-Med')}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterUrgency === 'Low-Med' ? 'bg-[#002645] text-white' : 'text-[#43474e]'}`}
            >
              Low / Med
            </button>
          </div>
        </div>
      </div>

      {/* Main List Rendering */}
      <div className="space-y-4">
        {filteredRequests.map(ticket => {
          return (
            <div 
              key={ticket.id}
              className="bg-white border border-[#e4e2e4] p-5 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-[#f0edef]">
                {/* Info block */}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      ticket.urgency === 'High' || ticket.urgency === 'Emergency' 
                        ? 'bg-red-100 text-red-800' 
                        : ticket.urgency === 'Med' 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-blue-100 text-blue-800'
                    }`}>
                      ● {ticket.urgency} Urgency
                    </span>
                    <span className="text-[10px] font-bold text-[#73777f] uppercase bg-[#f0edef] px-2 py-0.5 rounded-full">
                      {ticket.category}
                    </span>
                    <span className="text-[10px] text-[#73777f] flex items-center gap-1 font-semibold">
                      <Calendar className="h-3 w-3" /> {ticket.date}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-[#002645] text-base mt-2">{ticket.title}</h3>
                  <p className="text-xs text-[#43474e] mt-1 leading-relaxed max-w-2xl">{ticket.description}</p>
                </div>

                {/* Status marker badge */}
                <div className="shrink-0 flex items-center gap-2">
                  <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold border ${
                    ticket.status === 'Resolved' 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                      : ticket.status === 'In Progress' 
                        ? 'bg-indigo-100 text-indigo-800 border-indigo-200' 
                        : ticket.status === 'Acknowledged'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {ticket.status}
                  </span>
                </div>
              </div>

              {/* Resident Context bar or photo log previews */}
              <div className="pt-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  {/* Photo logs preview */}
                  {ticket.photos.map((p, i) => (
                    <img key={i} src={p} alt="Fault" className="w-10 h-10 object-cover rounded-lg border border-[#e4e2e4]" />
                  ))}

                  <div>
                    <p className="text-[9px] font-bold uppercase text-[#73777f] tracking-wide leading-none">Resident Locality</p>
                    <p className="font-bold text-xs text-[#002645] mt-1">
                      {ticket.tenantName} — {ticket.propertyName} ({ticket.unitNumber})
                    </p>
                  </div>
                </div>

                {/* Technician dispatched check */}
                {ticket.technicianName ? (
                  <div className="flex items-center gap-2.5 bg-[#f6f3f5] p-2 rounded-2xl border border-[#e4e2e4]">
                    <img 
                      src={ticket.technicianAvatar} 
                      alt={ticket.technicianName} 
                      className="w-10 h-10 rounded-xl object-cover" 
                    />
                    <div>
                      <span className="text-[9px] font-bold text-[#73777f] uppercase block leading-none">Tech Dispatched</span>
                      <span className="text-xs font-extrabold text-[#002645] mt-1 block">{ticket.technicianName} ({ticket.arrivalTime})</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-[10px] text-[#73777f] italic font-semibold">Pending technical allocation</span>
                )}

                {/* LANDLORD WORKFLOW STATUS CONTROLLER (Only visible when role is landlord) */}
                {role === 'landlord' && (
                  <div className="flex items-center gap-2 bg-[#eae7ea]/50 p-2 rounded-xl border border-[#c3c6cf] self-start sm:self-auto">
                    <span className="text-[10px] text-[#73777f] font-bold uppercase">Assign State:</span>
                    <select
                      className="bg-white p-1 rounded font-bold text-xs border border-[#c3c6cf] focus:outline-none focus:border-[#002645]"
                      value={ticket.status}
                      onChange={(e) => updateRequestStatus(ticket.id, e.target.value as any)}
                    >
                      <option value="Submitted">Submitted</option>
                      <option value="Acknowledged">Acknowledged</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredRequests.length === 0 && (
          <p className="text-center text-xs text-[#73777f] py-16 bg-white rounded-3xl border border-[#e4e2e4] font-semibold">
            No pipeline tickets registered under these filters.
          </p>
        )}
      </div>
    </div>
  );
}
