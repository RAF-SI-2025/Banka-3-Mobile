import { Card, CardRequest } from '../../../shared/types/models';
export interface ICardRepository {
  getCards(): Promise<Card[]>;
  blockCard(cardNumber: string): Promise<void>;
  requestCard(request: CardRequest): Promise<{ accepted: boolean }>;
  confirmCard(token: string): Promise<void>;
}
