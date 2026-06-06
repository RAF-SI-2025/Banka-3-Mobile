import { NetworkClient } from '../../../core/network/NetworkClient';
import {
  storeVerificationSession,
  VerificationActionKind,
} from '../../../core/verification/verificationSession';
import { ITotpRepository, TransactionCodeResult } from '../domain/ITotpRepository';

interface VerificationCodeApiResponse {
  code: string;
  verificationId?: string;
  expiresAt?: string;
}

export class TotpRepository implements ITotpRepository {
  constructor(private client: NetworkClient) {}

  async requestTransactionCode(actionKind: VerificationActionKind = 'payment'): Promise<TransactionCodeResult> {
    const response = await this.client.post<VerificationCodeApiResponse>('/v1/verification/request', {
      actionKind,
    });

    const expiresAt = response.expiresAt ?? new Date(Date.now() + 5 * 60 * 1000).toISOString();
    if (response.verificationId) {
      storeVerificationSession({
        actionKind,
        verificationId: response.verificationId,
        code: response.code,
        expiresAt,
      });
    }

    return {
      code: response.code,
      validUntilUnix: Math.floor(Date.parse(expiresAt) / 1000),
      maxAttempts: 3,
    };
  }
}
