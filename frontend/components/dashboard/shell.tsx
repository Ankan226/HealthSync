'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, LayoutDashboard, Search, CalendarDays, FileHeart, Pill, User as UserIcon, Clock, Users, ClipboardList, LogOut } from 'lucide-react';
import { useAuth } from '@/store/auth-store';
import { homeFor, type Role, type User } from '@/lib/mock-auth';

/** RBAC guard: logged out -> /login, wrong role/status -> own home. Passes the user to children. */
export function Guard({ role, children }: { role: Role; children: (u: User) => ReactNode }) {
  const { currentUser: u, hydrated } = useAuth(); const router = useRouter();
  useEffect(() => {
    if (!hydrated) return;
    if (!u) router.replace('/login');
    else if (u.role !== role) router.replace(homeFor(u));
  }, [u, hydrated, role, router]);
  if (!hydrated || !u || u.role !== role) return <div className="p-10 text-center text-sm text-gray-500">Loading…</div>;
  return <>{children(u)}{process.env.NODE_ENV === 'development' && <DevSwitcher />}</>;
}

/** Dev-only: flip the logged-in doctor's status to demo every screen */
function DevSwitcher() {
  const { currentUser: u, updateDoctorStatus } = useAuth(); const router = useRouter();
  if (u?.role !== 'doctor') return null;
  return (
    <div className="fixed bottom-4 right-4 z-40 rounded-xl border bg-white p-2 text-xs shadow-lg">
      <p className="mb-1 px-1 text-gray-400">Dev: doctor status</p>
      <div className="flex gap-1">{(['pending', 'rejected', 'approved'] as const).map(s => (
        <button key={s} onClick={() => { updateDoctorStatus(s); router.push(homeFor({ ...u, status: s })); }}
          className={`rounded px-2 py-1 capitalize ${u.status === s ? 'bg-brand text-white' : 'bg-gray-100'}`}>{s}</button>))}</div>
    </div>);
}

export const initials = (n: string) => n.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
export function Avatar({ user, size = 40 }: { user: User; size?: number }) {
  return user.photoDataUrl
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={user.photoDataUrl} alt={user.name} style={{ width: size, height: size }} className="rounded-full object-cover" />
    : <span style={{ width: size, height: size }} className="flex items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-brand" aria-label={user.name}>{initials(user.name)}</span>;
}

const navs = {
  patient: [['Dashboard', LayoutDashboard], ['Find Doctor', Search], ['My Appointments', CalendarDays], ['Medical History', FileHeart], ['Prescriptions', Pill], ['Profile', UserIcon]],
  doctor: [['Dashboard', LayoutDashboard], ['My Schedule', CalendarDays], ['Availability', Clock], ['Patients', Users], ['Patient Records', ClipboardList]],
} as const;

export function DashboardShell({ user, children }: { user: User; children: ReactNode }) {
  const { logout } = useAuth(); const router = useRouter(); const [menu, setMenu] = useState(false);
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r bg-white p-4 md:block">
        <p className="mb-6 text-xl font-bold text-navy">HealthSync</p>
        <nav aria-label="Main"><ul className="space-y-1">{navs[user.role].map(([label, Icon], i) => (
          <li key={label}><Link href="#" className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${i === 0 ? 'bg-blue-50 font-semibold text-brand' : 'text-gray-600 hover:bg-gray-50'}`}><Icon size={18} />{label}</Link></li>))}</ul></nav>
      </aside>
      <div className="flex-1">
        <header className="flex h-16 items-center justify-between border-b bg-white px-4 md:justify-end md:gap-4">
          <p className="font-bold text-navy md:hidden">HealthSync</p>
          <div className="flex items-center gap-3">
            {user.role === 'patient' && <button aria-label="Notifications" className="rounded-full p-2 hover:bg-gray-100"><Bell size={18} /></button>}
            <div className="relative">
              <button onClick={() => setMenu(m => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Account menu" className="rounded-full focus:ring-2 focus:ring-brand"><Avatar user={user} size={36} /></button>
              {menu && <div role="menu" className="absolute right-0 mt-2 w-40 rounded-lg border bg-white py-1 text-sm shadow-lg">
                <button role="menuitem" className="block w-full px-3 py-2 text-left hover:bg-gray-50">Profile</button>
                <button role="menuitem" onClick={() => { logout(); router.replace('/login'); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-gray-50"><LogOut size={14} />Log out</button></div>}
            </div>
          </div>
        </header>
        <main className="space-y-6 p-4 sm:p-6">{children}</main>
      </div>
    </div>);
}

export function StatCard({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">{label}</p><p className="mt-1 text-3xl font-bold text-navy">{value}</p></div>;
}
export function ListCard({ title, items, empty }: { title: string; items: [string, string][]; empty: string }) {
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="mb-3 font-semibold">{title}</h2>
      {items.length === 0 ? <p className="text-sm text-gray-400">{empty}</p> :
        <ul className="divide-y">{items.map(([a, b]) => <li key={a + b} className="flex justify-between py-3 text-sm"><span className="font-medium">{a}</span><span className="text-gray-500">{b}</span></li>)}</ul>}
    </section>);
}
