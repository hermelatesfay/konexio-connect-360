import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResponsePayload, AuthUser, LoginPayload, RegisterPayload } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function authRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (typeof data?.detail === 'string' && data.detail) || 'Authentication request failed';
    throw new Error(message);
  }

  return data as T;
}

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  fetchMe: () => Promise<void>;
  logout: () => void;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      async login(payload) {
        set({ loading: true, error: null });

        try {
          const response = await authRequest<AuthResponsePayload>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(payload),
          });

          set({
            token: response.access_token,
            user: response.user,
            isAuthenticated: true,
            loading: false,
            error: null,
          });
          return response.user;
        } catch (error) {
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Login failed',
          });
          throw error;
        }
      },

      async register(payload) {
        set({ loading: true, error: null });

        try {
          const response = await authRequest<AuthResponsePayload>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(payload),
          });

          set({
            token: response.access_token,
            user: response.user,
            isAuthenticated: true,
            loading: false,
            error: null,
          });
          return response.user;
        } catch (error) {
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Registration failed',
          });
          throw error;
        }
      },

      async fetchMe() {
        const token = get().token;
        if (!token) return;

        set({ loading: true, error: null });

        try {
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error('Session expired');
          }

          const user = (await response.json()) as AuthUser;
          set({ user, isAuthenticated: true, loading: false, error: null });
        } catch (error) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            loading: false,
            error: error instanceof Error ? error.message : 'Unable to load session',
          });
        }
      },

      logout() {
        set({ user: null, token: null, isAuthenticated: false, error: null });
      },

      clearError() {
        set({ error: null });
      },
    }),
    {
      name: 'konexio-auth-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
