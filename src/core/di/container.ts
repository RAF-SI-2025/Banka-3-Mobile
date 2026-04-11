import { API_CONFIG, apiClient } from '../network/NetworkClient';

import type { IAuthRepository } from '../../features/auth/domain/IAuthRepository';
import type { IAccountRepository } from '../../features/accounts/domain/IAccountRepository';
import type { IVerificationRepository } from '../../features/verification/domain/IVerificationRepository';
import type { IPaymentRepository } from '../../features/payments/domain/IPaymentRepository';
import type { IExchangeRepository } from '../../features/exchange/domain/IExchangeRepository';
import type { ICardRepository } from '../../features/cards/domain/ICardRepository';
import type { ILoanRepository } from '../../features/loans/domain/ILoanRepository';
import type { ITotpRepository } from '../../features/totp/domain/ITotpRepository';

import { MockAuthRepository } from '../../features/auth/data/MockAuthRepository';
import { MockAccountRepository } from '../../features/accounts/data/MockAccountRepository';
import { MockVerificationRepository } from '../../features/verification/data/MockVerificationRepository';
import { MockPaymentRepository } from '../../features/payments/data/MockPaymentRepository';
import { MockExchangeRepository } from '../../features/exchange/data/MockExchangeRepository';
import { MockTotpRepository } from '../../features/totp/data/MockTotpRepository';

import { AuthRepository } from '../../features/auth/data/AuthRepository';
import { AccountRepository } from '../../features/accounts/data/AccountRepository';
import { CardRepository } from '../../features/cards/data/CardRepository';
import { ExchangeRepository } from '../../features/exchange/data/ExchangeRepository';
import { LoanRepository } from '../../features/loans/data/LoanRepository';
import { PaymentRepository } from '../../features/payments/data/PaymentRepository';
import { TotpRepository } from '../../features/totp/data/TotpRepository';

class Container {
  private _authRepository?: IAuthRepository;
  private _accountRepository?: IAccountRepository;
  private _verificationRepository?: IVerificationRepository;
  private _paymentRepository?: IPaymentRepository;
  private _exchangeRepository?: IExchangeRepository;
  private _cardRepository?: ICardRepository;
  private _loanRepository?: ILoanRepository;
  private _totpRepository?: ITotpRepository;

  get authRepository(): IAuthRepository {
    if (!this._authRepository) {
      this._authRepository = API_CONFIG.USE_MOCK
        ? new MockAuthRepository()
        : new AuthRepository(apiClient);
    }
    return this._authRepository;
  }

  get accountRepository(): IAccountRepository {
    if (!this._accountRepository) {
      this._accountRepository = API_CONFIG.USE_MOCK
        ? new MockAccountRepository()
        : new AccountRepository(apiClient);
    }
    return this._accountRepository;
  }

  get verificationRepository(): IVerificationRepository {
    if (!this._verificationRepository) {
      this._verificationRepository = new MockVerificationRepository();
    }
    return this._verificationRepository;
  }

  get paymentRepository(): IPaymentRepository {
    if (!this._paymentRepository) {
      this._paymentRepository = API_CONFIG.USE_MOCK
        ? new MockPaymentRepository()
        : new PaymentRepository(apiClient);
    }
    return this._paymentRepository;
  }

  get exchangeRepository(): IExchangeRepository {
    if (!this._exchangeRepository) {
      this._exchangeRepository = API_CONFIG.USE_MOCK
        ? new MockExchangeRepository()
        : new ExchangeRepository(apiClient);
    }
    return this._exchangeRepository;
  }

  get cardRepository(): ICardRepository {
    if (!this._cardRepository) {
      this._cardRepository = new CardRepository(apiClient);
    }
    return this._cardRepository;
  }

  get loanRepository(): ILoanRepository {
    if (!this._loanRepository) {
      this._loanRepository = new LoanRepository(apiClient);
    }
    return this._loanRepository;
  }

  get totpRepository(): ITotpRepository {
    if (!this._totpRepository) {
      this._totpRepository = API_CONFIG.USE_MOCK
        ? new MockTotpRepository()
        : new TotpRepository(apiClient);
    }
    return this._totpRepository;
  }

  reset(): void {
    this._authRepository = undefined;
    this._accountRepository = undefined;
    this._verificationRepository = undefined;
    this._paymentRepository = undefined;
    this._exchangeRepository = undefined;
    this._cardRepository = undefined;
    this._loanRepository = undefined;
    this._totpRepository = undefined;
  }
}

export const container = new Container();
