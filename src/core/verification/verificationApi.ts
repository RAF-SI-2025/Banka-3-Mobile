import { NetworkClient } from '../network/NetworkClient';
import {
  clearVerificationSession,
  getVerificationSession,
  storeVerificationSession,
  VerificationActionKind,
} from './verificationSession';

interface VerificationIssueResponse {
  verificationId?: string;
  code: string;
  expiresAt?: string;
}

interface PendingVerificationResponse {
  pending?: Array<{
    id?: string;
    action?: string;
    code?: string;
    expiresAt?: string;
  }>;
}

export async function ensureVerificationHeaders(
  client: NetworkClient,
  actionKind: VerificationActionKind,
  providedCode?: string
): Promise<Record<string, string>> {
  const trimmedCode = providedCode?.trim();
  const cached = getVerificationSession(actionKind, trimmedCode);
  if (cached) {
    return {
      'X-Verification-Id': cached.verificationId,
      'X-Verification-Code': cached.code,
    };
  }

  if (trimmedCode) {
    const pending = await client.get<PendingVerificationResponse>('/v1/verification/pending');
    const matched = (pending.pending ?? []).find(item => {
      if (!item.id || !item.code || item.code.trim() !== trimmedCode) {
        return false;
      }
      return mapActionLabelToKind(item.action) === actionKind;
    });

    if (matched?.id && matched.code) {
      storeVerificationSession({
        actionKind,
        verificationId: matched.id,
        code: matched.code,
        expiresAt: matched.expiresAt ?? new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });

      return {
        'X-Verification-Id': matched.id,
        'X-Verification-Code': matched.code,
      };
    }

    throw new Error('Uneti verifikacioni kod nije validan ili je istekao. Osvezite kod na stranici Verifikacija i pokusajte ponovo.');
  }

  const issued = await client.post<VerificationIssueResponse>('/v1/verification/request', {
    actionKind,
  });

  if (!issued.verificationId || !issued.code) {
    throw new Error('Backend nije vratio verifikacioni kod.');
  }

  storeVerificationSession({
    actionKind,
    verificationId: issued.verificationId,
    code: issued.code,
    expiresAt: issued.expiresAt ?? new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  });

  return {
    'X-Verification-Id': issued.verificationId,
    'X-Verification-Code': issued.code,
  };
}

export function consumeVerificationSession(actionKind: VerificationActionKind): void {
  clearVerificationSession(actionKind);
}

function mapActionLabelToKind(action?: string): VerificationActionKind | null {
  const normalized = (action ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

  switch (normalized) {
    case 'placanje':
    case 'payment':
      return 'payment';
    case 'prenos sredstava':
    case 'prenos':
    case 'transfer':
      return 'transfer';
    case 'promena limita':
    case 'limit change':
      return 'limit_change';
    case 'izdavanje kartice':
    case 'card issue':
      return 'card_issue';
    default:
      return null;
  }
}
