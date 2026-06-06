import { NetworkClient } from '../../../core/network/NetworkClient';
import { Loan, LoanApplication, LoanRequest } from '../../../shared/types/models';
import { ILoanRepository } from '../domain/ILoanRepository';

interface AccountListApiResponse {
  accounts?: Array<{ id?: string; number?: string }>;
}

interface LoanListApiResponse {
  loans?: LoanApiResponse[];
}

interface LoanRequestListApiResponse {
  requests?: LoanRequestApiResponse[];
}

interface LoanApiResponse {
  id?: string;
  loanNumber?: string;
  accountId?: string;
  loanType?: string;
  principal?: number | string;
  currency?: string;
  installmentsTotal?: number | string;
  baseRate?: number | string;
  margin?: number | string;
  effectiveRate?: number | string;
  contractedAt?: string;
  maturesAt?: string;
  nextInstallmentDate?: string;
  nextInstallmentAmount?: number | string;
  remainingPrincipal?: number | string;
  status?: string;
}

interface LoanRequestApiResponse {
  id?: string;
  accountId?: string;
  loanType?: string;
  interestType?: string;
  amount?: number | string;
  currency?: string;
  purpose?: string;
  monthlySalary?: number | string;
  employmentStatus?: string;
  employmentDurationMonths?: number | string;
  installmentsTotal?: number | string;
  contactPhone?: string;
  status?: string;
  createdAt?: string;
  rejectionReason?: string;
}

export class LoanRepository implements ILoanRepository {
  constructor(private client: NetworkClient) {}

  async getLoans(): Promise<Loan[]> {
    const accountMap = await this.getAccountNumberMap();
    const data = await this.client.get<LoanListApiResponse>('/v1/loans');
    return (data.loans ?? []).map(loan => this.mapLoan(loan, accountMap));
  }

  async getLoanById(id: number): Promise<Loan> {
    const loans = await this.getLoans();
    const loan = loans.find(item => item.id === id);
    if (!loan) {
      throw new Error('Kredit nije pronadjen');
    }
    return loan;
  }

  async applyForLoan(application: LoanApplication): Promise<{ accepted: boolean }> {
    const account = await this.findAccountByNumber(application.accountNumber);
    if (!account?.id) {
      throw new Error('Racun za kredit nije pronadjen na backendu.');
    }

    await this.client.post('/v1/loan-requests', {
      accountId: account.id,
      loanType: this.mapLoanType(application.loanType),
      interestType: application.interestRateType === 'variable' ? 'INTEREST_TYPE_VARIABLE' : 'INTEREST_TYPE_FIXED',
      amount: this.formatDecimal(application.amount),
      currency: this.mapCurrencyEnum(application.currency),
      purpose: application.purpose,
      monthlySalary: this.formatDecimal(application.monthlySalary),
      employmentStatus: application.permanentEmployment ? 'EMPLOYMENT_STATUS_PERMANENT' : 'EMPLOYMENT_STATUS_TEMPORARY',
      employmentDurationMonths: Math.max(1, application.employmentYears * 12),
      installmentsTotal: application.maturityMonths,
      contactPhone: application.phone,
    });

    return { accepted: true };
  }

  async getLoanRequests(): Promise<LoanRequest[]> {
    const accountMap = await this.getAccountNumberMap();
    const response = await this.client.get<LoanRequestListApiResponse>('/v1/loan-requests');
    return (response.requests ?? []).map(item => this.mapLoanRequest(item, accountMap));
  }

  async approveLoanRequest(id: number): Promise<void> {
    const requests = await this.getLoanRequests();
    const target = requests.find(request => request.id === id);
    if (!target?.remoteId) {
      throw new Error('Zahtev za kredit nije pronadjen na backendu.');
    }

    await this.client.post(`/v1/loan-requests/${encodeURIComponent(target.remoteId)}/decide`, {
      approve: true,
      reason: '',
    });
  }

  async rejectLoanRequest(id: number): Promise<void> {
    const requests = await this.getLoanRequests();
    const target = requests.find(request => request.id === id);
    if (!target?.remoteId) {
      throw new Error('Zahtev za kredit nije pronadjen na backendu.');
    }

    await this.client.post(`/v1/loan-requests/${encodeURIComponent(target.remoteId)}/decide`, {
      approve: false,
      reason: 'Odbijeno iz mobilne aplikacije.',
    });
  }

  private async findAccountByNumber(accountNumber: string): Promise<{ id?: string; number?: string } | undefined> {
    const accounts = (await this.client.get<AccountListApiResponse>('/v1/accounts')).accounts ?? [];
    return accounts.find(account => (account.number ?? '').trim() === accountNumber.trim());
  }

  private async getAccountNumberMap(): Promise<Map<string, string>> {
    const accounts = (await this.client.get<AccountListApiResponse>('/v1/accounts')).accounts ?? [];
    const map = new Map<string, string>();
    for (const account of accounts) {
      if (account.id && account.number) {
        map.set(account.id, account.number);
      }
    }
    return map;
  }

