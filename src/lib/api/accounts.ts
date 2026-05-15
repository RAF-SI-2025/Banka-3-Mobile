// Account + transaction reads (view-only — the chosen "Dodatno" scope,
// spec p.84). No new backend: reuses the existing gateway endpoints.
// bank.ListAccounts already filters internal kinds, so a client only
// ever sees their own real accounts.
import { api } from "./client";
import type {
  v1Account,
  v1ListAccountsResponse,
  v1ListTransactionsResponse,
} from "./generated";

export async function listAccounts(
  ownerClientId: string,
): Promise<v1Account[]> {
  const { data } = await api.get<v1ListAccountsResponse>("/v1/accounts", {
    params: { ownerClientId },
  });
  return data.accounts ?? [];
}

export async function getAccount(id: string): Promise<v1Account> {
  const { data } = await api.get<v1Account>(`/v1/accounts/${id}`);
  return data;
}

export async function listTransactions(
  accountId: string,
): Promise<v1ListTransactionsResponse> {
  const { data } = await api.get<v1ListTransactionsResponse>(
    "/v1/transactions",
    { params: { accountId } },
  );
  return data;
}
