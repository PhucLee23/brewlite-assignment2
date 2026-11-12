import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface SessionUser {
  id: number;
  email: string;
  fullName: string;
  role: 'CUSTOMER' | 'STAFF';
  loyaltyPoints: number;
}

interface AuthState {
  token: string | null;
  user: SessionUser | null;
  setSession: (token: string, user: SessionUser) => void;
  updateUser: (patch: Partial<SessionUser>) => void;
  logout: () => void;
}

// Phiên đăng nhập lưu ở localStorage (ADR-005), còn sau khi tải lại trang
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      updateUser: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'brewlite-auth', storage: createJSONStorage(() => localStorage) },
  ),
);

/** Đọc thời điểm hết hạn trong payload JWT (giây → mili giây); token hỏng coi như đã hết hạn */
export function tokenExpiresAt(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export function isTokenExpired(token: string, now = Date.now()): boolean {
  return tokenExpiresAt(token) <= now;
}
