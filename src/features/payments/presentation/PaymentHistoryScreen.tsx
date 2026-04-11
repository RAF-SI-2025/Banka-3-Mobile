import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { fmt, fmtDateTime } from '../../../shared/utils/formatters';

interface Props { onBack: () => void; }

const MOCK_PAYMENTS = [
  { id: 1, recipient: 'EPS Beograd', account: '160-000...456-78', amount: -4580, currency: 'RSD', date: '05.03.2025 14:32', status: 'completed' as const, purpose: 'Račun za struju', code: '240' },
  { id: 2, recipient: 'Telenor Srbija', account: '170-000...321-90', amount: -2890, currency: 'RSD', date: '01.03.2025 18:44', status: 'rejected' as const, purpose: 'Mesečni račun', code: '241' },
  { id: 3, recipient: 'Ana Jovanović', account: '265-000...887-11', amount: -15000, currency: 'RSD', date: '28.02.2025 10:20', status: 'completed' as const, purpose: 'Pozajmica', code: '289' },
  { id: 4, recipient: 'Vodovod Beograd', account: '908-000...654-32', amount: -1250, currency: 'RSD', date: '25.02.2025 11:05', status: 'pending' as const, purpose: 'Komunalne usluge', code: '240' },
  { id: 5, recipient: 'Informatika AD', account: '325-000...112-45', amount: -15420, currency: 'RSD', date: '20.02.2025 09:00', status: 'completed' as const, purpose: 'Rata kredita', code: '289' },
  { id: 6, recipient: 'Menjačnica - odlazna konverzija', account: '265-000...234-78', amount: -58750, currency: 'RSD', date: '18.02.2025 16:30', status: 'completed' as const, purpose: 'Konverzija u EUR', code: '289' },
  { id: 7, recipient: 'SBB Beograd', account: '150-000...789-12', amount: -3500, currency: 'RSD', date: '15.02.2025 12:15', status: 'completed' as const, purpose: 'Internet i TV', code: '241' },
  { id: 8, recipient: 'Parking servis', account: '160-000...321-99', amount: -800, currency: 'RSD', date: '12.02.2025 08:40', status: 'rejected' as const, purpose: 'Mesečna karta', code: '289' },
];

type Filter = 'all' | 'completed' | 'pending' | 'rejected';

const filterCfg: Record<Filter, { label: string; color: string }> = {
  all: { label: 'Sve', color: C.textPrimary },
  completed: { label: 'Izvršeno', color: C.accent },
  pending: { label: 'U obradi', color: C.primary },
  rejected: { label: 'Odbijeno', color: C.danger },
};

const statusStyle: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  completed: { color: C.accent, bg: C.accentGlow, label: 'Izvršeno', icon: 'checkmark-circle' },
  pending: { color: C.primary, bg: C.primaryGlow, label: 'U obradi', icon: 'time' },
  rejected: { color: C.danger, bg: C.dangerGlow, label: 'Odbijeno', icon: 'close-circle' },
};

