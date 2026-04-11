import { NetworkClient } from '../../../core/network/NetworkClient';
import { Loan, LoanApplication, LoanRequest } from '../../../shared/types/models';
import { ILoanRepository } from '../domain/ILoanRepository';

interface LoanApiResponse {
  id?: number | string;
  loanId?: number | string;
  loan_id?: number | string;
  loanNumber?: string;
  loan_number?: string;
  number?: string;
  name?: string;
  loanName?: string;
  loan_name?: string;
  loanType?: string;
  loan_type?: string;
  amount?: number | string;
  loanAmount?: number | string;
  loan_amount?: number | string;
  principal?: number | string;
  currency?: string;
  period?: number | string;
  periodMonths?: number | string;
  repaymentPeriod?: number | string;
  repayment_period?: number | string;
  nominalRate?: number | string;
  nominal_rate?: number | string;
  effectiveRate?: number | string;
  effective_rate?: number | string;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;
  agreementDate?: string;
  agreement_date?: string;
  maturityDate?: string;
  maturity_date?: string;
  installment?: number | string;
  monthlyInstallment?: number | string;
  nextInstallmentAmount?: number | string;
  next_installment_amount?: number | string;
  nextPayment?: string;
  next_payment?: string;
  nextInstallmentDate?: string;
  next_installment_date?: string;
  remaining?: number | string;
  remainingAmount?: number | string;
  remainingDebt?: number | string;
  remaining_debt?: number | string;
  paid?: number | string;
  paidAmount?: number | string;
  accountId?: number | string;
  account_id?: number | string;
  accountNumber?: string;
  account_number?: string;
  status?: string;
}

interface LoanRequestApiResponse {
  id?: number | string;
  applicationId?: number | string;
  application_id?: number | string;
  loanRequestId?: number | string;
  loan_type?: string;
  loanType?: string;
  amount?: number | string;
  currency?: string;
  purpose?: string;
  salary?: number | string;
  employment_status?: string;
  employmentStatus?: string;
  employment_period?: number | string;
  employmentPeriod?: number | string;
  phone_number?: string;
  phoneNumber?: string;
  repayment_period?: number | string;
  repaymentPeriod?: number | string;
  account_number?: string;
  accountNumber?: string;
  status?: string;
  interest_rate_type?: string;
  interestRateType?: string;
  submission_date?: string;
  submissionDate?: string;
}

export class LoanRepository implements ILoanRepository {
  constructor(private client: NetworkClient) {}

  async getLoans(): Promise<Loan[]> {
    const data = await this.client.get<LoanApiResponse[]>('/api/loans');
    return data.map(loan => this.mapLoan(loan));
  }

  async getLoanById(id: number): Promise<Loan> {
    const loans = await this.getLoans();
    const loan = loans.find(item => item.id === id);
    if (!loan) throw new Error('Kredit nije pronađen');
    return loan;
  }

  async applyForLoan(application: LoanApplication): Promise<{ accepted: boolean }> {
    await this.client.post<LoanRequestApiResponse>('/api/loan-requests', {
      account_number: application.accountNumber,
      loan_type: application.loanType,
      interest_rate_type: application.interestRateType,
      amount: application.amount,
      currency: application.currency,
      purpose: application.purpose,
      salary: application.monthlySalary,
      employment_status: application.permanentEmployment ? 'full_time' : 'temporary',
      employment_period: application.employmentYears,
      repayment_period: application.maturityMonths,
      phone_number: application.phone,
    });
    return { accepted: true };
  }

  async getLoanRequests(): Promise<LoanRequest[]> {
    const response = await this.client.get<{ loanRequests?: LoanRequestApiResponse[]; loan_requests?: LoanRequestApiResponse[] } | LoanRequestApiResponse[]>('/api/loan-requests');
    const items = Array.isArray(response)
      ? response
      : response.loanRequests ?? response.loan_requests ?? [];
    return items.map(item => this.mapLoanRequest(item));
  }

  async approveLoanRequest(id: number): Promise<void> {
    await this.client.patch(`/api/loan-requests/${id}/approve`, {});
  }

  async rejectLoanRequest(id: number): Promise<void> {
    await this.client.patch(`/api/loan-requests/${id}/reject`, {});
  }

