import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { container } from '../../../core/di/container';
import { TransactionCodeResult } from '../domain/ITotpRepository';

interface Props {
  onBack: () => void;
  onTransactionCode: (code: string | null) => void;
}

export default function TotpSetupScreen({ onBack, onTransactionCode }: Props) {
  const [loading, setLoading] = useState(true);
  const [transactionCode, setTransactionCode] = useState<TransactionCodeResult | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState('');

  const loadCode = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await container.totpRepository.requestTransactionCode();
      setTransactionCode(result);
      onTransactionCode(result.code);
      setSecondsLeft(Math.max(0, result.validUntilUnix - Math.floor(Date.now() / 1000)));
    } catch (e: any) {
      setError(e.message ?? 'Neuspesno generisanje verifikacionog koda.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCode();
  }, []);

  useEffect(() => {
    if (!transactionCode) return;

    const timer = setInterval(() => {
      const next = Math.max(0, transactionCode.validUntilUnix - Math.floor(Date.now() / 1000));
      setSecondsLeft(next);
    }, 1000);

    return () => clearInterval(timer);
  }, [transactionCode]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>Jednokratni kod za transakcije</Text>
      </View>

      <Text style={styles.subtitle}>
        Backend vraća jednokratni verifikacioni kod preko `/api/totp/transaction-code`. Isti kod se koristi za potvrdu plaćanja, transfera i konverzije.
      </Text>

      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Ionicons name="shield-checkmark-outline" size={18} color={C.primary} />
          <Text style={styles.infoText}>Kod traje 5 minuta, dozvoljena su najviše 3 pokušaja i posle uspešne upotrebe više ne važi.</Text>
        </View>

        {transactionCode && (
          <>
            <View style={styles.dataBlock}>
              <Text style={styles.label}>Kod Za Potvrdu</Text>
              <Text style={styles.codeText}>{transactionCode.code}</Text>
            </View>
            <View style={styles.dataBlock}>
              <Text style={styles.label}>Preostalo Vreme</Text>
              <Text style={styles.codeText}>{Math.floor(secondsLeft / 60)}:{(secondsLeft % 60).toString().padStart(2, '0')}</Text>
            </View>
            <View style={styles.dataBlock}>
              <Text style={styles.label}>Maksimalno Pokušaja</Text>
              <Text style={styles.codeText}>{transactionCode.maxAttempts}</Text>
            </View>
          </>
        )}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color={C.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.7 }]} onPress={loadCode} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Traži Novi Kod</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={onBack}>
        <Text style={styles.secondaryBtnText}>Nazad</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 36 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bgCard },
  title: { color: C.textPrimary, fontSize: 22, fontWeight: '700' },
  subtitle: { color: C.textSecondary, fontSize: 14, lineHeight: 21, marginBottom: 18 },
  card: { backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 16, gap: 12, marginBottom: 18 },
  infoRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  infoText: { flex: 1, color: C.textPrimary, fontSize: 14, lineHeight: 20 },
  dataBlock: { backgroundColor: C.bg, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border },
  label: { color: C.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  codeText: { color: C.textPrimary, fontSize: 15, fontWeight: '700' },
  errorBox: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: C.dangerGlow, borderRadius: 12, padding: 12, marginBottom: 12 },
  errorText: { flex: 1, color: C.danger, fontSize: 13 },
  primaryBtn: { backgroundColor: C.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard },
  secondaryBtnText: { color: C.textPrimary, fontSize: 15, fontWeight: '600' },
});
