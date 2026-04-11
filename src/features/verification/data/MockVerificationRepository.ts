import { IVerificationRepository } from '../domain/IVerificationRepository';
import { VerificationRequest } from '../../../shared/types/models';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const INITIAL_HISTORY: VerificationRequest[] = [
  { id: 1, action: 'Plaćanje - EPS Beograd', description: 'Račun za struju', amount: '4,580.00 RSD', timestamp: '05.03.2025 14:32', status: 'confirmed', code: '482917' },
  { id: 2, action: 'Menjačnica - odlazna konverzija', description: 'Konverzija sa tekućeg na devizni', amount: '500.00 EUR', timestamp: '03.03.2025 09:15', status: 'confirmed', code: '739201' },
  { id: 3, action: 'Novo plaćanje - Telenor', description: 'Mesečni račun', amount: '2,890.00 RSD', timestamp: '01.03.2025 18:44', status: 'rejected', code: '156483' },
  { id: 4, action: 'Plaćanje - Informatika AD', description: 'Rata kredita', amount: '15,420.00 RSD', timestamp: '28.02.2025 10:20', status: 'confirmed', code: '927364' },
  { id: 5, action: 'Menjačnica - dolazna konverzija', description: 'Konverzija', amount: '200.00 EUR', timestamp: '25.02.2025 11:05', status: 'expired', code: '648201' },
];

const INITIAL_PENDING: VerificationRequest[] = [
  {
    id: 99,
    action: 'Novo plaćanje',
    description: 'Komunalne usluge',
    amount: '1,250.00 RSD',
    recipientName: 'Vodovod Beograd',
    recipientAccount: '908-0000000987654-32',
    sourceAccount: '265-0000000011234-56',
    timestamp: new Date().toISOString(),
    status: 'pending',
  },
];

export class MockVerificationRepository implements IVerificationRepository {
  private history = [...INITIAL_HISTORY];
  private pendingQueue = [...INITIAL_PENDING];

  async getHistory(): Promise<VerificationRequest[]> {
    await delay(500);
    return [...this.history].sort((a, b) => this.toTime(b.timestamp) - this.toTime(a.timestamp));
  }

  async getPending(): Promise<VerificationRequest | null> {
    await delay(300);
    return this.pendingQueue[0] ? { ...this.pendingQueue[0] } : null;
  }

  async confirm(id: number): Promise<void> {
    await delay(800);
    this.completePending(id, 'confirmed');
  }

  async reject(id: number): Promise<void> {
    await delay(800);
    this.completePending(id, 'rejected');
  }

  private completePending(id: number, status: 'confirmed' | 'rejected'): void {
    const index = this.pendingQueue.findIndex(item => item.id === id);
    if (index === -1) {
      return;
    }

    const [item] = this.pendingQueue.splice(index, 1);
    this.history.unshift({
      ...item,
      status,
      timestamp: this.formatTimestamp(new Date()),
    });
  }

  private formatTimestamp(date: Date): string {
    return new Intl.DateTimeFormat('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }

  private toTime(timestamp: string): number {
    const parsed = Date.parse(timestamp);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
}
