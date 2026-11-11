'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Guard } from '@/components/dashboard/shell';
import { useAuth } from '@/store/auth-store';
import { homeFor } from '@/lib/mock-auth';
import { AuthCard, StatusBadge, DetailsCard, primaryBtn, outlineBtn } from '@/components/auth/parts';
import { FileThumb, FileUpload, type UploadedFile } from '@/components/ui/file-upload';

export default function Rejected() { return <Guard role="doctor">{() => <Inner />}</Guard>; }
function Inner() {
  const { currentUser: u, logout, updateUser } = useAuth(); const router = useRouter();
  const [file, setFile] = useState<UploadedFile | null>(null); const [err, setErr] = useState('');
  useEffect(() => { if (u && u.status !== 'rejected') router.replace(homeFor(u)); }, [u, router]);
  if (!u) return null;
  const reapply = () => {
    if (!file) return setErr('Upload a corrected license photo to reapply');
    // Resubmit: store the new file and send the application back to review
    updateUser({ licenseFileDataUrl: file.dataUrl, licenseFileName: file.name, status: 'pending' });
    router.replace('/doctor/pending');
  };
  return (
    <AuthCard>
      <div className="space-y-5 text-center">
        <AlertCircle className="mx-auto text-red-500" size={40} /><StatusBadge status="rejected" />
        <h2 className="text-xl font-bold text-navy">Your application wasn&apos;t approved</h2>
        <p className="text-sm text-gray-500">Review the reason below, update your details and submit your application again.</p>
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-left"><h3 className="text-sm font-semibold text-red-800">Reason for rejection</h3>
          <p className="mt-1 text-sm text-red-700">{u.rejectionReason ?? 'License number could not be verified.'}</p></section>
        <DetailsCard title="Application details" rows={[['Name', u.name], ['Specialty', u.specialty ?? '-'], ['License number', u.license ?? '-']]}>
          <FileThumb url={u.licenseFileDataUrl} name={u.licenseFileName} /></DetailsCard>
        <div className="text-left"><FileUpload label="Re-upload license photo" required value={file} onChange={f => { setFile(f); setErr(''); }} error={err} /></div>
        <button onClick={reapply} className={primaryBtn}>Update details and reapply</button>
        <button onClick={() => { logout(); router.replace('/login'); }} className={outlineBtn}>Log out</button>
      </div>
    </AuthCard>);
}
