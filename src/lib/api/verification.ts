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

// GET /api/v1/verification/history — durable request history (spec
// p.84 "Stranica Verifikacija": every request submitted in the
// client's name, marked successful/unsuccessful). Survives the Redis
// code TTL (backed by the user service); status is the gateway's
// projected value (a stale-pending row reads back as "expired").
export async function getVerificationHistory(): Promise<
  VerificationHistoryItem[]
> {
  const { data } = await api.get<{ history?: VerificationHistoryItem[] }>(
    "/v1/verification/history",
  );
  return data.history ?? [];
}

// --- Inline-proof flow (spec p.11) -------------------------------------
// Used by the menjačnica (currency-exchange) screen, the one mutating
// action in the mobile app's todoSpec scope. The web app drives the
// identical round-trip via its verification dialog: request a 6-digit
// code, show it to the user, then attach it to the gated mutation as
// X-Verification-* headers. For inline-delivery actions (transfer) the
// gateway returns the code in the request response in dev mode, so the
// phone can display it directly (same fake-QR substitute the web app
// uses until the verification is consumed).

export type VerificationKind =
  | "payment"
  | "transfer"
  | "limit_change"
  | "card_issue";

export interface VerificationProof {
  id: string;
  code: string;
}

export interface IssuedVerification {
  verificationId: string;
  /** Present for inline-delivery actions (transfer/payment/limit). */
  code: string;
  expiresAt: string;
  delivery: "inline" | "email";
}

export async function requestVerification(
  actionKind: VerificationKind,
): Promise<IssuedVerification> {
  const { data } = await api.post<IssuedVerification>(
    "/v1/verification/request",
    { actionKind },
  );
  return data;
}

// proofHeaders maps a verification proof to the gateway middleware's
// expected headers. Empty object when no proof so callers can spread
// unconditionally.
export function proofHeaders(
  proof?: VerificationProof,
): Record<string, string> {
  if (!proof) return {};
  return {
    "X-Verification-Id": proof.id,
    "X-Verification-Code": proof.code,
  };
}
