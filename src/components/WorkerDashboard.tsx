import React from 'react';
import { useRenziy } from '../state';
import { CheckCircle2, Clock, HardHat, MapPin, Phone, ShieldAlert, Wrench } from 'lucide-react';

export default function WorkerDashboard() {
  const { username, members, maintenanceRequests, updateRequestStatus, assignMaintenanceWorker } = useRenziy();
  const sessionEmail = localStorage.getItem('renziy_user_email') || '';
  const worker = members.find(member => member.role === 'worker' && member.email.toLowerCase() === sessionEmail.toLowerCase());
  const workerEmail = worker?.email || sessionEmail;
  const assignedJobs = maintenanceRequests.filter(request => request.technicianEmail === workerEmail || request.technicianName === username);
  const openJobs = maintenanceRequests.filter(request => !request.technicianName && request.status !== 'Resolved');
  const activeJobs = assignedJobs.filter(request => request.status !== 'Resolved');
  const resolvedJobs = assignedJobs.filter(request => request.status === 'Resolved');

  return (
    <div className="bg-[#fcf8fb] min-h-screen text-[#1b1b1d] pb-24 md:pb-12">
      <section className="mb-6 rounded-3xl bg-[#002645] text-white p-5 md:p-7 border border-[#1a3c5e] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-400/25 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
              <HardHat className="h-3.5 w-3.5" />
              Maintenance worker portal
            </span>
            <h1 className="text-2xl md:text-3xl font-black mt-4">Repair dispatch for {username}</h1>
            <p className="text-sm text-[#b7cee8] mt-2 max-w-2xl">
              Landlords can assign tenant repair requests here. Accept open work, update progress, and close resolved jobs from one place.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 min-w-full md:min-w-80">
            <div className="rounded-2xl bg-white/8 border border-white/10 p-3 text-center">
              <span className="block text-2xl font-black">{activeJobs.length}</span>
              <span className="text-[9px] uppercase tracking-wider text-[#b7cee8] font-bold">Active</span>
            </div>
            <div className="rounded-2xl bg-white/8 border border-white/10 p-3 text-center">
              <span className="block text-2xl font-black">{openJobs.length}</span>
              <span className="text-[9px] uppercase tracking-wider text-[#b7cee8] font-bold">Open</span>
            </div>
            <div className="rounded-2xl bg-white/8 border border-white/10 p-3 text-center">
              <span className="block text-2xl font-black">{resolvedJobs.length}</span>
              <span className="text-[9px] uppercase tracking-wider text-[#b7cee8] font-bold">Resolved</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl border border-[#e4e2e4] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Assigned jobs</span>
              <h2 className="text-xl font-black text-[#002645] mt-1">Your repair queue</h2>
            </div>
            <Wrench className="h-5 w-5 text-[#002645]" />
          </div>
          <div className="space-y-3">
            {assignedJobs.map(job => (
              <article key={job.id} className="rounded-2xl border border-[#e4e2e4] bg-[#fcf8fb] p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                        job.urgency === 'High' || job.urgency === 'Emergency' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {job.urgency}
                      </span>
                      <span className="rounded-full bg-[#E8F4FD] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#002645]">
                        {job.status}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-[#002645] mt-2">{job.title}</h3>
                    <p className="text-xs text-[#43474e] leading-relaxed mt-1">{job.description}</p>
                  </div>
                  <select
                    value={job.status}
                    onChange={(event) => updateRequestStatus(job.id, event.target.value as any, workerEmail)}
                    className="rounded-xl border border-[#c3c6cf] bg-white p-2 text-xs font-black text-[#002645] focus:outline-none"
                  >
                    <option value="Acknowledged">Acknowledged</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-xl bg-white border border-[#e4e2e4] p-3">
                    <span className="block text-[9px] font-black uppercase tracking-widest text-[#73777f]">Location</span>
                    <span className="flex items-center gap-1.5 mt-1 font-bold text-[#002645]"><MapPin className="h-3.5 w-3.5" /> {job.propertyName} ({job.unitNumber})</span>
                  </div>
                  <div className="rounded-xl bg-white border border-[#e4e2e4] p-3">
                    <span className="block text-[9px] font-black uppercase tracking-widest text-[#73777f]">Tenant</span>
                    <span className="flex items-center gap-1.5 mt-1 font-bold text-[#002645]"><Phone className="h-3.5 w-3.5" /> {job.tenantName}</span>
                  </div>
                </div>
              </article>
            ))}
            {assignedJobs.length === 0 && (
              <p className="rounded-2xl border border-dashed border-[#c3c6cf] bg-[#fcf8fb] p-6 text-center text-xs font-semibold text-[#73777f]">
                No assigned repair jobs yet.
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#e4e2e4] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Open dispatch</span>
              <h2 className="text-xl font-black text-[#002645] mt-1">Available requests</h2>
            </div>
            <ShieldAlert className="h-5 w-5 text-amber-700" />
          </div>
          <div className="space-y-3">
            {openJobs.map(job => (
              <article key={job.id} className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-[#002645]">{job.title}</h3>
                    <p className="text-xs text-[#43474e] leading-relaxed mt-1">{job.description}</p>
                    <p className="text-[11px] font-bold text-[#73777f] mt-2">{job.propertyName} - {job.unitNumber}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => assignMaintenanceWorker(job.id, workerEmail)}
                    disabled={!workerEmail}
                    className="rounded-xl bg-[#002645] px-4 py-2.5 text-xs font-black text-white hover:bg-[#1a3c5e] disabled:bg-slate-300 transition-all"
                  >
                    Accept Job
                  </button>
                </div>
              </article>
            ))}
            {openJobs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#c3c6cf] bg-[#fcf8fb] p-6 text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600" />
                <p className="text-xs font-semibold text-[#73777f] mt-2">No unassigned tenant repairs right now.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-[#e4e2e4] p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-[#002645]" />
          <div>
            <h2 className="text-sm font-black text-[#002645]">Worker profile</h2>
            <p className="text-xs text-[#73777f] mt-1">{worker?.email || 'Worker email'} - {worker?.phone || 'Phone pending'} - {worker?.specialty || 'General maintenance'}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
