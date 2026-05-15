// Refresh-token persistence. On web the gateway keeps the refresh token
// in an httpOnly cookie the JS never sees; React Native has no cookie
// jar, so the mobile app holds the (long-lived) refresh token itself in
// the OS secure keystore (Keychain / Keystore via expo-secure-store).
// The short-lived access token never touches disk — it lives in memory
// (see auth/store.ts) exactly like the web app.
import * as SecureStore from "expo-secure-store";

const REFRESH_TOKEN_KEY = "banka.refreshToken";

export async function getStoredRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setStoredRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
}

export async function clearStoredRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