  private mapLoan(loan: LoanApiResponse): Loan {
    const loanType = loan.loanType ?? loan.loan_type ?? '';
    const accountNumber = loan.accountNumber ?? loan.account_number ?? '';
    const agreementDate = loan.agreementDate ?? loan.agreement_date ?? loan.startDate ?? loan.start_date ?? '';
    const maturityDate = loan.maturityDate ?? loan.maturity_date ?? loan.endDate ?? loan.end_date ?? '';
    const nextInstallmentAmount = this.toNumber(loan.nextInstallmentAmount ?? loan.next_installment_amount ?? loan.installment ?? loan.monthlyInstallment);
    const nextInstallmentDate = loan.nextInstallmentDate ?? loan.next_installment_date ?? loan.nextPayment ?? loan.next_payment ?? '';
    const remainingDebt = this.toNumber(loan.remainingDebt ?? loan.remaining_debt ?? loan.remaining ?? loan.remainingAmount);

    return {
      id: this.toNumber(loan.id ?? loan.loanId ?? loan.loan_id ?? this.hashLoanNumber(loan.loanNumber ?? loan.loan_number ?? loan.number ?? '')),
      name: loan.name ?? loan.loanName ?? loan.loan_name ?? (loanType ? this.mapLoanTypeLabel(loanType) : 'Kredit'),
      number: loan.loanNumber ?? loan.loan_number ?? loan.number ?? '',
      loanType,
      amount: this.toNumber(loan.amount ?? loan.loanAmount ?? loan.loan_amount ?? loan.principal),
      currency: loan.currency ?? 'RSD',
      period: this.toNumber(loan.period ?? loan.periodMonths ?? loan.repaymentPeriod ?? loan.repayment_period),
      nominalRate: this.toNumber(loan.nominalRate ?? loan.nominal_rate),
      effectiveRate: this.toNumber(loan.effectiveRate ?? loan.effective_rate),
      accountId: this.toNumber(loan.accountId ?? loan.account_id),
      accountNumber,
      agreementDate,
      maturityDate,
      nextInstallmentAmount,
      nextInstallmentDate,
      remainingDebt,
      startDate: agreementDate,
      endDate: maturityDate,
      installment: nextInstallmentAmount,
      nextPayment: nextInstallmentDate,
      remaining: remainingDebt,
      paid: this.toNumber(loan.paid ?? loan.paidAmount),
      status: this.mapStatus(loan.status),
    };
  }

  private mapLoanRequest(request: LoanRequestApiResponse): LoanRequest {
    return {
      id: this.toNumber(request.id ?? request.applicationId ?? request.application_id ?? request.loanRequestId),
      loanType: request.loan_type ?? request.loanType ?? '',
      amount: this.toNumber(request.amount),
      currency: request.currency ?? 'RSD',
      purpose: request.purpose ?? '',
      salary: this.toNumber(request.salary),
      employmentStatus: request.employment_status ?? request.employmentStatus ?? '',
      employmentPeriod: this.toNumber(request.employment_period ?? request.employmentPeriod),
      phoneNumber: request.phone_number ?? request.phoneNumber ?? '',
      repaymentPeriod: this.toNumber(request.repayment_period ?? request.repaymentPeriod),
      accountNumber: request.account_number ?? request.accountNumber ?? '',
      status: request.status ?? 'pending',
      interestRateType: request.interest_rate_type ?? request.interestRateType ?? 'fixed',
      submissionDate: request.submission_date ?? request.submissionDate ?? '',
    };
  }

  private mapStatus(status: string | undefined): Loan['status'] {
    const normalized = (status ?? '').toLowerCase();
    if (normalized === 'paid' || normalized === 'otplaćen' || normalized === 'otplacen') {
      return 'paid';
    }

    if (normalized === 'defaulted' || normalized === 'delinquent' || normalized === 'late') {
      return 'defaulted';
    }

    return 'active';
  }

  private hashLoanNumber(loanNumber: string): number {
    let hash = 0;
    for (let index = 0; index < loanNumber.length; index += 1) {
      hash = ((hash << 5) - hash + loanNumber.charCodeAt(index)) | 0;
    }
    return Math.abs(hash);
  }

  private mapLoanTypeLabel(loanType: string): string {
    const normalized = loanType.toLowerCase();
    const labels: Record<string, string> = {
      cash: 'Gotovinski kredit',
      mortgage: 'Stambeni kredit',
      car: 'Auto kredit',
      refinancing: 'Refinansirajući kredit',
      student: 'Studentski kredit',
    };

    return labels[normalized] ?? loanType;
  }

  private toNumber(value: number | string | undefined): number {
    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    return Number.isFinite(parsed) ? (parsed as number) : 0;
  }
}
