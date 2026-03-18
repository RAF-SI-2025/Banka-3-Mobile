// import * as SecureStore from 'expo-secure-store';

class TokenStorage {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    // await SecureStore.setItemAsync('access_token', accessToken);
    // await SecureStore.setItemAsync('refresh_token', refreshToken);
  }

  async getAccessToken(): Promise<string | null> {
    // return SecureStore.getItemAsync('access_token');
    return this.accessToken;
  }

  async getRefreshToken(): Promise<string | null> {
    //  return SecureStore.getItemAsync('refresh_token');
    return this.refreshToken;
  }

  async clear(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
    //  await SecureStore.deleteItemAsync('access_token');
    //  await SecureStore.deleteItemAsync('refresh_token');
  }

  async hasTokens(): Promise<boolean> {
    const token = await this.getAccessToken();
    return token !== null;
  }
}

export const tokenStorage = new TokenStorage();
