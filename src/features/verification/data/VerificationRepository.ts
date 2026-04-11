import { ApiError, NetworkClient } from '../../../core/network/NetworkClient';
import { VerificationRequest } from '../../../shared/types/models';
import { IVerificationRepository } from '../domain/IVerificationRepository';

interface VerificationApiResponse {
  id?: number | string;
  action?: string;
  description?: string;
  amount?: string;
  recipientName?: string;
  recipient_name?: string;
  recipientAccount?: string;
  recipient_account?: string;
  sourceAccount?: string;
  source_account?: string;
  timestamp?: string;
  status?: string;
  code?: string;
}

interface VerificationListApiResponse {
  items?: VerificationApiResponse[];
  data?: VerificationApiResponse[];
  verifications?: VerificationApiResponse[];
  requests?: VerificationApiResponse[];
}

const PENDING_ENDPOINTS = [
  '/api/verification/pending',
  '/api/verifications/pending',
  '/api/transactions/verification/pending',
  '/api/transactions/pending-verification',
];

const HISTORY_ENDPOINTS = [
  '/api/verification/history',
  '/api/verifications/history',
  '/api/transactions/verification/history',
  '/api/transactions/verification-requests',
];

const CONFIRM_ENDPOINTS = (id: number) => [
  `/api/verification/${id}/confirm`,
  `/api/verifications/${id}/confirm`,
  `/api/transactions/${id}/confirm-verification`,
  '/api/verification/confirm',
  '/api/verifications/confirm',
  '/api/transactions/confirm-verification',
];

const REJECT_ENDPOINTS = (id: number) => [
  `/api/verification/${id}/reject`,
  `/api/verifications/${id}/reject`,
  `/api/transactions/${id}/reject-verification`,
  '/api/verification/reject',
  '/api/verifications/reject',
  '/api/transactions/reject-verification',
];

export class VerificationRepository implements IVerificationRepository {
  constructor(private client: NetworkClient) {}

  async getHistory(): Promise<VerificationRequest[]> {
    const response = await this.tryGet<VerificationApiResponse[] | VerificationListApiResponse>(HISTORY_ENDPOINTS);
    return this.mapList(response);
  }

  async getPending(): Promise<VerificationRequest | null> {
    const response = await this.tryGet<VerificationApiResponse | null>(PENDING_ENDPOINTS);
    if (!response) {
      return null;
    }

    return this.mapRequest(response);
  }

  async confirm(id: number): Promise<void> {
    await this.tryAction(CONFIRM_ENDPOINTS(id), id, 'confirm');
  }

  async reject(id: number): Promise<void> {
    await this.tryAction(REJECT_ENDPOINTS(id), id, 'reject');
  }

  private async tryGet<T>(endpoints: string[]): Promise<T> {
    let lastError: unknown;

    for (const endpoint of endpoints) {
      try {
        return await this.client.get<T>(endpoint);
      } catch (error) {
        if (!this.shouldTryNextEndpoint(error)) {
          throw error;
        }

        lastError = error;
      }
    }

    throw this.toNotFoundError('verifikacioni endpoint', lastError);
  }

  private async tryAction(
    endpoints: string[],
    id: number,
    action: 'confirm' | 'reject'
  ): Promise<void> {
    let lastError: unknown;
    const bodies = this.buildActionBodies(id, action);

    for (const endpoint of endpoints) {
      for (const body of bodies) {
        try {
          if (body === undefined) {
            await this.client.post(endpoint);
          } else {
            await this.client.post(endpoint, body);
          }

          return;
        } catch (error) {
          if (!this.shouldTryNextEndpoint(error)) {
            if (this.shouldTryNextActionBody(error)) {
              lastError = error;
              continue;
            }

            throw error;
          }

          lastError = error;
        }
      }
    }

    throw this.toNotFoundError('verifikaciona akcija', lastError);
  }

  private mapList(response: VerificationApiResponse[] | VerificationListApiResponse): VerificationRequest[] {
    const items = Array.isArray(response)
      ? response
      : response.items ?? response.data ?? response.verifications ?? response.requests ?? [];

    return items.map(item => this.mapRequest(item));
  }

  private mapRequest(item: VerificationApiResponse): VerificationRequest {
    return {
      id: Number(item.id ?? 0),
      action: item.action ?? 'Nepoznata transakcija',
      description: item.description ?? '',
      amount: item.amount,
      recipientName: item.recipientName ?? item.recipient_name,
      recipientAccount: item.recipientAccount ?? item.recipient_account,
      sourceAccount: item.sourceAccount ?? item.source_account,
      timestamp: item.timestamp ?? new Date().toISOString(),
      status: this.normalizeStatus(item.status),
      code: item.code,
    };
  }

  private buildActionBodies(id: number, action: 'confirm' | 'reject'): Array<Record<string, unknown> | undefined> {
    return [
      undefined,
      { id },
      { verificationId: id },
      { verification_id: id },
      { id, action },
      { verificationId: id, action },
      { verification_id: id, action },
      { id, status: action === 'confirm' ? 'confirmed' : 'rejected' },
      {
        id,
        verificationId: id,
        verification_id: id,
        action,
        status: action === 'confirm' ? 'confirmed' : 'rejected',
      },
    ];
  }

  private normalizeStatus(status?: string): VerificationRequest['status'] {
    switch ((status ?? '').toLowerCase()) {
      case 'confirmed':
      case 'approved':
      case 'accepted':
      case 'done':
        return 'confirmed';
      case 'rejected':
      case 'denied':
      case 'declined':
        return 'rejected';
      case 'expired':
      case 'timeout':
        return 'expired';
      default:
        return 'pending';
    }
  }

  private shouldTryNextEndpoint(error: unknown): boolean {
    return error instanceof ApiError && (error.statusCode === 0 || error.statusCode === 404);
  }

  private shouldTryNextActionBody(error: unknown): boolean {
    return (
      error instanceof ApiError &&
      (error.statusCode === 400 || error.statusCode === 422) &&
      /invalid request body/i.test(error.message)
    );
  }

  private toNotFoundError(label: string, lastError: unknown): Error {
    const message = lastError instanceof Error ? lastError.message : 'Nepoznata greška';
    return new Error(`Backend ne izlaže podržan ${label}. Poslednja greška: ${message}`);
  }
}
