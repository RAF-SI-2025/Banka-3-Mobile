import { ApiError, NetworkClient } from '../../../core/network/NetworkClient';
import { PaymentRecipient, PaymentOrder, Transaction } from '../../../shared/types/models';
import { IPaymentRepository, PaymentRequest, TransferRequest } from '../domain/IPaymentRepository';
import { MockPaymentRepository } from './MockPaymentRepository';

interface PaymentApiResponse {
  status?: string;
  message?: string;
}

export class PaymentRepository implements IPaymentRepository {
  private fallbackRepository = new MockPaymentRepository();

  constructor(private client: NetworkClient) {}

  getRecipients(): Promise<PaymentRecipient[]> {
    return this.fallbackRepository.getRecipients();
  }

  addRecipient(name: string, accountNumber: string): Promise<PaymentRecipient> {
    return this.fallbackRepository.addRecipient(name, accountNumber);
  }

  updateRecipient(id: number, name: string, accountNumber: string): Promise<PaymentRecipient> {
    return this.fallbackRepository.updateRecipient(id, name, accountNumber);
  }

  deleteRecipient(id: number): Promise<void> {
    return this.fallbackRepository.deleteRecipient(id);
  }

  createPayment(order: PaymentOrder): Promise<{ verificationId: number }> {
    return this.fallbackRepository.createPayment(order);
  }

  async submitPayment(request: PaymentRequest): Promise<{ status?: string; message?: string }> {
    const senderAccount = this.normalizeAccountNumber(request.senderAccountNumber);
    const recipientAccount = this.normalizeAccountNumber(request.recipientAccount);

    const response = await this.client.post<PaymentApiResponse>(
      '/api/transactions/payment',
      {
        sender_account: senderAccount,
        recipient_account: recipientAccount,
        recipient_name: request.recipientName,
        amount: request.amount,
        payment_code: request.paymentCode,
        reference_number: request.referenceNumber ?? '',
        purpose: request.purpose,
      },
      request.totpCode ? { TOTP: request.totpCode } : undefined
    );

    return {
      status: response.status ?? 'completed',
      message: response.message,
    };
  }

  async submitTransfer(request: TransferRequest): Promise<{ status?: string; message?: string }> {
    const fromAccount = this.normalizeAccountNumber(request.fromAccountNumber);
    const toAccount = this.normalizeAccountNumber(request.toAccountNumber);

    const response = await this.client.post<PaymentApiResponse>(
      '/api/transactions/transfer',
      {
        from_account: fromAccount,
        to_account: toAccount,
        amount: request.amount,
      },
      request.totpCode ? { TOTP: request.totpCode } : undefined
    );

    return {
      status: response.status ?? 'completed',
      message: response.message,
    };
  }

  async getPaymentHistory(): Promise<Transaction[]> {
    try {
      return await this.fallbackRepository.getPaymentHistory();
    } catch (error) {
      if (!this.shouldUseMockFallback(error)) {
        throw error;
      }

      return this.fallbackRepository.getPaymentHistory();
    }
  }

  private shouldUseMockFallback(error: unknown): boolean {
    return (
      error instanceof ApiError &&
      (error.statusCode === 0 || error.statusCode === 404 || error.statusCode >= 500)
    );
  }

  private normalizeAccountNumber(value: string): string {
    return value.replace(/\D/g, '');
  }
}
