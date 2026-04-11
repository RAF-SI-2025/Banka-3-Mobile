import { ILoanRepository } from '../domain/ILoanRepository';
import { Loan, LoanApplication, LoanRequest } from '../../../shared/types/models';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const LOANS: Loan[] = [
  {
    id: 1,
    name: 'Gotovinski kredit',
    number: '265-KR-0000001234',
    loanType: 'cash',
    amount: 500000,
    currency: 'RSD',
    period: 60,
    nominalRate: 8.5,
    effectiveRate: 9.2,
    accountId: 1,
    accountNumber: '265-0000000011234-56',
    agreementDate: '15.01.2024',
    maturityDate: '15.01.2029',
    nextInstallmentAmount: 10245.5,
    nextInstallmentDate: '15.04.2025',
    remainingDebt: 384200,
    startDate: '15.01.2024',
    endDate: '15.01.2029',
    installment: 10245.5,
    nextPayment: '15.04.2025',
    remaining: 384200,
    paid: 115800,
    status: 'active',
  },
  {
    id: 2,
    name: 'Stambeni kredit',
    number: '265-KR-0000005678',
    loanType: 'mortgage',
    amount: 8500000,
    currency: 'RSD',
    period: 240,
    nominalRate: 4.2,
    effectiveRate: 4.8,
    accountId: 1,
    accountNumber: '265-0000000011234-56',
    agreementDate: '01.06.2023',
    maturityDate: '01.06.2043',
    nextInstallmentAmount: 52340,
    nextInstallmentDate: '01.04.2025',
    remainingDebt: 7842500,
    startDate: '01.06.2023',
    endDate: '01.06.2043',
    installment: 52340,
    nextPayment: '01.04.2025',
    remaining: 7842500,
    paid: 657500,
    status: 'active',
  },
  {
    id: 3,
    name: 'Auto kredit',
    number: '265-KR-0000009012',
    loanType: 'car',
    amount: 1200000,
    currency: 'RSD',
    period: 36,
    nominalRate: 6.9,
    effectiveRate: 7.5,
    accountId: 1,
    accountNumber: '265-0000000011234-56',
    agreementDate: '10.03.2023',
    maturityDate: '10.03.2026',
    nextInstallmentAmount: 36890,
    nextInstallmentDate: '10.04.2025',
    remainingDebt: 110670,
    startDate: '10.03.2023',
    endDate: '10.03.2026',
    installment: 36890,
    nextPayment: '10.04.2025',
    remaining: 110670,
    paid: 1089330,
    status: 'active',
  },
];

let loanRequests: LoanRequest[] = [
  {
    id: 1,
    loanType: 'cash',
    amount: 250000,
    currency: 'RSD',
    purpose: 'Kupovina tehnike',
    salary: 140000,
    employmentStatus: 'full_time',
    employmentPeriod: 24,
    phoneNumber: '+381641112223',
    repaymentPeriod: 24,
    accountNumber: '265-0000000011234-56',
    status: 'pending',
    interestRateType: 'fixed',
    submissionDate: '2026-04-11T09:00:00',
  },
];

export class MockLoanRepository implements ILoanRepository {
  async getLoans(): Promise<Loan[]> { await delay(500); return LOANS; }
  async getLoanById(id: number): Promise<Loan> {
    await delay(300);
    const loan = LOANS.find(l => l.id === id);
    if (!loan) throw new Error('Kredit nije pronađen');
    return loan;
  }
  async applyForLoan(application: LoanApplication): Promise<{ accepted: boolean }> {
    await delay(1200);
    loanRequests = [
      ...loanRequests,
      {
        id: Date.now(),
        loanType: application.loanType,
        amount: application.amount,
        currency: application.currency,
        purpose: application.purpose,
        salary: application.monthlySalary,
        employmentStatus: application.permanentEmployment ? 'full_time' : 'temporary',
        employmentPeriod: application.employmentYears,
        phoneNumber: application.phone,
        repaymentPeriod: application.maturityMonths,
        accountNumber: application.accountNumber,
        status: 'pending',
        interestRateType: application.interestRateType,
        submissionDate: new Date().toISOString(),
      },
    ];
    return { accepted: true };
  }

  async getLoanRequests(): Promise<LoanRequest[]> {
    await delay(400);
    return loanRequests.map(request => ({ ...request }));
  }

  async approveLoanRequest(id: number): Promise<void> {
    await delay(600);
    loanRequests = loanRequests.map(request => request.id === id ? { ...request, status: 'approved' } : request);
  }

  async rejectLoanRequest(id: number): Promise<void> {
    await delay(600);
    loanRequests = loanRequests.map(request => request.id === id ? { ...request, status: 'rejected' } : request);
  }
}
