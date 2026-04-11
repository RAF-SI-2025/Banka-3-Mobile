import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'banka.access_token';
const REFRESH_TOKEN_KEY = 'banka.refresh_token';
const SESSION_ID_KEY = 'banka.session_id';

class TokenStorage {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private sessionId: string | null = null;

  private isWeb(): boolean {
    return Platform.OS === 'web';
  }

  private getWebStorage(): Storage | null {
    if (!this.isWeb() || typeof window === 'undefined') {
      return null;
    }

    return window.localStorage;
  }

  private async safeSetItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Fall back to in-memory only if secure storage is unavailable.
    }
  }

  private async safeGetItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  }

  private async safeDeleteItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Ignore cleanup failures.
    }
  }

  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    if (this.isWeb()) {
      const storage = this.getWebStorage();
      storage?.setItem(ACCESS_TOKEN_KEY, accessToken);
      storage?.setItem(REFRESH_TOKEN_KEY, refreshToken);
      return;
    }

    await this.safeSetItem(ACCESS_TOKEN_KEY, accessToken);
    await this.safeSetItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  async saveSessionId(sessionId: string | null | undefined): Promise<void> {
    this.sessionId = sessionId ?? null;

    if (this.isWeb()) {
      const storage = this.getWebStorage();
      if (!storage) return;

      if (this.sessionId) {
        storage.setItem(SESSION_ID_KEY, this.sessionId);
      } else {
        storage.removeItem(SESSION_ID_KEY);
      }
      return;
    }

    if (this.sessionId) {
      await this.safeSetItem(SESSION_ID_KEY, this.sessionId);
    } else {
      await this.safeDeleteItem(SESSION_ID_KEY);
    }
  }

  async getAccessToken(): Promise<string | null> {
    if (this.accessToken) {
      return this.accessToken;
    }

    if (this.isWeb()) {
      const storage = this.getWebStorage();
      this.accessToken = storage?.getItem(ACCESS_TOKEN_KEY) ?? null;
      return this.accessToken;
    }

    this.accessToken = await this.safeGetItem(ACCESS_TOKEN_KEY);
    return this.accessToken;
  }

  async getRefreshToken(): Promise<string | null> {
    if (this.refreshToken) {
      return this.refreshToken;
    }

    if (this.isWeb()) {
      const storage = this.getWebStorage();
      this.refreshToken = storage?.getItem(REFRESH_TOKEN_KEY) ?? null;
      return this.refreshToken;
    }

    this.refreshToken = await this.safeGetItem(REFRESH_TOKEN_KEY);
    return this.refreshToken;
  }

  async getSessionId(): Promise<string | null> {
    if (this.sessionId) {
      return this.sessionId;
    }

    if (this.isWeb()) {
      const storage = this.getWebStorage();
      this.sessionId = storage?.getItem(SESSION_ID_KEY) ?? null;
      return this.sessionId;
    }

    this.sessionId = await this.safeGetItem(SESSION_ID_KEY);
    return this.sessionId;
  }

  async clear(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
    this.sessionId = null;

    if (this.isWeb()) {
      const storage = this.getWebStorage();
      storage?.removeItem(ACCESS_TOKEN_KEY);
      storage?.removeItem(REFRESH_TOKEN_KEY);
      storage?.removeItem(SESSION_ID_KEY);
      return;
    }

    await this.safeDeleteItem(ACCESS_TOKEN_KEY);
    await this.safeDeleteItem(REFRESH_TOKEN_KEY);
    await this.safeDeleteItem(SESSION_ID_KEY);
  }

  async hasTokens(): Promise<boolean> {
    const token = await this.getAccessToken();
    return token !== null;
  }
}

export const tokenStorage = new TokenStorage();
