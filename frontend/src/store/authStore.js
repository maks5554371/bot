import { create } from 'zustand';
import api from '../services/api';

export const useAuthStore = create((set) => ({
  admin: null,
  isAuthenticated: false,
  loading: true,

  login: async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    localStorage.setItem('token', res.data.token);
    set({ admin: res.data.admin, isAuthenticated: true });
    return res.data;
  },

  checkAuth: async () => {
    try {
      const res = await api.get('/auth/me');
      set({ admin: res.data, isAuthenticated: true, loading: false });
    } catch {
      set({ admin: null, isAuthenticated: false, loading: false });
    }
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('token');
    set({ admin: null, isAuthenticated: false });
  },
}));
