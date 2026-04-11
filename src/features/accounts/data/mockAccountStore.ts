import { Account, Transaction } from '../../../shared/types/models';

const ACCOUNTS: Account[] = [
  {
    id: 1,
    accountNumber: '265-0000000011234-56',
    ownerId: 1,
    ownerName: 'Marko Petrović',
    name: 'Tekuci racun',
    type: 'tekuci',
    subtype: 'Standardni',
    currency: 'RSD',
    balance: 347250.0,
    availableBalance: 335750.0,
    reservedAmount: 11500.0,
    status: 'active',
    createdAt: '2023-06-15',
    expiresAt: '2028-06-15',
    monthlyMaintenance: 255.0,
    dailyLimit: 250000.0,
    monthlyLimit: 1000000.0,
    dailySpent: 18240.5,
    monthlySpent: 87430.0,
  },
  {
    id: 2,
    accountNumber: '265-0000000011234-78',
    ownerId: 1,
    ownerName: 'Marko Petrović',
    name: 'Devizni racun',
    type: 'devizni',
    subtype: 'Licni',
    currency: 'EUR',
    balance: 2150.0,
    availableBalance: 2150.0,
    reservedAmount: 0,
    status: 'active',
    createdAt: '2023-06-15',
    expiresAt: '2028-06-15',
    dailyLimit: 5000.0,
    monthlyLimit: 20000.0,
    dailySpent: 89.99,
    monthlySpent: 420.0,
  },
  {
    id: 3,
    accountNumber: '265-0000000011234-90',
    ownerId: 1,
    ownerName: 'Marko Petrović',
    name: 'Poslovni devizni racun',
    type: 'poslovni',
    subtype: 'DOO',
    companyName: 'Petrovic Consulting DOO',
    currency: 'USD',
    balance: 9800.0,
    availableBalance: 9600.0,
    reservedAmount: 200.0,
    status: 'active',
    createdAt: '2024-01-10',
    expiresAt: '2029-01-10',
    dailyLimit: 15000.0,
    monthlyLimit: 75000.0,
    dailySpent: 1250.0,
    monthlySpent: 11200.0,
  },
];

const TRANSACTIONS: Transaction[] = [
  { id: 1, accountId: 1, description: 'Mesecna rata kredita', amount: -15420.0, currency: 'RSD', date: '05.03.2025', status: 'completed' },
  { id: 2, accountId: 1, description: 'Uplata plate - IT Solutions doo', amount: 185000.0, currency: 'RSD', date: '01.03.2025', status: 'completed' },
  { id: 3, accountId: 1, description: 'Maxi Market - kupovina', amount: -3240.5, currency: 'RSD', date: '28.02.2025', status: 'completed' },
  { id: 4, accountId: 1, description: 'EPS - racun za struju', amount: -4580.0, currency: 'RSD', date: '25.02.2025', status: 'completed' },
  { id: 5, accountId: 1, description: 'Povracaj poreza', amount: 12500.0, currency: 'RSD', date: '20.02.2025', status: 'completed' },
  { id: 6, accountId: 1, description: 'Telenor - mesecni racun', amount: -2890.0, currency: 'RSD', date: '18.02.2025', status: 'completed' },
  { id: 7, accountId: 2, description: 'Freelance - Upwork', amount: 450.0, currency: 'EUR', date: '02.03.2025', status: 'completed' },
  { id: 8, accountId: 2, description: 'Amazon.de - porudzbina', amount: -89.99, currency: 'EUR', date: '27.02.2025', status: 'completed' },
  { id: 9, accountId: 3, description: 'Mesecna stednja - auto prenos', amount: 50000.0, currency: 'RSD', date: '01.03.2025', status: 'completed' },
];

function cloneAccount(account: Account): Account {
  return { ...account };
}

function cloneTransaction(transaction: Transaction): Transaction {
  return { ...transaction };
}

function nextTransactionId(): number {
  return TRANSACTIONS.reduce((max, transaction) => Math.max(max, transaction.id), 0) + 1;
}

function formatNow(): string {
  return new Date().toLocaleString('sr-RS');
}

export function getMockAccounts(): Account[] {
  return ACCOUNTS.map(cloneAccount);
}

export function getMockAccountById(id: number): Account | undefined {
  const account = ACCOUNTS.find(item => item.id === id);
  return account ? cloneAccount(account) : undefined;
}

export function getMockTransactions(accountId: number): Transaction[] {
  return TRANSACTIONS.filter(transaction => transaction.accountId === accountId).map(cloneTransaction);
}

export function updateMockAccountName(accountNumber: string, name: string): void {
  const account = ACCOUNTS.find(item => item.accountNumber === accountNumber);
  if (!account) {
    throw new Error('Racun nije pronadjen');
  }

  account.name = name;
}

export function updateMockAccountLimits(accountNumber: string, updates: { dailyLimit?: number; monthlyLimit?: number }): void {
  const account = ACCOUNTS.find(item => item.accountNumber === accountNumber);
  if (!account) {
    throw new Error('Racun nije pronadjen');
  }

  if (updates.dailyLimit !== undefined) {
    account.dailyLimit = updates.dailyLimit;
  }

  if (updates.monthlyLimit !== undefined) {
    account.monthlyLimit = updates.monthlyLimit;
  }
}

export function applyMockExchangeTransfer(params: {
  fromAccountId: number;
  toAccountId: number;
  fromAmount: number;
  toAmount: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
}): void {
  const fromAccount = ACCOUNTS.find(account => account.id === params.fromAccountId);
  const toAccount = ACCOUNTS.find(account => account.id === params.toAccountId);

  if (!fromAccount || !toAccount) {
    throw new Error('Izabrani racun nije pronadjen.');
  }

  if (fromAccount.availableBalance < params.fromAmount) {
    throw new Error('Nedovoljno sredstava na racunu.');
  }

  fromAccount.balance -= params.fromAmount;
  fromAccount.availableBalance -= params.fromAmount;
  toAccount.balance += params.toAmount;
  toAccount.availableBalance += params.toAmount;

  const timestamp = formatNow();
  const roundedRate = params.rate.toFixed(2);

  TRANSACTIONS.unshift(
    {
      id: nextTransactionId(),
      accountId: fromAccount.id,
      description: `Menjačnica - odlazna konverzija`,
      amount: -params.fromAmount,
      currency: params.fromCurrency,
      date: timestamp,
      status: 'completed',
      recipientName: toAccount.name,
      recipientAccount: toAccount.accountNumber,
      purpose: `Kurs ${roundedRate}`,
    },
    {
      id: nextTransactionId() + 1,
      accountId: toAccount.id,
      description: `Menjačnica - dolazna konverzija`,
      amount: params.toAmount,
      currency: params.toCurrency,
      date: timestamp,
      status: 'completed',
      recipientName: fromAccount.name,
      recipientAccount: fromAccount.accountNumber,
      purpose: `Kurs ${roundedRate}`,
    }
  );
}
