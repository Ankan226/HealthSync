'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Guard, DashboardShell, Avatar, StatCard, ListCard } from '@/components/dashboard/shell';
import { StatusBadge, DetailsCard } from '@/components/auth/parts';
import { FileThumb } from '@/components/ui/file-upload';
import { homeFor, type User } from '@/lib/mock-auth';

const today: [string, string][] = [['Alex Johnson', '9:00 AM'], ['Maria Lopez', '10:30 AM'], ['Sam Patel', '1:15 PM']];
export default function DoctorDashboard() {
  return <Guard role="doctor">{u => <Inner u={u} />}</Guard>;
}
function Inner({ u }: { u: User }) {
  const router = useRouter();
  // Only approved doctors may see this page
  useEffect(() => { if (u.status !== 'approved') router.replace(homeFor(u)); }, [u, router]);
  if (u.status !== 'approved') return null;
  return (
    <DashboardShell user={u}>
      <div className="flex items-center gap-4"><Avatar user={u} size={56} />
        <div><h1 className="text-2xl font-bold text-navy">Welcome, Dr. {u.name.replace(/^Dr\.?\s*/, '')}</h1>
          <p className="flex items-center gap-2 text-sm text-gray-500">{u.specialty} <StatusBadge status="approved" label="Verified" /></p></div></div>
      <div className="grid gap-4 sm:grid-cols-3"><StatCard label="Today's appointments" value={today.length} /><StatCard label="Total patients" value={128} /><StatCard label="Pending prescriptions" value={4} /></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ListCard title="Today's schedule" items={today} empty="Nothing scheduled today." />
        <div className="rounded-2xl border bg-white p-5 shadow-sm"><DetailsCard title="My credentials" rows={[['License number', u.license ?? '-'], ['Experience', `${u.years ?? 0} years`], ['Consultation fee', `$${u.fee ?? 0}`]]}>
          <FileThumb url={u.licenseFileDataUrl} name={u.licenseFileName} /></DetailsCard></div>
      </div>
    </DashboardShell>);
}
