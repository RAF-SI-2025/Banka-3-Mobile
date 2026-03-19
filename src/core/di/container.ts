import { API_CONFIG, apiClient } from '../network/NetworkClient';

// Interfaces
import type { IAuthRepository } from '../../features/auth/domain/IAuthRepository';
import type { IExchangeRepository } from '../../features/exchange/domain/IExchangeRepository';

// Mock implementations
import { MockAuthRepository } from '../../features/auth/data/MockAuthRepository';
import { MockExchangeRepository } from '../../features/exchange/data/MockExchangeRepository';

// Real implementations
import { AuthRepository } from '../../features/auth/data/AuthRepository';
import { ExchangeRepository } from '../../features/exchange/data/ExchangeRepository';

class Container {
  private _authRepository?: IAuthRepository;
  private _exchangeRepository?: IExchangeRepository;

  get authRepository(): IAuthRepository {
    if (!this._authRepository) {
      this._authRepository = API_CONFIG.USE_MOCK
        ? new MockAuthRepository()
        : new AuthRepository(apiClient);
    }
    return this._authRepository;
  }

  get exchangeRepository(): IExchangeRepository {
    if (!this._exchangeRepository) {
      this._exchangeRepository = API_CONFIG.USE_MOCK
        ? new MockExchangeRepository()
        : new ExchangeRepository(apiClient);
    }
    return this._exchangeRepository;
  }

  reset(): void {
    this._authRepository = undefined;
    this._exchangeRepository = undefined;
  }
}

export const container = new Container();