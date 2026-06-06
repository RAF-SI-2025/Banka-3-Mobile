import { IAccountRepository } from '../domain/IAccountRepository';
import { Account, AccountLimitUpdate, Transaction } from '../../../shared/types/models';
import { ApiError, NetworkClient } from '../../../core/network/NetworkClient';
import { ensureVerificationHeaders, consumeVerificationSession } from '../../../core/verification/verificationApi';
import { MockAccountRepository } from './MockAccountRepository';

interface AccountListApiResponse {
  accounts?: AccountApiResponse[];
}

interface CurrentClientApiResponse {
  client?: {
    id?: string;
    firstName?: string;
    first_name?: string;
    lastName?: string;
    last_name?: string;
  };
}

interface AccountApiResponse {
  id?: string;
  number?: string;
  name?: string;
  ownerClientId?: string;
  companyId?: string;
  kind?: string;
  subtype?: string;
  currency?: string;
  status?: string;
  balance?: number | string;
  availableBalance?: number | string;
  maintenanceFee?: number | string;
  dailyLimit?: number | string;
  monthlyLimit?: number | string;
  dailySpent?: number | string;
  monthlySpent?: number | string;
  createdAt?: string | null;
  expiresAt?: string | null;
}

interface TransactionListApiResponse {
  transactions?: TransactionApiResponse[];
}

interface TransactionApiResponse {
  id?: string;
  opId?: string;
  kind?: string;
  fromAccountId?: string;
  toAccountId?: string;
  fromAmount?: number | string;
  toAmount?: number | string;
  rate?: number | string;
  recipientName?: string;
  paymentCode?: string;
  referenceNumber?: string;
  purpose?: string;
  status?: string;
  createdAt?: string;
  fromAccountNumber?: string;
  toAccountNumber?: string;
}

export class AccountRepository implements IAccountRepository {
  private fallbackRepository = new MockAccountRepository();

  constructor(private client: NetworkClient) {}

