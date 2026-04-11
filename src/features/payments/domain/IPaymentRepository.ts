import { PaymentRecipient, PaymentOrder, Transaction } from '../../../shared/types/models';

export interface PaymentRequest {
  senderAccountNumber: string;
  recipientName: string;
  recipientAccount: string;
  amount: number;
  paymentCode: string;
  referenceNumber?: string;
  purpose: string;
  totpCode?: string;
}

export interface TransferRequest {
  fromAccountNumber: string;
  toAccountNumber: string;
  amount: number;
  totpCode?: string;
}

export interface IPaymentRepository {
  getRecipients(): Promise<PaymentRecipient[]>;
  addRecipient(name: string, accountNumber: string): Promise<PaymentRecipient>;
  updateRecipient(id: number, name: string, accountNumber: string): Promise<PaymentRecipient>;
  deleteRecipient(id: number): Promise<void>;
  createPayment(order: PaymentOrder): Promise<{ verificationId: number }>;
  submitPayment(request: PaymentRequest): Promise<{ status?: string; message?: string }>;
  submitTransfer(request: TransferRequest): Promise<{ status?: string; message?: string }>;
  getPaymentHistory(): Promise<Transaction[]>;
}
