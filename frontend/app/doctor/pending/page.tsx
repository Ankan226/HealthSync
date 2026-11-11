'use client';
import { useRouter } from 'next/navigation';
import { Clock } from 'lucide-react';
import { Guard } from '@/components/dashboard/shell';
import { useAuth } from '@/store/auth-store';
import { homeFor } from '@/lib/mock-auth';
import { AuthCard, StatusBadge, Stepper, DetailsCard, primaryBtn, outlineBtn } from '@/components/auth/parts';
import { FileThumb } from '@/components/ui/file-upload';
import { useEffect } from 'react';

export default function Pending() {
  return <Guard role="doctor">{u => <Inner />}</Guard>;
}
function Inner() {
  const { currentUser: u, logout } = useAuth(); const router = useRouter();
  useEffect(() => { if (u && u.status !== 'pending') router.replace(homeFor(u)); }, [u, router]);
  if (!u) return null;
  return (
    <AuthCard>
      <div className="space-y-5 text-center">
        <Clock className="mx-auto text-yellow-500" size={40} /><StatusBadge status="pending" />
        <h2 className="text-xl font-bold text-navy">Your application is under review</h2>
        <p className="text-sm text-gray-500">An admin is verifying your license. You&apos;ll be notified once you&apos;re approved.</p>
        <Stepper current={1} />
        <DetailsCard title="Application details" rows={[['Name', u.name], ['Specialty', u.specialty ?? '-'], ['License number', u.license ?? '-']]}>
          <FileThumb url={u.licenseFileDataUrl} name={u.licenseFileName} /></DetailsCard>
        <button onClick={() => router.push('/register')} className={primaryBtn}>Edit details</button>
        <button onClick={() => { logout(); router.replace('/login'); }} className={outlineBtn}>Log out</button>
      </div>
    </AuthCard>);
}
