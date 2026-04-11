import React, { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from './src/shared/constants/theme';
import { container } from './src/core/di/container';
import { Client } from './src/shared/types/models';

import LoginScreen from './src/features/auth/presentation/LoginScreen';
import HomeScreen from './src/features/home/presentation/HomeScreen';
import AccountsScreen from './src/features/accounts/presentation/AccountsScreen';
import VerifyScreen from './src/features/verification/presentation/VerifyScreen';
import ProfileScreen from './src/features/profile/presentation/ProfileScreen';
import PaymentScreen from './src/features/payments/presentation/PaymentScreen';
import TransferScreen from './src/features/payments/presentation/TransferScreen';
import ExchangeScreen from './src/features/exchange/presentation/ExchangeScreen';
import CardsScreen from './src/features/cards/presentation/CardsScreen';
import LoansScreen from './src/features/loans/presentation/LoansScreen';
import RecipientsScreen from './src/features/recipients/presentation/RecipientsScreen';
import PaymentHistoryScreen from './src/features/payments/presentation/PaymentHistoryScreen';
import DepositScreen from './src/features/payments/presentation/DepositScreen';
import TotpSetupScreen from './src/features/totp/presentation/TotpSetupScreen';
import EmployeePortalScreen from './src/features/employee/presentation/EmployeePortalScreen';
import { onSessionInvalidated } from './src/core/auth/sessionEvents';

type Screen = 'home'|'accounts'|'verify'|'profile'|'payment'|'deposit'|'transfer'|'exchange'|'cards'|'loans'|'recipients'|'paymentHistory'|'totpSetup'|'employeePortal';

interface PaymentPrefill {
  recipientName: string;
  recipientAccount: string;
}

interface AppContextType {
  user: Client | null;
  transactionCode: string | null;
  setTransactionCode: (code: string | null) => void;
  navigate: (s: Screen) => void;
  goBack: () => void;
  detailAccountId: number | null;
  setDetailAccountId: (id: number | null) => void;
}

const AppContext = createContext<AppContextType>({} as AppContextType);
export const useApp = () => useContext(AppContext);

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<Client | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [screen, setScreen] = useState<Screen>('home');
  const [screenHistory, setScreenHistory] = useState<Screen[]>([]);
  const [detailAccountId, setDetailAccountId] = useState<number | null>(null);
  const [transferSourceAccountId, setTransferSourceAccountId] = useState<number | null>(null);
  const [transactionCode, setTransactionCode] = useState<string | null>(null);
  const [paymentPrefill, setPaymentPrefill] = useState<PaymentPrefill | null>(null);

  const navigate = useCallback((s: Screen) => {
    setScreenHistory(prev => [...prev, screen]);
    setScreen(s);
    if (s !== 'accounts') setDetailAccountId(null);
  }, [screen]);

  const goBack = useCallback(() => {
    setScreenHistory(prev => {
      const last = prev[prev.length - 1] || 'home';
      setScreen(last);
      return prev.slice(0, -1);
    });
    setDetailAccountId(null);
  }, []);

  const handleLogin = useCallback(async (email: string, password: string) => {
    const result = await container.authRepository.login({ email, password });
    setUser(result.user);
    setPermissions(result.permissions ?? []);
    setIsLoggedIn(true);
    return true;
  }, []);

  const handleLogout = useCallback(async () => {
    await container.authRepository.logout();
    container.reset();
    setUser(null);
    setPermissions([]);
    setIsLoggedIn(false);
    setScreen('home');
    setScreenHistory([]);
    setTransactionCode(null);
    setPaymentPrefill(null);
    setTransferSourceAccountId(null);
  }, []);

  useEffect(() => {
    return onSessionInvalidated(() => {
      container.reset();
      setUser(null);
      setPermissions([]);
      setIsLoggedIn(false);
      setScreen('home');
      setScreenHistory([]);
      setDetailAccountId(null);
      setTransactionCode(null);
      setPaymentPrefill(null);
      setTransferSourceAccountId(null);
    });
  }, []);

  if (!isLoggedIn) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <LoginScreen onLogin={handleLogin} />
      </SafeAreaProvider>
    );
  }

  const isEmployee = permissions.some(permission =>
    ['manage_accounts', 'manage_loans', 'manage_cards', 'manage_clients', 'manage_companies', 'manage_employees', 'admin'].includes(permission)
  );

  const tabScreens: Screen[] = isEmployee
    ? ['home', 'accounts', 'verify', 'employeePortal', 'profile']
    : ['home', 'accounts', 'verify', 'profile'];
  const activeTab = tabScreens.includes(screen) ? screen : 'home';
  const showTabs = tabScreens.includes(screen);

  const tabs: { id: Screen; label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }[] = isEmployee ? [
    { id: 'home', label: 'Početna', icon: 'home-outline', iconActive: 'home' },
    { id: 'accounts', label: 'Računi', icon: 'wallet-outline', iconActive: 'wallet' },
    { id: 'verify', label: 'Verifikacija', icon: 'shield-checkmark-outline', iconActive: 'shield-checkmark' },
    { id: 'employeePortal', label: 'Portal', icon: 'briefcase-outline', iconActive: 'briefcase' },
    { id: 'profile', label: 'Profil', icon: 'person-outline', iconActive: 'person' },
  ] : [
    { id: 'home', label: 'Početna', icon: 'home-outline', iconActive: 'home' },
    { id: 'accounts', label: 'Računi', icon: 'wallet-outline', iconActive: 'wallet' },
    { id: 'verify', label: 'Verifikacija', icon: 'shield-checkmark-outline', iconActive: 'shield-checkmark' },
    { id: 'profile', label: 'Profil', icon: 'person-outline', iconActive: 'person' },
  ];

  const ctx: AppContextType = {
    user,
    transactionCode,
    setTransactionCode,
    navigate,
    goBack,
    detailAccountId,
    setDetailAccountId,
  };

  const renderScreen = () => {
    switch (screen) {
      case 'home':
        return <HomeScreen
          hasNotif={false}
          onOpenAccount={(id: number) => { setDetailAccountId(id); navigate('accounts'); }}
          onShowAllAccounts={() => navigate('accounts')}
          onOpenQuickPayment={(prefill) => {
            setPaymentPrefill(prefill);
            navigate('payment');
          }}
          onOpenTransfer={(accountId: number) => {
            setTransferSourceAccountId(accountId);
            navigate('transfer');
          }}
          onNavigate={(s: string) => navigate(s as Screen)} />;
      case 'accounts':
        return <AccountsScreen
          detailId={detailAccountId}
          onSelect={(id: number) => setDetailAccountId(id)}
          onBack={() => setDetailAccountId(null)}
          onNavigate={(s: string) => navigate(s as Screen)}
          isEmployee={isEmployee}
        />;
      case 'verify':
        return <VerifyScreen
          onTransactionCode={setTransactionCode}
          onOpenTotpSetup={() => navigate('totpSetup')} />;
      case 'profile':
        return <ProfileScreen onLogout={handleLogout} />;
      case 'employeePortal':
        return <EmployeePortalScreen onBack={goBack} isEmployee={isEmployee} />;
      case 'payment':
        return (
          <PaymentScreen
            onBack={goBack}
            initialTotpCode={transactionCode ?? ''}
            onConsumeTotpCode={() => setTransactionCode(null)}
            initialRecipient={paymentPrefill}
            onConsumeInitialRecipient={() => setPaymentPrefill(null)}
          />
        );
      case 'deposit':
        return <DepositScreen onBack={goBack} />;
      case 'transfer':
        return <TransferScreen
          onBack={goBack}
          initialAccountId={transferSourceAccountId}
          onConsumeInitialAccountId={() => setTransferSourceAccountId(null)}
          initialTotpCode={transactionCode ?? ''}
          onConsumeTotpCode={() => setTransactionCode(null)}
        />;
      case 'exchange':
        return (
          <ExchangeScreen
            onBack={goBack}
            onRequireTotpSetup={() => navigate('totpSetup')}
            initialTotpCode={transactionCode ?? ''}
            onConsumeTotpCode={() => setTransactionCode(null)}
          />
        );
      case 'cards':
        return <CardsScreen onBack={goBack} />;
      case 'loans':
        return <LoansScreen onBack={goBack} />;
      case 'recipients':
        return <RecipientsScreen onBack={goBack} />;
      case 'paymentHistory':
        return <PaymentHistoryScreen onBack={goBack} />;
      case 'totpSetup':
        return <TotpSetupScreen onBack={goBack} onTransactionCode={setTransactionCode} />;
      default:
        return <HomeScreen
          hasNotif={false}
          onOpenAccount={(id: number) => { setDetailAccountId(id); navigate('accounts'); }}
          onShowAllAccounts={() => navigate('accounts')}
          onOpenQuickPayment={(prefill) => {
            setPaymentPrefill(prefill);
            navigate('payment');
          }}
          onOpenTransfer={(accountId: number) => {
            setTransferSourceAccountId(accountId);
            navigate('transfer');
          }}
          onNavigate={(s: string) => navigate(s as Screen)} />;
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <AppContext.Provider value={ctx}>
        <SafeAreaView style={[s.flex1, { backgroundColor: C.bg }]} edges={['top']}>
          <View style={s.flex1}>{renderScreen()}</View>

          {showTabs && (
            <View style={s.tabBar}>
              {tabs.map(t => {
                const active = activeTab === t.id;
                return (
                  <TouchableOpacity key={t.id} style={[s.tabItem, active && { backgroundColor: C.primarySoft }]}
                    onPress={() => { navigate(t.id); if (t.id !== 'accounts') setDetailAccountId(null); }} activeOpacity={0.7}>
                    <View>
                      <Ionicons name={active ? t.iconActive : t.icon} size={22} color={active ? C.primary : C.textMuted} />
                    </View>
                    <Text style={[s.tabLabel, active && { color: C.primary, fontWeight: '600' }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </SafeAreaView>
      </AppContext.Provider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  flex1: { flex: 1 },
  tabBar: { flexDirection: 'row', backgroundColor: C.bgCard, borderTopWidth: 1, borderTopColor: C.border, paddingVertical: 6, paddingHorizontal: 8, ...Platform.select({ web: { paddingBottom: 10 } }) },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 12, gap: 3 },
  tabLabel: { fontSize: 10, color: C.textMuted, fontWeight: '500' },
});
