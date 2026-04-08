import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { useCards } from '../../../shared/hooks/useFeatures';
import { fmt } from '../../../shared/utils/formatters';

interface Props { onBack: () => void; }

export default function CardsScreen({ onBack }: Props) {
  const { state, actions } = useCards();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const cards = state.data ?? [];
  const selected = selectedId ? cards.find(c => c.id === selectedId) : null;

  const handleBlock = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      if (selected.status === 'active') {
        await actions.blockCard(selected.id);
      } else {
        await actions.unblockCard(selected.id);
      }
    } finally {
      setActionLoading(false);
      setShowBlockConfirm(false);
    }
  };

  const statusCfg = {
    active: { color: C.accent, bg: C.accentGlow, label: 'Aktivna', icon: 'checkmark-circle' as const },
    blocked: { color: C.danger, bg: C.dangerGlow, label: 'Blokirana', icon: 'lock-closed' as const },
    deactivated: { color: C.textMuted, bg: 'rgba(100,116,139,0.12)', label: 'Deaktivirana', icon: 'close-circle' as const },
  };

  if (state.loading && cards.length === 0) {
    return (
      <View style={[styles.flex1, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  if (state.error && cards.length === 0) {
    return (
      <View style={[styles.flex1, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Ionicons name="alert-circle-outline" size={48} color={C.danger} />
        <Text style={{ color: C.textSecondary, marginTop: 12, textAlign: 'center' }}>{state.error}</Text>
        <TouchableOpacity onPress={actions.refresh} style={{ marginTop: 16 }}>
          <Text style={{ color: C.accent, fontWeight: '600' }}>Pokušaj ponovo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (selected) {
    const cfg = statusCfg[selected.status];
    return (
      <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hRow}>
          <TouchableOpacity onPress={() => setSelectedId(null)} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>{selected.cardName}</Text>
        </View>

        <View style={[styles.cardVisual, selected.cardType === 'credit' ? { backgroundColor: '#7c3aed' } : {}]}>
          <View style={styles.cvCircle1} />
          <View style={styles.cvCircle2} />
          <View style={styles.cvTop}>
            <Text style={styles.cvChip}>💳</Text>
            <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
              <Ionicons name={cfg.icon} size={12} color={cfg.color} />
              <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>
          <Text style={styles.cvNumber}>{selected.cardNumber}</Text>
          <View style={styles.cvBottom}>
            <View>
              <Text style={styles.cvLabel}>Ističe</Text>
              <Text style={styles.cvValue}>{selected.expiresAt}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cvLabel}>{selected.cardName}</Text>
              <Text style={styles.cvValue}>{selected.cardType === 'credit' ? 'CREDIT' : 'DEBIT'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          {[
            ['Broj računa', selected.accountId],
            ['Limit', fmt(selected.limit, selected.currency)],
            ['Tip', selected.cardType === 'credit' ? 'Kreditna kartica' : 'Debitna kartica'],
            ['Status', cfg.label],
          ].map(([l, v], i) => (
            <View key={l} style={[styles.infoRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
              <Text style={styles.infoLabel}>{l}</Text>
              <Text style={styles.infoValue}>{v}</Text>
            </View>
          ))}
        </View>

        {selected.status !== 'deactivated' && (
          <TouchableOpacity
            style={[styles.blockBtn, selected.status === 'blocked' && { backgroundColor: C.accentGlow, borderColor: 'rgba(6,214,160,0.2)' }]}
            onPress={() => setShowBlockConfirm(true)}
            activeOpacity={0.7}
          >
            <Ionicons name={selected.status === 'active' ? 'lock-closed' : 'lock-open'} size={20}
              color={selected.status === 'active' ? C.danger : C.accent} />
            <Text style={[styles.blockText, selected.status === 'blocked' && { color: C.accent }]}>
              {selected.status === 'active' ? 'Blokiraj karticu' : 'Odblokiraj karticu'}
            </Text>
          </TouchableOpacity>
        )}

        <Modal visible={showBlockConfirm} transparent animationType="fade">
          <View style={styles.mOverlay}>
            <View style={styles.mCard}>
              <Ionicons name={selected.status === 'active' ? 'lock-closed' : 'lock-open'} size={40}
                color={selected.status === 'active' ? C.danger : C.accent}
                style={{ alignSelf: 'center', marginBottom: 16 }} />
              <Text style={styles.mTitle}>
                {selected.status === 'active' ? 'Blokiraj karticu?' : 'Odblokiraj karticu?'}
              </Text>
              <Text style={styles.mSub}>
                {selected.status === 'active'
                  ? 'Kartica neće moći da se koristi dok je ne odblokirate.'
                  : 'Kartica će ponovo biti aktivna za korišćenje.'}
              </Text>
              <Text style={styles.mCardNum}>•••• {selected.cardNumber.slice(-4)}</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                <TouchableOpacity style={styles.secBtn} onPress={() => setShowBlockConfirm(false)} disabled={actionLoading}>
                  <Text style={styles.secBtnText}>Otkaži</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, selected.status === 'active' ? { backgroundColor: C.danger } : { backgroundColor: C.accent }, actionLoading && { opacity: 0.6 }]}
                  onPress={handleBlock} disabled={actionLoading}
                >
                  {actionLoading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.primaryBtnText}>{selected.status === 'active' ? 'Blokiraj' : 'Odblokiraj'}</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
      <View style={styles.hRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>Moje kartice</Text>
      </View>

      {cards.length === 0 && !state.loading && (
        <View style={{ alignItems: 'center', marginTop: 60 }}>
          <Ionicons name="card-outline" size={48} color={C.textMuted} />
          <Text style={{ color: C.textMuted, marginTop: 12 }}>Nema kartica</Text>
        </View>
      )}

      {cards.map(card => {
      console.log('card.id:', card.id, 'card.cardNumber:', card.cardNumber);

        const cfg = statusCfg[card.status];
        return (
          <TouchableOpacity key={card.id} style={styles.cardRow} onPress={() => setSelectedId(card.id)} activeOpacity={0.7}>
            <View style={[styles.cardMini, card.cardType === 'credit' ? { backgroundColor: '#7c3aed' } : {}]}>
              <Text style={styles.cardMiniNum}>•••• {card.cardNumber.slice(-4)}</Text>
              <Text style={styles.cardMiniType}>{card.cardType === 'credit' ? 'CREDIT' : 'DEBIT'}</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.cardName}>{card.cardName}</Text>
              <Text style={styles.cardNum}>•••• •••• •••• {card.cardNumber.slice(-4)}</Text>
              <View style={[styles.statusBadge, { backgroundColor: cfg.bg, marginTop: 6, alignSelf: 'flex-start' }]}>
                <Ionicons name={cfg.icon} size={12} color={cfg.color} />
                <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  hRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  title: { color: C.textPrimary, fontSize: 20, fontWeight: '700' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.bgCard, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 10 },
  cardMini: { width: 56, height: 38, borderRadius: 8, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', padding: 4 },
  cardMiniNum: { color: 'rgba(255,255,255,0.8)', fontSize: 8, fontWeight: '600' },
  cardMiniType: { color: 'rgba(255,255,255,0.6)', fontSize: 6, marginTop: 2, fontWeight: '700' },
  cardName: { color: C.textPrimary, fontSize: 15, fontWeight: '600' },
  cardNum: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '600' },
  cardVisual: { backgroundColor: C.primary, borderRadius: 20, padding: 24, marginBottom: 20, overflow: 'hidden', aspectRatio: 1.6, shadowColor: C.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  cvCircle1: { position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.06)' },
  cvCircle2: { position: 'absolute', bottom: -30, left: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.04)' },
  cvTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cvChip: { fontSize: 28 },
  cvNumber: { color: '#fff', fontSize: 20, fontWeight: '600', letterSpacing: 2, marginTop: 'auto', marginBottom: 'auto', paddingVertical: 12 },
  cvBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 'auto' },
  cvLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, textTransform: 'uppercase' },
  cvValue: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 2 },
  infoCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, paddingHorizontal: 18 },
  infoLabel: { color: C.textMuted, fontSize: 13 },
  infoValue: { color: C.textPrimary, fontSize: 13, fontWeight: '600' },
  blockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.dangerGlow, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' },
  blockText: { color: C.danger, fontSize: 15, fontWeight: '600' },
  mOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 24 },
  mCard: { backgroundColor: C.bgCard, borderRadius: 24, padding: 28, borderWidth: 1, borderColor: C.border },
  mTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  mSub: { color: C.textSecondary, fontSize: 13, textAlign: 'center' },
  mCardNum: { color: C.textMuted, fontSize: 14, textAlign: 'center', marginTop: 12 },
  primaryBtn: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secBtn: { flex: 1, backgroundColor: C.bgCard, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  secBtnText: { color: C.textSecondary, fontSize: 15, fontWeight: '600' },
});