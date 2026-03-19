import { IExchangeRepository } from '../domain/IExchangeRepository';
import { ExchangeRate } from '../../../shared/types/models';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const RATES: ExchangeRate[] = [
  { fromCurrency: 'EUR', toCurrency: 'RSD', buyRate: 116.50, sellRate: 118.20, middleRate: 117.35 },
  { fromCurrency: 'USD', toCurrency: 'RSD', buyRate: 106.80, sellRate: 108.90, middleRate: 107.85 },
  { fromCurrency: 'CHF', toCurrency: 'RSD', buyRate: 118.10, sellRate: 120.50, middleRate: 119.30 },
  { fromCurrency: 'GBP', toCurrency: 'RSD', buyRate: 136.20, sellRate: 138.80, middleRate: 137.50 },
  { fromCurrency: 'JPY', toCurrency: 'RSD', buyRate: 0.71, sellRate: 0.74, middleRate: 0.725 },
  { fromCurrency: 'CAD', toCurrency: 'RSD', buyRate: 77.40, sellRate: 79.60, middleRate: 78.50 },
  { fromCurrency: 'AUD', toCurrency: 'RSD', buyRate: 68.90, sellRate: 70.80, middleRate: 69.85 },
];

export class MockExchangeRepository implements IExchangeRepository {
  async getRates(): Promise<ExchangeRate[]> {
    await delay(500);
    return RATES;
  }

  async convert(fromCurrency: string, toCurrency: string, amount: number) {
    await delay(800);

    const rate = RATES.find(r => r.fromCurrency === fromCurrency);

    if (!rate) throw new Error('Rate not found');

    const isBuying = fromCurrency === 'RSD'; // RSD -> foreign

    const usedRate = isBuying ? rate.sellRate : rate.buyRate;

    const convertedAmount = isBuying
      ? amount / usedRate   // RSD -> EUR
      : amount * usedRate;  // EUR -> RSD

    return {
      convertedAmount,
      rate: usedRate,
    };
  }
}
