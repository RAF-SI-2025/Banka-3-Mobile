import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { pendingRequestsStorage, PendingCardRequest } from '../../../core/storage/pendingRequestsStorage';
import { tokenStorage } from '../../../core/storage/tokenStorage';
import { fmt, fmtDate, fmtDateTime } from '../../../shared/utils/formatters';
import { useAccounts, useCards } from '../../../shared/hooks/useFeatures';
import { FeatureHeader, ScreenState, StatusBadge } from '../../../shared/components/FeaturePrimitives';
import { Card } from '../../../shared/types/models';

interface Props {
  onBack: () => void;
}

type Step = 'list' | 'detail' | 'request' | 'requestConfirm' | 'requestSuccess' | 'confirm';

export default function CardsScreen({ onBack }: Props) {
  const { state: cardsState, actions: cardActions } = useCards();
  const { state: accountsState } = useAccounts();

  const cards = cardsState.data ?? [];
  const accounts = accountsState.data ?? [];

  const [step, setStep] = useState<Step>('list');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [toggling, setToggling] = useState(false);

  const [requestCardType] = useState<'debit'>('debit');
  const [requestCardBrand, setRequestCardBrand] = useState('visa');
  const [requestAccountId, setRequestAccountId] = useState<number | null>(null);
  const [showRequestTypePicker, setShowRequestTypePicker] = useState(false);
  const [showRequestBrandPicker, setShowRequestBrandPicker] = useState(false);
  const [showRequestAccountPicker, setShowRequestAccountPicker] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestErrors, setRequestErrors] = useState<Record<string, string>>({});
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [pendingCardRequests, setPendingCardRequests] = useState<PendingCardRequest[]>([]);
  const [confirmToken, setConfirmToken] = useState('');
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmSuccess, setConfirmSuccess] = useState(false);

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

  useEffect(() => {
    let alive = true;

    const restorePendingRequest = async () => {
      const sessionId = await tokenStorage.getSessionId();
      const pending = (await pendingRequestsStorage.listByKind(sessionId, 'card')) as PendingCardRequest[];
      if (alive) {
        setPendingCardRequests(pending);
        setRequestSubmitted(pending.length > 0);
      }
    };

    restorePendingRequest();

    return () => {
      alive = false;
    };
  }, []);

  const selected = useMemo(
    () => (selectedId ? cards.find(card => card.id === selectedId) ?? null : null),
    [cards, selectedId]
  );

  const requestAccount = useMemo(
    () => (requestAccountId ? accounts.find(account => account.id === requestAccountId) ?? null : null),
    [accounts, requestAccountId]
  );

  const accountCardLimit = requestAccount?.type === 'poslovni' ? 1 : 2;
  const currentCardCount = requestAccount
    ? cards.filter(card => card.accountNumber === requestAccount.accountNumber && card.status !== 'deactivated').length
    : 0;

  const linkedAccount = useMemo(
    () => {
      if (!selected) {
        return null;
      }

      return (
        accounts.find(account => account.accountNumber === selected.accountNumber) ??
        accounts.find(account => account.id === selected.accountId) ??
        null
      );
    },
    [accounts, selected]
  );

  const statusCfg: Record<Card['status'], { color: string; bg: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
    active: { color: C.accent, bg: C.accentGlow, label: 'Aktivna', icon: 'checkmark-circle' },
    blocked: { color: C.danger, bg: C.dangerGlow, label: 'Blokirana', icon: 'lock-closed' },
    deactivated: { color: C.textMuted, bg: 'rgba(100,116,139,0.12)', label: 'Deaktivirana', icon: 'close-circle' },
  };

  const resetRequestForm = (keepSubmission = false) => {
    setRequestCardBrand('visa');
    setRequestErrors({});
    setRequestError(null);
    if (!keepSubmission) {
      setRequestSubmitted(false);
    }
    setShowRequestAccountPicker(false);
    setShowRequestTypePicker(false);
    setShowRequestBrandPicker(false);
  };

  const resetConfirmForm = () => {
    setConfirmToken('');
    setConfirmSubmitting(false);
    setConfirmError(null);
    setConfirmSuccess(false);
  };

  const extractConfirmToken = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }

    const tokenFromQuery = trimmed.match(/[?&]token=([^&#]+)/i);
    if (tokenFromQuery?.[1]) {
      return decodeURIComponent(tokenFromQuery[1]);
    }

    return trimmed;
  };

  const validateRequest = () => {
    const nextErrors: Record<string, string> = {};

    if (!requestAccount) {
      nextErrors.account = 'Izaberite račun';
    }

    if (requestAccount && currentCardCount >= accountCardLimit) {
      nextErrors.account = requestAccount.type === 'poslovni'
        ? 'Poslovni račun može imati najviše 1 karticu'
        : 'Lični račun može imati najviše 2 kartice';
    }

    setRequestErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submitRequest = async () => {
    if (!requestAccount || !validateRequest()) {
      return;
    }

    setRequestSubmitting(true);
    setRequestError(null);
    try {
      const result = await cardActions.requestCard({
        accountId: requestAccount.id,
        accountNumber: requestAccount.accountNumber,
        cardType: requestCardType,
        cardBrand: requestCardBrand,
        currency: requestAccount.currency,
        cardName: `Debitna kartica ${requestAccount.currency}`,
      });

      setRequestSubmitted(result.accepted);
      const sessionId = await tokenStorage.getSessionId();
      await pendingRequestsStorage.addCard(sessionId, {
        id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'card',
        createdAt: new Date().toISOString(),
        accountName: requestAccount.name,
        accountNumber: requestAccount.accountNumber,
        cardType: requestCardType,
        cardBrand: requestCardBrand,
        currency: requestAccount.currency,
      });
      setPendingCardRequests((await pendingRequestsStorage.listByKind(sessionId, 'card')) as PendingCardRequest[]);
      setStep('requestSuccess');
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Neuspešno podnošenje zahteva.');
    } finally {
      setRequestSubmitting(false);
    }
  };

  const submitConfirm = async () => {
    const token = extractConfirmToken(confirmToken);
    if (!token) {
      setConfirmError('Nalepite token ili ceo link iz e-maila');
      return;
    }

    setConfirmSubmitting(true);
    setConfirmError(null);
    try {
      await cardActions.confirmCard(token);
      const sessionId = await tokenStorage.getSessionId();
      await pendingRequestsStorage.clearKind(sessionId, 'card');
      setPendingCardRequests([]);
      setConfirmSuccess(true);
      setRequestSubmitted(true);
      setStep('requestSuccess');
    } catch (error) {
      setConfirmError(error instanceof Error ? error.message : 'Neuspešna potvrda kartice.');
    } finally {
      setConfirmSubmitting(false);
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
    return (
      <ScreenState
        title="Moje kartice"
        onBack={onBack}
        loading={isLoading}
        error={cardsState.error}
      />
    );
  }

  if (step === 'requestSuccess') {
    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg, padding: 24 }]}>
        <Ionicons name="checkmark-circle" size={64} color={C.accent} />
        <Text style={styles.successTitle}>{confirmSuccess ? 'Kartica odobrena!' : 'Zahtev poslat!'}</Text>
        <Text style={styles.successSub}>
          {confirmSuccess
            ? 'Kartica je potvrđena i uskoro će se pojaviti na listi.'
            : 'Vaš zahtev za novu karticu je poslat. Kartica će se pojaviti na listi nakon potvrde iz e-maila.'}
        </Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tip</Text>
            <Text style={styles.summaryValue}>Debitna kartica</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Račun</Text>
            <Text style={styles.summaryValue}>{requestAccount ? requestAccount.name : '-'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Brend</Text>
            <Text style={styles.summaryValue}>{requestCardBrand.toUpperCase()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Status</Text>
            <Text style={styles.summaryValue}>
              {confirmSuccess ? 'Odobren' : requestSubmitted ? 'Poslat' : 'Zahtev nije poslat'}
            </Text>
          </View>
        </View>
        {!confirmSuccess ? (
          <TouchableOpacity
            style={[styles.secBtn, { width: '100%', marginBottom: 12 }]}
            onPress={() => {
              resetConfirmForm();
              setStep('confirm');
            }}
          >
            <Text style={styles.secBtnText}>Potvrdi karticu</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => {
            resetRequestForm(true);
            resetConfirmForm();
            setStep('list');
          }}
        >
          <Text style={styles.primaryBtnText}>Nazad na kartice</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'confirm') {
    return (
      <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <FeatureHeader title="Potvrda kartice" onBack={() => setStep('requestSuccess')} />

        <View style={styles.applyBanner}>
          <View style={styles.applyIconWrap}>
            <Ionicons name="mail" size={22} color={C.primary} />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.bannerTitle}>Unesi token ili ceo link iz e-maila</Text>
            <Text style={styles.bannerSub}>Kartica će biti kreirana nakon uspešne potvrde zahteva.</Text>
          </View>
        </View>

        <Text style={styles.label}>TOKEN ILI LINK POTVRDE</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={confirmToken}
            onChangeText={setConfirmToken}
            placeholder="nalepi token ili ceo link iz e-maila"
            placeholderTextColor={C.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        {confirmError ? <Text style={styles.errText}>{confirmError}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 20 }]}
          onPress={submitConfirm}
          disabled={confirmSubmitting}
        >
          {confirmSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Potvrdi karticu</Text>}
        </TouchableOpacity>

        <Text style={styles.helperNote}>
          Ako si otvorio e-mail link u pregledaču, kartica je već odobrena. Možeš da nalepiš samo token ili ceo potvrđujući link.
        </Text>
      </ScrollView>
    );
  }

  if (step === 'requestConfirm') {
    return (
      <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <FeatureHeader title="Potvrda zahteva" onBack={() => setStep('request')} />
        <View style={styles.confirmCard}>
          {[
            ['Tip kartice', 'Debitna kartica'],
            ['Račun', requestAccount ? `${requestAccount.name} (${requestAccount.accountNumber})` : '-'],
            ['Valuta', requestAccount?.currency ?? '-'],
          ].map(([label, value], index) => (
            <View key={label} style={[styles.confirmRow, index > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
              <Text style={styles.confirmLabel}>{label}</Text>
              <Text style={styles.confirmValue}>{value}</Text>
            </View>
          ))}
        </View>
        {requestError ? <Text style={styles.errText}>{requestError}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={styles.secBtn} onPress={() => setStep('request')}>
            <Text style={styles.secBtnText}>Nazad</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryBtn, { flex: 1.5 }]} onPress={submitRequest} disabled={requestSubmitting}>
            {requestSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Pošalji zahtev</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (step === 'request') {
    return (
      <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <FeatureHeader title="Zahtev za novu karticu" onBack={() => setStep('list')} />

        <Text style={styles.label}>VRSTA KARTICE</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowRequestTypePicker(true)}>
          <Text style={styles.selectMain}>Debitna kartica</Text>
          <Ionicons name="chevron-down" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 16 }]}>BREND KARTICE</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowRequestBrandPicker(true)}>
          <Text style={styles.selectMain}>{requestCardBrand.toUpperCase()}</Text>
          <Ionicons name="chevron-down" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 16 }]}>RAČUN ZA VEZIVANJE</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowRequestAccountPicker(true)}>
          <Text style={styles.selectMain}>
            {requestAccount ? `${requestAccount.name} (${requestAccount.accountNumber})` : 'Izaberite račun'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={C.textMuted} />
        </TouchableOpacity>
        {requestErrors.account && <Text style={styles.errText}>{requestErrors.account}</Text>}
        {requestAccount ? (
          <Text style={styles.helperNote}>
            {requestAccount.type === 'poslovni'
              ? `Poslovni račun može imati najviše 1 karticu. Trenutno: ${currentCardCount}/1.`
              : `Lični račun može imati najviše 2 kartice. Trenutno: ${currentCardCount}/2.`}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 24 }]}
          onPress={() => {
            if (validateRequest()) {
              setStep('requestConfirm');
            }
          }}
        >
          <Text style={styles.primaryBtnText}>Nastavi</Text>
        </TouchableOpacity>
        <Text style={styles.helperNote}>
          Zahtev ide preko izabranog računa i trenutno se podržava samo debitna kartica. Nakon toga stiže potvrda na e-mail i tek onda se kartica pojavljuje u listi.
        </Text>

        <BottomSheet visible={showRequestTypePicker} onClose={() => setShowRequestTypePicker(false)} title="Vrsta kartice">
          {[
            { value: 'debit' as const, label: 'Debitna kartica' },
          ].map(option => (
            <TouchableOpacity
              key={option.value}
              style={styles.sheetItem}
              onPress={() => {
                setRequestErrors(prev => {
                  const next = { ...prev };
                  return next;
                });
                setShowRequestTypePicker(false);
              }}
            >
              <Text style={[styles.sheetItemText, requestCardType === option.value && { color: C.primary, fontWeight: '600' }]}>
                {option.label}
              </Text>
              {requestCardType === option.value && <Ionicons name="checkmark" size={18} color={C.primary} />}
            </TouchableOpacity>
          ))}
        </BottomSheet>

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
              <Text style={[styles.sheetItemText, requestCardBrand === option.value && { color: C.primary, fontWeight: '600' }]}>
                {option.label}
              </Text>
              {requestCardBrand === option.value && <Ionicons name="checkmark" size={18} color={C.primary} />}
            </TouchableOpacity>
          ))}
        </BottomSheet>

        <BottomSheet visible={showRequestAccountPicker} onClose={() => setShowRequestAccountPicker(false)} title="Račun">
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
                <Text style={{ color: C.textMuted, fontSize: 12 }}>{account.accountNumber}</Text>
              </View>
              {requestAccountId === account.id && <Ionicons name="checkmark" size={18} color={C.primary} />}
            </TouchableOpacity>
          ))}
        </BottomSheet>
      </ScrollView>
    );
  }

  if (step === 'detail' && selected) {
    const cfg = statusCfg[selected.status];

    return (
      <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <FeatureHeader title={selected.cardName} onBack={() => setStep('list')} />

        <View style={[styles.cardVisual, selected.cardType === 'credit' ? { backgroundColor: '#7c3aed' } : {}]}>
          <View style={styles.cvCircle1} />
          <View style={styles.cvCircle2} />
          <View style={styles.cvTop}>
            <Text style={styles.cvChip}>💳</Text>
            <StatusBadge color={cfg.color} bg={cfg.bg} icon={cfg.icon} label={cfg.label} />
          </View>
          <Text style={styles.cvNumber}>{selected.cardNumber}</Text>
          <View style={styles.cvBottom}>
            <View>
              <Text style={styles.cvLabel}>Ističe</Text>
              <Text style={styles.cvValue}>{fmtDate(selected.expirationDate || selected.expiresAt)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cvLabel}>{selected.cardBrand.toUpperCase()}</Text>
              <Text style={styles.cvValue}>{selected.cardType === 'credit' ? 'KREDITNA' : 'DEBITNA'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          {[
            ['Brend kartice', selected.cardBrand.toUpperCase()],
            ['Broj kartice', selected.cardNumber],
            ['Broj računa', selected.accountNumber || linkedAccount?.accountNumber || '-'],
            ['Povezan račun', linkedAccount ? `${linkedAccount.name} (${linkedAccount.currency})` : '-'],
            ['Datum kreiranja', fmtDate(selected.creationDate || '-')],
            ['Datum isteka', fmtDate(selected.expirationDate || selected.expiresAt)],
            ['CVV', selected.cvv || '-'],
            ['Limit kartice', fmt(selected.limit, selected.currency)],
            ['Tip', selected.cardType === 'credit' ? 'Kreditna kartica' : 'Debitna kartica'],
            ['Status', cfg.label],
          ].map(([label, value], index) => (
            <View key={label} style={[styles.infoRow, index > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue}>{value}</Text>
            </View>
          ))}
        </View>

        {selected.status === 'active' && (
          <TouchableOpacity
            style={styles.blockBtn}
            onPress={() => setShowBlockConfirm(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="lock-closed" size={20} color={C.danger} />
            <Text style={styles.blockText}>Blokiraj karticu</Text>
          </TouchableOpacity>
        )}

        <Modal visible={showBlockConfirm} transparent animationType="fade">
          <View style={styles.mOverlay}>
            <View style={styles.mCard}>
              <Ionicons name="lock-closed" size={40} color={C.danger} style={{ alignSelf: 'center', marginBottom: 16 }} />
              <Text style={styles.mTitle}>Blokiraj karticu?</Text>
              <Text style={styles.mSub}>Kartica neće moći da se koristi nakon blokiranja.</Text>
              <Text style={styles.mCardNum}>•••• {selected.cardNumber.slice(-4)}</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                <TouchableOpacity style={styles.secBtn} onPress={() => setShowBlockConfirm(false)} disabled={toggling}>
                  <Text style={styles.secBtnText}>Otkaži</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: C.danger }]}
                  onPress={handleToggleBlock}
                  disabled={toggling}
                >
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
    <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
      <FeatureHeader title="Moje kartice" onBack={onBack} />

        <TouchableOpacity
        style={styles.applyBanner}
        onPress={() => {
          resetRequestForm(true);
          setStep('request');
        }}
        activeOpacity={0.8}
      >
        <View style={styles.applyIconWrap}>
          <Ionicons name="card" size={22} color={C.primary} />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.bannerTitle}>Zahtev za novu karticu</Text>
          <Text style={styles.bannerSub}>Debitna ili kreditna kartica uz postojeći račun</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={C.textMuted} />
      </TouchableOpacity>

      {pendingCardRequests.length > 0 ? (
        <View style={{ gap: 12, marginTop: 6 }}>
          <Text style={styles.sectionTitle}>Zahtevi na čekanju</Text>
          {pendingCardRequests.map(request => (
            <View key={request.id} style={styles.pendingCard}>
              <Ionicons name="mail-open" size={20} color={C.warning} />
              <View style={styles.flex1}>
                <Text style={styles.pendingTitle}>Zahtev za karticu je poslat</Text>
                <Text style={styles.pendingSub}>Čeka potvrdu iz e-maila</Text>
                <Text style={styles.pendingSub}>Kartica će se pojaviti nakon odobrenja</Text>
                <Text style={[styles.pendingSub, { marginTop: 8 }]}>
                  Debitna • {request.cardBrand.toUpperCase()} • {request.accountName}
                </Text>
                <Text style={[styles.pendingSub, { marginTop: 4 }]}>
                  Podneto: {fmtDateTime(request.createdAt)}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.secBtn, { flex: 0, paddingHorizontal: 12, paddingVertical: 10 }]}
                onPress={() => {
                  resetConfirmForm();
                  setStep('confirm');
                }}
              >
                <Text style={[styles.secBtnText, { fontSize: 13 }]}>Potvrdi</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}

      {cards.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="card-outline" size={34} color={C.textMuted} />
          <Text style={styles.emptyTitle}>Nema potvrđenih kartica</Text>
          <Text style={styles.emptySub}>Ako si poslao zahtev, kartica će se pojaviti nakon e-mail potvrde.</Text>
        </View>
      ) : (
        cards.map((card, index) => {
          const cfg = statusCfg[card.status];
          const account = accounts.find(item => item.id === card.accountId);

          return (
            <TouchableOpacity
              key={`${card.id}-${card.cardNumber}-${index}`}
              style={styles.cardRow}
              onPress={() => {
                setSelectedId(card.id);
                setStep('detail');
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.cardMini, card.cardType === 'credit' ? { backgroundColor: '#7c3aed' } : {}]}>
                <Text style={styles.cardMiniNum}>•••• {card.cardNumber.slice(-4)}</Text>
                <Text style={styles.cardMiniType}>DEBIT</Text>
              </View>
              <View style={styles.flexGrow}>
                <Text style={styles.cardName}>{card.cardName}</Text>
                <Text style={styles.cardMeta}>
                  {card.cardBrand.toUpperCase()} • DEBITNA • {card.accountNumber || account?.accountNumber || '-'}
                </Text>
                <Text style={styles.cardNum}>•••• •••• •••• {card.cardNumber.slice(-4)}</Text>
                <Text style={styles.cardSpend}>
                  Danas {fmt(account?.dailySpent ?? 0, account?.currency ?? card.currency)}
                </Text>
                <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
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
    <Modal visible={visible} transparent animationType="slide">
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
  sectionTitle: { color: C.textPrimary, fontSize: 16, fontWeight: '600' },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.bgCard,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
  },
  cardMini: {
    width: 56,
    height: 38,
    borderRadius: 8,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  cardMiniNum: { color: 'rgba(255,255,255,0.8)', fontSize: 8, fontWeight: '600' },
  cardMiniType: { color: 'rgba(255,255,255,0.6)', fontSize: 6, marginTop: 2, fontWeight: '700' },
  cardName: { color: C.textPrimary, fontSize: 15, fontWeight: '600' },
  cardMeta: { color: C.textSecondary, fontSize: 11, marginTop: 2 },
  cardNum: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  cardSpend: { color: C.textSecondary, fontSize: 12, marginTop: 4 },
  cardVisual: {
    backgroundColor: C.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    overflow: 'hidden',
    aspectRatio: 1.6,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cvCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cvCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  cvTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cvChip: { fontSize: 28 },
  cvNumber: { color: '#fff', fontSize: 20, fontWeight: '600', letterSpacing: 2, marginTop: 'auto', marginBottom: 'auto', paddingVertical: 12 },
  cvBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 'auto' },
  cvLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, textTransform: 'uppercase' },
  cvValue: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 2 },
  infoCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, paddingHorizontal: 18 },
  infoLabel: { color: C.textMuted, fontSize: 13 },
  infoValue: { color: C.textPrimary, fontSize: 13, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  blockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.dangerGlow,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.15)',
  },
  blockText: { color: C.danger, fontSize: 15, fontWeight: '600' },
  mOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  mSheet: { backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '60%' },
  mHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  mTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700' },
  mCard: { backgroundColor: C.bgCard, borderRadius: 24, padding: 28, borderWidth: 1, borderColor: C.border },
  mSub: { color: C.textSecondary, fontSize: 13, textAlign: 'center' },
  mCardNum: { color: C.textMuted, fontSize: 14, textAlign: 'center', marginTop: 12 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, marginBottom: 2 },
  sheetItemText: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
  primaryBtn: { backgroundColor: C.primary, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secBtn: { flex: 1, backgroundColor: C.bgCard, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  secBtnText: { color: C.textSecondary, fontSize: 15, fontWeight: '600' },
  label: { color: C.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  inputWrap: { backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, color: C.textPrimary, fontSize: 15, padding: 14 },
  cur: { color: C.textMuted, fontSize: 13, fontWeight: '600', paddingRight: 14 },
  errText: { color: C.danger, fontSize: 12, marginTop: 4 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, padding: 14 },
  selectMain: { color: C.textPrimary, fontSize: 14, fontWeight: '500', flex: 1 },
  applyBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.bgCard, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 14 },
  applyIconWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { color: C.textPrimary, fontSize: 15, fontWeight: '700' },
  bannerSub: { color: C.textSecondary, fontSize: 12, marginTop: 2 },
  helperNote: { color: C.textMuted, fontSize: 12, lineHeight: 18, marginTop: 12 },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.warningGlow,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.22)',
    padding: 16,
    marginBottom: 14,
  },
  pendingTitle: { color: C.warning, fontSize: 14, fontWeight: '700' },
  pendingSub: { color: C.textSecondary, fontSize: 12, marginTop: 2, lineHeight: 17 },
  emptyCard: {
    backgroundColor: C.bgCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  emptyTitle: { color: C.textPrimary, fontSize: 15, fontWeight: '700', marginTop: 10 },
  emptySub: { color: C.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  confirmCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 20 },
  confirmRow: { padding: 14, paddingHorizontal: 18 },
  confirmLabel: { color: C.textMuted, fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  confirmValue: { color: C.textPrimary, fontSize: 14, fontWeight: '500', marginTop: 4 },
  successTitle: { color: C.textPrimary, fontSize: 22, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  successSub: { color: C.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 },
  summaryCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18, width: '100%', marginBottom: 24 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { color: C.textMuted, fontSize: 13 },
  summaryValue: { color: C.textPrimary, fontSize: 13, fontWeight: '600', textAlign: 'right', maxWidth: '60%' },
});
