import { ExchangeRate } from '../../../shared/types/models';
export interface IExchangeRepository {
  getRates(): Promise<ExchangeRate[]>;

  convert(params: {
    fromAccountId: number;
    toAccountId: number;
    fromAccountNumber: string;
    toAccountNumber: string;
    fromCurrency: string;
    toCurrency: string;
    amount: number;
    description: string;
    totpCode?: string;
  }): Promise<{ convertedAmount: number; rate: number; fee?: number; status?: string; purpose?: string }>;
}
