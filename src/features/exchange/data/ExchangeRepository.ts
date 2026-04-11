import { IExchangeRepository } from '../domain/IExchangeRepository';
import { ExchangeRate } from '../../../shared/types/models';
import { API_CONFIG } from '../../../core/network/NetworkClient';
import { ApiError, NetworkClient } from '../../../core/network/NetworkClient';
import { MockExchangeRepository } from './MockExchangeRepository';

interface ExchangeRateApiResponse {
  currencyCode?: string;
  currency_code?: string;
  currency?: string;
  fromCurrency?: string;
  from_currency?: string;
  toCurrency?: string;
  to_currency?: string;
  buyRate?: number | string;
  buy_rate?: number | string;
  sellRate?: number | string;
  sell_rate?: number | string;
  middleRate?: number | string;
  middle_rate?: number | string;
}

interface ConvertApiResponse {
  convertedAmount?: number | string;
  converted_amount?: number | string;
  amount?: number | string;
  initial_amount?: number | string;
  final_amount?: number | string;
  fee?: number | string;
  rate?: number | string;
  exchangeRate?: number | string;
  exchange_rate?: number | string;
  status?: string;
  purpose?: string;
}

export class ExchangeRepository implements IExchangeRepository {
  private fallbackRepository = new MockExchangeRepository();

  constructor(private client: NetworkClient) {}

  async getRates(): Promise<ExchangeRate[]> {
    try {
      const responses = await this.tryGetRates();
      return responses.map(rate => this.mapRate(rate));
    } catch (error) {
      if (!API_CONFIG.USE_MOCK || !this.shouldUseMockFallback(error)) {
        throw error;
      }

      return this.fallbackRepository.getRates();
    }
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
    const {
      fromAccountId,
      toAccountId,
      fromAccountNumber,
      toAccountNumber,
      fromCurrency,
      toCurrency,
      amount,
      description,
      totpCode,
    } = params;

    const payload = {
      from_currency: fromCurrency,
      to_currency: toCurrency,
      amount,
      from_account: fromAccountNumber,
      to_account: toAccountNumber,
      description,
    };

    const endpoints = ['/api/exchange/convert'];
    const extraHeaders = totpCode ? { TOTP: totpCode } : undefined;

    for (const endpoint of endpoints) {
      try {
        const response = await this.client.post<ConvertApiResponse>(endpoint, payload, extraHeaders);
        return this.mapConversion(response);
      } catch (error) {
        if (!this.shouldTryNextEndpoint(error)) {
          throw error;
        }
      }
    }

    if (!API_CONFIG.USE_MOCK) {
      throw new Error('Backend nije prihvatio konverziju preko podrzanog endpointa.');
    }

    try {
      return await this.convertFromRates(fromCurrency, toCurrency, amount);
    } catch (error) {
      if (!this.shouldUseMockFallback(error)) {
        throw error;
      }

      return this.fallbackRepository.convert({
        fromAccountId,
        toAccountId,
        fromAccountNumber,
        toAccountNumber,
        fromCurrency,
        toCurrency,
        amount,
        description,
        totpCode,
      });
    }
  }

  private async tryGetRates(): Promise<ExchangeRateApiResponse[]> {
    return this.client.get<ExchangeRateApiResponse[]>('/api/exchange-rates');
  }

  private mapRate(rate: ExchangeRateApiResponse): ExchangeRate {
    const fromCurrency =
      rate.currencyCode ??
      rate.currency_code ??
      rate.currency ??
      rate.fromCurrency ??
      rate.from_currency;

    if (!fromCurrency) {
      throw new Error('Nepoznat format kursne liste.');
    }

    return {
      fromCurrency,
      toCurrency: rate.toCurrency ?? rate.to_currency ?? 'RSD',
      buyRate: this.toNumber(rate.buyRate ?? rate.buy_rate),
      sellRate: this.toNumber(rate.sellRate ?? rate.sell_rate),
      middleRate: this.toNumber(rate.middleRate ?? rate.middle_rate),
    };
  }

  private mapConversion(response: ConvertApiResponse) {
    const convertedAmount = this.toNumber(
      response.final_amount ?? response.convertedAmount ?? response.converted_amount ?? response.amount
    );
    const explicitRate = this.toOptionalNumber(
      response.rate ?? response.exchangeRate ?? response.exchange_rate
    );
    const initialAmount = this.toOptionalNumber(response.initial_amount);
    const derivedRate = initialAmount && initialAmount > 0 ? convertedAmount / initialAmount : undefined;
    const resolvedRate = explicitRate ?? derivedRate ?? 0;

    return {
      convertedAmount,
      rate: resolvedRate,
      fee: response.fee !== undefined ? this.toNumber(response.fee) : undefined,
      status: response.status,
      purpose: response.purpose,
    };
  }

  private async convertFromRates(fromCurrency: string, toCurrency: string, amount: number) {
    const rates = await this.getRates();
    const sourceCurrency = fromCurrency === 'RSD' ? toCurrency : fromCurrency;
    const sourceRate = rates.find(r => r.fromCurrency === sourceCurrency && r.toCurrency === 'RSD');
    if (!sourceRate) {
      throw new Error(`Kurs za ${sourceCurrency} nije pronađen.`);
    }

    if (fromCurrency === 'RSD') {
      const usedRate = sourceRate.sellRate;
      return {
        convertedAmount: amount / usedRate,
        rate: usedRate,
      };
    }

    if (toCurrency === 'RSD') {
      const usedRate = sourceRate.buyRate;
      return {
        convertedAmount: amount * usedRate,
        rate: usedRate,
      };
    }

    const targetRate = rates.find(r => r.fromCurrency === toCurrency && r.toCurrency === 'RSD');
    if (!targetRate) {
      throw new Error(`Kurs za ${toCurrency} nije pronađen.`);
    }

    const sourceToRsd = amount * sourceRate.buyRate;
    const convertedAmount = sourceToRsd / targetRate.sellRate;
    const effectiveRate = convertedAmount / amount;

    return {
      convertedAmount,
      rate: effectiveRate,
    };
  }

  private shouldTryNextEndpoint(error: unknown): boolean {
    return error instanceof ApiError && (error.statusCode === 0 || error.statusCode === 404);
  }

  private shouldUseMockFallback(error: unknown): boolean {
    return (
      error instanceof ApiError &&
      (error.statusCode === 0 || error.statusCode === 404 || error.statusCode >= 500)
    );
  }

  private toNumber(value: number | string | undefined): number {
    const parsed = typeof value === 'string' ? parseFloat(value) : value;

    if (parsed === undefined || !Number.isFinite(parsed)) {
      throw new Error('Neispravan broj u odgovoru servera.');
    }

    return parsed;
  }

  private toOptionalNumber(value: number | string | undefined): number | undefined {
    if (value === undefined) {
      return undefined;
    }

    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
