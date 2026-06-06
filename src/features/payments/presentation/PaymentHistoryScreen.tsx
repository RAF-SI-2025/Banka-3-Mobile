import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { fmt, fmtDateTime } from '../../../shared/utils/formatters';
import { usePaymentHistory } from '../../../shared/hooks/useFeatures';
import { Transaction } from '../../../shared/types/models';
import { FeatureHeader, ScreenState } from '../../../shared/components/FeaturePrimitives';

interface Props {
  onBack: () => void;
}

type Filter = 'all' | 'completed' | 'pending' | 'rejected';

const filterCfg: Record<Filter, { label: string }> = {
  all: { label: 'Sve' },
  completed: { label: 'Izvrseno' },
  pending: { label: 'U obradi' },
  rejected: { label: 'Odbijeno' },
};

const statusStyle: Record<Transaction['status'], { color: string; bg: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  completed: { color: C.accent, bg: C.accentGlow, label: 'Izvrseno', icon: 'checkmark-circle' },
  pending: { color: C.primary, bg: C.primaryGlow, label: 'U obradi', icon: 'time' },
  rejected: { color: C.danger, bg: C.dangerGlow, label: 'Odbijeno', icon: 'close-circle' },
};

export default function PaymentHistoryScreen({ onBack }: Props) {
  const { state } = usePaymentHistory();
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const allTransactions = useMemo(
    () => [...(state.data ?? [])].sort((left, right) => Date.parse(right.date) - Date.parse(left.date)),
    [state.data]
  );
  const filtered = filter === 'all' ? allTransactions : allTransactions.filter(item => item.status === filter);
  const selected = selectedId ? allTransactions.find(item => item.id === selectedId) ?? null : null;

  if (state.loading && allTransactions.length === 0) {
    return <ScreenState title="Pregled placanja" onBack={onBack} loading />;
  }

  if (state.error && allTransactions.length === 0) {
    return <ScreenState title="Pregled placanja" onBack={onBack} error={state.error} />;
  }

  if (selected) {
    const sCfg = statusStyle[selected.status];
    return (
      <ScrollView style={styles.flex1} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FeatureHeader title="Detalji transakcije" onBack={() => setSelectedId(null)} />

        <View style={[styles.statusBanner, { backgroundColor: sCfg.bg, borderColor: `${sCfg.color}33` }]}>
          <Ionicons name={sCfg.icon} size={20} color={sCfg.color} />
          <Text style={[styles.statusBannerText, { color: sCfg.color }]}>{sCfg.label}</Text>
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Iznos</Text>
          <Text style={styles.amountValue}>{fmt(selected.amount, selected.currency)}</Text>
        </View>

        <View style={styles.detailCard}>
          {buildDetailRows(selected).map(([label, value], index) => (
            <View key={label} style={[styles.dRow, index > 0 && styles.detailBorder]}>
              <Text style={styles.dLabel}>{label}</Text>
              <Text style={styles.dValue}>{value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <FeatureHeader title="Pregled placanja" onBack={onBack} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {(Object.keys(filterCfg) as Filter[]).map(key => (
          <TouchableOpacity
            key={key}
            style={[styles.filterTab, filter === key && styles.filterActive]}
            onPress={() => setFilter(key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>{filterCfg[key].label}</Text>
            {key !== 'all' ? (
              <View style={[styles.filterCount, filter === key && styles.filterCountActive]}>
                <Text style={styles.filterCountText}>{allTransactions.filter(item => item.status === key).length}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {state.error ? <Text style={styles.inlineError}>{state.error}</Text> : null}

      {filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="receipt-outline" size={48} color={C.textMuted} />
          <Text style={styles.emptyText}>Nema transakcija u ovoj kategoriji.</Text>
        </View>
      ) : (
        filtered.map(item => {
          const sCfg = statusStyle[item.status];
          return (
            <TouchableOpacity key={`${item.id}-${item.date}`} style={styles.payRow} onPress={() => setSelectedId(item.id)} activeOpacity={0.7}>
              <View style={[styles.payIcon, { backgroundColor: sCfg.bg }]}>
                <Ionicons name={sCfg.icon} size={18} color={sCfg.color} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.payRecipient} numberOfLines={1}>{getPrimaryLabel(item)}</Text>
                {getSecondaryLabel(item) ? (
                  <Text style={styles.payMetaText} numberOfLines={2}>{getSecondaryLabel(item)}</Text>
                ) : null}
                <Text style={styles.payDate}>{fmtDateTime(item.date)}</Text>
              </View>
              <View style={styles.payMeta}>
                <Text style={styles.payAmount}>{fmt(item.amount, item.currency)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: sCfg.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: sCfg.color }]}>{sCfg.label}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {filtered.length > 0 ? (
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ukupno transakcija</Text>
            <Text style={styles.summaryValue}>{filtered.length}</Text>
          </View>
          <View style={[styles.summaryRow, styles.detailBorder]}>
            <Text style={styles.summaryLabel}>Ukupan neto iznos</Text>
            <Text style={styles.summaryValue}>{fmt(filtered.reduce((sum, item) => sum + item.amount, 0))}</Text>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function getPrimaryLabel(transaction: Transaction): string {
  return transaction.purpose || transaction.recipientName || transaction.description || 'Transakcija';
}

function buildDetailRows(transaction: Transaction): [string, string][] {
  return [
    ['Opis', getPrimaryLabel(transaction)],
    ['Primalac', transaction.recipientName ?? '-'],
    ['Tip', transaction.kind ?? 'TRANSACTION'],
    ['Datum i vreme', fmtDateTime(transaction.date)],
    ['Status', statusStyle[transaction.status].label],
    ['Sa racuna', transaction.fromAccountNumber ?? '-'],
    ['Na racun', transaction.toAccountNumber ?? transaction.recipientAccount ?? '-'],
    ['Svrha', transaction.purpose ?? transaction.description],
    ['Sifra placanja', transaction.paymentCode ?? '-'],
    ['Poziv na broj', transaction.referenceNumber ?? '-'],
  ];
}

function getSecondaryLabel(transaction: Transaction): string {
  const parts = [
    transaction.purpose?.trim(),
    transaction.paymentCode?.trim() ? `Sifra ${transaction.paymentCode.trim()}` : undefined,
  ].filter(Boolean);

  return parts.join(' • ');
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  flex1Center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  filterScroll: { marginBottom: 16 },
  filterTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, marginRight: 8 },
  filterActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  filterText: { color: C.textSecondary, fontSize: 13, fontWeight: '500' },
  filterTextActive: { color: C.primary, fontWeight: '600' },
  filterCount: { backgroundColor: C.textMuted, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  filterCountActive: { backgroundColor: C.primary },
  filterCountText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  inlineError: { color: C.danger, fontSize: 12, marginBottom: 12 },
  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: C.textMuted, fontSize: 14, marginTop: 12 },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bgCard, borderRadius: 14, padding: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: C.border, marginBottom: 4 },
  payIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  payRecipient: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
  payMetaText: { color: C.textSecondary, fontSize: 12, marginTop: 2 },
  payDate: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  payMeta: { alignItems: 'flex-end' },
  payAmount: { color: C.textPrimary, fontSize: 14, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  statusBadgeText: { fontSize: 10, fontWeight: '600' },
  summaryCard: { backgroundColor: C.bgCard, borderRadius: 16, borderWidth: 1, borderColor: C.border, marginTop: 16, overflow: 'hidden' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, paddingHorizontal: 18 },
  summaryLabel: { color: C.textMuted, fontSize: 13 },
  summaryValue: { color: C.textPrimary, fontSize: 13, fontWeight: '600' },
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, padding: 12, paddingHorizontal: 16, borderWidth: 1, marginBottom: 16 },
  statusBannerText: { fontSize: 14, fontWeight: '600' },
  amountCard: { backgroundColor: C.bgCard, borderRadius: 18, padding: 22, borderWidth: 1, borderColor: C.border, alignItems: 'center', marginBottom: 16 },
  amountLabel: { color: C.textMuted, fontSize: 12 },
  amountValue: { color: C.textPrimary, fontSize: 28, fontWeight: '800', letterSpacing: -1, marginTop: 4 },
  detailCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 16 },
  dRow: { padding: 14, paddingHorizontal: 18 },
  detailBorder: { borderTopWidth: 1, borderTopColor: C.border },
  dLabel: { color: C.textMuted, fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  dValue: { color: C.textPrimary, fontSize: 14, fontWeight: '500', marginTop: 4 },
});
