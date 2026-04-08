import { ILoanRepository } from '../domain/ILoanRepository';
import { Loan, LoanApplication } from '../../../shared/types/models';
import { NetworkClient } from '../../../core/network/NetworkClient';

interface ApiLoan {
  loan_number: string;
  loan_type: string;
  account_number: string;
  loan_amount: number;
  repayment_period: number;
  nominal_rate: number;
  effective_rate: number;
  agreement_date: string;
  maturity_date: string;
  next_installment_amount: number;
  next_installment_date: string;
  remaining_debt: number;
  currency: string;
  status: string;
}

function mapLoan(l: ApiLoan, index: number): Loan {
  const rawStatus = l.status?.toLowerCase() ?? '';
  let status: Loan['status'] = 'active';
  if (rawStatus.includes('paid') || rawStatus.includes('isplaćen')) status = 'paid';
  else if (rawStatus.includes('default') || rawStatus.includes('kašnjenje')) status = 'defaulted';

  const paid = (l.loan_amount ?? 0) - (l.remaining_debt ?? 0);

  return {
    id: index + 1,
    name: l.loan_type ?? 'Kredit',
    number: l.loan_number ?? '',
    amount: l.loan_amount ?? 0,
    currency: l.currency ?? 'RSD',
    period: l.repayment_period ?? 0,
    nominalRate: l.nominal_rate ?? 0,
    effectiveRate: l.effective_rate ?? 0,
    startDate: l.agreement_date ?? '',
    endDate: l.maturity_date ?? '',
    installment: l.next_installment_amount ?? 0,
    nextPayment: l.next_installment_date ?? '',
    remaining: l.remaining_debt ?? 0,
    paid: paid > 0 ? paid : 0,
    accountId: 0, // backend ne vraća numeric id
    status,
  };
}

export class RealLoanRepository implements ILoanRepository {
  constructor(private client: NetworkClient) {}

  async getLoans(): Promise<Loan[]> {
    const data = await this.client.get<ApiLoan[]>('/api/loans');
    return data.map(mapLoan);
  }

  async getLoanById(id: number): Promise<Loan> {
    const loans = await this.getLoans();
    const loan = loans.find(l => l.id === id);
    if (!loan) throw new Error('Kredit nije pronađen');
    return loan;
  }

    async applyForLoan(application: LoanApplication): Promise<{ applicationId: number }> {
    const body = {
        account_number: application.accountNumber,
        loan_type: application.loanType,
        amount: application.amount,
        repayment_period: application.maturityMonths,
        currency: application.currency,
        purpose: application.purpose,
        salary: application.monthlySalary,
        employment_status: application.permanentEmployment ? 'full_time' : 'temporary',
        employment_period: application.employmentYears,
        phone_number: application.phone,
        interest_rate_type: 'FIKSNA',
    };
    console.log('[LOAN] request body:', JSON.stringify(body));
    await this.client.post('/api/loan-requests', body);
    return { applicationId: Math.floor(Math.random() * 10000) };
    }
}