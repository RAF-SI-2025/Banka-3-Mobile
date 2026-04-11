import { NetworkClient } from '../../../core/network/NetworkClient';
import { ITotpRepository, TransactionCodeResult } from '../domain/ITotpRepository';

interface TransactionCodeApiResponse {
  code: string;
  valid_until_unix?: number | string;
  validUntilUnix?: number | string;
  max_attempts?: number | string;
  maxAttempts?: number | string;
}

export class TotpRepository implements ITotpRepository {
  constructor(private client: NetworkClient) {}

  async requestTransactionCode(): Promise<TransactionCodeResult> {
    const response = await this.client.post<TransactionCodeApiResponse>('/api/totp/transaction-code');

    return {
      code: response.code,
      validUntilUnix: Number(response.valid_until_unix ?? response.validUntilUnix ?? 0),
      maxAttempts: Number(response.max_attempts ?? response.maxAttempts ?? 3),
    };
  }
}
