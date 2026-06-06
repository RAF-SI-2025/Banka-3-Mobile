// Menjačnica (currency exchange, todoSpec mobile section). No new
// backend. Two existing gateway endpoints, exactly as the web app's
// menjačnica page uses them:
//   - POST /v1/menjacnica/quote  QuoteExchange (rate + commission +
//                                resulting amount; non-mutating)
//   - POST /v1/transfers         CreateTransfer — the execute path. A
//                                cross-currency transfer between two of
//                                the client's OWN accounts IS the
//                                menjačnica conversion (there is no
//                                separate "execute exchange" route; the
//                                bank routes the FX via RSD internally).
//
// CreateTransfer is verification-gated (spec p.11): the caller must
// attach a VerificationProof (X-Verification-* headers). The screen
// runs the spec-Option-1 round-trip: request a code, show it, confirm,
// then call executeExchange with the proof.
import { api } from "./client";
import type {
  v1QuoteExchangeRequest,
  v1QuoteExchangeResponse,
  v1CreateTransferRequest,
  v1PaymentResult,
} from "./generated";
import { proofHeaders, type VerificationProof } from "./verification";

export async function quoteExchange(
  req: v1QuoteExchangeRequest,
): Promise<v1QuoteExchangeResponse> {
  const { data } = await api.post<v1QuoteExchangeResponse>(
    "/v1/menjacnica/quote",
    req,
  );
  return data;
}

export async function executeExchange(
  req: v1CreateTransferRequest,
  proof: VerificationProof,
): Promise<v1PaymentResult> {
  const { data } = await api.post<v1PaymentResult>("/v1/transfers", req, {
    headers: proofHeaders(proof),
  });
  return data;
}
