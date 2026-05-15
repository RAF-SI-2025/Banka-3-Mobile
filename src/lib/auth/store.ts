// In-memory auth state. Mirrors the web app's Zustand auth store so the
// non-React axios interceptor can read the access token via
// `useAuthStore.getState()` while React screens subscribe to it.
//
// `status` drives the Expo Router auth gate:
//   - "loading":          app just launched, silent-refresh in flight
//   - "authenticated":    access token present
//   - "unauthenticated":  no usable session (show /login)
import { create } from "zustand";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthIdentity {
  userId: string;
  permissions: string[];
  firstName: string;
  lastName: string;
}

interface AuthState {
  accessToken: string | null;
  identity: AuthIdentity | null;
  status: AuthStatus;
  /** Full session after a fresh login (token + identity from the body). */
  setSession: (accessToken: string, identity: AuthIdentity) => void;
  /** Token-only update after a silent refresh (identity unchanged). */
  setAccessToken: (accessToken: string) => void;
  /** Identity after a cold-start /auth/me (token already set by refresh). */
  setIdentity: (identity: AuthIdentity) => void;
  setStatus: (status: AuthStatus) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  identity: null,
  status: "loading",
  setSession: (accessToken, identity) =>
    set({ accessToken, identity, status: "authenticated" }),
  setAccessToken: (accessToken) =>
    set({ accessToken, status: "authenticated" }),
  setIdentity: (identity) => set({ identity }),
  setStatus: (status) => set({ status }),
  clear: () =>
    set({ accessToken: null, identity: null, status: "unauthenticated" }),
}));
