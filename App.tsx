import React, { useState, useCallback } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { C } from './src/shared/constants/theme';
import { container } from './src/core/di/container';
import { Client } from './src/shared/types/models';

import LoginScreen from './src/features/auth/presentation/LoginScreen';
import ExchangeScreen from './src/features/exchange/presentation/ExchangeScreen';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<Client | null>(null);

  const handleLogin = useCallback(async (email: string, password: string) => {
    const result = await container.authRepository.login({ email, password });
    setUser(result.user);
    setIsLoggedIn(true);
    return true;
  }, []);

  const handleBackFromExchange = useCallback(() => {
    setIsLoggedIn(false);
    setUser(null);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      {isLoggedIn ? (
        <ExchangeScreen onBack={handleBackFromExchange} />
      ) : (
        <LoginScreen onLogin={handleLogin} />
      )}
    </SafeAreaProvider>
  );
}