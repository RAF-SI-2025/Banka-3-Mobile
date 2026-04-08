import { IAuthRepository, LoginParams, LoginResult } from '../domain/IAuthRepository';
import { Client } from '../../../shared/types/models';
import { tokenStorage } from '../../../core/storage/tokenStorage';

const MOCK_USER: Client = {
  id: 1,
  firstName: 'Petar',
  lastName: 'Petrovic',
  dateOfBirth: 631152000,
  gender: 'M',
  email: 'petar@primer.raf',
  phone: '+381645555555',
  address: 'Njegoseva 25',
  accounts: [1, 2, 3],
};

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export class MockAuthRepository implements IAuthRepository {
  async login(params: LoginParams): Promise<LoginResult> {
    await delay(1200);
    if (!params.email || !params.password) {
      throw new Error('Email i lozinka su obavezni');
    }
    const tokens = {
      accessToken: `mock_jwt_${Date.now()}`,
      refreshToken: `mock_refresh_${Date.now()}`,
    };
    await tokenStorage.saveTokens(tokens.accessToken, tokens.refreshToken);
    return { tokens, user: MOCK_USER };
  }

  async logout(): Promise<void> {
    await delay(300);
    await tokenStorage.clear();
  }

  async getCurrentUser(): Promise<Client> {
    await delay(400);
    return MOCK_USER;
  }

  async isAuthenticated(): Promise<boolean> {
    return tokenStorage.hasTokens();
  }
}