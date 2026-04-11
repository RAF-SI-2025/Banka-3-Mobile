import { IAccountRepository } from '../domain/IAccountRepository';
import { Account, AccountLimitUpdate, Transaction } from '../../../shared/types/models';
import { ApiError, NetworkClient } from '../../../core/network/NetworkClient';
import { MockAccountRepository } from './MockAccountRepository';

interface AccountApiResponse {
  id?: number | string;
  accountId?: number | string;
  account_id?: number | string;
  accountNumber?: string;
  account_number?: string;
  account_name?: string;
  account_type?: string;
  ownerId?: number | string;
  owner_id?: number | string;
  ownerName?: string;
  owner_name?: string;
  name?: string;
  type?: string;
  subtype?: string;
  companyName?: string;
  company_name?: string;
  currency?: string;
  balance?: number | string;
  availableBalance?: number | string;
  available_balance?: number | string;
  reservedAmount?: number | string;
  reserved_amount?: number | string;
  status?: string;
  createdAt?: string;
  created_at?: string;
  creation_date?: string;
  expiresAt?: string;
  expires_at?: string;
  expiration_date?: string;
  monthlyMaintenance?: number | string;
  monthly_maintenance?: number | string;
  dailyLimit?: number | string;
  daily_limit?: number | string;
  monthlyLimit?: number | string;
  monthly_limit?: number | string;
  dailySpent?: number | string;
  daily_spent?: number | string;
  daily_spending?: number | string;
  monthlySpent?: number | string;
  monthly_spent?: number | string;
  monthly_spending?: number | string;
}

interface TransactionApiResponse {
  id?: number | string;
  accountId?: number | string;
  account_id?: number | string;
  accountNumber?: string;
  account_number?: string;
  type?: string;
  description?: string;
  desc?: string;
  amount?: number | string;
  initial_amount?: number | string;
  final_amount?: number | string;
  start_currency_id?: number | string;
  exchange_rate?: number | string;
  currency?: string;
  date?: string;
  timestamp?: string;
  status?: string;
  recipientName?: string;
  recipient_name?: string;
  recipientAccount?: string;
  recipient_account?: string;
  from_account?: string;
  to_account?: string;
  paymentCode?: string;
  payment_code?: string;
  purpose?: string;
}

export class AccountRepository implements IAccountRepository {
  private fallbackRepository = new MockAccountRepository();

  constructor(private client: NetworkClient) {}

  async getAccounts(): Promise<Account[]> {
    try {
      const data = await this.client.get<AccountApiResponse[]>('/api/accounts');
      const accounts = data.map(account => this.mapAccount(account));
      if (accounts.length > 0) {
        return accounts;
      }
    } catch (error) {
      if (!this.shouldUseMockFallback(error)) {
        throw error;
      }
    }

    return this.fallbackRepository.getAccounts();
  }

  async getAccountById(id: number): Promise<Account> {
    const accounts = await this.getAccounts();
    const account = accounts.find(item => item.id === id);
    if (!account) throw new Error('Racun nije pronadjen');
    return account;
  }

  async getTransactions(accountId: number): Promise<Transaction[]> {
    if (!accountId) return [];

    const account = await this.getAccountById(accountId);

    try {
      const data = await this.client.get<TransactionApiResponse[]>(
        `/api/transactions?account_number=${encodeURIComponent(account.accountNumber)}`
      );
      return data.map(transaction => this.mapTransaction(transaction, accountId, account.accountNumber, account.currency));
    } catch (error) {
      if (!this.shouldUseMockFallback(error)) {
        throw error;
      }
    }

    return this.fallbackRepository.getTransactions(accountId);
  }

  async updateAccountName(accountNumber: string, name: string): Promise<void> {
    await this.client.patch(`/api/accounts/${encodeURIComponent(accountNumber)}/name`, {
      name,
    });
  }

  async updateAccountLimits(accountNumber: string, updates: AccountLimitUpdate): Promise<void> {
    const headers = updates.totpCode ? { TOTP: updates.totpCode } : undefined;
    await this.client.patch(
      `/api/accounts/${encodeURIComponent(accountNumber)}/limit`,
      {
        daily_limit: updates.dailyLimit,
        monthly_limit: updates.monthlyLimit,
      },
      headers
    );
  }

