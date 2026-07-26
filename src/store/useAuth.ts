import { create } from 'zustand';
import { me, login as apiLogin, logout as apiLogout, getPw } from '@/services/guidesApi';

type Status = 'checking' | 'in' | 'out';

interface AuthState {
  status: Status;
  check: () => Promise<void>;
  login: (pw: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  status: 'checking',
  check: async () => {
    if (!getPw()) {
      set({ status: 'out' });
      return;
    }
    try {
      await me();
      set({ status: 'in' });
    } catch {
      set({ status: 'out' });
    }
  },
  login: async (pw) => {
    const ok = await apiLogin(pw);
    set({ status: ok ? 'in' : 'out' });
    return ok;
  },
  logout: () => {
    apiLogout();
    set({ status: 'out' });
  },
}));
