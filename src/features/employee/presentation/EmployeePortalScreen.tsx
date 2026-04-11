import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { fmt, fmtDateTime } from '../../../shared/utils/formatters';
import { useAccounts, useCards, useLoanRequests, useLoans } from '../../../shared/hooks/useFeatures';
import { FeatureHeader, StatusBadge } from '../../../shared/components/FeaturePrimitives';
import { Account, Card } from '../../../shared/types/models';

interface Props {
  onBack: () => void;
  isEmployee: boolean;
}

type Section = 'accounts' | 'loans' | 'cards';

export default function EmployeePortalScreen({ onBack, isEmployee }: Props) {
  const { state: accountsState, actions: accountActions } = useAccounts();
  const { state: cardsState } = useCards();
  const { state: loansState } = useLoans();
  const { state: loanRequestsState, actions: loanRequestActions } = useLoanRequests();

  const accounts = accountsState.data ?? [];
  const cards = cardsState.data ?? [];
  const loans = loansState.data ?? [];
  const loanRequests = loanRequestsState.data ?? [];

  const [section, setSection] = useState<Section>('loans');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [dailyLimitValue, setDailyLimitValue] = useState('');
  const [monthlyLimitValue, setMonthlyLimitValue] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const loading = accountsState.loading || cardsState.loading || loansState.loading || loanRequestsState.loading;
  const error = accountsState.error || cardsState.error || loansState.error || loanRequestsState.error;

  const accountStatus = useMemo(() => ({
    active: { color: C.accent, bg: C.accentGlow, label: 'Aktivan', icon: 'checkmark-circle' as const },
    inactive: { color: C.textMuted, bg: 'rgba(100,116,139,0.12)', label: 'Neaktivan', icon: 'close-circle' as const },
  }), []);

  const cardStatus = useMemo(() => ({
    active: { color: C.accent, bg: C.accentGlow, label: 'Aktivna', icon: 'checkmark-circle' as const },
    blocked: { color: C.danger, bg: C.dangerGlow, label: 'Blokirana', icon: 'lock-closed' as const },
    deactivated: { color: C.textMuted, bg: 'rgba(100,116,139,0.12)', label: 'Deaktivirana', icon: 'close-circle' as const },
  }), []);

  const loanStatus = useMemo(() => ({
    active: { color: C.accent, bg: C.accentGlow, label: 'Aktivan', icon: 'checkmark-circle' as const },
    paid: { color: C.primary, bg: C.primarySoft, label: 'Otplaćen', icon: 'wallet' as const },
    defaulted: { color: C.danger, bg: C.dangerGlow, label: 'U kašnjenju', icon: 'warning' as const },
  }), []);

  const openRename = (account: Account) => {
    setSelectedAccount(account);
    setRenameValue(account.name);
    setActionError(null);
    setShowRenameModal(true);
  };

  const openLimits = (account: Account) => {
    setSelectedAccount(account);
    setDailyLimitValue(account.dailyLimit ? String(account.dailyLimit) : '');
    setMonthlyLimitValue(account.monthlyLimit ? String(account.monthlyLimit) : '');
    setTotpCode('');
    setActionError(null);
    setShowLimitModal(true);
  };

  const submitRename = async () => {
    if (!selectedAccount) {
      return;
    }

    const trimmed = renameValue.trim();
    if (!trimmed) {
      setActionError('Unesite novo ime računa');
      return;
    }

    const duplicate = accounts.some(account =>
      account.id !== selectedAccount.id &&
      account.ownerId === selectedAccount.ownerId &&
      account.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setActionError('Ime računa već postoji za ovog klijenta');
      return;
    }

    setActionSubmitting(true);
    setActionError(null);
    try {
      await accountActions.renameAccount(selectedAccount.accountNumber, trimmed);
      setShowRenameModal(false);
    } catch (error_) {
      setActionError(error_ instanceof Error ? error_.message : 'Neuspešna promena naziva računa.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const submitLimits = async () => {
    if (!selectedAccount) {
      return;
    }

    if (!totpCode.trim()) {
      setActionError('Unesite TOTP kod');
      return;
    }

    const dailyLimit = dailyLimitValue.trim() ? Number.parseFloat(dailyLimitValue.replace(',', '.')) : undefined;
    const monthlyLimit = monthlyLimitValue.trim() ? Number.parseFloat(monthlyLimitValue.replace(',', '.')) : undefined;
    if (dailyLimit === undefined && monthlyLimit === undefined) {
      setActionError('Unesite bar jedan limit');
      return;
    }

    setActionSubmitting(true);
    setActionError(null);
    try {
      await accountActions.updateAccountLimits(selectedAccount.accountNumber, {
        dailyLimit,
        monthlyLimit,
        totpCode: totpCode.trim(),
      });
      setShowLimitModal(false);
    } catch (error_) {
      setActionError(error_ instanceof Error ? error_.message : 'Neuspešna promena limita.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const resolveLoanLabel = (loanType: string) => {
    const labels: Record<string, string> = {
      cash: 'Gotovinski kredit',
      mortgage: 'Stambeni kredit',
      car: 'Auto kredit',
      refinancing: 'Refinansirajući kredit',
      student: 'Studentski kredit',
    };

    return labels[loanType.toLowerCase()] ?? loanType;
  };

  if (!isEmployee) {
    return (
      <View style={[styles.flex1, styles.center, { padding: 24 }]}>
        <FeatureHeader title="Portal zaposlenog" onBack={onBack} />
        <Text style={styles.emptyTitle}>Portal je namenjen zaposlenima</Text>
        <Text style={styles.emptySub}>Prijavi se nalogom sa odgovarajućim dozvolama da bi video zahteve, račune i kartice.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <ScrollView style={styles.flex1} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FeatureHeader title="Portal zaposlenog" onBack={onBack} />
        <ActivityIndicator color={C.primary} />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <ScrollView style={styles.flex1} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FeatureHeader title="Portal zaposlenog" onBack={onBack} />
        <Text style={styles.emptySub}>{error}</Text>
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView style={styles.flex1} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FeatureHeader title="Portal zaposlenog" onBack={onBack} />

        <View style={styles.noteCard}>
          <Ionicons name="briefcase-outline" size={20} color={C.primary} />
          <View style={styles.flex1}>
            <Text style={styles.noteTitle}>Administrativni prikaz</Text>
            <Text style={styles.noteSub}>Krediti i računi prate backend dozvole. Za kartice je trenutno dostupno samo stanje i pregled, jer employee unblock/deactivate rute nisu izložene.</Text>
          </View>
        </View>

        <View style={styles.segmentRow}>
          {[
            { id: 'loans' as const, label: 'Krediti' },
            { id: 'accounts' as const, label: 'Računi' },
            { id: 'cards' as const, label: 'Kartice' },
          ].map(item => (
            <TouchableOpacity
              key={item.id}
              style={[styles.segmentBtn, section === item.id && styles.segmentBtnActive]}
              onPress={() => setSection(item.id)}
            >
              <Text style={[styles.segmentText, section === item.id && styles.segmentTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {section === 'loans' ? (
          <>
            <Text style={styles.sectionTitle}>Zahtevi za kredit</Text>
            {loanRequests.length === 0 ? (
              <Text style={styles.emptySub}>Nema kreditnih zahteva na čekanju.</Text>
            ) : loanRequests.map(request => (
              <View key={request.id} style={styles.portalCard}>
                <View style={styles.portalCardTop}>
                  <View style={styles.portalIcon}><Ionicons name="document-text-outline" size={18} color={C.primary} /></View>
                  <View style={styles.flex1}>
                    <Text style={styles.portalTitle}>{resolveLoanLabel(request.loanType)}</Text>
                    <Text style={styles.portalSub}>{request.accountNumber} • {fmt(request.amount, request.currency)}</Text>
                    <Text style={styles.portalSub}>{request.purpose}</Text>
                    <Text style={styles.portalSub}>Podneto: {fmtDateTime(request.submissionDate)}</Text>
                  </View>
                  <StatusBadge
                    color={(request.status ?? 'pending') === 'pending' ? C.warning : request.status === 'rejected' ? C.danger : C.accent}
                    bg={(request.status ?? 'pending') === 'pending' ? C.warningGlow : request.status === 'rejected' ? C.dangerGlow : C.accentGlow}
                    icon={(request.status ?? 'pending') === 'pending' ? 'time-outline' : request.status === 'rejected' ? 'close-circle' : 'checkmark-circle'}
                    label={(request.status ?? 'pending') === 'pending' ? 'Na čekanju' : request.status === 'rejected' ? 'Odbijen' : 'Odobren'}
                  />
                </View>
                {request.status === 'pending' ? (
                  <View style={styles.portalActions}>
                    <TouchableOpacity style={styles.actionSecondary} onPress={() => loanRequestActions.reject(request.id)}>
                      <Text style={styles.actionSecondaryText}>Odbij</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionPrimary, { flex: 1 }]} onPress={() => loanRequestActions.approve(request.id)}>
                      <Text style={styles.actionPrimaryText}>Odobri</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.cardNote}>Zahtev je već obrađen.</Text>
                )}
              </View>
            ))}

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Svi krediti</Text>
            {loans.length === 0 ? (
              <Text style={styles.emptySub}>Nema odobrenih kredita.</Text>
            ) : loans.map(loan => {
              const cfg = loanStatus[loan.status];
              return (
                <View key={loan.id} style={styles.portalCard}>
                  <View style={styles.portalCardTop}>
                    <View style={styles.portalIcon}><Ionicons name="wallet-outline" size={18} color={C.primary} /></View>
                    <View style={styles.flex1}>
                      <Text style={styles.portalTitle}>{loan.name}</Text>
                      <Text style={styles.portalSub}>{resolveLoanLabel(loan.loanType)} • {loan.accountNumber}</Text>
                      <Text style={styles.portalSub}>{fmt(loan.amount, loan.currency)} • {loan.period} meseci</Text>
                    </View>
                    <StatusBadge color={cfg.color} bg={cfg.bg} icon={cfg.icon} label={cfg.label} />
                  </View>
                </View>
              );
            })}
          </>
        ) : null}

        {section === 'accounts' ? (
          <>
            <Text style={styles.sectionTitle}>Računi</Text>
            {accounts.length === 0 ? (
              <Text style={styles.emptySub}>Nema dostupnih računa.</Text>
            ) : accounts.map(account => (
              <View key={account.id} style={styles.portalCard}>
                <View style={styles.portalCardTop}>
                  <View style={styles.portalIcon}><Ionicons name="wallet" size={18} color={C.primary} /></View>
                  <View style={styles.flex1}>
                    <Text style={styles.portalTitle}>{account.name}</Text>
                    <Text style={styles.portalSub}>{account.ownerName ?? 'Nepoznat vlasnik'} • {account.accountNumber}</Text>
                    <Text style={styles.portalSub}>{account.type === 'poslovni' ? 'Poslovni' : 'Lični'} • {account.currency}</Text>
                  </View>
                  <StatusBadge
                    color={accountStatus[account.status].color}
                    bg={accountStatus[account.status].bg}
                    icon={accountStatus[account.status].icon}
                    label={accountStatus[account.status].label}
                  />
                </View>
                <View style={styles.portalActions}>
                  <TouchableOpacity style={styles.actionSecondary} onPress={() => openRename(account)}>
                    <Text style={styles.actionSecondaryText}>Promeni naziv</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionPrimary, { flex: 1 }]} onPress={() => openLimits(account)}>
                    <Text style={styles.actionPrimaryText}>Promeni limit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        ) : null}

        {section === 'cards' ? (
          <>
            <Text style={styles.sectionTitle}>Kartice</Text>
            <Text style={styles.emptySub}>Zaposleni može da blokira aktivnu karticu. Odblokiranje i deaktivacija nisu dostupni kroz trenutni HTTP API.</Text>
            {cards.length === 0 ? (
              <Text style={styles.emptySub}>Nema dostupnih kartica.</Text>
            ) : cards.map(card => {
              const cfg = cardStatus[card.status];
              const account = accounts.find(item => item.accountNumber === card.accountNumber || item.id === card.accountId);
              return (
                <View key={card.id} style={styles.portalCard}>
                  <View style={styles.portalCardTop}>
                    <View style={styles.portalIcon}><Ionicons name="card-outline" size={18} color={C.primary} /></View>
                    <View style={styles.flex1}>
                      <Text style={styles.portalTitle}>{card.cardName}</Text>
                      <Text style={styles.portalSub}>•••• {card.cardNumber.slice(-4)} • {card.cardBrand.toUpperCase()}</Text>
                      <Text style={styles.portalSub}>{account?.name ?? card.accountNumber} • {fmt(card.limit, card.currency)}</Text>
                    </View>
                    <StatusBadge color={cfg.color} bg={cfg.bg} icon={cfg.icon} label={cfg.label} />
                  </View>
                  <Text style={styles.cardNote}>
                    {card.status === 'active'
                      ? 'Blokiranje kartice je dostupno samo u klijentskom flow-u. Employee unblock/deactivate rute nisu izložene.'
                      : card.status === 'blocked'
                        ? 'Kartica je blokirana. Odblokiranje nije dostupno kroz trenutni API.'
                        : 'Deaktivirane kartice su trajno isključene.'}
                  </Text>
                </View>
              );
            })}
          </>
        ) : null}
      </ScrollView>

      <Modal visible={showRenameModal} transparent animationType="fade" onRequestClose={() => setShowRenameModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Promena naziva računa</Text>
            <Text style={styles.modalLabel}>Trenutno ime računa</Text>
            <Text style={styles.modalNote}>{selectedAccount?.name ?? '-'}</Text>
            <Text style={styles.modalLabel}>Novo ime računa</Text>
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              style={styles.modalInput}
              placeholder="Unesite novo ime"
              placeholderTextColor={C.textMuted}
            />
            {actionError ? <Text style={styles.modalError}>{actionError}</Text> : null}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setShowRenameModal(false)} disabled={actionSubmitting}>
                <Text style={styles.modalButtonText}>Otkaži</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={submitRename} disabled={actionSubmitting}>
                {actionSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Sačuvaj</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showLimitModal} transparent animationType="fade" onRequestClose={() => setShowLimitModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Promena limita</Text>
            <Text style={styles.modalLabel}>Račun</Text>
            <Text style={styles.modalNote}>{selectedAccount?.name ?? '-'}</Text>
            <Text style={styles.modalLabel}>Dnevni limit</Text>
            <TextInput
              value={dailyLimitValue}
              onChangeText={setDailyLimitValue}
              style={styles.modalInput}
              placeholder="0.00"
              placeholderTextColor={C.textMuted}
              keyboardType="decimal-pad"
            />
            <Text style={styles.modalLabel}>Mesečni limit</Text>
            <TextInput
              value={monthlyLimitValue}
              onChangeText={setMonthlyLimitValue}
              style={styles.modalInput}
              placeholder="0.00"
              placeholderTextColor={C.textMuted}
              keyboardType="decimal-pad"
            />
            <Text style={styles.modalLabel}>TOTP kod</Text>
            <TextInput
              value={totpCode}
              onChangeText={setTotpCode}
              style={styles.modalInput}
              placeholder="6-cifreni kod"
              placeholderTextColor={C.textMuted}
              keyboardType="number-pad"
            />
            {actionError ? <Text style={styles.modalError}>{actionError}</Text> : null}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setShowLimitModal(false)} disabled={actionSubmitting}>
                <Text style={styles.modalButtonText}>Otkaži</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={submitLimits} disabled={actionSubmitting}>
                {actionSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Sačuvaj</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function resolveLoanLabel(loanType: string): string {
  const labels: Record<string, string> = {
    cash: 'Gotovinski kredit',
    mortgage: 'Stambeni kredit',
    car: 'Auto kredit',
    refinancing: 'Refinansirajući kredit',
    student: 'Studentski kredit',
  };

  return labels[loanType.toLowerCase()] ?? loanType;
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 36 },
  noteCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: C.bgCard, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  noteTitle: { color: C.textPrimary, fontSize: 15, fontWeight: '700' },
  noteSub: { color: C.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 18 },
  segmentRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  segmentBtn: { flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard },
  segmentBtnActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  segmentText: { color: C.textSecondary, fontSize: 13, fontWeight: '600' },
  segmentTextActive: { color: C.primary },
  sectionTitle: { color: C.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  portalCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 12 },
  portalCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  portalIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  portalTitle: { color: C.textPrimary, fontSize: 14, fontWeight: '700' },
  portalSub: { color: C.textSecondary, fontSize: 12, marginTop: 3, lineHeight: 17 },
  portalActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  actionPrimary: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center' },
  actionPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  actionSecondary: { flex: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  actionSecondaryText: { color: C.textSecondary, fontSize: 13, fontWeight: '700' },
  cardNote: { color: C.textMuted, fontSize: 12, lineHeight: 18 },
  emptyTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 12 },
  emptySub: { color: C.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  modalLabel: { color: C.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  modalInput: { backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, color: C.textPrimary, fontSize: 15, padding: 14, marginBottom: 12 },
  modalNote: { color: C.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  modalError: { color: C.danger, fontSize: 12, marginBottom: 8 },
  modalActionsRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalButton: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard },
  modalButtonPrimary: { backgroundColor: C.primary, borderColor: C.primary },
  modalButtonText: { color: C.textSecondary, fontSize: 15, fontWeight: '600' },
  modalButtonTextPrimary: { color: '#fff' },
});
