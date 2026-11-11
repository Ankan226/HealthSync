'use client';
import { useState, forwardRef } from 'react';
import { Eye, EyeOff, Check } from 'lucide-react';
import type { ReactNode, InputHTMLAttributes } from 'react';

export const inputCls = 'h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30';
export const primaryBtn = 'h-11 w-full rounded-lg bg-brand text-sm font-semibold text-white hover:bg-blue-700 focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
export const outlineBtn = 'h-11 w-full rounded-lg border border-gray-200 bg-white text-sm font-semibold hover:bg-gray-50 focus:ring-2 focus:ring-brand';

/** Centered card with HealthSync brand header */
export function AuthCard({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-navy">HealthSync</h1>
          <p className="text-sm text-gray-500">Your care, connected.</p>
        </header>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">{children}</div>
      </div>
    </main>);
}

export function Field({ label, error, helper, counter, children }: { label: string; error?: string; helper?: string; counter?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between"><span className="text-sm font-semibold">{label}</span>{counter && <span className="text-xs text-gray-400">{counter}</span>}</div>
      {children}
      {helper && !error && <p className="mt-1 text-xs text-gray-500">{helper}</p>}
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>);
}

export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>((props, ref) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input ref={ref} {...props} type={show ? 'text' : 'password'} className={`${inputCls} pr-20`} />
      <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 hover:text-gray-800 focus:ring-2 focus:ring-brand">
        {show ? <EyeOff size={14} /> : <Eye size={14} />}{show ? 'Hide' : 'Show'}
      </button>
    </div>);
});
PasswordInput.displayName = 'PasswordInput';

export function RoleToggle({ value, onChange }: { value: 'patient' | 'doctor'; onChange: (v: 'patient' | 'doctor') => void }) {
  return (
    <div className="flex items-center gap-3"><span className="text-sm font-semibold">I am a:</span>
      <div role="radiogroup" aria-label="Account type" className="flex rounded-lg bg-gray-100 p-1">
        {(['patient', 'doctor'] as const).map(r => (
          <button key={r} type="button" role="radio" aria-checked={value === r} onClick={() => onChange(r)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize focus:ring-2 focus:ring-brand ${value === r ? 'bg-white shadow-sm text-brand' : 'text-gray-500'}`}>{r}</button>))}
      </div></div>);
}

const badge = { pending: 'bg-yellow-100 text-yellow-800', rejected: 'bg-red-100 text-red-700', approved: 'bg-green-100 text-green-700' };
export function StatusBadge({ status, label }: { status: keyof typeof badge; label?: string }) {
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${badge[status]}`}>{label ?? status[0].toUpperCase() + status.slice(1)}</span>;
}

/** current: 0-2 index of the active step */
export function Stepper({ current }: { current: number }) {
  const steps = ['Submitted', 'Under review', 'Approved'];
  return (
    <ol className="flex items-center justify-between" aria-label="Application progress">
      {steps.map((s, i) => (
        <li key={s} aria-current={i === current ? 'step' : undefined} className="flex flex-1 flex-col items-center gap-1 text-xs">
          <span className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold ${i < current ? 'border-brand bg-brand text-white' : i === current ? 'border-brand text-brand' : 'border-gray-300 text-gray-400'}`}>
            {i < current ? <Check size={14} /> : i + 1}</span>
          <span className={i <= current ? 'font-semibold' : 'text-gray-400'}>{s}</span>
        </li>))}
    </ol>);
}

export function DetailsCard({ title, rows, children }: { title: string; rows: [string, ReactNode][]; children?: ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 p-4 text-left">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <dl className="space-y-2 text-sm">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4"><dt className="text-gray-500">{k}</dt><dd className="font-medium">{v}</dd></div>)}</dl>
      {children && <div className="mt-3">{children}</div>}
    </section>);
}
