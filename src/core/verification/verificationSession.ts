export type VerificationActionKind =
  | 'payment'
  | 'transfer'
  | 'limit_change'
  | 'card_issue';

export interface VerificationSession {
  actionKind: VerificationActionKind;
  verificationId: string;
  code: string;
  expiresAt: string;
}

const sessions = new Map<VerificationActionKind, VerificationSession>();

export function storeVerificationSession(session: VerificationSession): void {
  sessions.set(session.actionKind, session);
}

export function getVerificationSession(
  actionKind: VerificationActionKind,
  expectedCode?: string
): VerificationSession | null {
  const session = sessions.get(actionKind);
  if (!session) {
    return null;
  }

  if (expectedCode && session.code !== expectedCode.trim()) {
    return null;
  }

  const expiresAt = Date.parse(session.expiresAt);
  if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
    sessions.delete(actionKind);
    return null;
  }

  return session;
}

export function clearVerificationSession(actionKind: VerificationActionKind): void {
  sessions.delete(actionKind);
}
