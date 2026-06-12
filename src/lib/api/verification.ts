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
  /**
   * Quick-approve flag (todoSpec S12). True once this device has tapped
   * "Odobri": the gated web action can then proceed without the code.
   * Optional so an older gateway that doesn't send it reads as false.
   */
  approved?: boolean;
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

// POST /api/v1/verification/{id}/approve — quick-approve (todoSpec S12).
// Instead of relaying the 6-digit code, the client taps "Odobri" and the
// phone marks its own pending record approved. The next gated web action
// then passes verification with X-Verification-Id only. The gateway
// scopes approval to the caller's own records, so no id but the user's
// own can be approved.
export async function approveVerification(id: string): Promise<void> {
  await api.post(`/v1/verification/${id}/approve`);
}

// POST /api/v1/verification/{id}/reject — the "Ignore" action (spec p.84
// mode 2: the phone offers Confirm AND Ignore). Retires the pending
// record so the gated web action fails verification, and marks the
// request unsuccessful in the durable history. Scoped to the caller's
// own records gateway-side, same as approve.
export async function rejectVerification(id: string): Promise<void> {
  await api.post(`/v1/verification/${id}/reject`);
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

// --- Self-approve proof flow (spec p.11) -------------------------------
// Used by the mobile app's own money-out screens (Plaćanje / Prenos /
// Menjačnica). Because the phone IS the second factor, an action started
// on the phone needs no typed code: the screen requests verification,
// immediately approves it (approveVerification), and submits the gated
// mutation with X-Verification-Id only (proofHeaders sends the id alone
// when the proof has no code). The gateway never returns the 6-digit
// code in the request response — it lives only on the Verifikacija
// screen (getPendingVerifications), the companion 2FA flow for the
// WEB app.

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
  expiresAt: string;
  /** "mobile" (code lives on the phone) or "email" (card issuance). */
  delivery: "mobile" | "email";
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
// unconditionally. When the proof carries no code (this device
// self-approved its own request — see approveVerification) only
// X-Verification-Id is sent: the gateway validates by id against the
// approved record (the quick-approve path).
export function proofHeaders(
  proof?: VerificationProof,
): Record<string, string> {
  if (!proof) return {};
  if (!proof.code) {
    return { "X-Verification-Id": proof.id };
  }
  return {
    "X-Verification-Id": proof.id,
    "X-Verification-Code": proof.code,
  };
}
