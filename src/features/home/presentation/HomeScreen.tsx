import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { MOCK_USER } from '../../../shared/data/mockData';
import { fmt, fmtDateTime } from '../../../shared/utils/formatters';
import { compareAccountsByCurrencyAndBalance } from '../../../shared/utils/accountOrder';
import { compareByNameThenAccount } from '../../../shared/utils/recipientOrder';
import { useAccounts, useExchangeRates, useRecipients, useTransactions } from '../../../shared/hooks/useFeatures';

interface Props {
  hasNotif: boolean;
  onOpenAccount: (id: number) => void;
  onShowAllAccounts: () => void;
  onOpenQuickPayment: (prefill: { recipientName: string; recipientAccount: string }) => void;
  onOpenTransfer: (accountId: number) => void;
  onNavigate: (screen: string) => void;
}

export default function HomeScreen({ hasNotif, onOpenAccount, onShowAllAccounts, onOpenQuickPayment, onOpenTransfer, onNavigate }: Props) {
  const { state: accountsState } = useAccounts();
  const { state: recipientsState } = useRecipients();
  const { state: ratesState } = useExchangeRates();

  const accounts = useMemo(
    () => [...(accountsState.data ?? [])].sort(compareAccountsByCurrencyAndBalance),
    [accountsState.data]
  );
  const recipients = useMemo(
    () => [...(recipientsState.data ?? [])].sort((a, b) => compareByNameThenAccount(a, b, r => r.name, r => r.accountNumber)).slice(0, 4),
    [recipientsState.data]
  );

  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  useEffect(() => {
    if (!accounts.length) {
      setSelectedAccountId(null);
      return;
    }

    setSelectedAccountId(prev =>
      prev && accounts.some(account => account.id === prev) ? prev : accounts[0].id
    );
  }, [accounts]);

  const selectedAccount = accounts.find(account => account.id === selectedAccountId) ?? accounts[0];
  const { state: transactionsState } = useTransactions(selectedAccount?.id ?? 0);
  const transactions = (transactionsState.data ?? []).slice(0, 5);
  const calculatorRows = useMemo(() => {
    const allRates = ratesState.data ?? [];
    const baseCurrency = selectedAccount?.currency ?? 'RSD';
    const amount = 100;

    const toRsdRate = new Map<string, number>();
    toRsdRate.set('RSD', 1);

    allRates.forEach(rate => {
      if (rate.toCurrency === 'RSD') {
        toRsdRate.set(rate.fromCurrency, rate.middleRate);
      }
    });

    const currencies = Array.from(toRsdRate.keys()).filter(currency => currency !== baseCurrency);

    return currencies.slice(0, 4).map(targetCurrency => {
      const baseToRsd = toRsdRate.get(baseCurrency) ?? 1;
      const targetToRsd = toRsdRate.get(targetCurrency) ?? 1;
      const convertedAmount = baseCurrency === 'RSD'
        ? amount / targetToRsd
        : targetCurrency === 'RSD'
          ? amount * baseToRsd
          : (amount * baseToRsd) / targetToRsd;

      return {
        pair: `${baseCurrency}/${targetCurrency}`,
        convertedAmount,
        targetCurrency,
      };
    });
  }, [ratesState.data, selectedAccount?.currency]);

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Dobro dosli</Text>
          <Text style={styles.name}>{MOCK_USER.firstName} {MOCK_USER.lastName}</Text>
        </View>
        <TouchableOpacity style={styles.bellWrap} onPress={() => onNavigate('verify')}>
          <Ionicons name="notifications-outline" size={22} color={C.textSecondary} />
          {hasNotif && <View style={styles.bellDot} />}
        </TouchableOpacity>
      </View>

      <View style={styles.balanceCard}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <Text style={styles.balanceLabel}>Pregled racuna</Text>
        <Text style={styles.balanceAmount}>{selectedAccount ? fmt(selectedAccount.availableBalance, selectedAccount.currency) : fmt(0, 'RSD')}</Text>
        <Text style={styles.balanceAvail}>
          Izabrani racun: {selectedAccount?.name ?? '-'} • Raspolozivo {selectedAccount ? fmt(selectedAccount.availableBalance, selectedAccount.currency) : '-'}
        </Text>

        <View style={styles.quickRow}>
          {[
            { icon: 'wallet-outline' as const, label: 'Racuni', target: 'accounts' },
            { icon: 'send' as const, label: 'Placanje', target: 'payment' },
            { icon: 'swap-horizontal' as const, label: 'Prenos', target: 'transfer' },
          ].map(({ icon, label, target }) => (
            <TouchableOpacity
              key={label}
              style={styles.quickBtn}
              activeOpacity={0.7}
              onPress={() => {
                if (target === 'transfer' && selectedAccount) {
                  onOpenTransfer(selectedAccount.id);
                  return;
                }
                onNavigate(target);
              }}
            >
              <Ionicons name={icon} size={18} color="#fff" />
              <Text style={styles.quickLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.productRow}>
          <TouchableOpacity style={styles.productBtn} activeOpacity={0.75} onPress={() => onNavigate('cards')}>
            <View style={styles.productIconWrap}>
              <Ionicons name="card-outline" size={20} color={C.primary} />
            </View>
            <View style={styles.productTextWrap}>
              <Text style={styles.productTitle}>Kartice</Text>
              <Text style={styles.productSubtitle}>Pregled i blokiranje kartica</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.productBtn} activeOpacity={0.75} onPress={() => onNavigate('loans')}>
            <View style={styles.productIconWrap}>
              <Ionicons name="document-text-outline" size={20} color={C.primary} />
            </View>
            <View style={styles.productTextWrap}>
              <Text style={styles.productTitle}>Krediti</Text>
              <Text style={styles.productSubtitle}>Detalji i zahtev za novi kredit</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Moji racuni</Text>
        <TouchableOpacity onPress={onShowAllAccounts}>
          <Text style={styles.sectionLink}>Prikazi sve</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountScroller}>
        {accounts.map((account, index) => {
          const active = selectedAccount?.id === account.id;
          return (
            <View key={`${account.id}-${account.accountNumber}-${index}`} style={[styles.pill, active && styles.pillActive]}>
              <Text style={styles.pillName}>{account.name}</Text>
              <Text style={styles.pillMeta}>{account.accountNumber}</Text>
              <Text style={styles.pillBal}>{fmt(account.availableBalance, account.currency)}</Text>
              <View style={styles.pillActions}>
                <TouchableOpacity style={styles.pillSelectBtn} onPress={() => setSelectedAccountId(account.id)} activeOpacity={0.7}>
                  <Text style={styles.pillSelectText}>Izaberi</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pillDetailBtn} onPress={() => onOpenAccount(account.id)} activeOpacity={0.7}>
                  <Text style={styles.pillDetailText}>Detalji</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Poslednjih 5 transakcija</Text>
        <Text style={styles.inlineHint}>{selectedAccount?.name ?? ''}</Text>
      </View>
      {transactions.map((transaction, index) => (
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

      <View style={[styles.sectionRow, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>Brzo placanje</Text>
        <TouchableOpacity onPress={() => onNavigate('recipients')}>
          <Text style={styles.sectionLink}>Dodaj primaoca</Text>
        </TouchableOpacity>
      </View>
        <View style={styles.tileGrid}>
        {recipients.map(recipient => (
          <TouchableOpacity
            key={recipient.id}
            style={styles.tile}
            activeOpacity={0.7}
            onPress={() => onOpenQuickPayment({ recipientName: recipient.name, recipientAccount: recipient.accountNumber })}
          >
            <View style={styles.tileIcon}>
              <Ionicons name="person-outline" size={20} color={C.primary} />
            </View>
            <Text style={styles.tileTitle} numberOfLines={1}>{recipient.name}</Text>
            <Text style={styles.tileMeta} numberOfLines={1}>{recipient.accountNumber}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.sectionRow, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>Kursna lista i kalkulator</Text>
        <TouchableOpacity onPress={() => onNavigate('exchange')}>
          <Text style={styles.sectionLink}>Otvori menjacnicu</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.calculatorCard}>
        <Text style={styles.calcTitle}>Brza provera ekvivalentnosti</Text>
        <Text style={styles.calcSubtitle}>
          100 {selectedAccount?.currency ?? 'RSD'} na osnovu srednjeg kursa
        </Text>
        <View style={styles.rateList}>
          {calculatorRows.map(row => (
            <View key={row.pair} style={styles.rateRow}>
              <Text style={styles.ratePair}>{row.pair}</Text>
              <Text style={styles.rateValue}>
                {row.convertedAmount.toFixed(2)} {row.targetCurrency}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  content: { padding: 20, paddingBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { color: C.textSecondary, fontSize: 13 },
  name: { color: C.textPrimary, fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  bellWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  bellDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: C.danger },
  balanceCard: { backgroundColor: C.primary, borderRadius: 22, padding: 24, marginBottom: 24, overflow: 'hidden', shadowColor: C.primary, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 10 },
  circle1: { position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)' },
  circle2: { position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.04)' },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' },
  balanceAmount: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -1, marginTop: 4 },
  balanceAvail: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 4 },
  quickRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  quickBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  quickLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '500', marginTop: 4 },
  productRow: { gap: 10, marginTop: 12 },
  productBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  productIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  productTextWrap: { flex: 1 },
  productTitle: { color: C.textPrimary, fontSize: 14, fontWeight: '700' },
  productSubtitle: { color: C.textMuted, fontSize: 11, marginTop: 3 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: C.textPrimary, fontSize: 16, fontWeight: '600' },
  sectionLink: { color: C.primary, fontSize: 13, fontWeight: '500' },
  inlineHint: { color: C.textMuted, fontSize: 12 },
  accountScroller: { marginBottom: 8 },
  pill: { width: 208, backgroundColor: C.bgCard, borderRadius: 16, padding: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: C.border, marginRight: 10 },
  pillActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  pillName: { color: C.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  pillMeta: { color: C.textMuted, fontSize: 11, marginBottom: 8 },
  pillBal: { color: C.textPrimary, fontSize: 17, fontWeight: '700', marginBottom: 12 },
  pillActions: { flexDirection: 'row', gap: 8 },
  pillSelectBtn: { alignSelf: 'flex-start', backgroundColor: C.primarySoft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: C.primary },
  pillSelectText: { color: C.primary, fontSize: 12, fontWeight: '700' },
  pillDetailBtn: { alignSelf: 'flex-start', backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: C.border },
  pillDetailText: { color: C.textSecondary, fontSize: 12, fontWeight: '600' },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14, backgroundColor: C.bgCard, borderRadius: 14, borderWidth: 1, borderColor: C.border, marginBottom: 6 },
  txIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  txDesc: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
  txDate: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  txAmt: { color: C.textPrimary, fontSize: 14, fontWeight: '600' },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  tile: { width: '48%' as const, backgroundColor: C.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  tileIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  tileTitle: { color: C.textPrimary, fontSize: 13, fontWeight: '700' },
  tileMeta: { color: C.textMuted, fontSize: 11, marginTop: 4 },
  calculatorCard: { backgroundColor: C.bgCard, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: C.border },
  calcTitle: { color: C.textPrimary, fontSize: 15, fontWeight: '700' },
  calcSubtitle: { color: C.textSecondary, fontSize: 12, marginTop: 4, marginBottom: 14 },
  rateList: { gap: 10 },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  ratePair: { color: C.textSecondary, fontSize: 13, fontWeight: '600' },
  rateValue: { color: C.textPrimary, fontSize: 14, fontWeight: '700' },
});


