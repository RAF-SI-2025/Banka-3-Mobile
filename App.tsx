import React, { useState, useEffect, useCallback, createContext, useContext, useReducer } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, StatusBar, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from './src/shared/constants/theme';
import { container } from './src/core/di/container';
import { Client, VerificationRequest } from './src/shared/types/models';

import LoginScreen from './src/features/auth/presentation/LoginScreen';
import HomeScreen from './src/features/home/presentation/HomeScreen';
import AccountsScreen from './src/features/accounts/presentation/AccountsScreen';
import VerifyScreen from './src/features/verification/presentation/VerifyScreen';
import ProfileScreen from './src/features/profile/presentation/ProfileScreen';
import PaymentScreen from './src/features/payments/presentation/PaymentScreen';
import TransferScreen from './src/features/transfer/presentation/TransferScreen';
import ExchangeScreen from './src/features/exchange/presentation/ExchangeScreen';
import CardsScreen from './src/features/cards/presentation/CardsScreen';
import LoansScreen from './src/features/loans/presentation/LoansScreen';
import RecipientsScreen from './src/features/recipients/presentation/RecipientsScreen';
import PaymentHistoryScreen from './src/features/payments/presentation/PaymentHistoryScreen';
import DepositScreen from './src/features/payments/presentation/DepositScreen';


type Screen = 'home'|'accounts'|'verify'|'profile'|'payment'|'deposit'|'transfer'|'exchange'|'cards'|'loans'|'recipients'|'paymentHistory';

