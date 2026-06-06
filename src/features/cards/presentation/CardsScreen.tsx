import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { fmt, fmtDate } from '../../../shared/utils/formatters';
import { useAccounts, useCards } from '../../../shared/hooks/useFeatures';
import { FeatureHeader, ScreenState, StatusBadge } from '../../../shared/components/FeaturePrimitives';
import { Card } from '../../../shared/types/models';

interface Props {
  onBack: () => void;
}

type Step = 'list' | 'detail' | 'request' | 'requestConfirm' | 'requestSuccess';

export default function CardsScreen({ onBack }: Props) {
  const { state: cardsState, actions: cardActions } = useCards();
  const { state: accountsState } = useAccounts();

  const cards = cardsState.data ?? [];
  const accounts = accountsState.data ?? [];

  const [step, setStep] = useState<Step>('list');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [toggling, setToggling] = useState(false);

  const [requestCardBrand, setRequestCardBrand] = useState('visa');
  const [requestAccountId, setRequestAccountId] = useState<number | null>(null);
  const [showRequestBrandPicker, setShowRequestBrandPicker] = useState(false);
  const [showRequestAccountPicker, setShowRequestAccountPicker] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  useEffect(() => {
    if (selectedId && !cards.some(card => card.id === selectedId)) {
      setSelectedId(null);
      setStep('list');
    }
  }, [cards, selectedId]);

  useEffect(() => {
    if (accounts.length === 0) {
      setRequestAccountId(null);
      return;
    }

    setRequestAccountId(prev => (prev && accounts.some(account => account.id === prev) ? prev : accounts[0].id));
  }, [accounts]);

  const selected = useMemo(
    () => (selectedId ? cards.find(card => card.id === selectedId) ?? null : null),
    [cards, selectedId]
  );

  const requestAccount = useMemo(
    () => (requestAccountId ? accounts.find(account => account.id === requestAccountId) ?? null : null),
    [accounts, requestAccountId]
  );

  const linkedAccount = useMemo(() => {
    if (!selected) {
      return null;
    }

    return (
      accounts.find(account => account.accountNumber === selected.accountNumber) ??
      accounts.find(account => account.id === selected.accountId) ??
      null
    );
  }, [accounts, selected]);

  const accountCardLimit = requestAccount?.type === 'poslovni' ? 1 : 2;
  const currentCardCount = requestAccount
    ? cards.filter(card => card.accountNumber === requestAccount.accountNumber && card.status !== 'deactivated').length
    : 0;

  const statusCfg: Record<Card['status'], { color: string; bg: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
    active: { color: C.accent, bg: C.accentGlow, label: 'Aktivna', icon: 'checkmark-circle' },
    blocked: { color: C.danger, bg: C.dangerGlow, label: 'Blokirana', icon: 'lock-closed' },
    deactivated: { color: C.textMuted, bg: 'rgba(100,116,139,0.12)', label: 'Deaktivirana', icon: 'close-circle' },
  };

  const resetRequestForm = () => {
    setRequestCardBrand('visa');
    setRequestError(null);
    setRequestSubmitted(false);
    setShowRequestAccountPicker(false);
    setShowRequestBrandPicker(false);
  };

  const validateRequest = (): string | null => {
    if (!requestAccount) {
      return 'Izaberite racun.';
    }

    if (currentCardCount >= accountCardLimit) {
      return requestAccount.type === 'poslovni'
        ? 'Poslovni racun moze imati najvise 1 karticu.'
        : 'Licni racun moze imati najvise 2 kartice.';
    }

    return null;
  };

  const submitRequest = async () => {
    if (!requestAccount) {
      return;
    }

    const validationError = validateRequest();
    if (validationError) {
      setRequestError(validationError);
      return;
    }

    setRequestSubmitting(true);
    setRequestError(null);
    try {
      const result = await cardActions.requestCard({
        accountId: requestAccount.id,
        accountNumber: requestAccount.accountNumber,
        cardType: 'debit',
        cardBrand: requestCardBrand,
        currency: requestAccount.currency,
        cardName: `Debitna kartica ${requestAccount.currency}`,
      });

      setRequestSubmitted(result.accepted);
      setStep('requestSuccess');
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Neuspesno podnosenje zahteva.');
    } finally {
      setRequestSubmitting(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!selected) {
      return;
    }

    setToggling(true);
    try {
      await cardActions.blockCard(selected.cardNumber);
      setShowBlockConfirm(false);
    } finally {
      setToggling(false);
    }
  };

  const isLoading = cardsState.loading || accountsState.loading;

  if (isLoading || cardsState.error) {
    return <ScreenState title="Moje kartice" onBack={onBack} loading={isLoading} error={cardsState.error} />;
  }

  if (step === 'requestSuccess') {
    return (
      <View style={[styles.flex1, styles.center, styles.successScreen]}>
        <Ionicons name="checkmark-circle" size={64} color={C.accent} />
        <Text style={styles.successTitle}>Kartica uspesno zatražena</Text>
        <Text style={styles.successSub}>
          Backend je prihvatio zahtev i izvrsio verifikaciju. Ako se kartica ne pojavi odmah, osvezite listu.
        </Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tip</Text>
            <Text style={styles.summaryValue}>Debitna kartica</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Racun</Text>
            <Text style={styles.summaryValue}>{requestAccount ? requestAccount.name : '-'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Brend</Text>
            <Text style={styles.summaryValue}>{requestCardBrand.toUpperCase()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Status</Text>
            <Text style={styles.summaryValue}>{requestSubmitted ? 'Prihvacen' : 'U obradi'}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => {
            resetRequestForm();
            setStep('list');
          }}
        >
          <Text style={styles.primaryBtnText}>Nazad na kartice</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'requestConfirm') {
    return (
      <ScrollView style={styles.flex1} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FeatureHeader title="Potvrda zahteva" onBack={() => setStep('request')} />
        <View style={styles.confirmCard}>
          {[
            ['Tip kartice', 'Debitna kartica'],
            ['Racun', requestAccount ? `${requestAccount.name} (${requestAccount.accountNumber})` : '-'],
            ['Valuta', requestAccount?.currency ?? '-'],
            ['Brend', requestCardBrand.toUpperCase()],
          ].map(([label, value], index) => (
            <View key={label} style={[styles.confirmRow, index > 0 && styles.confirmBorder]}>
              <Text style={styles.confirmLabel}>{label}</Text>
              <Text style={styles.confirmValue}>{value}</Text>
            </View>
          ))}
        </View>
        {requestError ? <Text style={styles.errText}>{requestError}</Text> : null}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.secBtn} onPress={() => setStep('request')}>
            <Text style={styles.secBtnText}>Nazad</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryBtn, styles.actionPrimary]} onPress={submitRequest} disabled={requestSubmitting}>
            {requestSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Posalji zahtev</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (step === 'request') {
    return (
      <ScrollView style={styles.flex1} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FeatureHeader title="Zahtev za novu karticu" onBack={() => setStep('list')} />

        <Text style={styles.label}>BREND KARTICE</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowRequestBrandPicker(true)}>
          <Text style={styles.selectMain}>{requestCardBrand.toUpperCase()}</Text>
          <Ionicons name="chevron-down" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <Text style={[styles.label, styles.spacedLabel]}>RACUN ZA VEZIVANJE</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowRequestAccountPicker(true)}>
          <Text style={styles.selectMain}>
            {requestAccount ? `${requestAccount.name} (${requestAccount.accountNumber})` : 'Izaberite racun'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={C.textMuted} />
        </TouchableOpacity>

        {requestAccount ? (
          <Text style={styles.helperNote}>
            {requestAccount.type === 'poslovni'
              ? `Poslovni racun moze imati najvise 1 karticu. Trenutno: ${currentCardCount}/1.`
              : `Licni racun moze imati najvise 2 kartice. Trenutno: ${currentCardCount}/2.`}
          </Text>
        ) : null}

        {requestError ? <Text style={styles.errText}>{requestError}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryBtn, styles.topMargin]}
          onPress={() => {
            const validationError = validateRequest();
            if (validationError) {
              setRequestError(validationError);
              return;
            }
            setRequestError(null);
            setStep('requestConfirm');
          }}
        >
          <Text style={styles.primaryBtnText}>Nastavi</Text>
        </TouchableOpacity>

        <Text style={styles.helperNote}>
          Trenutni backend podrzava izdavanje debitne kartice uz verifikaciju. Dodatna e-mail potvrda vise nije potrebna.
        </Text>

        <BottomSheet visible={showRequestBrandPicker} onClose={() => setShowRequestBrandPicker(false)} title="Brend kartice">
          {[
            { value: 'visa', label: 'VISA' },
            { value: 'mastercard', label: 'MASTERCARD' },
          ].map(option => (
            <TouchableOpacity
              key={option.value}
              style={styles.sheetItem}
              onPress={() => {
                setRequestCardBrand(option.value);
                setShowRequestBrandPicker(false);
              }}
            >
              <Text style={[styles.sheetItemText, requestCardBrand === option.value && styles.sheetItemTextActive]}>{option.label}</Text>
              {requestCardBrand === option.value ? <Ionicons name="checkmark" size={18} color={C.primary} /> : null}
            </TouchableOpacity>
          ))}
        </BottomSheet>

        <BottomSheet visible={showRequestAccountPicker} onClose={() => setShowRequestAccountPicker(false)} title="Racun">
          {accounts.map(account => (
            <TouchableOpacity
              key={account.id}
              style={styles.sheetItem}
              onPress={() => {
                setRequestAccountId(account.id);
                setShowRequestAccountPicker(false);
              }}
            >
              <View style={styles.flex1}>
                <Text style={styles.sheetItemText}>{account.name}</Text>
                <Text style={styles.sheetItemSub}>{account.accountNumber}</Text>
              </View>
              {requestAccountId === account.id ? <Ionicons name="checkmark" size={18} color={C.primary} /> : null}
            </TouchableOpacity>
          ))}
        </BottomSheet>
      </ScrollView>
    );
  }

  if (step === 'detail' && selected) {
    const cfg = statusCfg[selected.status];

    return (
      <ScrollView style={styles.flex1} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FeatureHeader title={selected.cardName} onBack={() => setStep('list')} />

        <View style={styles.cardVisual}>
          <View style={styles.cvCircle1} />
          <View style={styles.cvCircle2} />
          <View style={styles.cvTop}>
            <Text style={styles.cvChip}>CARD</Text>
            <StatusBadge color={cfg.color} bg={cfg.bg} icon={cfg.icon} label={cfg.label} />
          </View>
          <Text style={styles.cvNumber}>{selected.cardNumber}</Text>
          <View style={styles.cvBottom}>
            <View>
              <Text style={styles.cvLabel}>Istice</Text>
              <Text style={styles.cvValue}>{fmtDate(selected.expirationDate || selected.expiresAt)}</Text>
            </View>
            <View style={styles.cvRight}>
              <Text style={styles.cvLabel}>{selected.cardBrand.toUpperCase()}</Text>
              <Text style={styles.cvValue}>DEBITNA</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          {[
            ['Brend kartice', selected.cardBrand.toUpperCase()],
            ['Broj kartice', selected.cardNumber],
            ['Broj racuna', selected.accountNumber || linkedAccount?.accountNumber || '-'],
            ['Povezan racun', linkedAccount ? `${linkedAccount.name} (${linkedAccount.currency})` : '-'],
            ['Datum kreiranja', fmtDate(selected.creationDate || '-')],
            ['Datum isteka', fmtDate(selected.expirationDate || selected.expiresAt)],
            ['Limit kartice', fmt(selected.limit, selected.currency)],
            ['Status', cfg.label],
          ].map(([label, value], index) => (
            <View key={label} style={[styles.infoRow, index > 0 && styles.infoBorder]}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue}>{value}</Text>
            </View>
          ))}
        </View>

        {selected.status === 'active' ? (
          <TouchableOpacity style={styles.blockBtn} onPress={() => setShowBlockConfirm(true)} activeOpacity={0.7}>
            <Ionicons name="lock-closed" size={20} color={C.danger} />
            <Text style={styles.blockText}>Blokiraj karticu</Text>
          </TouchableOpacity>
        ) : null}

        <Modal visible={showBlockConfirm} transparent animationType="fade" onRequestClose={() => setShowBlockConfirm(false)}>
          <View style={styles.mOverlay}>
            <View style={styles.mCard}>
              <Ionicons name="lock-closed" size={40} color={C.danger} style={styles.modalIcon} />
              <Text style={styles.mTitle}>Blokiraj karticu?</Text>
              <Text style={styles.mSub}>Kartica nece moci da se koristi nakon blokiranja.</Text>
              <Text style={styles.mCardNum}>**** {selected.cardNumber.slice(-4)}</Text>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.secBtn} onPress={() => setShowBlockConfirm(false)} disabled={toggling}>
                  <Text style={styles.secBtnText}>Otkazi</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, styles.actionPrimary, styles.dangerBtn]} onPress={handleToggleBlock} disabled={toggling}>
                  {toggling ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Blokiraj</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <FeatureHeader title="Moje kartice" onBack={onBack} />

      <TouchableOpacity
        style={styles.applyBanner}
        onPress={() => {
          resetRequestForm();
          setStep('request');
        }}
        activeOpacity={0.8}
      >
        <View style={styles.applyIconWrap}>
          <Ionicons name="card" size={22} color={C.primary} />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.bannerTitle}>Zahtev za novu karticu</Text>
          <Text style={styles.bannerSub}>Debitna kartica uz postojeci racun</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={C.textMuted} />
      </TouchableOpacity>

      {cards.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="card-outline" size={34} color={C.textMuted} />
          <Text style={styles.emptyTitle}>Nema kartica</Text>
          <Text style={styles.emptySub}>Mozete odmah podneti zahtev za novu debitnu karticu.</Text>
        </View>
      ) : (
        cards.map(card => {
          const cfg = statusCfg[card.status];
          const account = accounts.find(item => item.id === card.accountId);

          return (
            <TouchableOpacity
              key={card.id}
              style={styles.cardRow}
              onPress={() => {
                setSelectedId(card.id);
                setStep('detail');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.cardMini}>
                <Text style={styles.cardMiniNum}>**** {card.cardNumber.slice(-4)}</Text>
                <Text style={styles.cardMiniType}>DEBIT</Text>
              </View>
              <View style={styles.flexGrow}>
                <Text style={styles.cardName}>{card.cardName}</Text>
                <Text style={styles.cardMeta}>{card.cardBrand.toUpperCase()} • {card.accountNumber || account?.accountNumber || '-'}</Text>
                <Text style={styles.cardNum}>Istice {fmtDate(card.expirationDate || card.expiresAt)}</Text>
                <Text style={styles.cardSpend}>Danas {fmt(account?.dailySpent ?? 0, account?.currency ?? card.currency)}</Text>
                <View style={styles.badgeWrap}>
                  <StatusBadge color={cfg.color} bg={cfg.bg} icon={cfg.icon} label={cfg.label} />
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

function BottomSheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.mOverlay}>
        <View style={styles.mSheet}>
          <View style={styles.mHead}>
            <Text style={styles.mTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={C.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  flexGrow: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  successScreen: { backgroundColor: C.bg, padding: 24 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionPrimary: { flex: 1.5 },
  label: { color: C.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  spacedLabel: { marginTop: 16 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, padding: 14 },
  selectMain: { color: C.textPrimary, fontSize: 14, fontWeight: '500', flex: 1 },
  helperNote: { color: C.textMuted, fontSize: 12, lineHeight: 18, marginTop: 12 },
  errText: { color: C.danger, fontSize: 12, marginTop: 8 },
  primaryBtn: { backgroundColor: C.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secBtn: { flex: 1, backgroundColor: C.bgCard, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  secBtnText: { color: C.textSecondary, fontSize: 15, fontWeight: '600' },
  topMargin: { marginTop: 24 },
  summaryCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18, width: '100%', marginBottom: 24 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { color: C.textMuted, fontSize: 13 },
  summaryValue: { color: C.textPrimary, fontSize: 13, fontWeight: '600', textAlign: 'right', maxWidth: '60%' },
  successTitle: { color: C.textPrimary, fontSize: 22, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  successSub: { color: C.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  confirmCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 20 },
  confirmRow: { padding: 14, paddingHorizontal: 18 },
  confirmBorder: { borderTopWidth: 1, borderTopColor: C.border },
  confirmLabel: { color: C.textMuted, fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  confirmValue: { color: C.textPrimary, fontSize: 14, fontWeight: '500', marginTop: 4 },
  applyBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.bgCard, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 14 },
  applyIconWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { color: C.textPrimary, fontSize: 15, fontWeight: '700' },
  bannerSub: { color: C.textSecondary, fontSize: 12, marginTop: 2 },
  emptyCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 20, alignItems: 'center', marginBottom: 14, marginTop: 4 },
  emptyTitle: { color: C.textPrimary, fontSize: 15, fontWeight: '700', marginTop: 10 },
  emptySub: { color: C.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.bgCard, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 10 },
  cardMini: { width: 56, height: 38, borderRadius: 8, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', padding: 4 },
  cardMiniNum: { color: 'rgba(255,255,255,0.8)', fontSize: 8, fontWeight: '600' },
  cardMiniType: { color: 'rgba(255,255,255,0.6)', fontSize: 6, marginTop: 2, fontWeight: '700' },
  cardName: { color: C.textPrimary, fontSize: 15, fontWeight: '600' },
  cardMeta: { color: C.textSecondary, fontSize: 11, marginTop: 2 },
  cardNum: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  cardSpend: { color: C.textSecondary, fontSize: 12, marginTop: 4 },
  badgeWrap: { marginTop: 6, alignSelf: 'flex-start' },
  cardVisual: { backgroundColor: C.primary, borderRadius: 20, padding: 24, marginBottom: 20, overflow: 'hidden', aspectRatio: 1.6 },
  cvCircle1: { position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.06)' },
  cvCircle2: { position: 'absolute', bottom: -30, left: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.04)' },
  cvTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cvChip: { color: '#fff', fontSize: 12, fontWeight: '700' },
  cvNumber: { color: '#fff', fontSize: 20, fontWeight: '600', letterSpacing: 2, marginTop: 'auto', marginBottom: 'auto', paddingVertical: 12 },
  cvBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 'auto' },
  cvRight: { alignItems: 'flex-end' },
  cvLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, textTransform: 'uppercase' },
  cvValue: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 2 },
  infoCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, paddingHorizontal: 18 },
  infoBorder: { borderTopWidth: 1, borderTopColor: C.border },
  infoLabel: { color: C.textMuted, fontSize: 13 },
  infoValue: { color: C.textPrimary, fontSize: 13, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  blockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.dangerGlow, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' },
  blockText: { color: C.danger, fontSize: 15, fontWeight: '600' },
  mOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  mSheet: { backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '60%' },
  mHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  mTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700' },
  mCard: { backgroundColor: C.bgCard, borderRadius: 24, padding: 28, borderWidth: 1, borderColor: C.border },
  mSub: { color: C.textSecondary, fontSize: 13, textAlign: 'center' },
  mCardNum: { color: C.textMuted, fontSize: 14, textAlign: 'center', marginTop: 12 },
  modalIcon: { alignSelf: 'center', marginBottom: 16 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, marginBottom: 2 },
  sheetItemText: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
  sheetItemTextActive: { color: C.primary, fontWeight: '600' },
  sheetItemSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  dangerBtn: { backgroundColor: C.danger },
});
