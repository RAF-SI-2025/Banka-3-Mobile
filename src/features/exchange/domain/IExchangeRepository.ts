import { ExchangeRate } from '../../../shared/types/models';
export interface IExchangeRepository {
  getRates(): Promise<ExchangeRate[]>;

  convert(
    fromCurrency: string,
    toCurrency: string,
    amount: number
  ): Promise<{ convertedAmount: number; rate: number }>;
}
