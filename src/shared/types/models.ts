
export interface Client {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: number;
  gender: string;
  email: string;
  phone: string;
  address: string;
  accounts: number[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  sessionId?: string;
}

export type AccountType = 'tekuci' | 'devizni' | 'stedni' | 'poslovni';
export type AccountStatus = 'active' | 'inactive';

export interface Account {
  id: number;
  accountNumber: string;
  ownerId: number;
  ownerName?: string;
  name: string;
  type: AccountType;
  subtype?: string;
  companyName?: string;
  currency: string;
  balance: number;
  availableBalance: number;
  reservedAmount: number;
  status: AccountStatus;
  createdAt: string;
  expiresAt: string;
  monthlyMaintenance?: number;
  dailyLimit?: number;
  monthlyLimit?: number;
  dailySpent?: number;
  monthlySpent?: number;
}

export interface AccountLimitUpdate {
  dailyLimit?: number;
  monthlyLimit?: number;
  totpCode?: string;
}

export type TransactionStatus = 'completed' | 'pending' | 'rejected';

export interface Transaction {
  id: number;
  accountId: number;
  description: string;
  amount: number;
  currency: string;
  date: string;
  status: TransactionStatus;
  recipientName?: string;
  recipientAccount?: string;
  paymentCode?: string;
  purpose?: string;
}

export type VerificationStatus = 'pending' | 'confirmed' | 'rejected' | 'expired';

export interface VerificationRequest {
  id: number;
  action: string;
  description: string;
  amount?: string;
  recipientName?: string;
  recipientAccount?: string;
  sourceAccount?: string;
  timestamp: string;
  status: VerificationStatus;
  code?: string;
}

export type CardType = 'debit' | 'credit';
export type CardStatus = 'active' | 'blocked' | 'deactivated';

export interface Card {
  id: number;
  cardNumber: string;
  cardName: string;
  cardType: CardType;
  cardBrand: string;
  accountId: number;
  accountNumber: string;
  creationDate: string;
  expiresAt: string;
  expirationDate: string;
  cvv: string;
  limit: number;
  status: CardStatus;
  currency: string;
}

export interface CardRequest {
  accountId?: number;
  accountNumber: string;
  cardType: CardType;
  cardBrand: string;
  currency: string;
  limit?: number;
  cardName?: string;
}

export type LoanStatus = 'active' | 'paid' | 'defaulted';

export interface Loan {
  id: number;
  name: string;
  number: string;
  loanType: string;
  amount: number;
  currency: string;
  period: number;
  nominalRate: number;
  effectiveRate: number;
  accountId: number;
  accountNumber: string;
  agreementDate: string;
  maturityDate: string;
  nextInstallmentAmount: number;
  nextInstallmentDate: string;
  remainingDebt: number;
  startDate: string;
  endDate: string;
  installment: number;
  nextPayment: string;
  remaining: number;
  paid: number;
  status: LoanStatus;
}

export interface LoanApplication {
  loanType: string;
  interestRateType: 'fixed' | 'variable';
  amount: number;
  currency: string;
  purpose: string;
  monthlySalary: number;
  permanentEmployment: boolean;
  employmentYears: number;
  maturityMonths: number;
  accountNumber: string;
  accountId?: number;
  phone: string;
}

export interface LoanRequest {
  id: number;
  loanType: string;
  amount: number;
  currency: string;
  purpose: string;
  salary: number;
  employmentStatus: string;
  employmentPeriod: number;
  phoneNumber: string;
  repaymentPeriod: number;
  accountNumber: string;
  status: string;
  interestRateType: 'fixed' | 'variable' | string;
  submissionDate: string;
}

export interface PaymentRecipient {
  id: number;
  name: string;
  accountNumber: string;
}

export interface PaymentOrder {
  senderAccountId: number;
  recipientName: string;
  recipientAccount: string;
  amount: number;
  paymentCode: string;
  referenceNumber?: string;
  purpose: string;
}

export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  buyRate: number;
  sellRate: number;
  middleRate: number;
}

export interface Result<T> {
  data?: T;
  error?: string;
  loading: boolean;
}
