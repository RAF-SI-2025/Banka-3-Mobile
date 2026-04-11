import { IAccountRepository } from '../domain/IAccountRepository';
import { Account, AccountLimitUpdate, Transaction } from '../../../shared/types/models';
import { getMockAccountById, getMockAccounts, getMockTransactions, updateMockAccountLimits, updateMockAccountName } from './mockAccountStore';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export class MockAccountRepository implements IAccountRepository {
  async getAccounts(): Promise<Account[]> {
    await delay(500);
    return getMockAccounts();
  }

  async getAccountById(id: number): Promise<Account> {
    await delay(300);
    const account = getMockAccountById(id);
    if (!account) throw new Error('Racun nije pronadjen');
    return account;
  }

  async getTransactions(accountId: number): Promise<Transaction[]> {
    await delay(400);
    return getMockTransactions(accountId);
  }

  async updateAccountName(accountNumber: string, name: string): Promise<void> {
    await delay(400);
    updateMockAccountName(accountNumber, name);
  }

  async updateAccountLimits(accountNumber: string, updates: AccountLimitUpdate): Promise<void> {
    await delay(400);
    updateMockAccountLimits(accountNumber, {
      dailyLimit: updates.dailyLimit,
      monthlyLimit: updates.monthlyLimit,
    });
  }
}
