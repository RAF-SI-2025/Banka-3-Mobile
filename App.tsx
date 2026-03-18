import React, { useState, useCallback } from 'react';
import { StatusBar, View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { C } from './src/shared/constants/theme';
import { container } from './src/core/di/container';
import { Client } from './src/shared/types/models';

import LoginScreen from './src/features/auth/presentation/LoginScreen';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<Client | null>(null);

  const handleLogin = useCallback(async (email: string, password: string) => {
    const result = await container.authRepository.login({ email, password });
    setUser(result.user);
    setIsLoggedIn(true);
    return true;
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      {isLoggedIn
        ? (
          <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: C.textPrimary, fontSize: 18, fontWeight: '600' }}>Logged in</Text>
          </View>
        )
        : <LoginScreen onLogin={handleLogin} />}
    </SafeAreaProvider>
  );
}
