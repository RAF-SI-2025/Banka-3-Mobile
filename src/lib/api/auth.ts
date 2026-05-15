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
  const { data } = await api.post<v1LoginResponse>("/v1/auth/login", {
    email,
    password,
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
