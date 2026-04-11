import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { container } from '../../../core/di/container';
import { TransactionCodeResult } from '../../totp/domain/ITotpRepository';

interface Props {
  onTransactionCode: (code: string | null) => void;
  onOpenTotpSetup: () => void;
}

export default function VerifyScreen({ onTransactionCode, onOpenTotpSetup }: Props) {
  const [transactionCode, setTransactionCode] = useState<TransactionCodeResult | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loadingCode, setLoadingCode] = useState(false);
  const [error, setError] = useState('');

  const requestCode = async () => {
    setLoadingCode(true);
    setError('');
    try {
      const result = await container.totpRepository.requestTransactionCode();
      setTransactionCode(result);
      onTransactionCode(result.code);
      setSecondsLeft(Math.max(0, result.validUntilUnix - Math.floor(Date.now() / 1000)));
    } catch (e: any) {
      setError(e.message ?? 'Neuspesno generisanje verifikacionog koda.');
    } finally {
      setLoadingCode(false);
    }
  };

  useEffect(() => {
    requestCode();
  }, []);

  useEffect(() => {
    if (!transactionCode) return;

    const timer = setInterval(() => {
      const next = Math.max(0, transactionCode.validUntilUnix - Math.floor(Date.now() / 1000));
      setSecondsLeft(next);
    }, 1000);

    return () => clearInterval(timer);
  }, [transactionCode]);

  useEffect(() => {
    if (secondsLeft === 0 && transactionCode && !loadingCode) {
      requestCode();
    }
  }, [secondsLeft, transactionCode, loadingCode]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Jednokratni kod za transakcije</Text>
      <Text style={styles.subtitle}>
        Backend vraća jednokratni verifikacioni kod preko `/api/totp/transaction-code`, a isti kod se zatim šalje uz `TOTP` header pri potvrdi plaćanja, prenosa ili konverzije.
      </Text>

      <TouchableOpacity style={styles.setupCard} onPress={onOpenTotpSetup} activeOpacity={0.8}>
        <View style={styles.setupIconWrap}>
          <Ionicons name="shield-checkmark-outline" size={18} color={C.primary} />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.setupTitle}>TOTP podešavanje i pomoć</Text>
          <Text style={styles.setupSub}>Otvorite ekran za dodatne TOTP informacije i prikaz aktivnog koda.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
      </TouchableOpacity>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Kako radi potvrda</Text>
        <Text style={styles.infoText}>1. Dobijete kod sa ovog ekrana ili kroz TOTP setup.</Text>
        <Text style={styles.infoText}>2. Kod unesete na ekranu plaćanja, prenosa ili konverzije.</Text>
        <Text style={styles.infoText}>3. Backend ga proverava kroz `TOTP` header i vraća `remaining_attempts` ako je neispravan.</Text>
      </View>

      <View style={styles.codeCard}>
        <View style={styles.headerRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="key" size={22} color={C.primary} />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.codeTitle}>Jednokratni kod</Text>
            <Text style={styles.codeDesc}>Koristi se za potvrdu transakcija</Text>
          </View>
        </View>

        {transactionCode ? (
          <View style={styles.codeDisplay}>
            <View style={styles.codeRow}>
              {transactionCode.code.split('').map((digit, index) => (
                <View key={`${digit}-${index}`} style={styles.digitBox}>
                  <Text style={styles.digit}>{digit}</Text>
                </View>
              ))}
            </View>
            <View style={styles.timerRow}>
              <Ionicons name="time-outline" size={14} color={secondsLeft < 60 ? C.danger : C.textSecondary} />
              <Text style={[styles.timerText, secondsLeft < 60 && { color: C.danger }]}>
                Ističe za {Math.floor(secondsLeft / 60)}:{(secondsLeft % 60).toString().padStart(2, '0')}
              </Text>
            </View>
            <Text style={styles.attemptText}>Maksimalno pokušaja: {transactionCode.maxAttempts}</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity style={styles.refreshBtn} onPress={requestCode} activeOpacity={0.8} disabled={loadingCode}>
          {loadingCode ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="refresh" size={20} color="#fff" />}
          <Text style={styles.refreshText}>{loadingCode ? 'Generisanje...' : 'Traži novi kod'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 36 },
  flex1: { flex: 1 },
  title: { color: C.textPrimary, fontSize: 22, fontWeight: '700' },
  subtitle: { color: C.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 4, marginBottom: 16 },
  setupCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bgCard, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  setupIconWrap: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  setupTitle: { color: C.textPrimary, fontSize: 14, fontWeight: '700' },
  setupSub: { color: C.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 18 },
  infoCard: { backgroundColor: C.bgCard, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  infoTitle: { color: C.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  infoText: { color: C.textSecondary, fontSize: 13, lineHeight: 20 },
  codeCard: { backgroundColor: C.bgCard, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  codeTitle: { color: C.textPrimary, fontSize: 15, fontWeight: '600' },
  codeDesc: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  codeDisplay: { alignItems: 'center' },
  codeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  digitBox: { width: 44, height: 52, borderRadius: 12, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.primary, justifyContent: 'center', alignItems: 'center' },
  digit: { color: C.textPrimary, fontSize: 24, fontWeight: '800', letterSpacing: 2 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  timerText: { color: C.textSecondary, fontSize: 13 },
  attemptText: { color: C.textMuted, fontSize: 12, marginBottom: 16 },
  errorText: { color: C.danger, fontSize: 12, marginTop: 8, textAlign: 'center' },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 14, padding: 14, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6, marginTop: 12 },
  refreshText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
