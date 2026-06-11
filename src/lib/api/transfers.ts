// Prenos (internal transfer between the client's own accounts) — Celina 2
// client operation, spec p.84 "Dodatno" bonus surface. No new backend:
//   - POST /v1/transfers  CreateTransfer (verification-gated, spec p.11)
//
// Same endpoint the menjačnica screen uses, but here both accounts share
// a currency (a same-currency move). Cross-currency conversion is the
// menjačnica screen's job. Verification-gated: takes a VerificationProof.
import { api } from "./client";
import type {
  v1CreateTransferRequest,
  v1PaymentResult,
} from "./generated";
import { proofHeaders, type VerificationProof } from "./verification";

export async function createTransfer(
  req: v1CreateTransferRequest,
  proof: VerificationProof,
): Promise<v1PaymentResult> {
  const { data } = await api.post<v1PaymentResult>("/v1/transfers", req, {
    headers: proofHeaders(proof),
  });
  return data;
}
