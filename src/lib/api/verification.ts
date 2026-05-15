// Verification client — the mandatory core (spec p.84 "Aktivnost" +
// "Verifikacija", gating spec p.11). Hand-typed because verification
// lives in gateway handlers OUTSIDE the proto/grpc-gateway surface, so
// it never appears in banka.swagger.json (same situation as the web
// app's verification.ts).
//
// GET /api/v1/verification/pending is the additive P0 backend endpoint
// (NOT yet implemented). Spec Option 1: the phone shows the code, the
// user types it on the web app. Until the endpoint lands this 404s and
// the screen renders the empty state.
import { api } from "./client";

export interface PendingVerification {
  id: string;
  /** Human-readable Serbian description of the action being verified. */
  action: string;
  /** 6-digit code the client types back on the web app (spec Option 1). */
  code: string;
  expiresAt: string;
  attemptsRemaining: number;
}

export type VerificationOutcome =
  | "pending"
  | "success"
  | "failed"
  | "expired";

export interface VerificationHistoryItem {
  id: string;
  action: string;
  status: VerificationOutcome;
  createdAt: string;
}

export async function getPendingVerifications(): Promise<
  PendingVerification[]
> {
  const { data } = await api.get<{ pending?: PendingVerification[] }>(
    "/v1/verification/pending",
  );
  return data.pending ?? [];
}
