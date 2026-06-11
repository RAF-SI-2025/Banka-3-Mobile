// Plaćanje (payment to another account) — Celina 2 client operation,
// the spec p.84 "Dodatno" bonus surface. No new backend: reuses the
// exact gateway endpoint the web app drives.
//   - POST /v1/payments  CreatePayment (verification-gated, spec p.11)
//
// CreatePayment requires a VerificationProof (X-Verification-* headers).
// The screen runs the spec-Option-1 round-trip: request a code, show it,
// confirm, then call createPayment with the proof.
import { api } from "./client";
import type {
  v1CreatePaymentRequest,
  v1PaymentResult,
} from "./generated";
import { proofHeaders, type VerificationProof } from "./verification";

export async function createPayment(
  req: v1CreatePaymentRequest,
  proof: VerificationProof,
): Promise<v1PaymentResult> {
  const { data } = await api.post<v1PaymentResult>("/v1/payments", req, {
    headers: proofHeaders(proof),
  });
  return data;
}
