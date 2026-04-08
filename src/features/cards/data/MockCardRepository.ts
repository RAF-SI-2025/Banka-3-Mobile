import { ICardRepository } from '../domain/ICardRepository';
import { Card } from '../../../shared/types/models';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

let cards: Card[] = [
  {
    id: '4532123456789012',
    cardNumber: '4532 1234 5678 9012',
    cardName: 'Visa Debit',
    cardType: 'debit',
    accountId: 'ACC001',
    expiresAt: '06/27',
    limit: 500000,
    status: 'active',
    currency: 'RSD',
  },
  {
    id: '5412753498210043',
    cardNumber: '5412 7534 9821 0043',
    cardName: 'Mastercard EUR',
    cardType: 'debit',
    accountId: 'ACC002',
    expiresAt: '01/28',
    limit: 3000,
    status: 'active',
    currency: 'EUR',
  },
  {
    id: '4916880122345567',
    cardNumber: '4916 8801 2234 5567',
    cardName: 'Visa Gold',
    cardType: 'credit',
    accountId: 'ACC001',
    expiresAt: '12/26',
    limit: 200000,
    status: 'blocked',
    currency: 'RSD',
  },
];

export class MockCardRepository implements ICardRepository {
  async getCards(): Promise<Card[]> {
    await delay(400);
    return [...cards];
  }

  async blockCard(cardNumber: string): Promise<void> {
    await delay(600);
    cards = cards.map(c =>
      c.id === cardNumber ? { ...c, status: 'blocked' as const } : c
    );
  }

  async unblockCard(cardNumber: string): Promise<void> {
    await delay(600);
    cards = cards.map(c =>
      c.id === cardNumber ? { ...c, status: 'active' as const } : c
    );
  }
}