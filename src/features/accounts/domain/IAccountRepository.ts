import { Account, AccountLimitUpdate, Transaction } from '../../../shared/types/models';
export interface IAccountRepository {
  getAccounts(): Promise<Account[]>;
  getAccountById(id: number): Promise<Account>;
  getTransactions(accountId: number): Promise<Transaction[]>;
  updateAccountName(accountNumber: string, name: string): Promise<void>;
  updateAccountLimits(accountNumber: string, updates: AccountLimitUpdate): Promise<void>;
}
