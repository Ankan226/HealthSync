'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { seedUsers, type User, type Status } from '@/lib/mock-auth';

interface AuthState {
  users: User[]; currentUser: User | null; hydrated: boolean;
  register: (u: Omit<User, 'id'>) => User;
  login: (email: string, password: string) => User | null;
  logout: () => void;
  updateUser: (patch: Partial<User>) => void;
  updateDoctorStatus: (s: Status, reason?: string) => void;
}
// Replace one user in both the list and currentUser
const patchUser = (st: AuthState, id: string, patch: Partial<User>) => ({
  users: st.users.map(u => (u.id === id ? { ...u, ...patch } : u)),
  currentUser: st.currentUser?.id === id ? { ...st.currentUser, ...patch } : st.currentUser,
});
export const useAuth = create<AuthState>()(persist((set, get) => ({
  users: seedUsers, currentUser: null, hydrated: false,
  register: data => {
    const user = { ...data, id: crypto.randomUUID() };
    set(s => ({ users: [...s.users, user], currentUser: user }));
    return user;
  },
  login: (email, password) => {
    const u = get().users.find(x => x.email.toLowerCase() === email.toLowerCase() && x.password === password);
    if (u) set({ currentUser: u });
    return u ?? null;
  },
  logout: () => set({ currentUser: null }),
  updateUser: patch => { const c = get().currentUser; if (c) set(s => patchUser(s, c.id, patch)); },
  updateDoctorStatus: (status, rejectionReason) => {
    const c = get().currentUser;
    if (c?.role === 'doctor') set(s => patchUser(s, c.id, { status, rejectionReason: rejectionReason ?? c.rejectionReason }));
  },
}), { name: 'healthsync-auth', onRehydrateStorage: () => () => useAuth.setState({ hydrated: true }) }));
