
import { API_CONFIG, apiClient } from '../network/NetworkClient';

import type { IAuthRepository } from '../../features/auth/domain/IAuthRepository';

import { MockAuthRepository } from '../../features/auth/data/MockAuthRepository';

import { AuthRepository } from '../../features/auth/data/AuthRepository';

class Container {
  private _authRepository?: IAuthRepository;

  get authRepository(): IAuthRepository {
    if (!this._authRepository) {
      this._authRepository = API_CONFIG.USE_MOCK
        ? new MockAuthRepository()
        : new AuthRepository(apiClient);
    }
    return this._authRepository;
  }



  reset(): void {
    this._authRepository = undefined;
  }
}

export const container = new Container();