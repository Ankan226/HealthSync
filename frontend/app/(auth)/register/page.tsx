'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerSchema, type RegisterValues } from '@/lib/validators';
import { useAuth } from '@/store/auth-store';
import { homeFor } from '@/lib/mock-auth';
import { AuthCard, Field, PasswordInput, RoleToggle, inputCls, primaryBtn } from '@/components/auth/parts';
import { FileUpload } from '@/components/ui/file-upload';
import { Info } from 'lucide-react';

const SPECIALTIES = ['Neurology', 'Cardiology', 'Dermatology', 'Pediatrics', 'General Physician'];
export default function RegisterPage() {
  const router = useRouter(); const registerUser = useAuth(s => s.register);
  const { register, control, handleSubmit, watch, formState: { errors, isSubmitting, isValid } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema), mode: 'onChange',
    defaultValues: { role: 'patient', licenseFile: null, photo: null, terms: false, bio: '' },
  });
  const role = watch('role'); const bio = watch('bio') ?? ''; const isDoc = role === 'doctor';

  const onSubmit = async (v: RegisterValues) => {
    await new Promise(r => setTimeout(r, 500)); // simulate network
    const u = registerUser({
      role: v.role, name: v.name, email: v.email, password: v.password, photoDataUrl: v.photo?.dataUrl,
      ...(isDoc ? { specialty: v.specialty, license: v.license, years: +v.years!, fee: +v.fee!, bio: v.bio,
        licenseFileDataUrl: v.licenseFile!.dataUrl, licenseFileName: v.licenseFile!.name, status: 'pending' as const } : { dob: v.dob }),
    });
    router.replace(homeFor(u));
  };

  return (
    <AuthCard wide={isDoc}>
      <div role="tablist" className="mb-6 grid grid-cols-2 rounded-lg bg-gray-100 p-1 text-sm font-medium">
        <Link role="tab" aria-selected={false} href="/login" className="py-2 text-center text-gray-500">Login</Link>
        <span role="tab" aria-selected className="rounded-md bg-white py-2 text-center shadow-sm">Register</span>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Controller control={control} name="role" render={({ field }) => <RoleToggle value={field.value} onChange={field.onChange} />} />
        {isDoc && <div className="flex gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-800"><Info size={16} className="mt-0.5 shrink-0" />Doctor accounts are reviewed by an admin before activation.</div>}
        <div className={`grid gap-4 ${isDoc ? 'sm:grid-cols-2' : ''}`}>
          <Field label="Full name" error={errors.name?.message}><input {...register('name')} className={inputCls} /></Field>
          <Field label="Email" error={errors.email?.message}><input {...register('email')} type="email" className={inputCls} /></Field>
          <Field label="Password" error={errors.password?.message}><PasswordInput {...register('password')} autoComplete="new-password" /></Field>
          <Field label="Confirm password" error={errors.confirm?.message}><PasswordInput {...register('confirm')} autoComplete="new-password" /></Field>
          {!isDoc && <Field label="Date of birth" error={errors.dob?.message} helper="MM/DD/YYYY"><input {...register('dob')} type="date" className={inputCls} /></Field>}
          {isDoc && <>
            <Field label="Specialty" error={errors.specialty?.message}>
              <select {...register('specialty')} defaultValue="" className={inputCls}><option value="" disabled>Select specialty</option>{SPECIALTIES.map(s => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Medical license number" error={errors.license?.message} helper="Demo license number, not a real medical credential."><input {...register('license')} className={inputCls} /></Field>
            <div className="sm:col-span-2">
              <Controller control={control} name="licenseFile" render={({ field }) => (
                <FileUpload label="Upload license photo" required maxSizeMB={5} value={field.value} onChange={field.onChange} error={errors.licenseFile?.message}
                  helperText="Upload a clear photo or scan of your medical license. Demo files only." />)} /></div>
            <Field label="Years of experience" error={errors.years?.message}><input {...register('years')} type="number" min={0} className={inputCls} /></Field>
            <Field label="Consultation fee" error={errors.fee?.message}>
              <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span><input {...register('fee')} type="number" min={0} className={`${inputCls} pl-7`} /></div></Field>
            <div className="sm:col-span-2"><Field label="Short bio" counter={`${bio.length}/300`} error={errors.bio?.message}>
              <textarea {...register('bio')} maxLength={300} rows={3} className={`${inputCls} h-auto py-2`} /></Field></div>
          </>}
        </div>
        <Controller control={control} name="photo" render={({ field }) => (
          <FileUpload label="Profile photo (optional)" accept={['image/jpeg', 'image/png']} maxSizeMB={2} value={field.value} onChange={field.onChange} helperText="JPG or PNG, max 2 MB." />)} />
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" {...register('terms')} className="mt-1 h-4 w-4 accent-brand" />
          <span>I agree to the <Link href="#" className="text-brand">Terms</Link> and <Link href="#" className="text-brand">Privacy Policy</Link></span></label>
        {errors.terms && <p role="alert" className="text-xs text-red-600">{errors.terms.message}</p>}
        <button disabled={!isValid || isSubmitting} className={primaryBtn}>{isSubmitting ? 'Please wait…' : isDoc ? 'Submit for approval' : 'Create account'}</button>
      </form>
      <p className="mt-5 text-center text-sm text-gray-500">Already have an account? <Link href="/login" className="font-semibold text-brand">Sign in</Link></p>
    </AuthCard>);
}
