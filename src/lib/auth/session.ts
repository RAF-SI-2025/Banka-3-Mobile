// Session lifecycle: login, cold-start restore, sign-out. Centralises
// the rules the raw endpoint wrappers don't know about:
//   - the app is client-only (spec p.84 "namenjena samo Klijentima")
//   - the refresh token is long-lived and lives in the secure store
//   - identity is restored on cold start via /auth/me (the refresh
//     response carries only tokens, not the user)
import { getMe, login, logout } from "../api/auth";
import {
  clearStoredRefreshToken,
  getStoredRefreshToken,
  setStoredRefreshToken,
} from "./storage";
import { useAuthStore, type AuthIdentity } from "./store";

/** Thrown when a non-client (employee) tries to use the mobile app. */
export class NotAClientError extends Error {
  constructor() {
    super("Mobilna aplikacija je namenjena samo klijentima.");
    this.name = "NotAClientError";
  }
}

export async function loginWithCredentials(
  email: string,
  password: string,
): Promise<void> {
  const res = await login(email, password);

  // The gateway's auth endpoints are HAND-WRITTEN (auth_handlers.go)
  // and serialize userKind as the lowercase wire string "client" /
  // "employee" — NOT the proto enum name ("USER_KIND_CLIENT") the
  // generated types describe, because /auth/* bypasses the swagger
  // surface (see CLAUDE.md). Comparing to the generated enum rejected
  // every real login. Normalize and accept either form.
  const kind = String(res.userKind ?? "").toLowerCase();
  if (kind !== "client" && kind !== "user_kind_client") {
    throw new NotAClientError();
  }
  if (!res.accessToken || !res.refreshToken) {
    throw new Error("Neispravan odgovor servera pri prijavi.");
  }

  await setStoredRefreshToken(res.refreshToken);
  const identity: AuthIdentity = {
    userId: res.userId ?? "",
    permissions: res.permissions ?? [],
    firstName: res.firstName ?? "",
    lastName: res.lastName ?? "",
    // The login response has no email field; fill it from /auth/me
    // below (spec p.84 Početna shows the client's email).
    email: "",
  };
  useAuthStore.getState().setSession(res.accessToken, identity);

  // Best-effort enrich with the canonical client record (adds email).
  // A failure here must not fail an otherwise-successful login — the
  // session is already valid; email just stays blank until next launch.
  try {
    const me = await getMe();
    if (me.client) {
      useAuthStore.getState().setIdentity({
        userId: me.client.id ?? identity.userId,
        permissions: me.client.permissions ?? identity.permissions,
        firstName: me.client.firstName ?? identity.firstName,
        lastName: me.client.lastName ?? identity.lastName,
        email: me.client.email ?? "",
      });
    }
  } catch {
    // Keep the login-response identity (email blank).
  }
}

/**
 * Cold-start restore. No stored token → unauthenticated. Otherwise hit
 * /auth/me: the axios 401 interceptor silently refreshes with the stored
 * token (rotating it) and sets the access token; we then fill identity.
 * Any failure leaves the store unauthenticated.
 */
export async function bootstrapSession(): Promise<void> {
  const store = useAuthStore.getState();
  store.setStatus("loading");

  const stored = await getStoredRefreshToken();
  if (!stored) {
    store.clear();
    return;
  }

  try {
    const me = await getMe();
    if (!me.client) {
      // An employee token somehow persisted — not allowed here.
      await clearStoredRefreshToken();
      useAuthStore.getState().clear();
      return;
    }
    useAuthStore.getState().setIdentity({
      userId: me.client.id ?? "",
      permissions: me.client.permissions ?? [],
      firstName: me.client.firstName ?? "",
      lastName: me.client.lastName ?? "",
      email: me.client.email ?? "",
    });
  } catch {
    // The interceptor already cleared the store on a refresh failure;
    // make the terminal state explicit for any other error too.
    if (useAuthStore.getState().status !== "authenticated") {
      useAuthStore.getState().clear();
    }
  }
}

export async function signOut(): Promise<void> {
  const stored = await getStoredRefreshToken();
  if (stored) {
    try {
      await logout(stored);
    } catch {
      // Best-effort server-side revocation; local clear is what matters.
    }
  }
  await clearStoredRefreshToken();
  useAuthStore.getState().clear();
}
