import { IExchangeRepository } from '../domain/IExchangeRepository';
import { ExchangeRate } from '../../../shared/types/models';
import { API_CONFIG, ApiError, NetworkClient } from '../../../core/network/NetworkClient';
import { consumeVerificationSession, ensureVerificationHeaders } from '../../../core/verification/verificationApi';
import { MockExchangeRepository } from './MockExchangeRepository';

interface AccountListApiResponse {
  accounts?: Array<{ id?: string; number?: string }>;
}

interface ExchangeRatesApiResponse {
  rates?: ExchangeRateApiResponse[];
}

interface ExchangeRateApiResponse {
  from?: string;
  to?: string;
  bid?: number | string;
  ask?: number | string;
}

interface TransferResultApiResponse {
  status?: string;
  transactions?: Array<{
    toAmount?: string;
    rate?: string;
    toAccountId?: string;
  }>;
}

export class ExchangeRepository implements IExchangeRepository {
  private fallbackRepository = new MockExchangeRepository();

  constructor(private client: NetworkClient) {}

  async getRates(): Promise<ExchangeRate[]> {
    try {
      const response = await this.client.get<ExchangeRatesApiResponse>('/v1/exchange/rates');
      return (response.rates ?? []).map(rate => this.mapRate(rate));
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
    const fromAccount = await this.findAccountByNumber(params.fromAccountNumber);
    const toAccount = await this.findAccountByNumber(params.toAccountNumber);
    if (!fromAccount?.id || !toAccount?.id) {
      throw new Error('Nije moguce pronaci racune za konverziju na backendu.');
    }

    const headers = await ensureVerificationHeaders(this.client, 'transfer', params.totpCode);
    const response = await this.client.post<TransferResultApiResponse>(
      '/v1/transfers',
      {
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        amount: this.formatDecimal(params.amount),
        purpose: params.description,
      },
      headers
    );

    consumeVerificationSession('transfer');

    const incomingLeg = (response.transactions ?? []).find(leg => leg.toAccountId === toAccount.id) ?? response.transactions?.[0];
    const convertedAmount = this.toOptionalNumber(incomingLeg?.toAmount) ?? params.amount;
    const rate = this.toOptionalNumber(incomingLeg?.rate) ?? (params.amount > 0 ? convertedAmount / params.amount : 0);

    return {
      convertedAmount,
      rate,
      status: response.status,
      purpose: params.description,
    };
  }

  private async findAccountByNumber(accountNumber: string): Promise<{ id?: string; number?: string } | undefined> {
    const accounts = (await this.client.get<AccountListApiResponse>('/v1/accounts')).accounts ?? [];
    const normalized = accountNumber.trim();
    return accounts.find(account => (account.number ?? '').trim() === normalized);
  }

  private mapRate(rate: ExchangeRateApiResponse): ExchangeRate {
    const fromCurrency = this.mapCurrency(rate.from);
    const toCurrency = this.mapCurrency(rate.to);
    const buyRate = this.toNumber(rate.bid);
    const sellRate = this.toNumber(rate.ask);

    return {
      fromCurrency,
      toCurrency,
      buyRate,
      sellRate,
      middleRate: (buyRate + sellRate) / 2,
    };
  }

  private mapCurrency(currency?: string): string {
    return (currency ?? 'CURRENCY_RSD').replace('CURRENCY_', '');
  }

  private toNumber(value: number | string | undefined): number {
    const parsed = typeof value === 'string' ? Number.parseFloat(value) : value;
    if (parsed === undefined || !Number.isFinite(parsed)) {
      throw new Error('Neispravan broj u odgovoru servera.');
    }
    return parsed;
  }

  private toOptionalNumber(value: number | string | undefined): number | undefined {
    if (value === undefined) {
      return undefined;
    }
    const parsed = typeof value === 'string' ? Number.parseFloat(value) : value;
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private formatDecimal(value: number): string {
    return value.toFixed(2);
  }

  private shouldUseMockFallback(error: unknown): boolean {
    return (
      error instanceof ApiError &&
      (error.statusCode === 0 || error.statusCode === 404 || error.statusCode >= 500)
    );
  }
}
