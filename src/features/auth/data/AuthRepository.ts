import { IAuthRepository, LoginParams, LoginResult } from '../domain/IAuthRepository';
import { Client } from '../../../shared/types/models';
import { NetworkClient } from '../../../core/network/NetworkClient';
import { tokenStorage } from '../../../core/storage/tokenStorage';

interface LoginApiResponse {
  accessToken: string;
  refreshToken: string;
  permissions: string[];
}

interface LogoutApiResponse {
  message: string;
}

interface RefreshApiResponse {
  access_token: string;
  refresh_token: string;
}

interface PasswordResetResponse {
  message: string;
}

export class AuthRepository implements IAuthRepository {
  constructor(private client: NetworkClient) {}

  async login(params: LoginParams): Promise<LoginResult> {
    const response = await this.client.post<LoginApiResponse>('/api/login', {
      email: params.email,
      password: params.password,
    });

    await tokenStorage.saveTokens(response.accessToken, response.refreshToken);

    const user = this.extractUserFromJwt(response.accessToken, params.email);

    return {
      tokens: {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      },
      user,
      permissions: response.permissions,
    };
  }

  async logout(): Promise<void> {
    try {
      await this.client.post<LogoutApiResponse>('/api/logout');
    } catch (e) {}
    await tokenStorage.clear();
  }

  async getCurrentUser(): Promise<Client> {
    const token = await tokenStorage.getAccessToken();
    if (!token) throw new Error('Niste prijavljeni');

    const decoded = this.decodeJwt(token);
    if (!decoded) throw new Error('Neispravan token');

    return this.mapJwtToClient(decoded, decoded.email || decoded.sub || '');
  }

  async isAuthenticated(): Promise<boolean> {
    return tokenStorage.hasTokens();
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.client.post<PasswordResetResponse>('/api/password-reset/request', { email });
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    await this.client.post<PasswordResetResponse>('/api/password-reset/confirm', {
      token,
      password: newPassword,
    });
  }

  async refreshAccessToken(): Promise<string> {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) throw new Error('Nema refresh tokena');

    const response = await this.client.post<RefreshApiResponse>('/api/token/refresh', {
      refresh_token: refreshToken,
    });

    await tokenStorage.saveTokens(response.access_token, response.refresh_token);
    return response.access_token;
  }

  private decodeJwt(token: string): Record<string, any> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(payload);
      return JSON.parse(decoded);
    } catch (e) {
      return null;
    }
  }

  private extractUserFromJwt(token: string, email: string): Client {
    const decoded = this.decodeJwt(token);
    return this.mapJwtToClient(decoded, email);
  }

  private mapJwtToClient(decoded: Record<string, any> | null, email: string): Client {
    return {
      id: decoded?.id || decoded?.user_id || decoded?.sub || 0,
      firstName: decoded?.first_name || decoded?.firstName || '',
      lastName: decoded?.last_name || decoded?.lastName || '',
      dateOfBirth: decoded?.date_of_birth ? new Date(decoded.date_of_birth).getTime() / 1000 : 0,
      gender: decoded?.gender || '',
      email: decoded?.email || email,
      phone: decoded?.phone_number || decoded?.phone || '',
      address: decoded?.address || '',
      accounts: decoded?.accounts || [],
    };
  }
}