  async getAccounts(): Promise<Account[]> {
    try {
      const [data, currentClient] = await Promise.all([
        this.client.get<AccountListApiResponse>('/v1/accounts'),
        this.fetchCurrentClientProfile(),
      ]);
      const accounts = (data.accounts ?? []).map(account => this.mapAccount(account, currentClient));
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
    if (!account) {
      throw new Error('Racun nije pronadjen');
    }
    return account;
  }

  async getTransactions(accountId: number): Promise<Transaction[]> {
    if (!accountId) {
      return [];
    }

    const account = await this.getAccountById(accountId);
    const remote = await this.findRemoteAccountByNumber(account.accountNumber);
    if (!remote?.id) {
      return this.fallbackRepository.getTransactions(accountId);
    }

    try {
      const data = await this.client.get<TransactionListApiResponse>(
        `/v1/transactions?accountId=${encodeURIComponent(remote.id)}`
      );
      return (data.transactions ?? []).map(transaction =>
        this.mapTransaction(transaction, accountId, account.accountNumber, account.currency)
      );
    } catch (error) {
      if (!this.shouldUseMockFallback(error)) {
        throw error;
      }
    }

    return this.fallbackRepository.getTransactions(accountId);
  }

  async updateAccountName(accountNumber: string, name: string): Promise<void> {
    const remote = await this.findRemoteAccountByNumber(accountNumber);
    if (!remote?.id) {
      throw new Error('Racun nije pronadjen na backendu.');
    }

    await this.client.patch(`/v1/accounts/${encodeURIComponent(remote.id)}/name`, {
      name,
    });
  }

  async updateAccountLimits(accountNumber: string, updates: AccountLimitUpdate): Promise<void> {
    const remote = await this.findRemoteAccountByNumber(accountNumber);
    if (!remote?.id) {
      throw new Error('Racun nije pronadjen na backendu.');
    }

    const headers = await ensureVerificationHeaders(this.client, 'limit_change', updates.totpCode);
    try {
      await this.client.patch(
        `/v1/accounts/${encodeURIComponent(remote.id)}/limits`,
        {
          dailyLimit: updates.dailyLimit !== undefined ? this.formatDecimal(updates.dailyLimit) : undefined,
          monthlyLimit: updates.monthlyLimit !== undefined ? this.formatDecimal(updates.monthlyLimit) : undefined,
        },
        headers
      );
      consumeVerificationSession('limit_change');
    } catch (error) {
      throw error;
    }
  }

  private async fetchRemoteAccounts(): Promise<AccountApiResponse[]> {
    const data = await this.client.get<AccountListApiResponse>('/v1/accounts');
    return data.accounts ?? [];
  }

  private async findRemoteAccountByNumber(accountNumber: string): Promise<AccountApiResponse | undefined> {
    const normalized = accountNumber.trim();
    const accounts = await this.fetchRemoteAccounts();
    return accounts.find(account => (account.number ?? '').trim() === normalized);
  }

  private async fetchCurrentClientProfile(): Promise<{ remoteId: string; fullName: string } | null> {
    try {
      const response = await this.client.get<CurrentClientApiResponse>('/v1/auth/me');
      const client = response.client;
      if (!client?.id) {
        return null;
      }

      const firstName = client.firstName ?? client.first_name ?? '';
      const lastName = client.lastName ?? client.last_name ?? '';
      const fullName = `${firstName} ${lastName}`.trim();

      return {
        remoteId: client.id,
        fullName,
      };
    } catch {
      return null;
    }
  }

  private mapAccount(account: AccountApiResponse, currentClient?: { remoteId: string; fullName: string } | null): Account {
    const remoteId = account.id ?? '';
    const accountNumber = account.number ?? '';
    const ownerRemoteId = account.ownerClientId ?? '';
    const ownerName = currentClient && ownerRemoteId === currentClient.remoteId
      ? currentClient.fullName
      : undefined;

    return {
      id: this.hashString(remoteId || accountNumber),
      remoteId,
      accountNumber,
      ownerId: this.hashString(ownerRemoteId),
      ownerRemoteId,
      ownerName,
      name: account.name ?? 'Racun',
      type: this.mapAccountType(account.kind),
      subtype: this.mapSubtype(account.subtype),
      companyName: account.companyId ? 'Poslovni racun' : undefined,
      currency: this.mapCurrency(account.currency),
      balance: this.toNumber(account.balance),
      availableBalance: this.toNumber(account.availableBalance ?? account.balance),
      reservedAmount: Math.max(0, this.toNumber(account.balance) - this.toNumber(account.availableBalance ?? account.balance)),
      status: this.mapAccountStatus(account.status),
      createdAt: account.createdAt ?? '',
      expiresAt: account.expiresAt ?? '',
      monthlyMaintenance: this.toOptionalNumber(account.maintenanceFee),
      dailyLimit: this.toOptionalNumber(account.dailyLimit),
      monthlyLimit: this.toOptionalNumber(account.monthlyLimit),
      dailySpent: this.toOptionalNumber(account.dailySpent),
      monthlySpent: this.toOptionalNumber(account.monthlySpent),
    };
  }

  private mapTransaction(
    transaction: TransactionApiResponse,
    fallbackAccountId: number,
    fallbackAccountNumber: string,
    fallbackCurrency: string
  ): Transaction {
    const outgoing = transaction.fromAccountNumber === fallbackAccountNumber;
    const incoming = transaction.toAccountNumber === fallbackAccountNumber;
    const fromAmount = this.toNumber(transaction.fromAmount);
    const toAmount = this.toNumber(transaction.toAmount);

    return {
      id: this.hashString(transaction.id ?? `${transaction.opId ?? ''}:${transaction.fromAccountId ?? ''}:${transaction.toAccountId ?? ''}`),
      remoteId: transaction.id,
      accountId: fallbackAccountId,
      description: this.resolveTransactionDescription(transaction, fallbackAccountNumber),
      amount: outgoing ? -Math.abs(fromAmount) : incoming ? Math.abs(toAmount || fromAmount) : fromAmount,
      currency: fallbackCurrency,
      date: transaction.createdAt ?? '',
      status: this.mapTransactionStatus(transaction.status),
      kind: transaction.kind,
      fromAccountId: transaction.fromAccountId,
      toAccountId: transaction.toAccountId,
      fromAccountNumber: transaction.fromAccountNumber,
      toAccountNumber: transaction.toAccountNumber,
      recipientName: transaction.recipientName,
      recipientAccount: transaction.toAccountNumber,
      paymentCode: transaction.paymentCode,
      referenceNumber: transaction.referenceNumber,
      purpose: transaction.purpose,
    };
  }

  private resolveTransactionDescription(
    transaction: TransactionApiResponse,
    accountNumber: string
  ): string {
    const kind = (transaction.kind ?? '').toUpperCase();
    const purpose = transaction.purpose?.trim();
    const recipientName = transaction.recipientName?.trim();

    if (kind.includes('PAYMENT')) {
      return purpose || recipientName || 'Placanje';
    }

    if (kind.includes('EXCHANGE') || kind.includes('FOREX')) {
      if (purpose) {
        return purpose;
      }
      if (transaction.fromAccountNumber === accountNumber) {
        return 'Menjacnica - odlazna konverzija';
      }
      if (transaction.toAccountNumber === accountNumber) {
        return 'Menjacnica - dolazna konverzija';
      }
      return 'Menjacnica';
    }

    if (kind.includes('TRANSFER')) {
      if (purpose) {
        return purpose;
      }
      if (transaction.fromAccountNumber === accountNumber) {
        return 'Prenos - odlazni';
      }
      if (transaction.toAccountNumber === accountNumber) {
        return 'Prenos - dolazni';
      }
      return 'Prenos';
    }

    return purpose || recipientName || 'Transakcija';
  }

  private mapAccountType(kind?: string): Account['type'] {
    const normalized = (kind ?? '').toUpperCase();
    if (normalized.includes('BUSINESS')) {
      return 'poslovni';
    }
    if (normalized.includes('FX')) {
      return 'devizni';
    }
    if (normalized.includes('SAVINGS')) {
      return 'stedni';
    }
    return 'tekuci';
  }

  private mapSubtype(subtype?: string): string | undefined {
    if (!subtype || subtype === 'ACCOUNT_SUBTYPE_UNSPECIFIED') {
      return undefined;
    }
    return subtype.replace('ACCOUNT_SUBTYPE_', '');
  }

  private mapCurrency(currency?: string): string {
    return (currency ?? 'CURRENCY_RSD').replace('CURRENCY_', '');
  }

  private mapAccountStatus(status?: string): Account['status'] {
    return (status ?? '').includes('ACTIVE') ? 'active' : 'inactive';
  }

  private mapTransactionStatus(status?: string): Transaction['status'] {
    const normalized = (status ?? '').toUpperCase();
    if (normalized.includes('PENDING')) {
      return 'pending';
    }
    if (normalized.includes('FAILED') || normalized.includes('REJECTED') || normalized.includes('CANCELLED')) {
      return 'rejected';
    }
    return 'completed';
  }

  private formatDecimal(value: number): string {
    return value.toFixed(2);
  }

  private toNumber(value: number | string | undefined): number {
    if (value === undefined) {
      return 0;
    }
    const parsed = typeof value === 'string' ? Number.parseFloat(value) : value;
    return Number.isFinite(parsed) ? (parsed as number) : 0;
  }

  private toOptionalNumber(value: number | string | undefined): number | undefined {
    if (value === undefined) {
      return undefined;
    }
    const parsed = typeof value === 'string' ? Number.parseFloat(value) : value;
    return Number.isFinite(parsed) ? (parsed as number) : undefined;
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

  private shouldUseMockFallback(error: unknown): boolean {
    return (
      error instanceof ApiError &&
      (error.statusCode === 0 || error.statusCode === 404 || error.statusCode >= 500)
    );
  }
}
