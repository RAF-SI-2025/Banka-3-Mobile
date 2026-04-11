import { VerificationRequest } from '../../../shared/types/models';
export interface IVerificationRepository {
  getHistory(): Promise<VerificationRequest[]>;
  getPending(): Promise<VerificationRequest | null>;
  confirm(id: number): Promise<void>;
  reject(id: number): Promise<void>;
}
