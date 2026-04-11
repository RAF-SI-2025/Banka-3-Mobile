import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type PendingRequestKind = 'card' | 'loan';

export interface PendingCardRequest {
  id: string;
  kind: 'card';
  createdAt: string;
  accountName: string;
  accountNumber: string;
  cardType: 'debit' | 'credit';
  cardBrand: string;
  currency: string;
}

export interface PendingLoanRequest {
  id: string;
  kind: 'loan';
  createdAt: string;
  accountName: string;
  accountNumber: string;
  loanType: string;
  interestRateType?: 'fixed' | 'variable' | string;
  amount: number;
  currency: string;
  maturityMonths: number;
}

export type PendingRequest = PendingCardRequest | PendingLoanRequest;

const PENDING_REQUESTS_KEY_PREFIX = 'banka.pending_requests';

function buildKey(sessionId: string | null | undefined): string {
  return `${PENDING_REQUESTS_KEY_PREFIX}.${sessionId?.trim() || 'anonymous'}`;
}

class PendingRequestsStorage {
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
      // Ignore secure storage issues and keep the fallback behavior.
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

  private async readAll(sessionId: string | null | undefined): Promise<PendingRequest[]> {
    const key = buildKey(sessionId);
    let raw: string | null = null;

    if (this.isWeb()) {
      raw = this.getWebStorage()?.getItem(key) ?? null;
    } else {
      raw = await this.safeGetItem(key);
    }

    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as PendingRequest[]) : [];
    } catch {
      return [];
    }
  }

  private async writeAll(sessionId: string | null | undefined, requests: PendingRequest[]): Promise<void> {
    const key = buildKey(sessionId);
    const serialized = JSON.stringify(requests);

    if (this.isWeb()) {
      this.getWebStorage()?.setItem(key, serialized);
      return;
    }

    await this.safeSetItem(key, serialized);
  }

  async list(sessionId: string | null | undefined): Promise<PendingRequest[]> {
    return this.readAll(sessionId);
  }

  async listByKind(sessionId: string | null | undefined, kind: PendingRequestKind): Promise<PendingRequest[]> {
    const current = await this.readAll(sessionId);
    return current.filter(request => request.kind === kind);
  }

  async add(sessionId: string | null | undefined, request: PendingRequest): Promise<void> {
    const current = await this.readAll(sessionId);
    await this.writeAll(sessionId, [request, ...current]);
  }

  async addCard(sessionId: string | null | undefined, request: PendingCardRequest): Promise<void> {
    await this.add(sessionId, request);
  }

  async addLoan(sessionId: string | null | undefined, request: PendingLoanRequest): Promise<void> {
    await this.add(sessionId, request);
  }

  async remove(sessionId: string | null | undefined, id: string): Promise<void> {
    const current = await this.readAll(sessionId);
    await this.writeAll(sessionId, current.filter(request => request.id !== id));
  }

  async clearKind(sessionId: string | null | undefined, kind: PendingRequestKind): Promise<void> {
    const current = await this.readAll(sessionId);
    await this.writeAll(sessionId, current.filter(request => request.kind !== kind));
  }

  async clear(sessionId: string | null | undefined): Promise<void> {
    const key = buildKey(sessionId);

    if (this.isWeb()) {
      this.getWebStorage()?.removeItem(key);
      return;
    }

    await this.safeDeleteItem(key);
  }
}

export const pendingRequestsStorage = new PendingRequestsStorage();
