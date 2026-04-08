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
}

export type AccountType = 'tekuci' | 'devizni' | 'stedni' | 'poslovni';
export type AccountStatus = 'active' | 'inactive';

export interface Account {
  id: number;
  accountNumber: string;
  ownerId: number;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  availableBalance: number;
  reservedAmount: number;
  status: AccountStatus;
  createdAt: string;
  expiresAt: string;
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
  id: string;
  cardNumber: string;
  cardName: string;
  cardType: CardType;
  accountId: string;
  expiresAt: string;
  limit: number;
  status: CardStatus;
  currency: string;
}

export type LoanStatus = 'active' | 'paid' | 'defaulted';

export interface Loan {
  id: number;
  name: string;
  number: string;
  amount: number;
  currency: string;
  period: number;
  nominalRate: number;
  effectiveRate: number;
  startDate: string;
  endDate: string;
  installment: number;
  nextPayment: string;
  remaining: number;
  paid: number;
  accountId: number;
  status: LoanStatus;
}

export interface LoanApplication {
  loanType: string;
  amount: number;
  currency: string;
  purpose: string;
  monthlySalary: number;
  permanentEmployment: boolean;
  employmentYears: number;
  maturityMonths: number;
  accountNumber: string;  // account_number string, ne numeric id
  phone: string;
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