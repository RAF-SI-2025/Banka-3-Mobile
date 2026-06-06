// Exchange-rate list (kursna lista, todoSpec mobile section). Read-only.
// Reuses the existing gateway endpoint GET /v1/exchange/rates
// (ListRates) — the same one the web app's menjačnica page reads.
import { api } from "./client";
import type { v1Rate, v1ListRatesResponse } from "./generated";

export async function listRates(): Promise<v1Rate[]> {
  const { data } = await api.get<v1ListRatesResponse>("/v1/exchange/rates");
  return data.rates ?? [];
}
