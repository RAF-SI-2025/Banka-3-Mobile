import { VerificationActionKind } from '../../../core/verification/verificationSession';

export interface TransactionCodeResult {
  code: string;
  validUntilUnix: number;
  maxAttempts: number;
}

export interface ITotpRepository {
  requestTransactionCode(actionKind?: VerificationActionKind): Promise<TransactionCodeResult>;
}
