import { ApiError, NetworkClient } from '../../../core/network/NetworkClient';
import { consumeVerificationSession, ensureVerificationHeaders } from '../../../core/verification/verificationApi';
import { PaymentRecipient, PaymentOrder, Transaction } from '../../../shared/types/models';
import { IPaymentRepository, PaymentRequest, TransferRequest } from '../domain/IPaymentRepository';
import { MockPaymentRepository } from './MockPaymentRepository';

interface AccountListApiResponse {
  accounts?: Array<{ id?: string; number?: string; currency?: string }>;
}

interface RecipientListApiResponse {
  recipients?: RecipientApiResponse[];
}

interface RecipientApiResponse {
  id?: string;
  name?: string;
  accountNumber?: string;
  account_number?: string;
}

interface PaymentResultApiResponse {
  opId?: string;
  status?: string;
  transactions?: TransactionApiResponse[];
}

interface TransactionListApiResponse {
  transactions?: TransactionApiResponse[];
}

interface TransactionApiResponse {
  id?: string;
  kind?: string;
  status?: string;
  createdAt?: string;
  recipientName?: string;
  paymentCode?: string;
  purpose?: string;
  fromAccountId?: string;
  toAccountId?: string;
  fromAccountNumber?: string;
  toAccountNumber?: string;
  fromAmount?: string;
  toAmount?: string;
}

export class PaymentRepository implements IPaymentRepository {
  private fallbackRepository = new MockPaymentRepository();

  constructor(private client: NetworkClient) {}

  async getRecipients(): Promise<PaymentRecipient[]> {
    const response = await this.client.get<RecipientListApiResponse>('/v1/payment-recipients');
    return (response.recipients ?? []).map((recipient, index) => ({
      id: this.hashString(recipient.id ?? `${recipient.accountNumber ?? recipient.account_number ?? ''}:${index}`),
      remoteId: recipient.id,
      name: recipient.name ?? '',
      accountNumber: recipient.accountNumber ?? recipient.account_number ?? '',
    }));
  }

  async addRecipient(name: string, accountNumber: string): Promise<PaymentRecipient> {
    const response = await this.client.post<RecipientApiResponse>('/v1/payment-recipients', {
      name,
      accountNumber: this.normalizeAccountNumber(accountNumber),
    });

    return {
      id: this.hashString(response.id ?? response.accountNumber ?? response.account_number ?? accountNumber),
      remoteId: response.id,
      name: response.name ?? name,
      accountNumber: response.accountNumber ?? response.account_number ?? this.normalizeAccountNumber(accountNumber),
    };
  }

  async updateRecipient(id: number, name: string, accountNumber: string): Promise<PaymentRecipient> {
    const recipients = await this.getRecipients();
    const target = recipients.find(recipient => recipient.id === id);
    if (!target?.remoteId) {
      throw new Error('Primalac nije pronadjen na backendu.');
    }

    const response = await this.client.patch<RecipientApiResponse>(
      `/v1/payment-recipients/${encodeURIComponent(target.remoteId)}`,
      {
        name,
        accountNumber: this.normalizeAccountNumber(accountNumber),
      }
    );

    return {
      id,
      remoteId: response.id ?? target.remoteId,
      name: response.name ?? name,
      accountNumber: response.accountNumber ?? response.account_number ?? this.normalizeAccountNumber(accountNumber),
    };
  }

  async deleteRecipient(id: number): Promise<void> {
    const recipients = await this.getRecipients();
    const target = recipients.find(recipient => recipient.id === id);
    if (!target?.remoteId) {
      throw new Error('Primalac nije pronadjen na backendu.');
    }

    await this.client.delete(`/v1/payment-recipients/${encodeURIComponent(target.remoteId)}`);
  }

  createPayment(order: PaymentOrder): Promise<{ verificationId: number }> {
    return this.fallbackRepository.createPayment(order);
  }

  async submitPayment(request: PaymentRequest): Promise<{ status?: string; message?: string }> {
    const senderAccount = await this.findAccountByNumber(request.senderAccountNumber);
    if (!senderAccount?.id) {
      throw new Error('Polazni racun nije pronadjen na backendu.');
    }

    const headers = await ensureVerificationHeaders(this.client, 'payment', request.totpCode);
    const response = await this.client.post<PaymentResultApiResponse>(
      '/v1/payments',
      {
        fromAccountId: senderAccount.id,
        toAccountNumber: this.normalizeAccountNumber(request.recipientAccount),
        amount: this.formatDecimal(request.amount),
        recipientName: request.recipientName,
        paymentCode: request.paymentCode,
        referenceNumber: request.referenceNumber ?? '',
        purpose: request.purpose,
        saveRecipient: false,
      },
      headers
    );

    consumeVerificationSession('payment');
    return {
      status: response.status ?? 'completed',
      message: response.opId,
    };
  }