export default function PaymentHistoryScreen({ onBack }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const filtered = filter === 'all' ? MOCK_PAYMENTS : MOCK_PAYMENTS.filter(p => p.status === filter);
  const selected = selectedId ? MOCK_PAYMENTS.find(p => p.id === selectedId) : null;

  // Detail view
  if (selected) {
    const sCfg = statusStyle[selected.status];
    return (
      <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hRow}>
          <TouchableOpacity onPress={() => setSelectedId(null)} style={styles.backBtn}><Ionicons name="chevron-back" size={20} color={C.textSecondary} /></TouchableOpacity>
          <Text style={styles.title}>Detalji plaćanja</Text>
        </View>

        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: sCfg.bg, borderColor: sCfg.color + '33' }]}>
          <Ionicons name={sCfg.icon as any} size={20} color={sCfg.color} />
          <Text style={[styles.statusBannerText, { color: sCfg.color }]}>{sCfg.label}</Text>
        </View>

        {/* Amount */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Iznos</Text>
          <Text style={styles.amountValue}>{fmt(selected.amount, selected.currency)}</Text>
        </View>

        {/* Details */}
        <View style={styles.detailCard}>
          {[
            ['Primalac', selected.recipient],
            ['Račun primaoca', selected.account],
            ['Svrha plaćanja', selected.purpose],
            ['Šifra plaćanja', selected.code],
            ['Datum i vreme', fmtDateTime(selected.date)],
            ['Status', sCfg.label],
          ].map(([l, v], i) => (
            <View key={l} style={[styles.dRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
              <Text style={styles.dLabel}>{l}</Text>
              <Text style={styles.dValue}>{v}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.printBtn} activeOpacity={0.7}>
          <Ionicons name="print-outline" size={18} color={C.primary} />
          <Text style={styles.printText}>Štampaj potvrdu</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // List view
  return (
    <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
      <View style={styles.hRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><Ionicons name="chevron-back" size={20} color={C.textSecondary} /></TouchableOpacity>
        <Text style={styles.title}>Pregled plaćanja</Text>
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {(Object.keys(filterCfg) as Filter[]).map(f => (
          <TouchableOpacity key={f}
            style={[styles.filterTab, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)} activeOpacity={0.7}>
            <Text style={[styles.filterText, filter === f && { color: C.primary, fontWeight: '600' }]}>
              {filterCfg[f].label}
            </Text>
            {f !== 'all' && (
              <View style={[styles.filterCount, filter === f && { backgroundColor: C.primary }]}>
                <Text style={styles.filterCountText}>{MOCK_PAYMENTS.filter(p => p.status === f).length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Payment list */}
      {filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="receipt-outline" size={48} color={C.textMuted} />
          <Text style={styles.emptyText}>Nema plaćanja u ovoj kategoriji</Text>
        </View>
      ) : filtered.map(p => {
        const sCfg = statusStyle[p.status];
        return (
          <TouchableOpacity key={p.id} style={styles.payRow} onPress={() => setSelectedId(p.id)} activeOpacity={0.7}>
            <View style={[styles.payIcon, { backgroundColor: sCfg.bg }]}>
              <Ionicons name={sCfg.icon as any} size={18} color={sCfg.color} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.payRecipient} numberOfLines={1}>{p.recipient}</Text>
              <Text style={styles.payDate}>{fmtDateTime(p.date)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.payAmount}>{fmt(p.amount, p.currency)}</Text>
              <View style={[styles.statusBadge, { backgroundColor: sCfg.bg }]}>
                <Text style={[styles.statusBadgeText, { color: sCfg.color }]}>{sCfg.label}</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Summary */}
      {filtered.length > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ukupno plaćanja</Text>
            <Text style={styles.summaryValue}>{filtered.length}</Text>
          </View>
          <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: C.border }]}>
            <Text style={styles.summaryLabel}>Ukupan iznos</Text>
            <Text style={styles.summaryValue}>{fmt(filtered.reduce((sum, p) => sum + p.amount, 0))}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  hRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  title: { color: C.textPrimary, fontSize: 20, fontWeight: '700' },
  // Filters
  filterTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, marginRight: 8 },
  filterActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  filterText: { color: C.textSecondary, fontSize: 13, fontWeight: '500' },
  filterCount: { backgroundColor: C.textMuted, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  filterCountText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  // Empty
  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: C.textMuted, fontSize: 14, marginTop: 12 },
  // Payment row
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bgCard, borderRadius: 14, padding: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: C.border, marginBottom: 4 },
  payIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  payRecipient: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
  payDate: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  payAmount: { color: C.textPrimary, fontSize: 14, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  statusBadgeText: { fontSize: 10, fontWeight: '600' },
  // Summary
  summaryCard: { backgroundColor: C.bgCard, borderRadius: 16, borderWidth: 1, borderColor: C.border, marginTop: 16, overflow: 'hidden' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, paddingHorizontal: 18 },
  summaryLabel: { color: C.textMuted, fontSize: 13 },
  summaryValue: { color: C.textPrimary, fontSize: 13, fontWeight: '600' },
  // Detail
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, padding: 12, paddingHorizontal: 16, borderWidth: 1, marginBottom: 16 },
  statusBannerText: { fontSize: 14, fontWeight: '600' },
  amountCard: { backgroundColor: C.bgCard, borderRadius: 18, padding: 22, borderWidth: 1, borderColor: C.border, alignItems: 'center', marginBottom: 16 },
  amountLabel: { color: C.textMuted, fontSize: 12 },
  amountValue: { color: C.textPrimary, fontSize: 28, fontWeight: '800', letterSpacing: -1, marginTop: 4 },
  detailCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 16 },
  dRow: { padding: 14, paddingHorizontal: 18 },
  dLabel: { color: C.textMuted, fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  dValue: { color: C.textPrimary, fontSize: 14, fontWeight: '500', marginTop: 4 },
  printBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primaryGlow, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)' },
  printText: { color: C.primary, fontSize: 15, fontWeight: '600' },
});
