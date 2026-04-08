import { ICardRepository } from '../domain/ICardRepository';
import { Card } from '../../../shared/types/models';
import { NetworkClient } from '../../../core/network/NetworkClient';

interface ApiCard {
  card_number: string;
  card_type: string;
  card_name: string;
  expiration_date: string;
  account_number: string;
  limit: number;
  status: string;
}

function mapCard(c: ApiCard): Card {
  const s = c.status?.toLowerCase();
  let status: Card['status'] = 'active';
  if (s === 'blocked' || s === 'blokirana') status = 'blocked';
  else if (s === 'deactivated' || s === 'deaktivirana') status = 'deactivated';

  const expDate = c.expiration_date
    ? new Date(c.expiration_date).toLocaleDateString('en-US', {
        month: '2-digit',
        year: '2-digit',
      })
    : '';

  const raw = c.card_number?.replace(/\s/g, '') ?? '';
  const formatted = raw.replace(/(.{4})/g, '$1 ').trim();

  return {
    id: raw,
    cardNumber: formatted,
    cardName: c.card_name ?? '',
    cardType: c.card_type?.toLowerCase() === 'credit' ? 'credit' : 'debit',
    accountId: c.account_number ?? '',
    expiresAt: expDate,
    limit: c.limit ?? 0,
    status,
    currency: 'RSD',
  };
}

export class RealCardRepository implements ICardRepository {
  constructor(private client: NetworkClient) {}

  async getCards(): Promise<Card[]> {
    const res = await this.client.get<ApiCard[]>('/api/cards');
    return res.map(mapCard);
  }

  async blockCard(cardNumber: string): Promise<void> {
    await this.client.patch(`/api/cards/${cardNumber}/block`);
  }

  async unblockCard(cardNumber: string): Promise<void> {
    // Isti endpoint toggleuje status na backendu
    await this.client.patch(`/api/cards/${cardNumber}/block`);
  }
}