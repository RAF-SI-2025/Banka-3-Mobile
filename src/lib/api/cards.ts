// Card reads + blocking (todoSpec mobile section). No new backend:
// reuses the existing gateway endpoints the web app already drives.
//   - GET  /v1/cards          ListCards (numbers come back masked for
//                             clients)
//   - POST /v1/cards/{id}/status  SetCardStatus
//
// Blocking only: the mobile client may BLOCK a card but never unblock
// it — unblocking happens in branch / by phone (spec). The screen never
// offers the reverse action.
import { api } from "./client";
import type {
  v1Card,
  v1ListCardsResponse,
  v1ListTransactionsResponse,
  BankServiceSetCardStatusBody,
} from "./generated";
import { v1CardStatus } from "./generated";

export async function listCards(accountId?: string): Promise<v1Card[]> {
  const { data } = await api.get<v1ListCardsResponse>("/v1/cards", {
    params: accountId ? { accountId } : {},
  });
  return data.cards ?? [];
}

export async function setCardStatus(
  id: string,
  status: v1CardStatus,
): Promise<v1Card> {
  const body: BankServiceSetCardStatusBody = { status };
  const { data } = await api.post<v1Card>(`/v1/cards/${id}/status`, body);
  return data;
}

// blockCard is the only state transition the mobile app performs.
export async function blockCard(id: string): Promise<v1Card> {
  return setCardStatus(id, v1CardStatus.CARD_STATUS_BLOCKED);
}

// Per-card transaction history. The transactions endpoint filters by
// account (there is no card_id filter — a card's ledger IS its
// account's ledger), so we page over the card's account. Paginated for
// readability on a phone.
export async function listCardTransactions(
  accountId: string,
  page: number,
  pageSize: number,
): Promise<v1ListTransactionsResponse> {
  const { data } = await api.get<v1ListTransactionsResponse>(
    "/v1/transactions",
    { params: { accountId, page, pageSize } },
  );
  return data;
}
