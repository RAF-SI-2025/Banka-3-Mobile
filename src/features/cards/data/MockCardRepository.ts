import { ICardRepository } from '../domain/ICardRepository';
import { Card, CardRequest } from '../../../shared/types/models';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

let cards: Card[] = [
  {
    id: 1,
    cardNumber: '4532 1234 5678 9012',
    cardName: 'Visa Debit',
    cardType: 'debit',
    cardBrand: 'visa',
    accountId: 1,
    accountNumber: '265-0000000011234-56',
    creationDate: '2024-01-15',
    expiresAt: '06/27',
    expirationDate: '06/27',
    cvv: '123',
    limit: 500000,
    status: 'active',
    currency: 'RSD',
  },
  {
    id: 2,
    cardNumber: '5412 7534 9821 0043',
    cardName: 'Mastercard EUR',
    cardType: 'debit',
    cardBrand: 'mastercard',
    accountId: 2,
    accountNumber: '265-0000000011234-78',
    creationDate: '2024-02-10',
    expiresAt: '01/28',
    expirationDate: '01/28',
    cvv: '456',
    limit: 3000,
    status: 'active',
    currency: 'EUR',
  },
  {
    id: 3,
    cardNumber: '4916 8801 2234 5567',
    cardName: 'Visa Gold',
    cardType: 'credit',
    cardBrand: 'visa',
    accountId: 1,
    accountNumber: '265-0000000011234-56',
    creationDate: '2024-03-01',
    expiresAt: '12/26',
    expirationDate: '12/26',
    cvv: '789',
    limit: 200000,
    status: 'blocked',
    currency: 'RSD',
  },
];

export class MockCardRepository implements ICardRepository {
  async getCards(): Promise<Card[]> { await delay(400); return [...cards]; }
  async blockCard(cardNumber: string): Promise<void> {
    await delay(600);
    cards = cards.map(c => c.cardNumber.replace(/\s/g, '') === cardNumber.replace(/\s/g, '')
      ? { ...c, status: 'blocked' as const }
      : c);
  }
  async requestCard(request: CardRequest): Promise<{ accepted: boolean }> {
    await delay(700);
    const nextId = cards.reduce((max, card) => Math.max(max, card.id), 0) + 1;
    const lastDigits = String(nextId).padStart(4, '0');
    const prefix = request.cardType === 'credit' ? '4999' : '4111';
    const generatedNumber = `${prefix} 0000 0000 ${lastDigits}`;
    const generatedName = request.cardName
      ?? (request.cardType === 'credit'
        ? `Kreditna kartica ${request.currency}`
        : `Debitna kartica ${request.currency}`);

    cards = [
      ...cards,
      {
        id: nextId,
        cardNumber: generatedNumber,
        cardName: generatedName,
        cardType: request.cardType,
        cardBrand: request.cardBrand,
        accountId: request.accountId ?? cards[0]?.accountId ?? 1,
        accountNumber: request.accountNumber,
        creationDate: new Date().toISOString().slice(0, 10),
        expiresAt: '12/29',
        expirationDate: '12/29',
        cvv: '321',
        limit: request.limit ?? (request.cardType === 'credit' ? 200000 : 500000),
        status: 'active',
        currency: request.currency,
      },
    ];

    return { accepted: true };
  }

  async confirmCard(_token: string): Promise<void> {
    await delay(500);
  }
}
