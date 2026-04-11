import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CARD_REQUEST_KEY_PREFIX = 'banka.pending_card_request';

function buildKey(sessionId: string | null | undefined): string {
  return `${CARD_REQUEST_KEY_PREFIX}.${sessionId?.trim() || 'anonymous'}`;
}

class CardRequestStorage {
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
      // Ignore secure storage issues and keep the in-memory/web fallback.
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

  async savePending(sessionId: string | null | undefined): Promise<void> {
    const key = buildKey(sessionId);

    if (this.isWeb()) {
      this.getWebStorage()?.setItem(key, '1');
      return;
    }

    await this.safeSetItem(key, '1');
  }

  async isPending(sessionId: string | null | undefined): Promise<boolean> {
    const key = buildKey(sessionId);

    if (this.isWeb()) {
      return this.getWebStorage()?.getItem(key) === '1';
    }

    return (await this.safeGetItem(key)) === '1';
  }

  async clearPending(sessionId: string | null | undefined): Promise<void> {
    const key = buildKey(sessionId);

    if (this.isWeb()) {
      this.getWebStorage()?.removeItem(key);
      return;
    }

    await this.safeDeleteItem(key);
  }
}

export const cardRequestStorage = new CardRequestStorage();
