import { NetworkClient } from '../../../core/network/NetworkClient';
import { consumeVerificationSession, ensureVerificationHeaders } from '../../../core/verification/verificationApi';
import { Card, CardRequest } from '../../../shared/types/models';
import { ICardRepository } from '../domain/ICardRepository';

interface AccountListApiResponse {
  accounts?: Array<{ id?: string; number?: string }>;
}

interface CardListApiResponse {
  cards?: CardApiResponse[];
}

interface CardApiResponse {
  id?: string;
  number?: string;
  brand?: string;
  name?: string;
  accountId?: string;
  authorizedPersonId?: string;
  cardLimit?: number | string;
  status?: string;
  expiresAt?: string;
  createdAt?: string;
}

export class CardRepository implements ICardRepository {
  constructor(private client: NetworkClient) {}

  async getCards(): Promise<Card[]> {
    const accountMap = await this.getAccountNumberMap();
    const data = await this.client.get<CardListApiResponse>('/v1/cards');
    return (data.cards ?? []).map(card => this.mapCard(card, accountMap));
  }

  async blockCard(cardNumber: string): Promise<void> {
    const card = await this.findCardByMaskedNumber(cardNumber);
    if (!card?.id) {
      throw new Error('Kartica nije pronadjena na backendu.');
    }

    await this.client.post(`/v1/cards/${encodeURIComponent(card.id)}/status`, {
      status: 'CARD_STATUS_BLOCKED',
    });
  }

  async requestCard(request: CardRequest): Promise<{ accepted: boolean }> {
    const account = await this.findAccountByNumber(request.accountNumber);
    if (!account?.id) {
      throw new Error('Racun za karticu nije pronadjen na backendu.');
    }

    const headers = await ensureVerificationHeaders(this.client, 'card_issue');
    await this.client.post(
      '/v1/cards',
      {
        accountId: account.id,
        brand: this.mapBrand(request.cardBrand),
        name: request.cardName ?? 'Debit',
        cardLimit: this.formatDecimal(request.limit ?? 100000),
      },
      headers
    );

    consumeVerificationSession('card_issue');
    return { accepted: true };
  }

  async confirmCard(_token: string): Promise<void> {
    throw new Error('Potvrda kartice preko e-mail tokena vise nije potrebna. Kartica se izdaje odmah nakon verifikacije.');
  }

  private async findAccountByNumber(accountNumber: string): Promise<{ id?: string; number?: string } | undefined> {
    const accounts = (await this.client.get<AccountListApiResponse>('/v1/accounts')).accounts ?? [];
    return accounts.find(account => (account.number ?? '').trim() === accountNumber.trim());
  }

  private async getAccountNumberMap(): Promise<Map<string, string>> {
    const accounts = (await this.client.get<AccountListApiResponse>('/v1/accounts')).accounts ?? [];
    const map = new Map<string, string>();
    for (const account of accounts) {
      if (account.id && account.number) {
        map.set(account.id, account.number);
      }
    }
    return map;
  }

  private async findCardByMaskedNumber(cardNumber: string): Promise<CardApiResponse | undefined> {
    const cards = (await this.client.get<CardListApiResponse>('/v1/cards')).cards ?? [];
    return cards.find(card => (card.number ?? '').trim() === cardNumber.trim());
  }

  private mapCard(card: CardApiResponse, accountMap: Map<string, string>): Card {
    const remoteId = card.id ?? '';
    const cardNumber = card.number ?? '';
    const brand = this.mapCardBrand(card.brand);
    const accountNumber = accountMap.get(card.accountId ?? '') ?? '';

    return {
      id: this.hashString(remoteId || cardNumber),
      remoteId,
      cardNumber,
      cardName: card.name ?? 'Debit',
      cardType: 'debit',
      cardBrand: brand,
      accountId: this.hashString(card.accountId ?? accountNumber),
      accountRemoteId: card.accountId ?? '',
      accountNumber,
      creationDate: card.createdAt ?? '',
      expiresAt: card.expiresAt ?? '',
      expirationDate: card.expiresAt ?? '',
      cvv: '',
      limit: this.toNumber(card.cardLimit),
      status: this.mapStatus(card.status),
      currency: this.inferCurrency(cardNumber, accountNumber),
    };
  }

  private mapBrand(brand: string): string {
    switch (brand.toLowerCase()) {
      case 'mastercard':
        return 'CARD_BRAND_MASTERCARD';
      case 'dinacard':
        return 'CARD_BRAND_DINACARD';
      case 'amex':
      case 'american_express':
        return 'CARD_BRAND_AMEX';
      default:
        return 'CARD_BRAND_VISA';
    }
  }

  private mapCardBrand(brand?: string): string {
    return (brand ?? 'CARD_BRAND_VISA').replace('CARD_BRAND_', '').toLowerCase();
  }

  private mapStatus(status: string | undefined): Card['status'] {
    const normalized = (status ?? '').toUpperCase();
    if (normalized.includes('BLOCKED')) {
      return 'blocked';
    }
    if (normalized.includes('DEACTIVATED') || normalized.includes('INACTIVE')) {
      return 'deactivated';
    }
    return 'active';
  }

  private inferCurrency(_cardNumber: string, accountNumber: string): string {
    if (accountNumber.startsWith('333')) {
      return 'RSD';
    }
    return 'RSD';
  }

  private formatDecimal(value: number): string {
    return value.toFixed(2);
  }

  private toNumber(value: number | string | undefined): number {
    const parsed = typeof value === 'string' ? Number.parseFloat(value) : value;
    return Number.isFinite(parsed) ? (parsed as number) : 0;
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
}