  async submitTransfer(request: TransferRequest): Promise<{ status?: string; message?: string }> {
    const fromAccount = await this.findAccountByNumber(request.fromAccountNumber);
    const toAccount = await this.findAccountByNumber(request.toAccountNumber);
    if (!fromAccount?.id || !toAccount?.id) {
      throw new Error('Jedan od racuna za prenos nije pronadjen na backendu.');
    }

    const headers = await ensureVerificationHeaders(this.client, 'transfer', request.totpCode);
    const response = await this.client.post<PaymentResultApiResponse>(
      '/v1/transfers',
      {
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        amount: this.formatDecimal(request.amount),
        purpose: 'Prenos sredstava',
      },
      headers
    );

    consumeVerificationSession('transfer');
    return {
      status: response.status ?? 'completed',
      message: response.opId,
    };
  }

  async getPaymentHistory(): Promise<Transaction[]> {
    try {
      const accounts = (await this.client.get<AccountListApiResponse>('/v1/accounts')).accounts ?? [];
      const allTransactions: Transaction[] = [];

      for (const account of accounts) {
        if (!account.id || !account.number) {
          continue;
        }

        const response = await this.client.get<TransactionListApiResponse>(
          `/v1/transactions?accountId=${encodeURIComponent(account.id)}`
        );

        for (const transaction of response.transactions ?? []) {
          const kind = (transaction.kind ?? '').toUpperCase();
          if (!kind.includes('PAYMENT') && !kind.includes('TRANSFER') && !kind.includes('EXCHANGE')) {
            continue;
          }

          allTransactions.push(this.mapTransaction(transaction, account.number, this.mapCurrency(account.currency)));
        }
      }

      return allTransactions
        .sort((left, right) => Date.parse(right.date) - Date.parse(left.date));
    } catch (error) {
      if (!this.shouldUseMockFallback(error)) {
        throw error;
      }

      return this.fallbackRepository.getPaymentHistory();
    }
  }

  private async findAccountByNumber(accountNumber: string): Promise<{ id?: string; number?: string; currency?: string } | undefined> {
    const accounts = (await this.client.get<AccountListApiResponse>('/v1/accounts')).accounts ?? [];
    const normalized = this.normalizeAccountNumber(accountNumber);
    return accounts.find(account => this.normalizeAccountNumber(account.number ?? '') === normalized);
  }

  private mapTransaction(
    transaction: TransactionApiResponse,
    accountNumber: string,
    currency: string
  ): Transaction {
    const outgoing = transaction.fromAccountNumber === accountNumber;
    const fromAmount = Number.parseFloat(transaction.fromAmount ?? '0');
    const toAmount = Number.parseFloat(transaction.toAmount ?? '0');

    return {
      id: this.hashString(transaction.id ?? `${transaction.fromAccountId ?? ''}:${transaction.toAccountId ?? ''}:${transaction.createdAt ?? ''}`),
      remoteId: transaction.id,
      accountId: this.hashString(accountNumber),
      description: transaction.purpose || transaction.recipientName || this.mapKindLabel(transaction.kind),
      amount: outgoing ? -Math.abs(fromAmount) : Math.abs(toAmount || fromAmount),
      currency,
      date: transaction.createdAt ?? '',
      status: this.mapStatus(transaction.status),
      kind: transaction.kind,
      fromAccountId: transaction.fromAccountId,
      toAccountId: transaction.toAccountId,
      fromAccountNumber: transaction.fromAccountNumber,
      toAccountNumber: transaction.toAccountNumber,
      recipientName: transaction.recipientName,
      recipientAccount: transaction.toAccountNumber,
      paymentCode: transaction.paymentCode,
      purpose: transaction.purpose,
    };
  }

  private mapKindLabel(kind?: string): string {
    const normalized = (kind ?? '').toUpperCase();
    if (normalized.includes('PAYMENT')) {
      return 'Placanje';
    }
    if (normalized.includes('EXCHANGE') || normalized.includes('FOREX')) {
      return 'Menjacnica';
    }
    if (normalized.includes('TRANSFER')) {
      return 'Prenos';
    }
    return 'Transakcija';
  }

  private mapStatus(status?: string): Transaction['status'] {
    const normalized = (status ?? '').toUpperCase();
    if (normalized.includes('PENDING')) {
      return 'pending';
    }
    if (normalized.includes('FAILED') || normalized.includes('REJECTED') || normalized.includes('CANCELLED')) {
      return 'rejected';
    }
    return 'completed';
  }

  private mapCurrency(currency?: string): string {
    return (currency ?? 'CURRENCY_RSD').replace('CURRENCY_', '');
  }

  private formatDecimal(value: number): string {
    return value.toFixed(2);
  }

  private normalizeAccountNumber(value: string): string {
    return value.replace(/\D/g, '');
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
