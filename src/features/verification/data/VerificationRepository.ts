import { NetworkClient } from '../../../core/network/NetworkClient';
import { storeVerificationSession, VerificationActionKind } from '../../../core/verification/verificationSession';
import { VerificationRequest } from '../../../shared/types/models';
import { IVerificationRepository } from '../domain/IVerificationRepository';

const LABEL_TO_ACTION_KIND: Record<string, VerificationActionKind> = {
  placanje: 'payment',
  payment: 'payment',
  'prenos sredstava': 'transfer',
  prenos: 'transfer',
  transfer: 'transfer',
  'promena limita': 'limit_change',
  'limit change': 'limit_change',
  'izdavanje kartice': 'card_issue',
  'card issue': 'card_issue',
};

interface PendingApiResponse {
  pending?: PendingVerificationApiItem[];
}

interface PendingVerificationApiItem {
  id?: string;
  action?: string;
  code?: string;
  expiresAt?: string;
  attemptsRemaining?: number;
}

interface HistoryApiResponse {
  history?: HistoryVerificationApiItem[];
}

interface HistoryVerificationApiItem {
  id?: string;
  action?: string;
  status?: string;
  createdAt?: string;
}

export class VerificationRepository implements IVerificationRepository {
  constructor(private client: NetworkClient) {}

  async getHistory(): Promise<VerificationRequest[]> {
    const response = await this.client.get<HistoryApiResponse>('/v1/verification/history');
    return (response.history ?? []).map(item => ({
      id: this.hashString(item.id ?? `${item.action ?? ''}:${item.createdAt ?? ''}`),
      action: item.action ?? 'Verifikacija',
      description: item.action ?? 'Verifikacija',
      timestamp: item.createdAt ?? new Date().toISOString(),
      status: this.mapHistoryStatus(item.status),
      code: undefined,
    }));
  }

  async getPending(): Promise<VerificationRequest | null> {
    const response = await this.client.get<PendingApiResponse>('/v1/verification/pending');
    const item = [...(response.pending ?? [])]
      .sort((left, right) => Date.parse(right.expiresAt ?? '') - Date.parse(left.expiresAt ?? ''))[0];

    if (!item) {
      return null;
    }

    const actionKind = LABEL_TO_ACTION_KIND[this.normalizeLabel(item.action)];
    if (item.id && item.code && actionKind) {
      storeVerificationSession({
        actionKind,
        verificationId: item.id,
        code: item.code,
        expiresAt: item.expiresAt ?? new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });
    }

    return {
      id: this.hashString(item.id ?? `${item.action ?? ''}:${item.expiresAt ?? ''}`),
      action: item.action ?? 'Verifikacija',
      description: 'Aktivan verifikacioni kod',
      timestamp: item.expiresAt ?? new Date().toISOString(),
      status: 'pending',
      code: item.code,
    };
  }

  async confirm(): Promise<void> {
    throw new Error('Potvrda zahteva direktno iz mobilne aplikacije nije podrzana na ovom backendu.');
  }

  async reject(): Promise<void> {
    throw new Error('Ignorisanje zahteva direktno iz mobilne aplikacije nije podrzano na ovom backendu.');
  }

  private mapHistoryStatus(status?: string): VerificationRequest['status'] {
    switch ((status ?? '').toLowerCase()) {
      case 'success':
      case 'confirmed':
        return 'confirmed';
      case 'failed':
      case 'rejected':
        return 'rejected';
      case 'expired':
        return 'expired';
      default:
        return 'pending';
    }
  }

  private normalizeLabel(value?: string): string {
    return (value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
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
