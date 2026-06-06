import { IAuthRepository, LoginParams, LoginResult } from '../domain/IAuthRepository';
import { Client } from '../../../shared/types/models';
import { NetworkClient } from '../../../core/network/NetworkClient';
import { tokenStorage } from '../../../core/storage/tokenStorage';

interface LoginApiResponse {
  access_token?: string;
  refresh_token?: string;
  accessToken?: string;
  refreshToken?: string;
  permissions?: string[];
  session_id?: string;
  sessionId?: string;
  user_id?: string;
  userId?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
}

interface RefreshApiResponse {
  access_token?: string;
  refresh_token?: string;
  accessToken?: string;
  refreshToken?: string;
  permissions?: string[];
  session_id?: string;
  sessionId?: string;
}

interface MeApiResponse {
  client?: {
    id?: string;
    firstName?: string;
    first_name?: string;
    lastName?: string;
    last_name?: string;
    dateOfBirth?: string;
    date_of_birth?: string;
    gender?: string;
    email?: string;
    phone?: string;
    phone_number?: string;
    address?: string;
  };
}

export class AuthRepository implements IAuthRepository {
  constructor(private client: NetworkClient) {}

  async login(params: LoginParams): Promise<LoginResult> {
    const response = await this.client.post<LoginApiResponse>('/v1/auth/login', {
      email: params.email,
      password: params.password,
      longLivedSession: true,
    });

    const accessToken = response.access_token ?? response.accessToken;
    const refreshToken = response.refresh_token ?? response.refreshToken;
    const sessionId = response.session_id ?? response.sessionId;
    if (!accessToken || !refreshToken) {
      throw new Error('Server nije vratio pristupne tokene.');
    }

    await tokenStorage.saveTokens(accessToken, refreshToken);
    await tokenStorage.saveSessionId(sessionId);

    const user = await this.getCurrentUser().catch(() => this.extractUser(response, accessToken, params.email));

    return {
      tokens: {
        accessToken,
        refreshToken,
        sessionId,
      },
      user,
      permissions: response.permissions,
    };
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      await this.client.post('/v1/auth/logout', refreshToken ? { refreshToken } : {});
    } catch {
      // Best-effort logout only.
    }
    await tokenStorage.clear();
  }

  async getCurrentUser(): Promise<Client> {
    const response = await this.client.get<MeApiResponse>('/v1/auth/me');
    const client = response.client;
    if (!client) {
      throw new Error('Server nije vratio podatke o klijentu.');
    }

    return {
      id: this.hashString(client.id ?? ''),
      remoteId: client.id ?? '',
      firstName: client.firstName ?? client.first_name ?? '',
      lastName: client.lastName ?? client.last_name ?? '',
      dateOfBirth: client.dateOfBirth ?? client.date_of_birth ?? '',
      gender: client.gender ?? '',
      email: client.email ?? '',
      phone: client.phone ?? client.phone_number ?? '',
      address: client.address ?? '',
      accounts: [],
    };
  }

  async isAuthenticated(): Promise<boolean> {
    return tokenStorage.hasTokens();
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.client.post('/v1/auth/password-reset/request', { email });
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    await this.client.post('/v1/auth/password-reset/confirm', {
      token,
      newPassword,
    });
  }

  async refreshAccessToken(): Promise<string> {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('Nema refresh tokena');
    }

    const response = await this.client.post<RefreshApiResponse>('/v1/auth/refresh', {
      refreshToken,
      longLivedSession: true,
    });

    const newAccessToken = response.access_token ?? response.accessToken;
    const newRefreshToken = response.refresh_token ?? response.refreshToken ?? refreshToken;
    const sessionId = response.session_id ?? response.sessionId;
    if (!newAccessToken) {
      throw new Error('Server nije vratio novi access token.');
    }

    await tokenStorage.saveTokens(newAccessToken, newRefreshToken);
    await tokenStorage.saveSessionId(sessionId);
    return newAccessToken;
  }

  private decodeJwt(token: string): Record<string, any> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }

  private extractUser(response: LoginApiResponse, token: string, email: string): Client {
    const decoded = this.decodeJwt(token);
    return this.mapJwtToClient(decoded, email, response);
  }

  private mapJwtToClient(
    decoded: Record<string, any> | null,
    email: string,
    response?: LoginApiResponse
  ): Client {
    const remoteId = String(
      decoded?.id ||
      decoded?.user_id ||
      decoded?.sub ||
      response?.user_id ||
      response?.userId ||
      ''
    );

    return {
      id: this.hashString(remoteId),
      remoteId,
      firstName: decoded?.first_name || decoded?.firstName || response?.first_name || response?.firstName || '',
      lastName: decoded?.last_name || decoded?.lastName || response?.last_name || response?.lastName || '',
      dateOfBirth: decoded?.date_of_birth || '',
      gender: decoded?.gender || '',
      email: decoded?.email || email,
      phone: decoded?.phone_number || decoded?.phone || '',
      address: decoded?.address || '',
      accounts: decoded?.accounts || [],
    };
  }

  private hashString(value: string): number {
    if (!value) {
      return 0;
    }

    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
    }
    return Math.abs(hash);
  }
}
