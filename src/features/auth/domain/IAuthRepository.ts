/**
 * AUTH REPOSITORY - Domain Interface
 * 
 * Maps to Go backend endpoints:
 *   POST /login
 *   POST /logout
 *   POST /password-reset/request
 *   POST /password-reset/confirm
 *   POST /token/refresh
 */

import { Client, AuthTokens } from '../../../shared/types/models';

export interface LoginParams {
  email: string;
  password: string;
}

export interface LoginResult {
  tokens: AuthTokens;
  user: Client;
  permissions?: string[];
}

export interface IAuthRepository {
  login(params: LoginParams): Promise<LoginResult>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<Client>;
  isAuthenticated(): Promise<boolean>;
  // Password reset (from API spec)
  requestPasswordReset?(email: string): Promise<void>;
  confirmPasswordReset?(token: string, newPassword: string): Promise<void>;
  // Token refresh
  refreshAccessToken?(): Promise<string>;
}
