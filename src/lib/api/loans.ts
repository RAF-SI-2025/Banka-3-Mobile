// Loan reads (todoSpec mobile section). Read-only: the client views
// their loans plus the upcoming installment amount + due date. Reuses
// the existing gateway endpoints:
//   - GET /v1/loans       ListLoans (filtered to the caller's loans by
//                         the gateway's client scoping)
//   - GET /v1/loans/{id}  GetLoan -> loan + full installment schedule
import { api } from "./client";
import type {
  v1Loan,
  v1ListLoansResponse,
  v1LoanWithInstallments,
} from "./generated";

export async function listLoans(clientId?: string): Promise<v1Loan[]> {
  const { data } = await api.get<v1ListLoansResponse>("/v1/loans", {
    params: clientId ? { clientId } : {},
  });
  return data.loans ?? [];
}

export async function getLoan(id: string): Promise<v1LoanWithInstallments> {
  const { data } = await api.get<v1LoanWithInstallments>(`/v1/loans/${id}`);
  return data;
}