interface AppContextType {
  user: Client | null;
  pendingVerification: VerificationRequest | null;
  verificationHandled: boolean;
  showVerificationModal: boolean;
  setShowVerificationModal: (v: boolean) => void;
  handleVerification: (accepted: boolean) => void;
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
  const [screen, setScreen] = useState<Screen>('home');
  const [screenHistory, setScreenHistory] = useState<Screen[]>([]);
  const [detailAccountId, setDetailAccountId] = useState<number | null>(null);
  const [pendingVerification, setPendingVerification] = useState<VerificationRequest | null>(null);
  const [verificationHandled, setVerificationHandled] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

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
    setIsLoggedIn(true);
    return true;
  }, []);

  const handleLogout = useCallback(async () => {
    await container.authRepository.logout();
    container.reset();
    setUser(null);
    setIsLoggedIn(false);
    setScreen('home');
    setScreenHistory([]);
    setVerificationHandled(false);
    setPendingVerification(null);
    setShowVerificationModal(false);
  }, []);

  useEffect(() => {
    if (!isLoggedIn || verificationHandled) return;
    let cancelled = false;
    const load = async () => {
      try {
        const pending = await container.verificationRepository.getPending();
        if (!cancelled && pending) {
          setPendingVerification(pending);
          setTimeout(() => { if (!cancelled) setShowVerificationModal(true); }, 3000);
        }
      } catch (e) {}
    };
    load();
    return () => { cancelled = true; };
  }, [isLoggedIn, verificationHandled]);

  const handleVerification = useCallback(async (accepted: boolean) => {
    if (!pendingVerification) return;
    try {
      if (accepted) await container.verificationRepository.confirm(pendingVerification.id);
      else await container.verificationRepository.reject(pendingVerification.id);
    } catch (e) {}
    setShowVerificationModal(false);
    setVerificationHandled(true);
    setPendingVerification(null);
  }, [pendingVerification]);

  if (!isLoggedIn) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <LoginScreen onLogin={handleLogin} />
      </SafeAreaProvider>
    );
  }

  const activeTab = (['home','accounts','verify','profile'] as Screen[]).includes(screen) ? screen : 'home';
  const showTabs = ['home','accounts','verify','profile'].includes(screen);

  const tabs: { id: Screen; label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'home', label: 'Početna', icon: 'home-outline', iconActive: 'home' },
    { id: 'accounts', label: 'Računi', icon: 'wallet-outline', iconActive: 'wallet' },
    { id: 'verify', label: 'Verifikacija', icon: 'shield-checkmark-outline', iconActive: 'shield-checkmark' },
    { id: 'profile', label: 'Profil', icon: 'person-outline', iconActive: 'person' },
  ];

  const ctx: AppContextType = {
    user, pendingVerification, verificationHandled, showVerificationModal,
    setShowVerificationModal, handleVerification, navigate, goBack,
    detailAccountId, setDetailAccountId,
  };

  const renderScreen = () => {
    switch (screen) {
      case 'home':
        return <HomeScreen
          hasNotif={!verificationHandled && !!pendingVerification}
          onOpenAccount={(id: number) => { setDetailAccountId(id); navigate('accounts'); }}
          onShowAllAccounts={() => navigate('accounts')}
          onNavigate={(s: string) => navigate(s as Screen)} />;
      case 'accounts':
        return <AccountsScreen
          detailId={detailAccountId}
          onSelect={(id: number) => setDetailAccountId(id)}
          onBack={() => setDetailAccountId(null)} />;
      case 'verify':
        return <VerifyScreen
          verified={verificationHandled}
          onShowModal={() => setShowVerificationModal(true)} />;
      case 'profile':
        return <ProfileScreen onLogout={handleLogout} user={user} />;
      case 'payment':
        return <PaymentScreen onBack={goBack} />;
      case 'deposit':                                    
        return <DepositScreen onBack={goBack} />;
      case 'transfer':
        return <TransferScreen onBack={goBack} />;
      case 'exchange':
        return <ExchangeScreen onBack={goBack} />;
      case 'cards':
        return <CardsScreen onBack={goBack} />;
      case 'loans':
        return <LoansScreen onBack={goBack} />;
      case 'recipients':
        return <RecipientsScreen onBack={goBack} />;
      case 'paymentHistory':
        return <PaymentHistoryScreen onBack={goBack} />;
      default:
        return <HomeScreen
          hasNotif={!verificationHandled && !!pendingVerification}
          onOpenAccount={(id: number) => { setDetailAccountId(id); navigate('accounts'); }}
          onShowAllAccounts={() => navigate('accounts')}
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
                      {t.id === 'verify' && !verificationHandled && pendingVerification && <View style={s.notifDot} />}
                    </View>
                    <Text style={[s.tabLabel, active && { color: C.primary, fontWeight: '600' }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Verification Modal */}
          <Modal visible={showVerificationModal} transparent animationType="fade">
            <View style={s.mOverlay}>
              <View style={s.mCard}>
                <View style={s.mIconWrap}><View style={s.mPulse} /><Ionicons name="shield-checkmark" size={28} color={C.primary} /></View>
                <Text style={s.mTitle}>Potvrda transakcije</Text>
                <Text style={s.mSub}>Zahtev sa web aplikacije</Text>
                {pendingVerification && (
                  <View style={s.mDetails}>
                    {([['Akcija', pendingVerification.action], ['Primalac', pendingVerification.recipientName || '-'], ['Iznos', pendingVerification.amount || '-'], ['Sa računa', pendingVerification.sourceAccount || '-']] as [string,string][]).map(([l,v]) => (
                      <View key={l} style={s.mRow}><Text style={s.mRowL}>{l}</Text><Text style={s.mRowV}>{v}</Text></View>
                    ))}
                  </View>
                )}
                <View style={s.mActions}>
                  <TouchableOpacity style={s.rejectBtn} onPress={() => handleVerification(false)}><Text style={s.rejectText}>Odbij</Text></TouchableOpacity>
                  <TouchableOpacity style={s.confirmBtn} onPress={() => handleVerification(true)}><Text style={s.confirmText}>Potvrdi ✓</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
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
  notifDot: { position: 'absolute', top: -2, right: -5, width: 8, height: 8, borderRadius: 4, backgroundColor: C.danger },
  mOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 24 },
  mCard: { backgroundColor: C.bgCard, borderRadius: 24, padding: 28, borderWidth: 1, borderColor: C.border },
  mIconWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 20, height: 64 },
  mPulse: { position: 'absolute', width: 70, height: 70, borderRadius: 35, backgroundColor: C.primaryGlow },
  mTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  mSub: { color: C.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 20, marginTop: 4 },
  mDetails: { backgroundColor: C.bg, borderRadius: 14, padding: 16, gap: 12, marginBottom: 24 },
  mRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mRowL: { color: C.textMuted, fontSize: 13 },
  mRowV: { color: C.textPrimary, fontSize: 13, fontWeight: '600' },
  mActions: { flexDirection: 'row', gap: 12 },
  rejectBtn: { flex: 1, backgroundColor: C.dangerGlow, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  rejectText: { color: C.danger, fontSize: 15, fontWeight: '600' },
  confirmBtn: { flex: 1.5, backgroundColor: C.primary, borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
