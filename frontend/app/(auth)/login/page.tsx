'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { loginSchema } from '@/lib/validators';
import { useAuth } from '@/store/auth-store';
import { homeFor } from '@/lib/mock-auth';
import { AuthCard, Field, PasswordInput, inputCls, primaryBtn } from '@/components/auth/parts';
import { z } from 'zod';

type V = z.infer<typeof loginSchema>;
export default function LoginPage() {
  const router = useRouter(); const login = useAuth(s => s.login); const [err, setErr] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<V>({ resolver: zodResolver(loginSchema) });
  const onSubmit = async (v: V) => {
    setErr(''); await new Promise(r => setTimeout(r, 400)); // simulate network
    const u = login(v.email, v.password);
    if (!u) return setErr('Incorrect email or password. Demo password: password123');
    router.replace(homeFor(u));
  };
  return (
    <AuthCard>
      <div role="tablist" className="mb-6 grid grid-cols-2 rounded-lg bg-gray-100 p-1 text-sm font-medium">
        <span role="tab" aria-selected className="rounded-md bg-white py-2 text-center shadow-sm">Login</span>
        <Link role="tab" aria-selected={false} href="/register" className="py-2 text-center text-gray-500">Register</Link>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Field label="Email" error={errors.email?.message}><input {...register('email')} type="email" autoComplete="email" placeholder="you@email.com" className={inputCls} aria-invalid={!!errors.email} /></Field>
        <Field label="Password" error={errors.password?.message}><PasswordInput {...register('password')} autoComplete="current-password" aria-invalid={!!errors.password} /></Field>
        <div className="text-right"><Link href="#" className="text-sm text-brand hover:underline">Forgot password?</Link></div>
        {err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        <button disabled={isSubmitting} className={primaryBtn}>{isSubmitting ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="mt-5 text-center text-sm text-gray-500">New here? <Link href="/register" className="font-semibold text-brand">Create an account</Link></p>
    </AuthCard>);
}
