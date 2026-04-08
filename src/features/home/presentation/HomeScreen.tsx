import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { fmt } from '../../../shared/utils/formatters';
import { useAccounts, useTransactions } from '../../../shared/hooks/useFeatures';
import { Client } from '../../../shared/types/models';

interface Props {
  hasNotif: boolean;
  user: Client | null;
  onOpenAccount: (id: number) => void;
  onShowAllAccounts: () => void;
  onNavigate: (screen: string) => void;
}

export default function HomeScreen({ hasNotif, user, onOpenAccount, onShowAllAccounts, onNavigate }: Props) {
  const { state: accountsState } = useAccounts();
  const accounts = accountsState.data ?? [];
  const main = accounts[0];
  const { state: transactionsState } = useTransactions(main?.id ?? 0);
  const transactions = (transactionsState.data ?? []).slice(0, 5);

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Dobro došli</Text>
          <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        </View>
        <TouchableOpacity style={styles.bellWrap} onPress={() => onNavigate('verify')}>
          <Ionicons name="notifications-outline" size={22} color={C.textSecondary} />
          {hasNotif && <View style={styles.bellDot} />}
        </TouchableOpacity>
      </View>

      {main && (
        <View style={styles.balanceCard}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
          <Text style={styles.balanceLabel}>Ukupno stanje</Text>
          <Text style={styles.balanceAmount}>{fmt(main.balance, main.currency)}</Text>
          <Text style={styles.balanceAvail}>Raspoloživo: {fmt(main.availableBalance, main.currency)}</Text>

          <View style={styles.quickRow}>
            {[
              { icon: 'arrow-up' as const, label: 'Uplata', target: 'deposit' },
              { icon: 'send' as const, label: 'Plaćanje', target: 'payment' },
              { icon: 'swap-horizontal' as const, label: 'Prenos', target: 'transfer' },
            ].map(({ icon, label, target }) => (
              <TouchableOpacity key={label} style={styles.quickBtn} activeOpacity={0.7} onPress={() => onNavigate(target)}>
                <Ionicons name={icon} size={18} color="#fff" />
                <Text style={styles.quickLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Moji računi</Text>
        <TouchableOpacity onPress={onShowAllAccounts}><Text style={styles.sectionLink}>Prikaži sve</Text></TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
        {accounts.map((account, index) => (
          <TouchableOpacity key={`home-account-${account.id}-${account.accountNumber}-${account.currency}-${account.name}-${index}`} style={styles.pill} onPress={() => onOpenAccount(account.id)} activeOpacity={0.7}>
            <Text style={styles.pillName}>{account.name}</Text>
            <Text style={styles.pillBal}>{fmt(account.balance, account.currency)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Brzi pristup</Text>
      </View>
      <View style={styles.menuGrid}>
        {[
          { icon: 'card-outline' as const, label: 'Kartice', target: 'cards' },
          { icon: 'swap-horizontal-outline' as const, label: 'Menjačnica', target: 'exchange' },
          { icon: 'cash-outline' as const, label: 'Krediti', target: 'loans' },
          { icon: 'receipt-outline' as const, label: 'Plaćanja', target: 'paymentHistory' },
          { icon: 'people-outline' as const, label: 'Primaoci', target: 'recipients' },
          { icon: 'shield-checkmark-outline' as const, label: 'Verifikacija', target: 'verify' },
        ].map(({ icon, label, target }) => (
          <TouchableOpacity key={label} style={styles.menuItem} activeOpacity={0.7} onPress={() => onNavigate(target)}>
            <View style={styles.menuIcon}>
              <Ionicons name={icon} size={22} color={C.primary} />
            </View>
            <Text style={styles.menuLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.sectionRow, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>Poslednje transakcije</Text>
      </View>
      {transactions.map((transaction, index) => (
        <View key={`home-transaction-${transaction.id}-${transaction.accountId}-${transaction.date}-${transaction.amount}-${index}`} style={styles.txRow}>
          <View style={[styles.txIcon, { backgroundColor: transaction.amount > 0 ? C.accentGlow : C.dangerGlow }]}>
            <Ionicons name={transaction.amount > 0 ? 'arrow-down' : 'arrow-up'} size={18} color={transaction.amount > 0 ? C.accent : C.danger} />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.txDesc} numberOfLines={1}>{transaction.description}</Text>
            <Text style={styles.txDate}>{transaction.date}</Text>
          </View>
          {transactions.map((transaction, i) => (
            <View key={`${transaction.id}-${i}`} style={styles.txRow}>
              <View style={[styles.txIcon, { backgroundColor: transaction.amount > 0 ? C.accentGlow : C.dangerGlow }]}>
                <Ionicons name={transaction.amount > 0 ? 'arrow-down' : 'arrow-up'} size={18} color={transaction.amount > 0 ? C.accent : C.danger} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.txDesc} numberOfLines={1}>{transaction.description}</Text>
                <Text style={styles.txDate}>{transaction.date}</Text>
              </View>
              <Text style={[styles.txAmt, transaction.amount > 0 && { color: C.accent }]}>
                {transaction.amount > 0 ? '+' : ''}
                {fmt(transaction.amount, transaction.currency)}
              </Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
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
  balanceAvail: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 },
  quickRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  quickBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  quickLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '500', marginTop: 4 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: C.textPrimary, fontSize: 16, fontWeight: '600' },
  sectionLink: { color: C.primary, fontSize: 13, fontWeight: '500' },
  pill: { minWidth: 150, backgroundColor: C.bgCard, borderRadius: 16, padding: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: C.border, marginRight: 10 },
  pillName: { color: C.textSecondary, fontSize: 11, fontWeight: '500', marginBottom: 6 },
  pillBal: { color: C.textPrimary, fontSize: 16, fontWeight: '700' },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  menuItem: { width: '31%' as any, backgroundColor: C.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  menuIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  menuLabel: { color: C.textSecondary, fontSize: 12, fontWeight: '500' },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14, backgroundColor: C.bgCard, borderRadius: 14, borderWidth: 1, borderColor: C.border, marginBottom: 4 },
  txIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  txDesc: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
  txDate: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  txAmt: { color: C.textPrimary, fontSize: 14, fontWeight: '600' },
});