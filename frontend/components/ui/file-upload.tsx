'use client';
import { useRef, useState } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';

export interface UploadedFile { name: string; dataUrl: string; size?: number }
const ALLOWED = ['image/jpeg', 'image/png', 'application/pdf'];

/** Clickable thumbnail (image or PDF icon) that opens a larger preview dialog. */
export function FileThumb({ url, name }: { url?: string; name?: string }) {
  const [open, setOpen] = useState(false);
  if (!url) return <p className="text-sm text-gray-400">No file uploaded</p>;
  const isPdf = url.startsWith('data:application/pdf');
  return (<>
    <button type="button" onClick={() => setOpen(true)} aria-label={`Preview ${name ?? 'file'}`}
      className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border bg-gray-50 focus:ring-2 focus:ring-brand">
      {isPdf ? <FileText className="text-red-500" /> : /* eslint-disable-next-line @next/next/no-img-element */ <img src={url} alt={name ?? ''} className="h-full w-full object-cover" />}
    </button>
    {open && (
      <div role="dialog" aria-modal="true" aria-label="File preview" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
        <div className="relative max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-4" onClick={e => e.stopPropagation()}>
          <button onClick={() => setOpen(false)} aria-label="Close preview" className="absolute right-3 top-3 rounded p-1 hover:bg-gray-100"><X size={18} /></button>
          <p className="mb-3 pr-8 text-sm font-semibold">{name}</p>
          {isPdf ? <iframe src={url} title={name} className="h-[70vh] w-full" /> : /* eslint-disable-next-line @next/next/no-img-element */ <img src={url} alt={name ?? ''} className="w-full rounded-lg" />}
        </div>
      </div>)}
  </>);
}

interface Props {
  label: string; accept?: string[]; maxSizeMB?: number; required?: boolean; helperText?: string;
  value: UploadedFile | null; onChange: (f: UploadedFile | null) => void; error?: string;
}
export function FileUpload({ label, accept = ALLOWED, maxSizeMB = 5, required, helperText, value, onChange, error }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [localErr, setLocalErr] = useState('');
  const id = label.replace(/\s+/g, '-').toLowerCase();
  const shownErr = localErr || error;
  const typeMsg = accept.includes('application/pdf') ? 'Only JPG, PNG or PDF allowed' : 'Only JPG or PNG allowed';

  // Validate, then convert to a base64 data URL so it persists in the Zustand store
  const handle = (f?: File) => {
    if (!f) return;
    if (!accept.includes(f.type)) return setLocalErr(typeMsg);
    if (f.size > maxSizeMB * 1024 * 1024) return setLocalErr(`File must be under ${maxSizeMB} MB`);
    setLocalErr('');
    const r = new FileReader();
    r.onload = () => onChange({ name: f.name, size: f.size, dataUrl: r.result as string });
    r.onerror = () => setLocalErr('Could not read the file. Try again.');
    r.readAsDataURL(f);
  };
  const desc = [helperText && `${id}-help`, shownErr && `${id}-err`].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">{label}{required && <span className="text-red-500"> *</span>}</label>
      <input ref={ref} id={id} type="file" className="hidden" accept={accept.join(',')} aria-describedby={desc}
        onChange={e => { handle(e.target.files?.[0]); e.target.value = ''; }} />
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
          <FileThumb url={value.dataUrl} name={value.name} />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{value.name}</p>
            {value.size != null && <p className="text-xs text-gray-500">{(value.size / 1024).toFixed(0)} KB</p>}</div>
          <button type="button" onClick={() => ref.current?.click()} className="h-9 rounded-lg border px-3 text-sm hover:bg-gray-50 focus:ring-2 focus:ring-brand">Replace</button>
          <button type="button" onClick={() => { onChange(null); setLocalErr(''); }} aria-label="Remove file" className="rounded p-2 hover:bg-gray-100"><X size={16} /></button>
        </div>
      ) : (
        <div role="button" tabIndex={0} aria-describedby={desc}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ref.current?.click(); } }}
          onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files?.[0]); }}
          className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed bg-gray-50 px-4 py-6 text-center outline-none focus:ring-2 focus:ring-brand ${drag ? 'border-brand bg-blue-50' : 'border-gray-300'} ${shownErr ? 'border-red-400' : ''}`}>
          <UploadCloud className="text-gray-400" />
          <p className="text-sm text-gray-600">Drag &amp; drop your file here or</p>
          <button type="button" tabIndex={-1} onClick={() => ref.current?.click()} className="h-9 rounded-lg border bg-white px-4 text-sm font-medium hover:bg-gray-50">Browse file</button>
        </div>)}
      {helperText && <p id={`${id}-help`} className="mt-1 text-xs text-gray-500">{helperText}</p>}
      {shownErr && <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-red-600">{shownErr}</p>}
    </div>);
}
