export interface TransactionCodeResult {
  code: string;
  validUntilUnix: number;
  maxAttempts: number;
}

export interface ITotpRepository {
  requestTransactionCode(): Promise<TransactionCodeResult>;
}
