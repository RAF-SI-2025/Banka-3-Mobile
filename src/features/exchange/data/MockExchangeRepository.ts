import { IExchangeRepository } from '../domain/IExchangeRepository';
import { ExchangeRate } from '../../../shared/types/models';
import { applyMockExchangeTransfer } from '../../accounts/data/mockAccountStore';

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

  async convert(params: {
    fromAccountId: number;
    toAccountId: number;
    fromAccountNumber: string;
    toAccountNumber: string;
    fromCurrency: string;
    toCurrency: string;
    amount: number;
    description: string;
    totpCode?: string;
  }) {
    await delay(800);
    const { fromAccountId, toAccountId, fromCurrency, toCurrency, amount, description } = params;

    const sourceCurrency = fromCurrency === 'RSD' ? toCurrency : fromCurrency;
    const sourceRate = RATES.find(r => r.fromCurrency === sourceCurrency);
    if (!sourceRate) throw new Error('Rate not found');

    let convertedAmount: number;
    let usedRate: number;

    if (fromCurrency === 'RSD') {
      usedRate = sourceRate.sellRate;
      convertedAmount = amount / usedRate;
    } else if (toCurrency === 'RSD') {
      usedRate = sourceRate.buyRate;
      convertedAmount = amount * usedRate;
    } else {
      const targetRate = RATES.find(r => r.fromCurrency === toCurrency);
      if (!targetRate) throw new Error('Rate not found');

      const sourceToRsd = amount * sourceRate.buyRate;
      convertedAmount = sourceToRsd / targetRate.sellRate;
      usedRate = convertedAmount / amount;
    }

    applyMockExchangeTransfer({
      fromAccountId,
      toAccountId,
      fromAmount: amount,
      toAmount: convertedAmount,
      fromCurrency,
      toCurrency,
      rate: usedRate,
    });

    return {
      convertedAmount,
      rate: usedRate,
      fee: 0,
      status: 'realized',
      purpose: description,
    };
  }
}
