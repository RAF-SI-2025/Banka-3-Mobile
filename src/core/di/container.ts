import { API_CONFIG, apiClient } from '../network/NetworkClient';

import type { IAuthRepository } from '../../features/auth/domain/IAuthRepository';
import type { IAccountRepository } from '../../features/accounts/domain/IAccountRepository';
import type { IVerificationRepository } from '../../features/verification/domain/IVerificationRepository';
import type { IPaymentRepository } from '../../features/payments/domain/IPaymentRepository';
import type { IExchangeRepository } from '../../features/exchange/domain/IExchangeRepository';
import type { ICardRepository } from '../../features/cards/domain/ICardRepository';
import type { ILoanRepository } from '../../features/loans/domain/ILoanRepository';

import { MockAuthRepository } from '../../features/auth/data/MockAuthRepository';
import { MockAccountRepository } from '../../features/accounts/data/MockAccountRepository';
import { MockVerificationRepository } from '../../features/verification/data/MockVerificationRepository';
import { MockPaymentRepository } from '../../features/payments/data/MockPaymentRepository';
import { MockExchangeRepository } from '../../features/exchange/data/MockExchangeRepository';
import { MockCardRepository } from '../../features/cards/data/MockCardRepository';
import { MockLoanRepository } from '../../features/loans/data/MockLoanRepository';

import { AuthRepository } from '../../features/auth/data/AuthRepository';
import { AccountRepository } from '../../features/accounts/data/AccountRepository';
import { ExchangeRepository } from '../../features/exchange/data/ExchangeRepository';
import { RealCardRepository } from '../../features/cards/data/RealCardRepository';
import { RealLoanRepository } from '../../features/loans/data/RealLoanRepository';

import { VerificationRepository } from '../../features/verification/data/VerificationRepository';

class Container {
  private _authRepository?: IAuthRepository;
  private _accountRepository?: IAccountRepository;
  private _verificationRepository?: IVerificationRepository;
  private _paymentRepository?: IPaymentRepository;
  private _exchangeRepository?: IExchangeRepository;
  private _cardRepository?: ICardRepository;
  private _loanRepository?: ILoanRepository;

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
      this._verificationRepository = API_CONFIG.USE_MOCK
        ? new MockVerificationRepository()
        : new VerificationRepository(apiClient);
    }
    return this._verificationRepository;
  }

  get paymentRepository(): IPaymentRepository {
    if (!this._paymentRepository) {
      this._paymentRepository = new MockPaymentRepository();
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
      this._cardRepository = API_CONFIG.USE_MOCK
        ? new MockCardRepository()
        : new RealCardRepository(apiClient);
    }
    return this._cardRepository;
  }

  get loanRepository(): ILoanRepository {
    if (!this._loanRepository) {
      this._loanRepository = API_CONFIG.USE_MOCK
        ? new MockLoanRepository()
        : new RealLoanRepository(apiClient);
    }
    return this._loanRepository;
  }

  reset(): void {
    this._authRepository = undefined;
    this._accountRepository = undefined;
    this._verificationRepository = undefined;
    this._paymentRepository = undefined;
    this._exchangeRepository = undefined;
    this._cardRepository = undefined;
    this._loanRepository = undefined;
  }
}

export const container = new Container();