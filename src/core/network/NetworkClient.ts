import { Platform } from 'react-native';
import { tokenStorage } from '../storage/tokenStorage';
import { emitSessionInvalidated } from '../auth/sessionEvents';

const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const envUseMock = process.env.EXPO_PUBLIC_USE_MOCK?.trim().toLowerCase();
const envApiLogs = process.env.EXPO_PUBLIC_API_LOGS?.trim().toLowerCase();
const webBaseUrl = 'http://localhost:8081/api';
const defaultBaseUrl = Platform.OS === 'web' ? webBaseUrl : (envBaseUrl || webBaseUrl);

export const API_CONFIG = {
  BASE_URL: defaultBaseUrl,
  USE_MOCK: envUseMock ? envUseMock === 'true' : false,
  LOG_API: envApiLogs ? envApiLogs === 'true' : false,

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
  private readonly apiLogsEnabled = API_CONFIG.LOG_API;

  constructor(baseUrl: string = API_CONFIG.BASE_URL) {
    this.baseUrl = this.normalizeBaseUrl(baseUrl);
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

  async post<T>(path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<T> {
    return this.request<T>('POST', path, body, true, extraHeaders);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  async patch<T>(path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<T> {
    return this.request<T>('PATCH', path, body, true, extraHeaders);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    retry = true,
    extraHeaders?: Record<string, string>
  ): Promise<T> {
    const requestUrl = this.buildUrl(path);
    const startedAt = Date.now();
    const headers = await this.getHeaders();
    const mergedHeaders = { ...headers, ...extraHeaders };
    let response: Response;

    this.logRequestStart(method, requestUrl, !!body, extraHeaders);

    try {
      response = await fetch(requestUrl, {
        method,
        headers: mergedHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      const mappedError = this.mapNetworkError(error);
      this.logRequestFailure(method, requestUrl, startedAt, mappedError);
      throw mappedError;
    }

    if (response.status === 401) {
      const errorMessage = await this.readErrorMessage(response);

      if (this.isSessionInvalidationMessage(errorMessage)) {
        await tokenStorage.clear();
        emitSessionInvalidated();
        const sessionError = new ApiError(401, 'Sesija je istekla. Prijavite se ponovo.');
        this.logRequestFailure(method, requestUrl, startedAt, sessionError);
        throw sessionError;
      }

      if (this.isVerificationMessage(errorMessage)) {
        const verificationError = new ApiError(401, errorMessage || 'Unauthorized');
        this.logRequestFailure(method, requestUrl, startedAt, verificationError);
        throw verificationError;
      }

      if (retry) {
        try {
          const newToken = await this.handleTokenRefresh();
          if (newToken) {
            this.logRequestRetry(method, requestUrl);
            return this.request<T>(method, path, body, false, extraHeaders);
          }
        } catch {
          await tokenStorage.clear();
          emitSessionInvalidated();
          throw new ApiError(401, 'Sesija je istekla. Prijavite se ponovo.');
        }
      }

      const unauthorizedError = new ApiError(401, errorMessage || 'Unauthorized');
      this.logRequestFailure(method, requestUrl, startedAt, unauthorizedError);
      throw unauthorizedError;
    }

    try {
      const result = await this.handleResponse<T>(response);
      this.logRequestSuccess(method, requestUrl, startedAt, response.status);
      return result;
    } catch (error) {
      this.logRequestFailure(method, requestUrl, startedAt, error);
      throw error;
    }
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
      const refreshUrl = this.buildUrl('/api/token/refresh');
      const refreshStartedAt = Date.now();
      let response: Response;
      try {
        this.logRequestStart('POST', refreshUrl, true, undefined, true);
        response = await fetch(refreshUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch (error) {
        const mappedError = this.mapNetworkError(error);
        this.logRequestFailure('POST', refreshUrl, refreshStartedAt, mappedError, true);
        throw mappedError;
      }

      if (!response.ok) {
        const errorMessage = await this.readErrorMessage(response);
        const refreshError = new Error(errorMessage || 'Refresh failed');
        this.logRequestFailure('POST', refreshUrl, refreshStartedAt, refreshError, true);
        throw refreshError;
      }

      const data = await response.json();
      const newAccessToken = data.access_token ?? data.accessToken;
      const newRefreshToken = data.refresh_token ?? data.refreshToken ?? refreshToken;
      const sessionId = data.session_id ?? data.sessionId;

      if (!newAccessToken) {
        throw new Error('Refresh response missing access token');
      }

      // Swagger: /token/refresh only returns { access_token }, keep existing refresh token
      await tokenStorage.saveTokens(newAccessToken, newRefreshToken);
      await tokenStorage.saveSessionId(sessionId);
      this.logRequestSuccess('POST', refreshUrl, refreshStartedAt, response.status, true);

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

  private async readErrorMessage(response: Response): Promise<string> {
    try {
      const body = await response.clone().json();
      return body.message || body.error || JSON.stringify(body);
    } catch {
      try {
        return await response.clone().text();
      } catch {
        return '';
      }
    }
  }

  private isSessionInvalidationMessage(message: string): boolean {
    const normalized = message.trim().toLowerCase();
    return (
      normalized === 'no active session' ||
      normalized === 'account deactivated' ||
      normalized === 'wrong token' ||
      normalized === 'invalid token'
    );
  }

  private isVerificationMessage(message: string): boolean {
    const normalized = message.trim().toLowerCase();
    return (
      normalized.includes('verification code') ||
      normalized.includes('missing verification code')
    );
  }

  private mapNetworkError(error: unknown): ApiError {
    const message = error instanceof Error ? error.message : String(error);
    const platformHint = Platform.OS === 'web'
      ? 'U web pregledaču backend najčešće mora da bude dostupan na localhost i da CORS dozvoli origin.'
      : 'Za Expo Go na telefonu backend mora biti na istoj mrezi i dostupan preko LAN IP adrese.';

    return new ApiError(
      0,
      `Ne mogu da pristupim serveru na ${this.baseUrl}. ${platformHint} Detalj: ${message}`
    );
  }

  private normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/+$/, '');
  }

  private logRequestStart(
    method: string,
    url: string,
    hasBody: boolean,
    extraHeaders?: Record<string, string>,
    isRefresh = false
  ): void {
    if (!this.apiLogsEnabled) {
      return;
    }

    this.logStyled(
      'info',
      `${isRefresh ? '[refresh] ' : ''}→ ${method} ${this.shortUrl(url)}${hasBody ? ' (body)' : ''}${
        extraHeaders ? ' (extra headers)' : ''
      }`
    );
  }

  private logRequestSuccess(
    method: string,
    url: string,
    startedAt: number,
    status: number,
    isRefresh = false
  ): void {
    if (!this.apiLogsEnabled) {
      return;
    }

    this.logStyled(
      'success',
      `${isRefresh ? '[refresh] ' : ''}← ${method} ${this.shortUrl(url)} ${status} (${Date.now() - startedAt} ms)`
    );
  }

  private logRequestFailure(
    method: string,
    url: string,
    startedAt: number,
    error: unknown,
    isRefresh = false
  ): void {
    if (!this.apiLogsEnabled) {
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    this.logStyled(
      'error',
      `${isRefresh ? '[refresh] ' : ''}✕ ${method} ${this.shortUrl(url)} (${Date.now() - startedAt} ms) - ${message}`
    );
  }

  private logRequestRetry(method: string, url: string): void {
    if (!this.apiLogsEnabled) {
      return;
    }

    this.logStyled('warn', `↻ ${method} ${this.shortUrl(url)} after token refresh`);
  }

  private shortUrl(url: string): string {
    return url.replace(this.baseUrl, '').replace(/^\/+/, '/');
  }

  private logStyled(level: 'info' | 'success' | 'warn' | 'error', message: string): void {
    if (Platform.OS === 'web') {
      const styles: Record<typeof level, string> = {
        info: 'color:#2563eb;font-weight:600',
        success: 'color:#16a34a;font-weight:700',
        warn: 'color:#d97706;font-weight:700',
        error: 'color:#dc2626;font-weight:700',
      };
      const prefixStyles = 'color:#0f172a;font-weight:800';
      console.log(`%c[API]%c ${message}`, prefixStyles, styles[level]);
      return;
    }

    const colors: Record<typeof level, string> = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
    };
    const reset = '\x1b[0m';
    console.log(`${colors[level]}[API] ${message}${reset}`);
  }

  private buildUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    if (this.baseUrl.endsWith('/api') && normalizedPath.startsWith('/api/')) {
      return `${this.baseUrl}${normalizedPath.slice(4)}`;
    }

    return `${this.baseUrl}${normalizedPath}`;
  }
}

export const apiClient = new NetworkClient();
