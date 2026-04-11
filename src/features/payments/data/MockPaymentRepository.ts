import { IPaymentRepository, PaymentRequest, TransferRequest } from '../domain/IPaymentRepository';
import { PaymentRecipient, PaymentOrder, Transaction } from '../../../shared/types/models';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

let recipients: PaymentRecipient[] = [
  { id: 1, name: 'EPS Beograd', accountNumber: '333000112345678910' },
  { id: 2, name: 'Telenor Srbija', accountNumber: '333000112345678910' },
  { id: 3, name: 'Vodovod Beograd', accountNumber: '333000112345678910' },
  { id: 4, name: 'Ana Jovanović', accountNumber: '333000112345678910' },
];

const paymentHistory: Transaction[] = [
  { id: 101, accountId: 1, description: 'EPS Beograd', amount: -4580, currency: 'RSD', date: '05.03.2025 14:32', status: 'completed', recipientName: 'EPS Beograd', purpose: 'Račun za struju', paymentCode: '240' },
  { id: 102, accountId: 1, description: 'Telenor Srbija', amount: -2890, currency: 'RSD', date: '01.03.2025 18:44', status: 'rejected', recipientName: 'Telenor Srbija', purpose: 'Mesečni račun', paymentCode: '241' },
  { id: 103, accountId: 1, description: 'Ana Jovanović', amount: -15000, currency: 'RSD', date: '28.02.2025 10:20', status: 'completed', recipientName: 'Ana Jovanović', purpose: 'Pozajmica', paymentCode: '289' },
  { id: 104, accountId: 1, description: 'Vodovod Beograd', amount: -1250, currency: 'RSD', date: '25.02.2025 11:05', status: 'pending', recipientName: 'Vodovod Beograd', purpose: 'Komunalne usluge', paymentCode: '240' },
  { id: 105, accountId: 1, description: 'Informatika AD', amount: -15420, currency: 'RSD', date: '20.02.2025 09:00', status: 'completed', recipientName: 'Informatika AD', purpose: 'Rata kredita', paymentCode: '289' },
];

export class MockPaymentRepository implements IPaymentRepository {
  async getRecipients(): Promise<PaymentRecipient[]> { await delay(400); return [...recipients]; }
  async addRecipient(name: string, accountNumber: string): Promise<PaymentRecipient> {
    await delay(500);
    const r = { id: Math.max(...recipients.map(x => x.id), 0) + 1, name, accountNumber };
    recipients.push(r);
    return r;
  }
  async updateRecipient(id: number, name: string, accountNumber: string): Promise<PaymentRecipient> {
    await delay(500);
    recipients = recipients.map(r => r.id === id ? { ...r, name, accountNumber } : r);
    return recipients.find(r => r.id === id)!;
  }
  async deleteRecipient(id: number): Promise<void> { await delay(400); recipients = recipients.filter(r => r.id !== id); }
  async createPayment(order: PaymentOrder): Promise<{ verificationId: number }> { await delay(1000); return { verificationId: Math.floor(Math.random() * 10000) }; }
  async submitPayment(_request: PaymentRequest): Promise<{ status?: string; message?: string }> {
    await delay(1000);
    return { status: 'completed', message: 'Payment submitted' };
  }
  async submitTransfer(_request: TransferRequest): Promise<{ status?: string; message?: string }> {
    await delay(1000);
    return { status: 'completed', message: 'Payment submitted' };
  }
  async getPaymentHistory(): Promise<Transaction[]> { await delay(500); return paymentHistory; }
}
