// Exchange-rate list (kursna lista, todoSpec mobile section). Read-only.
// Reuses the existing gateway endpoint GET /v1/exchange/rates
// (ListRates) — the same one the web app's menjačnica page reads.
import { api } from "./client";
import type {
  v1Rate,
  v1ListRatesResponse,
  v1RateHistoryPoint,
  v1ListRateHistoryResponse,
  bankaExchangeV1Currency,
} from "./generated";

export async function listRates(): Promise<v1Rate[]> {
  const { data } = await api.get<v1ListRatesResponse>("/v1/exchange/rates");
  return data.rates ?? [];
}

// listRateHistory backs the "kursna lista u zadnjih mesec dana" view —
// recorded bid/ask points for one pair over the last `days` days
// (default 30), newest first. Reuses GET /v1/exchange/rates/history
// (ListRateHistory), the append-only sibling of ListRates.
export async function listRateHistory(
  from: bankaExchangeV1Currency,
  to: bankaExchangeV1Currency,
  days = 30,
): Promise<v1RateHistoryPoint[]> {
  const { data } = await api.get<v1ListRateHistoryResponse>(
    "/v1/exchange/rates/history",
    { params: { from, to, days } },
  );
  return data.points ?? [];
}
