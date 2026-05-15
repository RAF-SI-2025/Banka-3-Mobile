// Auth endpoint wrappers. Thin typed calls over the shared axios
// instance; the session lifecycle (token persistence, store updates,
// client-only gate) lives in auth/session.ts.
import { api } from "./client";
import type {
  v1LoginResponse,
  v1MeResponse,
} from "./generated";

export async function login(
  email: string,
  password: string,
): Promise<v1LoginResponse> {
  // longLivedSession: mobile has no cookie jar and no session interval
  // (spec p.84) — the gateway returns the refresh token in the body and
  // mints a long-lived one.
  const { data } = await api.post<v1LoginResponse>("/v1/auth/login", {
    email,
    password,
    longLivedSession: true,
  });
  return data;
}

export async function logout(refreshToken: string): Promise<void> {
  await api.post("/v1/auth/logout", { refreshToken });
}

export async function getMe(): Promise<v1MeResponse> {
  const { data } = await api.get<v1MeResponse>("/v1/auth/me");
  return data;
}
