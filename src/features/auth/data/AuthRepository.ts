import { IAuthRepository, LoginParams, LoginResult } from '../domain/IAuthRepository';
import { Client } from '../../../shared/types/models';
import { NetworkClient } from '../../../core/network/NetworkClient';
import { tokenStorage } from '../../../core/storage/tokenStorage';

interface LoginApiResponse {
  access_token?: string;
  refresh_token?: string;
  accessToken?: string;
  refreshToken?: string;
}

interface RefreshApiResponse {
  access_token?: string;
  refresh_token?: string;
  accessToken?: string;
  refreshToken?: string;
}

interface ClientApiResponse {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: number;
  gender: string;
  email: string;
  phone_number: string;
  address: string;
}

export class AuthRepository implements IAuthRepository {
  constructor(private client: NetworkClient) {}

  async login(params: LoginParams): Promise<LoginResult> {
    const response = await this.client.post<LoginApiResponse>('/api/login', {
      email: params.email,
      password: params.password,
    });

    const accessToken = response.access_token ?? response.accessToken;
    const refreshToken = response.refresh_token ?? response.refreshToken;
    if (!accessToken || !refreshToken) {
      throw new Error('Server nije vratio pristupne tokene.');
    }

    await tokenStorage.saveTokens(accessToken, refreshToken);

    // Fetchuj prave podatke sa /api/clients/me
    let user: Client;
    try {
      user = await this.getCurrentUser();
    } catch {
      // Fallback na JWT ako /clients/me ne radi
      user = this.extractUserFromJwt(accessToken, params.email);
    }

    return { tokens: { accessToken, refreshToken }, user };
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/api/logout');
    } catch (e) {}
    await tokenStorage.clear();
  }

  async getCurrentUser(): Promise<Client> {
    const data = await this.client.get<ClientApiResponse>('/api/clients/me');
    return {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      dateOfBirth: data.date_of_birth,
      gender: data.gender,
      email: data.email,
      phone: data.phone_number,
      address: data.address,
      accounts: [],
    };
  }

  async isAuthenticated(): Promise<boolean> {
    return tokenStorage.hasTokens();
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.client.post('/api/password-reset/request', { email });
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    await this.client.post('/api/password-reset/confirm', {
      token,
      new_password: newPassword,
    });
  }

  async refreshAccessToken(): Promise<string> {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) throw new Error('Nema refresh tokena');

    const response = await this.client.post<RefreshApiResponse>('/api/token/refresh', {
      refresh_token: refreshToken,
    });

    const newAccessToken = response.access_token ?? response.accessToken;
    const newRefreshToken = response.refresh_token ?? response.refreshToken ?? refreshToken;
    if (!newAccessToken) throw new Error('Server nije vratio novi access token.');

    await tokenStorage.saveTokens(newAccessToken, newRefreshToken);
    return newAccessToken;
  }

  private decodeJwt(token: string): Record<string, any> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(payload));
    } catch (e) {
      return null;
    }
  }

  private extractUserFromJwt(token: string, email: string): Client {
    const decoded = this.decodeJwt(token);
    return {
      id: decoded?.id || 0,
      firstName: decoded?.first_name || '',
      lastName: decoded?.last_name || '',
      dateOfBirth: decoded?.date_of_birth || 0,
      gender: decoded?.gender || '',
      email: decoded?.email || email,
      phone: decoded?.phone_number || '',
      address: decoded?.address || '',
      accounts: [],
    };
  }
}