  private mapAccount(account: AccountApiResponse): Account {
    const accountNumber = account.accountNumber ?? account.account_number ?? '';

    return {
      id: this.resolveAccountId(account, accountNumber),
      accountNumber,
      ownerId: this.toNumber(account.ownerId ?? account.owner_id ?? 0),
      ownerName: account.ownerName ?? account.owner_name,
      name: account.name ?? account.account_name ?? 'Racun',
      type: this.mapAccountType(account.type ?? account.account_type),
      subtype: account.subtype,
      companyName: account.companyName ?? account.company_name,
      currency: account.currency ?? 'RSD',
      balance: this.toNumber(account.balance),
      availableBalance: this.toNumber(account.availableBalance ?? account.available_balance ?? account.balance ?? 0),
      reservedAmount: this.toNumber(account.reservedAmount ?? account.reserved_amount ?? 0),
      status: account.status === 'inactive' ? 'inactive' : 'active',
      createdAt: account.createdAt ?? account.created_at ?? account.creation_date ?? '',
      expiresAt: account.expiresAt ?? account.expires_at ?? account.expiration_date ?? '',
      monthlyMaintenance: this.toNumber(account.monthlyMaintenance ?? account.monthly_maintenance),
      dailyLimit: this.toNumber(account.dailyLimit ?? account.daily_limit),
      monthlyLimit: this.toNumber(account.monthlyLimit ?? account.monthly_limit),
      dailySpent: this.toNumber(account.dailySpent ?? account.daily_spent ?? account.daily_spending),
      monthlySpent: this.toNumber(account.monthlySpent ?? account.monthly_spent ?? account.monthly_spending),
    };
  }

  private mapTransaction(
    transaction: TransactionApiResponse,
    fallbackAccountId: number,
    fallbackAccountNumber?: string,
    fallbackAccountCurrency?: string
  ): Transaction {
    const fromAccount = transaction.from_account;
    const toAccount = transaction.to_account;
    const accountNumber = transaction.accountNumber ?? transaction.account_number ?? fallbackAccountNumber;
    const initialAmount = this.toOptionalNumber(transaction.amount ?? transaction.initial_amount) ?? 0;
    const finalAmount = this.toOptionalNumber(transaction.final_amount);
    const signedAmount =
      accountNumber && fromAccount === accountNumber
        ? -Math.abs(initialAmount)
        : accountNumber && toAccount === accountNumber
          ? Math.abs(finalAmount ?? initialAmount)
          : initialAmount;

    return {
      id: this.resolveTransactionId(transaction),
      accountId: this.toNumber(transaction.accountId ?? transaction.account_id ?? fallbackAccountId),
      description: this.resolveTransactionDescription(transaction, accountNumber, fallbackAccountCurrency),
      amount: signedAmount,
      currency: transaction.currency ?? 'RSD',
      date: transaction.date ?? transaction.timestamp ?? '',
      status: transaction.status === 'pending' || transaction.status === 'rejected' ? transaction.status : 'completed',
      recipientName: transaction.recipientName ?? transaction.recipient_name,
      recipientAccount: transaction.recipientAccount ?? transaction.recipient_account ?? toAccount,
      paymentCode: transaction.paymentCode ?? transaction.payment_code,
      purpose: transaction.purpose,
    };
  }

