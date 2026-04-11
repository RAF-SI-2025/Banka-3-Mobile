import { ITotpRepository, TransactionCodeResult } from '../domain/ITotpRepository';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class MockTotpRepository implements ITotpRepository {
  async requestTransactionCode(): Promise<TransactionCodeResult> {
    await delay(350);
    return {
      code: '885988',
      validUntilUnix: Math.floor(Date.now() / 1000) + 300,
      maxAttempts: 3,
    };
  }
}
