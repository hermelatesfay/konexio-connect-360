import { signInWithPopup } from 'firebase/auth';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { firebaseAuth, googleAuthProvider } from '../lib/firebase';
import type {
  AuthResponsePayload,
  AuthUser,
  LoginPayload,
  LoginStepResult,
  RegisterPayload,
} from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const AUTH_STORAGE_KEY = 'konexio-auth-store';
const REMEMBER_PREF_KEY = 'konexio-auth-remember';

function readRememberPref(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const flag = window.localStorage.getItem(REMEMBER_PREF_KEY);
    if (flag === '0') return false;
    if (flag === '1') return true;
    if (window.sessionStorage.getItem(AUTH_STORAGE_KEY)) return false;
    return true;
  } catch {
    return true;
  }
}

function writeRememberPref(rememberMe: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(REMEMBER_PREF_KEY, rememberMe ? '1' : '0');
  } catch {
    // Storage optional
  }
}

const dualAuthStorage: StateStorage = {
  getItem(name) {
    if (typeof window === 'undefined') return null;
    try {
      const preferLocal = readRememberPref();
      if (preferLocal) {
        return window.localStorage.getItem(name) ?? window.sessionStorage.getItem(name);
      }
      return window.sessionStorage.getItem(name) ?? window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem(name, value) {
    if (typeof window === 'undefined') return;
    try {
      if (readRememberPref()) {
        window.localStorage.setItem(name, value);
        window.sessionStorage.removeItem(name);
      } else {
        window.sessionStorage.setItem(name, value);
        window.localStorage.removeItem(name);
      }
    } catch {
      // Storage optional
    }
  },
  removeItem(name) {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(name);
      window.sessionStorage.removeItem(name);
    } catch {
      // Storage optional
    }
  },
};

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

export type PendingMfaState = {
  mode: 'setup' | 'challenge';
  mfaToken: string;
  user: AuthUser;
  rememberMe: boolean;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  pendingMfa: PendingMfaState | null;
  loading: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<LoginStepResult>;
  loginWithGoogle: () => Promise<LoginStepResult>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  completeMfaAuth: (accessToken: string, user: AuthUser, rememberMe?: boolean) => void;
  refreshAuthSession: (accessToken: string, user: AuthUser) => void;
  clearPendingMfa: () => void;
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
      pendingMfa: null,
      loading: false,
      error: null,

      async login(payload) {
        set({ loading: true, error: null });
        const rememberMe = payload.remember_me ?? true;

        try {
          const response = await authRequest<AuthResponsePayload>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
              email: payload.email,
              password: payload.password,
              remember_me: rememberMe,
            }),
          });

          if (response.requires_2fa_setup && response.mfa_token) {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              pendingMfa: {
                mode: 'setup',
                mfaToken: response.mfa_token,
                user: response.user,
                rememberMe,
              },
              loading: false,
              error: null,
            });
            return { status: 'mfa_setup', user: response.user };
          }

          if (response.requires_2fa && response.mfa_token) {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              pendingMfa: {
                mode: 'challenge',
                mfaToken: response.mfa_token,
                user: response.user,
                rememberMe,
              },
              loading: false,
              error: null,
            });
            return { status: 'mfa_challenge', user: response.user };
          }

          if (!response.access_token) {
            throw new Error('Authentication token missing from server response.');
          }

          writeRememberPref(rememberMe);
          set({
            token: response.access_token,
            user: response.user,
            isAuthenticated: true,
            pendingMfa: null,
            loading: false,
            error: null,
          });
          return { status: 'authenticated', user: response.user };
        } catch (error) {
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Login failed',
          });
          throw error;
        }
      },

      async loginWithGoogle() {
        set({ loading: true, error: null });
        try {
          const credential = await signInWithPopup(firebaseAuth, googleAuthProvider);
          const idToken = await credential.user.getIdToken();
          const response = await authRequest<AuthResponsePayload>('/auth/firebase', {
            method: 'POST',
            body: JSON.stringify({ id_token: idToken }),
          });

          if (response.requires_2fa_setup && response.mfa_token) {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              pendingMfa: {
                mode: 'setup',
                mfaToken: response.mfa_token,
                user: response.user,
                rememberMe: true,
              },
              loading: false,
              error: null,
            });
            return { status: 'mfa_setup', user: response.user };
          }

          if (response.requires_2fa && response.mfa_token) {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              pendingMfa: {
                mode: 'challenge',
                mfaToken: response.mfa_token,
                user: response.user,
                rememberMe: true,
              },
              loading: false,
              error: null,
            });
            return { status: 'mfa_challenge', user: response.user };
          }

          if (!response.access_token) {
            throw new Error('Authentication token missing from server response.');
          }

          writeRememberPref(true);
          set({
            token: response.access_token,
            user: response.user,
            isAuthenticated: true,
            pendingMfa: null,
            loading: false,
            error: null,
          });
          return { status: 'authenticated', user: response.user };
        } catch (error) {
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Google sign-in failed',
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

          if (!response.access_token) {
            throw new Error('Registration completed but no session token was returned.');
          }

          writeRememberPref(true);
          set({
            token: response.access_token,
            user: response.user,
            isAuthenticated: true,
            pendingMfa: null,
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

      completeMfaAuth(accessToken, user, rememberMe = true) {
        writeRememberPref(rememberMe);
        set({
          token: accessToken,
          user,
          isAuthenticated: true,
          pendingMfa: null,
          loading: false,
          error: null,
        });
      },

      refreshAuthSession(accessToken, user) {
        set({
          token: accessToken,
          user,
          isAuthenticated: true,
          error: null,
        });
      },

      clearPendingMfa() {
        set({ pendingMfa: null, error: null });
      },

      async fetchMe() {
        const token = get().token;
        if (!token) return;

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
        } catch {
          dualAuthStorage.removeItem(AUTH_STORAGE_KEY);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            pendingMfa: null,
            loading: false,
            error: null,
          });
        }
      },

      logout() {
        dualAuthStorage.removeItem(AUTH_STORAGE_KEY);
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          pendingMfa: null,
          error: null,
        });
      },

      clearError() {
        set({ error: null });
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => dualAuthStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