  private resolveTransactionDescription(
    transaction: TransactionApiResponse,
    accountNumber?: string,
    accountCurrency?: string
  ): string {
    const transactionType = transaction.type?.toLowerCase();
    const fromAccount = transaction.from_account;
    const toAccount = transaction.to_account;
    const initialAmount = this.toOptionalNumber(transaction.initial_amount ?? transaction.amount);
    const finalAmount = this.toOptionalNumber(transaction.final_amount);
    const isExchangeTransaction = this.isExchangeTransaction(transaction);
    const isTransferTransaction =
      transactionType === 'transfer' ||
      (!!fromAccount || !!toAccount);
    const hasExchangeAccounts = !!fromAccount && !!toAccount;
    const hasExchangeMarker =
      (transaction.purpose ?? '').toLowerCase().includes('kurs') ||
      (transaction.description ?? transaction.desc ?? '').toLowerCase().includes('menjačnica');
    const hasDifferentSettlementAmounts =
      initialAmount !== undefined &&
      finalAmount !== undefined &&
      !this.areCloseEnough(initialAmount, finalAmount);
    const recipientName = transaction.recipientName ?? transaction.recipient_name;
    const hasPaymentMarker =
      transactionType === 'payment' ||
      !!transaction.paymentCode ||
      !!transaction.payment_code ||
      !!recipientName;

    if (hasPaymentMarker && !isExchangeTransaction && !hasDifferentSettlementAmounts && !hasExchangeMarker) {
      const directPaymentDescription = transaction.description ?? transaction.desc ?? transaction.purpose ?? '';
      if (directPaymentDescription && directPaymentDescription.trim()) {
        return directPaymentDescription;
      }

      if (recipientName) {
        return recipientName;
      }

      return 'Plaćanje';
    }

    if ((isExchangeTransaction || hasDifferentSettlementAmounts) && hasExchangeAccounts) {
      if (accountNumber && fromAccount === accountNumber) {
        return 'Menjačnica - odlazna konverzija';
      }

      if (accountNumber && toAccount === accountNumber) {
        return 'Menjačnica - dolazna konverzija';
      }

      return 'Menjačnica';
    }

    if (transactionType === 'payment' || !!transaction.paymentCode || !!transaction.payment_code) {
      const directPaymentDescription = transaction.description ?? transaction.desc ?? transaction.purpose ?? '';
      if (directPaymentDescription && directPaymentDescription.trim()) {
        return directPaymentDescription;
      }

      if (recipientName) {
        return recipientName;
      }

      return 'Plaćanje';
    }

    if ((hasExchangeMarker || transactionType === 'exchange' || transactionType === 'conversion') && hasExchangeAccounts) {
      if (accountNumber && fromAccount === accountNumber) {
        return 'Menjačnica - odlazna konverzija';
      }

      if (accountNumber && toAccount === accountNumber) {
        return 'Menjačnica - dolazna konverzija';
      }

      return 'Menjačnica';
    }

    if (isTransferTransaction) {
      if (accountNumber && fromAccount === accountNumber) {
        return 'Prenos - odlazni';
      }

      if (accountNumber && toAccount === accountNumber) {
        return 'Prenos - dolazni';
      }

      return 'Prenos';
    }

    const directDescription = transaction.description ?? transaction.desc ?? transaction.purpose ?? '';
    return directDescription && directDescription.trim()
      ? directDescription
      : (transaction.recipientName ?? transaction.recipient_name ?? 'Transakcija');
  }

  private resolveTransactionId(transaction: TransactionApiResponse): number {
    const explicitId = this.toOptionalNumber(transaction.id);
    if (explicitId !== undefined) {
      return explicitId;
    }

    const timestamp = transaction.date ?? transaction.timestamp ?? '';
    const amount = this.toOptionalNumber(transaction.amount ?? transaction.initial_amount ?? transaction.final_amount) ?? 0;
    const fingerprint = `${transaction.from_account ?? ''}-${transaction.to_account ?? ''}-${timestamp}-${amount}`;

    let hash = 0;
    for (let index = 0; index < fingerprint.length; index += 1) {
      hash = ((hash << 5) - hash + fingerprint.charCodeAt(index)) | 0;
    }

    return Math.abs(hash);
  }

  private mapAccountType(type: string | undefined): Account['type'] {
    if (type === 'devizni' || type === 'foreign') {
      return 'devizni';
    }

    if (type === 'stedni' || type === 'savings') {
      return 'stedni';
    }

    if (type === 'poslovni' || type === 'business') {
      return 'poslovni';
    }

    return 'tekuci';
  }

  private resolveAccountId(account: AccountApiResponse, accountNumber: string): number {
    const explicitId = this.toNumber(account.id ?? account.accountId ?? account.account_id);
    if (explicitId > 0) {
      return explicitId;
    }

    const digits = accountNumber.replace(/\D/g, '');
    if (!digits) {
      return 0;
    }

    const tail = digits.slice(-9);
    const parsed = Number.parseInt(tail, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toNumber(value: number | string | undefined): number {
    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    return Number.isFinite(parsed) ? parsed as number : 0;
  }

  private toOptionalNumber(value: number | string | undefined): number | undefined {
    if (value === undefined) {
      return undefined;
    }

    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    return Number.isFinite(parsed) ? (parsed as number) : undefined;
  }

  private isExchangeTransaction(transaction: TransactionApiResponse): boolean {
    const startCurrencyId = this.toOptionalNumber(transaction.start_currency_id);
    const exchangeRate = this.toOptionalNumber(transaction.exchange_rate);

    if ((startCurrencyId ?? 0) > 0) {
      return true;
    }

    if ((exchangeRate ?? 0) > 0) {
      return true;
    }

    const marker = `${transaction.description ?? transaction.desc ?? ''} ${transaction.purpose ?? ''}`.toLowerCase();
    return marker.includes('menjačnica') || marker.includes('kurs') || marker.includes('konverz');
  }

  private areCloseEnough(left: number, right: number): boolean {
    return Math.abs(left - right) < 0.0001;
  }

  private shouldUseMockFallback(error: unknown): boolean {
    return (
      error instanceof ApiError &&
      (error.statusCode === 0 || error.statusCode === 404 || error.statusCode >= 500)
    );
  }
}
