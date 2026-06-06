import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { fmtDateTime } from '../../../shared/utils/formatters';
import { useVerification } from '../../../shared/hooks/useFeatures';
import { VerificationRequest } from '../../../shared/types/models';

interface Props {
  onTransactionCode: (code: string | null) => void;
  onOpenTotpSetup: () => void;
}

export default function VerifyScreen({ onTransactionCode, onOpenTotpSetup }: Props) {
  const { history, pending, actions } = useVerification();

  const pendingRequest = pending.data;
  const historyItems = useMemo(
    () => [...(history.data ?? [])].sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp)),
    [history.data]
  );

  useEffect(() => {
    onTransactionCode(pendingRequest?.code ?? null);
  }, [onTransactionCode, pendingRequest?.code]);

  useEffect(() => {
    const timer = setInterval(() => {
      actions.fetchPending();
      actions.fetchHistory();
    }, 10000);

    return () => clearInterval(timer);
  }, [actions]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Verifikacija</Text>
      <Text style={styles.subtitle}>Ovde se prikazuju aktivni verifikacioni kodovi i istorija zahteva pokrenutih sa web aplikacije.</Text>

      <TouchableOpacity style={styles.setupCard} onPress={onOpenTotpSetup} activeOpacity={0.8}>
        <View style={styles.setupIconWrap}>
          <Ionicons name="shield-checkmark-outline" size={18} color={C.primary} />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.setupTitle}>Pomoc za verifikaciju</Text>
          <Text style={styles.setupSub}>Otvori pomocni ekran za rucno osvezavanje koda i dodatna objasnjenja.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
      </TouchableOpacity>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Kako radi potvrda</Text>
        <Text style={styles.infoText}>1. Web aplikacija pokrene zahtev koji trazi dodatnu proveru.</Text>
        <Text style={styles.infoText}>2. Na ovom ekranu se pojavi aktivan verifikacioni kod.</Text>
        <Text style={styles.infoText}>3. Kod unesete na web aplikaciji i zahtev se potom vidi u istoriji.</Text>
      </View>

      <View style={styles.codeCard}>
        <View style={styles.headerRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="key" size={22} color={C.primary} />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.codeTitle}>Aktivni kod</Text>
            <Text style={styles.codeDesc}>Kod koji trenutno moze da se iskoristi na web aplikaciji</Text>
          </View>
        </View>

        {pending.loading && !pendingRequest ? (
          <ActivityIndicator color={C.primary} />
        ) : pending.error ? (
          <Text style={styles.errorText}>{pending.error}</Text>
        ) : pendingRequest?.code ? (
          <View style={styles.codeDisplay}>
            <View style={styles.codeRow}>
              {pendingRequest.code.split('').map((digit, index) => (
                <View key={`${digit}-${index}`} style={styles.digitBox}>
                  <Text style={styles.digit}>{digit}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.detailText}>{formatActionLabel(pendingRequest.action)}</Text>
            <Text style={styles.detailText}>Vazi do: {fmtDateTime(pendingRequest.timestamp)}</Text>
          </View>
        ) : (
          <Text style={styles.emptyText}>Trenutno nema aktivnog verifikacionog koda.</Text>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => {
              actions.fetchPending();
              actions.fetchHistory();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={18} color={C.textPrimary} />
            <Text style={styles.secondaryText}>Osvezi podatke</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>Istorija zahteva</Text>
          <TouchableOpacity onPress={actions.fetchHistory} activeOpacity={0.7}>
            <Text style={styles.historyLink}>Osvezi</Text>
          </TouchableOpacity>
        </View>

        {history.loading && historyItems.length === 0 ? (
          <ActivityIndicator color={C.primary} />
        ) : history.error ? (
          <Text style={styles.errorText}>{history.error}</Text>
        ) : historyItems.length === 0 ? (
          <Text style={styles.emptyText}>Jos nema evidentiranih verifikacionih zahteva.</Text>
        ) : (
          historyItems.map(item => {
            const statusConfig = getStatusConfig(item);
            return (
              <View key={`${item.id}-${item.timestamp}`} style={styles.historyRow}>
                <View style={[styles.historyIcon, { backgroundColor: statusConfig.bg }]}>
                  <Ionicons name={statusConfig.icon} size={16} color={statusConfig.color} />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.historyAction}>{formatActionLabel(item.action)}</Text>
                  <Text style={styles.historyTime}>{fmtDateTime(item.timestamp)}</Text>
                </View>
                <Text style={[styles.historyStatus, { color: statusConfig.color }]}>{statusConfig.label}</Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

function formatActionLabel(action: string): string {
  const normalized = action.trim().toLowerCase();
  switch (normalized) {
    case 'payment':
      return 'Placanje';
    case 'transfer':
      return 'Prenos';
    case 'limit_change':
      return 'Promena limita';
    case 'card_issue':
      return 'Izdavanje kartice';
    default:
      return action || 'Verifikacija';
  }
}

function getStatusConfig(item: VerificationRequest): {
  bg: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
} {
  switch (item.status) {
    case 'confirmed':
      return { bg: C.accentGlow, color: C.accent, icon: 'checkmark-circle', label: 'Uspesno' };
    case 'rejected':
      return { bg: C.dangerGlow, color: C.danger, icon: 'close-circle', label: 'Odbijeno' };
    case 'expired':
      return { bg: C.warningGlow, color: C.warning, icon: 'time', label: 'Isteklo' };
    default:
      return { bg: C.primarySoft, color: C.primary, icon: 'time-outline', label: 'Na cekanju' };
  }
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
  codeCard: { backgroundColor: C.bgCard, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  codeTitle: { color: C.textPrimary, fontSize: 15, fontWeight: '600' },
  codeDesc: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  codeDisplay: { alignItems: 'center' },
  codeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  digitBox: { width: 44, height: 52, borderRadius: 12, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.primary, justifyContent: 'center', alignItems: 'center' },
  digit: { color: C.textPrimary, fontSize: 24, fontWeight: '800', letterSpacing: 2 },
  detailText: { color: C.textSecondary, fontSize: 12, marginBottom: 4, textAlign: 'center' },
  emptyText: { color: C.textMuted, fontSize: 13, textAlign: 'center' },
  errorText: { color: C.danger, fontSize: 12, marginTop: 8, textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.bg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border },
  secondaryText: { color: C.textPrimary, fontSize: 14, fontWeight: '600' },
  historyCard: { backgroundColor: C.bgCard, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  historyTitle: { color: C.textPrimary, fontSize: 15, fontWeight: '700' },
  historyLink: { color: C.primary, fontSize: 13, fontWeight: '600' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border },
  historyIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  historyAction: { color: C.textPrimary, fontSize: 14, fontWeight: '600' },
  historyTime: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  historyStatus: { fontSize: 12, fontWeight: '700' },
});
