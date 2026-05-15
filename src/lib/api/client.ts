// Hand-written axios transport. Mirrors the web app's client.ts (Bearer
// header, single-flight silent refresh on 401, Idempotency-Key on
// mutations) with one deliberate divergence: the refresh token is NOT a
// cookie. RN has no cookie jar, so the long-lived refresh token is read
// from / written to the OS secure store and sent in the refresh request
// body. The backend already supports body-based refresh
// (v1RefreshRequest { refreshToken } -> v1RefreshResponse), so this
// needs no gateway change — only the mobile-flavoured long-lived token
// lifetime (P0 backend tweak).
import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import * as Crypto from "expo-crypto";

import type { v1RefreshResponse } from "./generated";
import { useAuthStore } from "../auth/store";
import {
  clearStoredRefreshToken,
  getStoredRefreshToken,
  setStoredRefreshToken,
} from "../auth/storage";

// EXPO_PUBLIC_* is inlined into the bundle at build time. Falls back to
// localhost for web/dev; on a device this must be the dev machine LAN
// IP (see .env.example).
export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api";

let refreshInFlight: Promise<string | null> | null = null;

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;

  // Idempotency-Key on every mutating request (project API convention).
  // The gateway hashes it into a per-key result cache so retries — which
  // the 401-refresh path below performs — are safe. Callers may pre-set
  // their own key and we won't overwrite it.
  const method = (cfg.method ?? "get").toLowerCase();
  if (method !== "get" && method !== "head" && method !== "options") {
    if (!cfg.headers["Idempotency-Key"]) {
      cfg.headers["Idempotency-Key"] = Crypto.randomUUID();
    }
  }
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    if (!err.response || err.response.status !== 401) throw err;
    const original = err.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    if (!original || original._retry || isRefreshCall(original)) throw err;

    original._retry = true;
    const newToken = await refresh();
    if (!newToken) throw err;
    original.headers.Authorization = `Bearer ${newToken}`;
    return api.request(original);
  },
);

function isRefreshCall(cfg: InternalAxiosRequestConfig | undefined): boolean {
  return !!cfg?.url?.includes("/auth/refresh");
}

// Single-flight refresh: concurrent 401s share one network call. Reads
// the stored refresh token, posts it in the body (bare axios so this
// call skips the interceptor), persists the rotated token, and pushes
// the new access token into the in-memory store. Any failure clears the
// session — the router gate then redirects to /login.
async function refresh(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const stored = await getStoredRefreshToken();
      if (!stored) {
        await endSession();
        return null;
      }
      const { data } = await axios.post<v1RefreshResponse>(
        `${API_BASE}/v1/auth/refresh`,
        { refreshToken: stored },
        { headers: { "Content-Type": "application/json" } },
      );
      if (!data.accessToken) {
        await endSession();
        return null;
      }
      if (data.refreshToken) await setStoredRefreshToken(data.refreshToken);
      useAuthStore.getState().setAccessToken(data.accessToken);
      return data.accessToken;
    } catch {
      await endSession();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function endSession(): Promise<void> {
  await clearStoredRefreshToken();
  useAuthStore.getState().clear();
}
