import { tokenStorage } from '../storage/tokenStorage';

export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.1.102:8080', // 'http://10.169.213.174:8080'
  USE_MOCK: false,
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
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!skipAuth) {
      const token = await tokenStorage.getAccessToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async get<T>(path: string): Promise<T> { return this.request<T>('GET', path); }
  async post<T>(path: string, body?: unknown): Promise<T> { return this.request<T>('POST', path, body); }
  async put<T>(path: string, body?: unknown): Promise<T> { return this.request<T>('PUT', path, body); }
  async patch<T>(path: string, body?: unknown): Promise<T> { return this.request<T>('PATCH', path, body); }
  async delete<T>(path: string): Promise<T> { return this.request<T>('DELETE', path); }

  private async request<T>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
    const headers = await this.getHeaders();
    let response: Response;

    console.log(`[API] ${method} ${this.baseUrl}${path}`);

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method, headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      throw this.mapNetworkError(error);
    }

    console.log(`[API] ${method} ${path} → ${response.status}`);

    if (response.status === 401 && retry) {
      console.log('[API] 401 — pokusavam refresh...');
      try {
        const newToken = await this.handleTokenRefresh();
        if (newToken) return this.request<T>(method, path, body, false);
      } catch (e) {
        console.log('[API] Refresh failed:', e);
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
        try { errorMessage = await response.text(); } catch {}
      }
      throw new ApiError(response.status, errorMessage);
    }
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) return {} as T;
    return response.json();
  }

  private async handleTokenRefresh(): Promise<string | null> {
    if (this.isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        this.refreshQueue.push({ resolve, reject });
      });
    }
    this.isRefreshing = true;
    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      console.log('[API] refresh token postoji:', !!refreshToken);
      if (!refreshToken) throw new Error('No refresh token');

      const headers = await this.getHeaders(true);
      let response: Response;
      try {
        response = await fetch(`${this.baseUrl}/api/token/refresh`, {
          method: 'POST', headers,
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch (error) {
        throw this.mapNetworkError(error);
      }

      console.log('[API] refresh status:', response.status);
      if (!response.ok) throw new Error('Refresh failed');

      const data = await response.json();
      console.log('[API] refresh data:', JSON.stringify(data));

      const newAccessToken = data.access_token ?? data.accessToken;
      const newRefreshToken = data.refresh_token ?? data.refreshToken ?? refreshToken;
      if (!newAccessToken) throw new Error('Refresh response missing access token');

      await tokenStorage.saveTokens(newAccessToken, newRefreshToken);
      this.refreshQueue.forEach(({ resolve }) => resolve(newAccessToken));
      this.refreshQueue = [];
      return newAccessToken;
    } catch (err) {
      this.refreshQueue.forEach(({ reject }) => reject(err));
      this.refreshQueue = [];
      throw err;
    } finally {
      this.isRefreshing = false;
    }
  }

  private mapNetworkError(error: unknown): ApiError {
    const message = error instanceof Error ? error.message : String(error);
    return new ApiError(0, `Ne mogu da pristupim serveru na ${this.baseUrl}. Detalj: ${message}`);
  }
}

export const apiClient = new NetworkClient();