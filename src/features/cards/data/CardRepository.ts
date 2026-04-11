import { NetworkClient } from '../../../core/network/NetworkClient';
import { Card, CardRequest } from '../../../shared/types/models';
import { ICardRepository } from '../domain/ICardRepository';

interface CardApiResponse {
  id?: number | string;
  cardId?: number | string;
  card_id?: number | string;
  cardNumber?: string;
  card_number?: string;
  number?: string;
  cardName?: string;
  card_name?: string;
  name?: string;
  cardType?: string;
  card_type?: string;
  type?: string;
  cardBrand?: string;
  card_brand?: string;
  accountId?: number | string;
  account_id?: number | string;
  accountNumber?: string;
  account_number?: string;
  creationDate?: string;
  creation_date?: string;
  expiresAt?: string;
  expires_at?: string;
  expiration_date?: string;
  limit?: number | string;
  cardLimit?: number | string;
  cvv?: string;
  status?: string;
  currency?: string;
}

interface CardRequestApiResponse {
  id?: number | string;
  requestId?: number | string;
  request_id?: number | string;
  cardId?: number | string;
  card_id?: number | string;
  accepted?: boolean;
  accepted_card?: boolean;
}

export class CardRepository implements ICardRepository {
  constructor(private client: NetworkClient) {}

  async getCards(): Promise<Card[]> {
    const data = await this.client.get<CardApiResponse[]>('/api/cards');
    return data.map(card => this.mapCard(card));
  }

  async blockCard(cardNumber: string): Promise<void> {
    await this.client.patch(`/api/cards/${encodeURIComponent(this.normalizeCardNumber(cardNumber))}/block`);
  }

  async requestCard(request: CardRequest): Promise<{ accepted: boolean }> {
    await this.client.post<CardRequestApiResponse>('/api/cards', {
      account_number: request.accountNumber,
      card_type: request.cardType,
      card_brand: request.cardBrand,
    });
    return { accepted: true };
  }

  async confirmCard(token: string): Promise<void> {
    await this.client.get(`/api/cards/confirm?token=${encodeURIComponent(token.trim())}`);
  }

  private mapCard(card: CardApiResponse): Card {
    const cardNumber = card.cardNumber ?? card.card_number ?? card.number ?? '';
    const cardType = (card.cardType ?? card.card_type ?? card.type ?? 'debit').toLowerCase();
    const cardBrand = (card.cardBrand ?? card.card_brand ?? 'visa').toLowerCase();
    const accountNumber = card.accountNumber ?? card.account_number ?? '';
    const creationDate = card.creationDate ?? card.creation_date ?? '';
    const expirationDate = card.expiresAt ?? card.expires_at ?? card.expiration_date ?? '';
    const cvv = card.cvv ?? '';

    return {
      id: this.toNumber(card.id ?? card.cardId ?? card.card_id ?? this.hashCardNumber(cardNumber)),
      cardNumber,
      cardName: card.cardName ?? card.card_name ?? card.name ?? `${cardBrand.toUpperCase()} ${cardType === 'credit' ? 'kreditna' : 'debitna'} kartica`,
      cardType: cardType === 'credit' ? 'credit' : 'debit',
      cardBrand,
      accountId: this.toNumber(card.accountId ?? card.account_id ?? this.hashCardNumber(cardNumber)),
      accountNumber,
      creationDate,
      expiresAt: expirationDate,
      expirationDate,
      cvv,
      limit: this.toNumber(card.limit ?? card.cardLimit),
      status: this.mapStatus(card.status),
      currency: card.currency ?? 'RSD',
    };
  }

  private mapStatus(status: string | undefined): Card['status'] {
    const normalized = (status ?? '').toLowerCase();
    if (normalized === 'blocked' || normalized === 'blokirana') {
      return 'blocked';
    }

    if (normalized === 'deactivated' || normalized === 'deaktivirana' || normalized === 'inactive') {
      return 'deactivated';
    }

    return 'active';
  }

  private normalizeCardNumber(cardNumber: string): string {
    return cardNumber.replace(/\s/g, '');
  }

  private hashCardNumber(cardNumber: string): number {
    const digits = this.normalizeCardNumber(cardNumber);
    if (!digits) {
      return 0;
    }

    let hash = 0;
    for (let index = 0; index < digits.length; index += 1) {
      hash = ((hash << 5) - hash + digits.charCodeAt(index)) | 0;
    }
    return Math.abs(hash);
  }

  private toNumber(value: number | string | undefined): number {
    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    return Number.isFinite(parsed) ? (parsed as number) : 0;
  }
}
