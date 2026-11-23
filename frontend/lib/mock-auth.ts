export type Role = 'patient' | 'doctor';
export type Status = 'pending' | 'approved' | 'rejected';
export interface User {
  id: string; role: Role; name: string; email: string; password: string;
  dob?: string; photoDataUrl?: string;
  specialty?: string; license?: string; licenseFileDataUrl?: string; licenseFileName?: string;
  years?: number; fee?: number; bio?: string;
  status?: Status; rejectionReason?: string;
}
// Demo password for both seed users: password123
export const seedUsers: User[] = [
  { id: 'p1', role: 'patient', name: 'Alex Johnson', email: 'alex.johnson@email.com', password: 'password123', dob: '1992-04-18' },
  { id: 'd1', role: 'doctor', name: 'Rohan Mehta', email: 'rohan.mehta@email.com', password: 'password123',
    specialty: 'Neurology', license: 'DEMO-NEU-2026-001', years: 8, fee: 120, status: 'pending',
    rejectionReason: 'License number could not be verified.' },
];
export const homeFor = (u: User) =>
  u.role === 'patient' ? '/patient/dashboard'
  : u.status === 'approved' ? '/doctor/dashboard'
  : u.status === 'rejected' ? '/doctor/rejected' : '/doctor/pending';
