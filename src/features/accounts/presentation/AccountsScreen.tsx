import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { fmt, fmtDate, fmtDateTime } from '../../../shared/utils/formatters';
import { compareAccountsByCurrencyAndBalance } from '../../../shared/utils/accountOrder';
import { useAccounts, useTransactions } from '../../../shared/hooks/useFeatures';
import { ScreenState } from '../../../shared/components/FeaturePrimitives';
import { Transaction } from '../../../shared/types/models';

interface Props {
  detailId: number | null;
  onSelect: (id: number) => void;
  onBack: () => void;
  onNavigate: (screen: string) => void;
  isEmployee: boolean;
}

export default function AccountsScreen({ detailId, onSelect, onBack, onNavigate, isEmployee }: Props) {
  const { state: accountsState, actions: accountActions } = useAccounts();
  const { state: transactionsState } = useTransactions(detailId ?? 0);

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [dailyLimitValue, setDailyLimitValue] = useState('');
  const [monthlyLimitValue, setMonthlyLimitValue] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  if (accountsState.loading) {
    return <ScreenState title="Računi" onBack={onBack} loading />;
  }

  if (accountsState.error) {
    return <ScreenState title="Računi" onBack={onBack} error={accountsState.error} />;
  }

  const accounts = [...(accountsState.data ?? [])].sort(compareAccountsByCurrencyAndBalance);
  const selectedAccount = detailId ? accounts.find(item => item.id === detailId) : undefined;

  const openRenameModal = () => {
    if (!selectedAccount) {
      return;
    }

    setRenameValue(selectedAccount.name);
    setActionError(null);
    setShowRenameModal(true);
  };

  const openLimitModal = () => {
    if (!selectedAccount) {
      return;
    }

    setDailyLimitValue(selectedAccount.dailyLimit ? String(selectedAccount.dailyLimit) : '');
    setMonthlyLimitValue(selectedAccount.monthlyLimit ? String(selectedAccount.monthlyLimit) : '');
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

    if (trimmed === selectedAccount.name) {
      setActionError('Novo ime mora da bude različito od trenutnog');
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
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Neuspešna promena naziva računa.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const submitLimits = async () => {
    if (!selectedAccount) {
      return;
    }

    const dailyLimit = dailyLimitValue.trim() ? Number.parseFloat(dailyLimitValue.replace(',', '.')) : undefined;
    const monthlyLimit = monthlyLimitValue.trim() ? Number.parseFloat(monthlyLimitValue.replace(',', '.')) : undefined;

    if (dailyLimit === undefined && monthlyLimit === undefined) {
      setActionError('Unesite bar jedan limit');
      return;
    }

    if (dailyLimit !== undefined && (!Number.isFinite(dailyLimit) || dailyLimit < 0)) {
      setActionError('Dnevni limit mora biti validan broj');
      return;
    }

    if (monthlyLimit !== undefined && (!Number.isFinite(monthlyLimit) || monthlyLimit < 0)) {
      setActionError('Mesečni limit mora biti validan broj');
      return;
    }

    if (!isEmployee) {
      setActionError('Promena limita je trenutno dostupna zaposlenima u portalu.');
      return;
    }

    if (!totpCode.trim()) {
      setActionError('Unesite TOTP kod sa stranice Verifikacija.');
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
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Neuspešna promena limita.');
    } finally {
      setActionSubmitting(false);
    }
  };

  if (detailId) {
    const account = selectedAccount;
    const transactions = transactionsState.data ?? [];
    const spendingStats = account
      ? getSpendingStats(
          transactions
        )
      : { dailySpent: 0, monthlySpent: 0 };

    if (!account) {
      return (
        <View style={[styles.flex1, styles.center, { padding: 24 }]}>
          <Text style={styles.subtitle}>Racun nije pronadjen.</Text>
        </View>
      );
    }

    const detailRows: [string, string][] = [
      ['Naziv racuna', account.name],
      ['Broj racuna', account.accountNumber],
      ['Vlasnik', account.ownerName ?? 'Marko Petrović'],
      ['Tip', account.type === 'poslovni' ? `Poslovni • ${account.subtype ?? 'Poslovni'}` : `${account.type} • ${account.subtype ?? 'Licni'}`],
      ['Raspolozivo stanje', fmt(account.availableBalance, account.currency)],
      ['Rezervisana sredstva', fmt(account.reservedAmount, account.currency)],
      ['Stanje racuna', fmt(account.balance, account.currency)],
      ['Datum kreiranja', fmtDate(account.createdAt)],
      ['Datum isteka', fmtDate(account.expiresAt)],
      ['Status', account.status === 'active' ? 'Aktivan' : 'Neaktivan'],
    ];

    if (account.companyName) {
      detailRows.splice(4, 0, ['Firma', account.companyName]);
    }

    return (
      <>
      <ScrollView style={styles.flex1} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.row}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>Detalji racuna</Text>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>{account.name}</Text>
          <Text style={styles.heroAmount}>{fmt(account.availableBalance, account.currency)}</Text>
          <Text style={styles.heroSub}>{account.accountNumber}</Text>
        </View>

        <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={openRenameModal}>
          <Ionicons name="create-outline" size={16} color={C.primary} />
          <Text style={styles.actionText}>Promena naziva</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onNavigate('payment')}>
          <Ionicons name="send-outline" size={16} color={C.primary} />
          <Text style={styles.actionText}>Novo placanje</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={openLimitModal}>
          <Ionicons name="options-outline" size={16} color={C.primary} />
          <Text style={styles.actionText}>Promena limita</Text>
        </TouchableOpacity>
      </View>

        {selectedAccount ? (
          <Text style={styles.helperText}>
            {isEmployee
              ? 'Promena limita se šalje sa TOTP potvrdom.'
              : 'Promena limita je dostupna zaposlenima u portalu. Naziv računa možeš menjati odmah.'}
          </Text>
        ) : null}

        <Text style={styles.sectionTitle}>Podaci o racunu</Text>
        <View style={styles.detailCard}>
          {detailRows.map(([label, value], index) => (
            <View key={label} style={[styles.infoRow, index > 0 && styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Limiti i potrosnja</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Dnevni limit</Text>
            <Text style={styles.statValue}>{fmt(account.dailyLimit ?? 0, account.currency)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Mesecni limit</Text>
            <Text style={styles.statValue}>{fmt(account.monthlyLimit ?? 0, account.currency)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Dnevna potrosnja</Text>
            <Text style={styles.statValue}>{fmt(spendingStats.dailySpent, account.currency)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Mesecna potrosnja</Text>
            <Text style={styles.statValue}>{fmt(spendingStats.monthlySpent, account.currency)}</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 14 }]}>Transakcije</Text>
        {transactionsState.loading ? (
          <ActivityIndicator color={C.primary} />
        ) : transactions.length === 0 ? (
          <Text style={styles.emptyState}>Nema transakcija</Text>
        ) : transactions.map((transaction, index) => (
          <View key={`${transaction.id}-${transaction.accountId}-${transaction.date}-${transaction.amount}-${index}`} style={styles.txRow}>
            <View style={[styles.txIcon, { backgroundColor: transaction.amount > 0 ? C.accentGlow : C.dangerGlow }]}>
              <Ionicons name={transaction.amount > 0 ? 'arrow-down' : 'arrow-up'} size={18} color={transaction.amount > 0 ? C.accent : C.danger} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.txDesc} numberOfLines={1}>{transaction.description}</Text>
              <Text style={styles.txDate}>{fmtDateTime(transaction.date)}</Text>
            </View>
            <Text style={[styles.txAmt, transaction.amount > 0 && { color: C.accent }]}>
              {transaction.amount > 0 ? '+' : ''}
              {fmt(transaction.amount, transaction.currency)}
            </Text>
          </View>
        ))}
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
            <View style={styles.modalActions}>
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
            <Text style={styles.modalNote}>
              {isEmployee
                ? 'Unesi novi dnevni i/ili mesečni limit. Potreban je TOTP kod sa stranice Verifikacija.'
                : 'Promena limita je dostupna zaposlenima u portalu.'}
            </Text>
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
            <View style={styles.modalActions}>
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

  return (
    <>
    <ScrollView style={styles.flex1} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Moji racuni</Text>
      <Text style={styles.subtitle}>Aktivni racuni su sortirani po raspolozivom stanju</Text>
      {accounts.map((account, index) => (
        <View key={`${account.id}-${account.accountNumber}-${index}`} style={styles.accountCard}>
          <TouchableOpacity style={styles.accountMain} onPress={() => onSelect(account.id)} activeOpacity={0.7}>
            <View style={styles.accIcon}>
              <Ionicons name="wallet" size={22} color={C.primary} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.accName}>{account.name}</Text>
              <Text style={styles.accNum}>{account.accountNumber}</Text>
              <Text style={styles.accMeta}>
                {account.companyName ? `${account.companyName} • ` : ''}
                {account.type === 'poslovni' ? 'Poslovni' : 'Licni'} • {account.currency}
              </Text>
            </View>
            <View style={styles.accountAmountBox}>
              <Text style={styles.accBal}>{fmt(account.availableBalance, account.currency)}</Text>
              <Text style={styles.accSmall}>raspolozivo</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.detailBtn} onPress={() => onSelect(account.id)} activeOpacity={0.7}>
            <Text style={styles.detailBtnText}>Detalji</Text>
            <Ionicons name="chevron-forward" size={14} color={C.primary} />
          </TouchableOpacity>
        </View>
      ))}
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
          <View style={styles.modalActions}>
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
          <Text style={styles.modalNote}>
            {isEmployee
              ? 'Unesi novi dnevni i/ili mesečni limit. Potreban je TOTP kod sa stranice Verifikacija.'
              : 'Promena limita je dostupna zaposlenima u portalu.'}
          </Text>
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
          <View style={styles.modalActions}>
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

function getSpendingStats(
  transactions: Transaction[]
): { dailySpent: number; monthlySpent: number } {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let dailySpent = 0;
  let monthlySpent = 0;

  for (const transaction of transactions) {
    if (transaction.status !== 'completed' || transaction.amount >= 0) {
      continue;
    }

    const transactionDate = parseTransactionDate(transaction.date);
    if (!transactionDate) {
      continue;
    }

    if (transactionDate >= startOfDay) {
      dailySpent += Math.abs(transaction.amount);
    }

    if (transactionDate >= startOfMonth) {
      monthlySpent += Math.abs(transaction.amount);
    }
  }

  return {
    dailySpent,
    monthlySpent,
  };
}

function parseTransactionDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const dayMonthYearMatch = trimmed.match(
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[.,]?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?\.?$/
  );

  if (dayMonthYearMatch) {
    const [, dayRaw, monthRaw, yearRaw, hourRaw = '0', minuteRaw = '0', secondRaw = '0'] = dayMonthYearMatch;
    const day = Number.parseInt(dayRaw, 10);
    const month = Number.parseInt(monthRaw, 10) - 1;
    const year = Number.parseInt(yearRaw, 10);
    const hour = Number.parseInt(hourRaw, 10);
    const minute = Number.parseInt(minuteRaw, 10);
    const second = Number.parseInt(secondRaw, 10);
    const parsed = new Date(year, month, day, hour, minute, second);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const isoParsed = new Date(trimmed);
  return Number.isNaN(isoParsed.getTime()) ? null : isoParsed;
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  title: { color: C.textPrimary, fontSize: 22, fontWeight: '700' },
  subtitle: { color: C.textSecondary, fontSize: 13, marginBottom: 20 },
  sectionTitle: { color: C.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 14 },
  heroCard: { backgroundColor: C.primary, borderRadius: 20, padding: 22, marginBottom: 18 },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  heroAmount: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 8 },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 6, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.bgCard, borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: C.border },
  actionText: { color: C.textSecondary, fontSize: 12, fontWeight: '600' },
  detailCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  infoRow: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: C.border },
  infoLabel: { color: C.textMuted, fontSize: 13, flex: 1 },
  infoValue: { color: C.textPrimary, fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  statCard: { width: '48%' as const, backgroundColor: C.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  statLabel: { color: C.textMuted, fontSize: 12 },
  statValue: { color: C.textPrimary, fontSize: 15, fontWeight: '700', marginTop: 8 },
  emptyState: { color: C.textMuted, textAlign: 'center', padding: 40 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14, backgroundColor: C.bgCard, borderRadius: 14, borderWidth: 1, borderColor: C.border, marginBottom: 6 },
  txIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  txDesc: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
  txDate: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  txAmt: { color: C.textPrimary, fontSize: 14, fontWeight: '600' },
  accountCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, marginBottom: 10, overflow: 'hidden' },
  accountMain: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, paddingHorizontal: 20 },
  accIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  accName: { color: C.textPrimary, fontSize: 15, fontWeight: '600' },
  accNum: { color: C.textMuted, fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 2 },
  accMeta: { color: C.textSecondary, fontSize: 12, marginTop: 6 },
  accountAmountBox: { alignItems: 'flex-end' },
  accBal: { color: C.textPrimary, fontSize: 16, fontWeight: '700' },
  accSmall: { color: C.textMuted, fontSize: 11, marginTop: 4 },
  detailBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: C.border, paddingVertical: 12, backgroundColor: C.bg },
  detailBtnText: { color: C.primary, fontSize: 13, fontWeight: '700' },
  helperText: { color: C.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  modalLabel: { color: C.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  modalInput: { backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, color: C.textPrimary, fontSize: 15, padding: 14, marginBottom: 12 },
  modalNote: { color: C.textMuted, fontSize: 12, lineHeight: 18, marginTop: 4, marginBottom: 12 },
  modalError: { color: C.danger, fontSize: 12, marginBottom: 8 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 6 },
  modalButton: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard },
  modalButtonPrimary: { backgroundColor: C.primary, borderColor: C.primary },
  modalButtonText: { color: C.textSecondary, fontSize: 15, fontWeight: '600' },
  modalButtonTextPrimary: { color: '#fff' },
});

