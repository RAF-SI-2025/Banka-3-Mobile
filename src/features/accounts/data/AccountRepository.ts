import { IAccountRepository } from '../domain/IAccountRepository';
import { Account, Transaction } from '../../../shared/types/models';
import { ApiError, NetworkClient } from '../../../core/network/NetworkClient';

interface ApiAccount {
  account_number: string;
  account_name?: string;
  name?: string;
  account_name?: string;
  type?: string;
  account_type?: string;
  currency?: string;
  currency_code?: string;
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
}

type AccountListApiResponse =
  | AccountApiResponse[]
  | {
      value?: AccountApiResponse[];
      data?: AccountApiResponse[];
    };

interface TransactionApiResponse {
  id?: number | string;
  accountId?: number | string;
  account_id?: number | string;
  description?: string;
  desc?: string;
  amount?: number | string;
  currency?: string;
  purpose?: string;
  payment_code?: string;
  reference_number?: string;
  status?: string;
  timestamp?: string;
  date?: string;
  description?: string;
}

// accountNumber string → stable numeric hash za id
function accountNumberToId(accountNumber: string): number {
  let hash = 0;
  for (let i = 0; i < accountNumber.length; i++) {
    hash = (hash * 31 + accountNumber.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function mapAccountType(type: string | undefined): Account['type'] {
  const t = type?.toLowerCase() ?? '';
  if (t.includes('foreign') || t.includes('devizni')) return 'devizni';
  if (t.includes('savings') || t.includes('stedni')) return 'stedni';
  if (t.includes('business') || t.includes('poslovni')) return 'poslovni';
  return 'tekuci';
}

function mapAccount(a: ApiAccount): Account {
  return {
    id: accountNumberToId(a.account_number),
    accountNumber: a.account_number,
    ownerId: a.owner_id ?? 0,
    name: a.account_name ?? a.name ?? 'Račun',
    type: mapAccountType(a.account_type),
    currency: a.currency ?? 'RSD',
    balance: a.balance ?? 0,
    availableBalance: a.available_balance ?? a.balance ?? 0,
    reservedAmount: 0,
    status: a.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active',
    createdAt: a.creation_date ?? '',
    expiresAt: a.expiration_date ?? '',
  };
}

function mapTransaction(t: ApiTransaction, accountId: number, index: number): Transaction {
  const amount = t.final_amount ?? t.initial_amount ?? t.amount ?? 0;
  const rawStatus = t.status?.toLowerCase() ?? '';
  let status: Transaction['status'] = 'completed';
  if (rawStatus.includes('pending') || rawStatus.includes('obrada')) status = 'pending';
  else if (rawStatus.includes('reject') || rawStatus.includes('odbij')) status = 'rejected';

  return {
    id: index,
    accountId,
    description: t.purpose ?? t.description ?? 'Transakcija',
    amount,
    currency: t.currency ?? 'RSD',
    date: t.timestamp ? new Date(t.timestamp).toLocaleDateString('sr-RS') : (t.date ?? ''),
    status,
    recipientName: undefined,
    recipientAccount: t.to_account,
    paymentCode: t.payment_code,
    purpose: t.purpose,
  };
}

export class AccountRepository implements IAccountRepository {
  constructor(private client: NetworkClient) {}

  async getAccounts(): Promise<Account[]> {
    try {
      const data = await this.client.get<AccountListApiResponse>('/api/accounts');
      const accounts = this.getUniqueAccounts(
        this.unwrapAccountsResponse(data).map(account => this.mapAccount(account))
      );
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
    const account = accounts.find(a => a.id === id);
    if (!account) throw new Error('Račun nije pronađen');
    return account;
  }

  async getTransactions(accountId: number): Promise<Transaction[]> {
    if (!accountId) return [];
    const accounts = await this.getAccounts();
    const account = accounts.find(a => a.id === accountId);
    if (!account) return [];

    try {
      const data = await this.client.get<TransactionApiResponse[]>(`/api/transactions?accountId=${accountId}`);
      if (data.length > 0) {
        return data.map(transaction => this.mapTransaction(transaction, accountId));
      }
    } catch (error) {
      if (!this.shouldUseMockFallback(error)) {
        throw error;
      }
    }

    return this.fallbackRepository.getTransactions(accountId);
  }

  private mapAccount(account: AccountApiResponse): Account {
    const accountNumber = account.accountNumber ?? account.account_number ?? '';
    const fallbackId = this.getFallbackAccountId(accountNumber);
    const normalizedStatus = (account.status ?? '').toLowerCase();

    return {
      id: this.toNumber(account.id ?? account.accountId ?? account.account_id ?? fallbackId),
      accountNumber,
      ownerId: this.toNumber(account.ownerId ?? account.owner_id ?? 0),
      name: account.name ?? account.account_name ?? 'Racun',
      type: this.mapAccountType(account.type ?? account.account_type),
      currency: account.currency ?? account.currency_code ?? 'RSD',
      balance: this.toNumber(account.balance),
      availableBalance: this.toNumber(account.availableBalance ?? account.available_balance ?? account.balance ?? 0),
      reservedAmount: this.toNumber(account.reservedAmount ?? account.reserved_amount ?? 0),
      status: normalizedStatus === 'inactive' ? 'inactive' : 'active',
      createdAt: account.createdAt ?? account.created_at ?? account.creation_date ?? '',
      expiresAt: account.expiresAt ?? account.expires_at ?? account.expiration_date ?? '',
    };
  }

  private mapTransaction(transaction: TransactionApiResponse, fallbackAccountId: number): Transaction {
    return {
      id: this.toNumber(transaction.id),
      accountId: this.toNumber(transaction.accountId ?? transaction.account_id ?? fallbackAccountId),
      description: transaction.description ?? transaction.desc ?? 'Transakcija',
      amount: this.toNumber(transaction.amount),
      currency: transaction.currency ?? 'RSD',
      date: transaction.date ?? '',
      status: transaction.status === 'pending' || transaction.status === 'rejected' ? transaction.status : 'completed',
      recipientName: transaction.recipientName ?? transaction.recipient_name,
      recipientAccount: transaction.recipientAccount ?? transaction.recipient_account,
      paymentCode: transaction.paymentCode ?? transaction.payment_code,
      purpose: transaction.purpose,
    };
  }

  private mapAccountType(type: string | undefined): Account['type'] {
    const normalizedType = (type ?? '').toLowerCase();

    if (normalizedType === 'devizni' || normalizedType === 'foreign_currency' || normalizedType === 'foreign') {
      return 'devizni';
    }

    if (normalizedType === 'stedni' || normalizedType === 'savings') {
      return 'stedni';
    }

    if (normalizedType === 'poslovni' || normalizedType === 'business') {
      return 'poslovni';
    }
  }

  private unwrapAccountsResponse(response: AccountListApiResponse): AccountApiResponse[] {
    if (Array.isArray(response)) {
      return response;
    }

    return response.value ?? response.data ?? [];
  }

  private getUniqueAccounts(accounts: Account[]): Account[] {
    const uniqueAccounts = new Map<string, Account>();

    for (const account of accounts) {
      const signature = [
        account.accountNumber || 'no-account-number',
        account.currency || 'no-currency',
        account.name || 'no-name',
        account.id || 0,
      ].join('|');

      if (!uniqueAccounts.has(signature)) {
        uniqueAccounts.set(signature, account);
      }
    }

    return Array.from(uniqueAccounts.values());
  }

  private getFallbackAccountId(accountNumber: string): number {
    const digits = accountNumber.replace(/\D/g, '');
    if (!digits) {
      return 0;
    }

    return this.toNumber(digits.slice(-9));
  }

  private toNumber(value: number | string | undefined): number {
    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    return Number.isFinite(parsed) ? parsed as number : 0;
  }

  private shouldUseMockFallback(error: unknown): boolean {
    return (
      error instanceof ApiError &&
      (error.statusCode === 0 || error.statusCode === 404 || error.statusCode >= 500)
    );
  }
}
