import { tokenStorage } from '../storage/tokenStorage';

export const API_CONFIG = {

  BASE_URL: 'http://192.168.1.102:8080',
  USE_MOCK: false,  // Connected to real backend

  TIMEOUT: 10000,
};

export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

  constructor(baseUrl: string = API_CONFIG.BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async getHeaders(skipAuth = false): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (!skipAuth) {
      const token = await tokenStorage.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  private async request<T>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
    const headers = await this.getHeaders();

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // 401 Try token refresh 
    if (response.status === 401 && retry) {
      try {
        const newToken = await this.handleTokenRefresh();
        if (newToken) {
          // Retry the original request with new token
          return this.request<T>(method, path, body, false);
        }
      } catch (e) {
        // Refresh failed — user needs to re-login
        await tokenStorage.clear();
        throw new ApiError(401, 'Sesija je istekla. Prijavite se ponovo.');
      }
    }

    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = 'Greška na serveru';
      try {
        const body = await response.json();
        errorMessage = body.message || body.error || JSON.stringify(body);
      } catch {
        try {
          errorMessage = await response.text();
        } catch {
          // fallback
        }
      }
      throw new ApiError(response.status, errorMessage);
    }

    // Handle empty responses (204 No Content, etc.)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return {} as T;
    }

    return response.json();
  }

  private async handleTokenRefresh(): Promise<string | null> {
    if (this.isRefreshing) {
      // Another request is already refreshing — wait for it
      return new Promise<string>((resolve, reject) => {
        this.refreshQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token');

      // Call refresh endpoint WITHOUT auth header (use refresh token in body)
      const headers = await this.getHeaders(true);
      const response = await fetch(`${this.baseUrl}/api/token/refresh`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) throw new Error('Refresh failed');

      const data = await response.json();
      const newAccessToken = data.access_token;

      // Swagger: /token/refresh only returns { access_token }, keep existing refresh token
      await tokenStorage.saveTokens(newAccessToken, refreshToken);

      // Resolve all queued requests
      this.refreshQueue.forEach(({ resolve }) => resolve(newAccessToken));
      this.refreshQueue = [];

      return newAccessToken;
    } catch (err) {
      // Reject all queued requests
      this.refreshQueue.forEach(({ reject }) => reject(err));
      this.refreshQueue = [];
      throw err;
    } finally {
      this.isRefreshing = false;
    }
  }
}

export const apiClient = new NetworkClient();
