import { z } from 'zod';
export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
const file = z.object({ name: z.string(), dataUrl: z.string() }).nullable();
export const registerSchema = z.object({
  role: z.enum(['patient', 'doctor']),
  name: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm: z.string(),
  dob: z.string().optional(),
  specialty: z.string().optional(), license: z.string().optional(),
  years: z.string().optional(), fee: z.string().optional(),
  bio: z.string().max(300, 'Max 300 characters').optional(),
  licenseFile: file, photo: file,
  terms: z.boolean().refine(v => v, 'You must accept the Terms and Privacy Policy'),
}).superRefine((d, ctx) => {
  const bad = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
  if (d.password !== d.confirm) bad('confirm', 'Passwords do not match');
  if (d.role === 'patient' && !d.dob) bad('dob', 'Enter your date of birth');
  if (d.role === 'doctor') {
    if (!d.specialty) bad('specialty', 'Select a specialty');
    if (!d.license) bad('license', 'Enter your license number');
    if (!d.years || isNaN(+d.years)) bad('years', 'Enter years of experience');
    if (!d.fee || isNaN(+d.fee)) bad('fee', 'Enter a consultation fee');
    if (!d.licenseFile) bad('licenseFile', 'Upload your license photo');
  }
});
export type RegisterValues = z.infer<typeof registerSchema>;
