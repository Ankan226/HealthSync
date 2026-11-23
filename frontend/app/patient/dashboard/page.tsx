'use client';
import { Guard, DashboardShell, Avatar, StatCard, ListCard } from '@/components/dashboard/shell';
import { DetailsCard } from '@/components/auth/parts';

const upcoming: [string, string][] = [['Dr. Rohan Mehta, Neurology', 'Nov 5, 10:30 AM'], ['Dr. Priya Nair, Cardiology', 'Nov 12, 2:00 PM']];
export default function PatientDashboard() {
  return <Guard role="patient">{u => (
    <DashboardShell user={u}>
      <div className="flex items-center gap-4"><Avatar user={u} size={56} /><h1 className="text-2xl font-bold text-navy">Welcome back, {u.name}</h1></div>
      <div className="grid gap-4 sm:grid-cols-3"><StatCard label="Upcoming appointments" value={2} /><StatCard label="Past visits" value={7} /><StatCard label="Active prescriptions" value={1} /></div>
      <div className="flex flex-wrap gap-3"><button className="h-11 rounded-lg bg-brand px-5 text-sm font-semibold text-white">Find a doctor</button><button className="h-11 rounded-lg border bg-white px-5 text-sm font-semibold">Book appointment</button></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ListCard title="Upcoming appointments" items={upcoming} empty="No upcoming appointments. Find a doctor to book one." />
        <div className="rounded-2xl border bg-white p-5 shadow-sm"><DetailsCard title="My profile" rows={[['Name', u.name], ['Email', u.email], ['Date of birth', u.dob ?? '-']]} /></div>
      </div>
    </DashboardShell>)}</Guard>;
}
