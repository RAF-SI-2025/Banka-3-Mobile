import { Loan, LoanApplication, LoanRequest } from '../../../shared/types/models';
export interface ILoanRepository {
  getLoans(): Promise<Loan[]>;
  getLoanById(id: number): Promise<Loan>;
  applyForLoan(application: LoanApplication): Promise<{ accepted: boolean }>;
  getLoanRequests(): Promise<LoanRequest[]>;
  approveLoanRequest(id: number): Promise<void>;
  rejectLoanRequest(id: number): Promise<void>;
}
