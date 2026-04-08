import { Card } from '../../../shared/types/models';

export interface ICardRepository {
  getCards(): Promise<Card[]>;
  blockCard(cardNumber: string): Promise<void>;
  unblockCard(cardNumber: string): Promise<void>;
}