  private mapLoan(loan: LoanApiResponse, accountMap: Map<string, string>): Loan {
    const remoteId = loan.id ?? '';
    const accountNumber = accountMap.get(loan.accountId ?? '') ?? '';
    const nominalRate = this.toNumber(loan.baseRate) + this.toNumber(loan.margin);
    const remainingDebt = this.toNumber(loan.remainingPrincipal);
    const amount = this.toNumber(loan.principal);

    return {
      id: this.hashString(remoteId || (loan.loanNumber ?? '')),
      remoteId,
      name: this.mapLoanTypeLabel(loan.loanType),
      number: loan.loanNumber ?? '',
      loanType: this.mapLoanTypeLabel(loan.loanType),
      amount,
      currency: this.mapCurrency(loan.currency),
      period: this.toNumber(loan.installmentsTotal),
      nominalRate,
      effectiveRate: this.toNumber(loan.effectiveRate),
      accountId: this.hashString(loan.accountId ?? accountNumber),
      accountRemoteId: loan.accountId ?? '',
      accountNumber,
      agreementDate: loan.contractedAt ?? '',
      maturityDate: loan.maturesAt ?? '',
      nextInstallmentAmount: this.toNumber(loan.nextInstallmentAmount),
      nextInstallmentDate: loan.nextInstallmentDate ?? '',
      remainingDebt,
      startDate: loan.contractedAt ?? '',
      endDate: loan.maturesAt ?? '',
      installment: this.toNumber(loan.nextInstallmentAmount),
      nextPayment: loan.nextInstallmentDate ?? '',
      remaining: remainingDebt,
      paid: Math.max(0, amount - remainingDebt),
      status: this.mapStatus(loan.status),
    };
  }

  private mapLoanRequest(request: LoanRequestApiResponse, accountMap: Map<string, string>): LoanRequest {
    const remoteId = request.id ?? '';
    return {
      id: this.hashString(remoteId),
      remoteId,
      loanType: this.mapLoanTypeLabel(request.loanType),
      amount: this.toNumber(request.amount),
      currency: this.mapCurrency(request.currency),
      purpose: request.purpose ?? '',
      salary: this.toNumber(request.monthlySalary),
      employmentStatus: this.mapEmploymentStatus(request.employmentStatus),
      employmentPeriod: Math.round(this.toNumber(request.employmentDurationMonths) / 12),
      phoneNumber: request.contactPhone ?? '',
      repaymentPeriod: this.toNumber(request.installmentsTotal),
      accountNumber: accountMap.get(request.accountId ?? '') ?? '',
      accountRemoteId: request.accountId ?? '',
      status: this.mapRequestStatus(request.status, request.rejectionReason),
      interestRateType: this.mapInterestType(request.interestType),
      submissionDate: request.createdAt ?? '',
    };
  }

  private mapLoanType(value: string): string {
    switch (value.toLowerCase()) {
      case 'stambeni':
      case 'mortgage':
        return 'LOAN_TYPE_HOUSING';
      case 'auto':
      case 'car':
        return 'LOAN_TYPE_AUTO';
      case 'refinansirajuci':
      case 'refinancing':
        return 'LOAN_TYPE_REFINANCING';
      case 'studentski':
      case 'student':
        return 'LOAN_TYPE_STUDENT';
      default:
        return 'LOAN_TYPE_CASH';
    }
  }

  private mapLoanTypeLabel(value?: string): string {
    const normalized = (value ?? '').replace('LOAN_TYPE_', '').toLowerCase();
    switch (normalized) {
      case 'housing':
      case 'mortgage':
        return 'Stambeni kredit';
      case 'auto':
      case 'car':
        return 'Auto kredit';
      case 'refinancing':
        return 'Refinansirajuci kredit';
      case 'student':
        return 'Studentski kredit';
      default:
        return 'Gotovinski kredit';
    }
  }

  private mapCurrencyEnum(currency: string): string {
    return `CURRENCY_${currency.toUpperCase()}`;
  }

  private mapCurrency(value?: string): string {
    return (value ?? 'CURRENCY_RSD').replace('CURRENCY_', '');
  }

  private mapInterestType(value?: string): 'fixed' | 'variable' {
    return (value ?? '').includes('VARIABLE') ? 'variable' : 'fixed';
  }

  private mapEmploymentStatus(value?: string): string {
    return (value ?? '').includes('PERMANENT') ? 'stalno zaposlen' : 'privremeno zaposlen';
  }

  private mapStatus(status?: string): Loan['status'] {
    const normalized = (status ?? '').toUpperCase();
    if (normalized.includes('PAID')) {
      return 'paid';
    }
    if (normalized.includes('DEFAULT') || normalized.includes('LATE')) {
      return 'defaulted';
    }
    return 'active';
  }

  private mapRequestStatus(status?: string, rejectionReason?: string): string {
    const normalized = (status ?? '').toUpperCase();
    if (normalized.includes('REJECTED')) {
      return rejectionReason ? `odbijen: ${rejectionReason}` : 'odbijen';
    }
    if (normalized.includes('APPROVED')) {
      return 'odobren';
    }
    return 'na cekanju';
  }

  private formatDecimal(value: number): string {
    return value.toFixed(2);
  }

  private toNumber(value: number | string | undefined): number {
    const parsed = typeof value === 'string' ? Number.parseFloat(value) : value;
    return Number.isFinite(parsed) ? (parsed as number) : 0;
  }

  private hashString(value: string): number {
    if (!value) {
      return 0;
    }
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
    }
    return Math.abs(hash);
  }
}
