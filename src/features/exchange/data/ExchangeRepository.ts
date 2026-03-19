import { IExchangeRepository } from '../domain/IExchangeRepository';
import { ExchangeRate } from '../../../shared/types/models';
import { NetworkClient } from '../../../core/network/NetworkClient';

interface ExchangeRateApiResponse {
  currencyCode: string;
  buyRate: number;
  sellRate: number;
  middleRate: number;
}

export class ExchangeRepository implements IExchangeRepository {
  constructor(private client: NetworkClient) {}

  async getRates(): Promise<ExchangeRate[]> {
    const data = await this.client.get<ExchangeRateApiResponse[]>('/exchange-rates');

    return data.map(r => ({
      fromCurrency: r.currencyCode,
      toCurrency: 'RSD',
      buyRate: r.buyRate,
      sellRate: r.sellRate,
      middleRate: r.middleRate,
    }));
  }

  async convert(fromCurrency: string, toCurrency: string, amount: number) {
    const rates = await this.getRates();

    const rate = rates.find(r => r.fromCurrency === fromCurrency);

    if (!rate) throw new Error('Rate not found');

    const isBuying = fromCurrency === 'RSD';

    const usedRate = isBuying ? rate.sellRate : rate.buyRate;

    const convertedAmount = isBuying
      ? amount / usedRate
      : amount * usedRate;

    return {
      convertedAmount,
      rate: usedRate,
    };
  }
}