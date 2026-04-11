import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { compareAccountsByCurrencyAndBalance } from '../../../shared/utils/accountOrder';
import { useAccounts } from '../../../shared/hooks/useFeatures';
import { fmt } from '../../../shared/utils/formatters';
import { Account } from '../../../shared/types/models';

interface Props { onBack: () => void; }

type Mode = 'deposit' | 'withdraw';
type Step = 'form' | 'confirm' | 'success';

export default function DepositScreen({ onBack }: Props) {
  const { state: accountsState } = useAccounts();
  const accounts = [...(accountsState.data ?? [])].sort(compareAccountsByCurrencyAndBalance);

  const [step, setStep] = useState<Step>('form');
  const [mode, setMode] = useState<Mode>('deposit');
  const [account, setAccount] = useState<Account | null>(null);
  const [amount, setAmount] = useState('');
  const [showAccounts, setShowAccounts] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!account && accounts.length > 0) {
      setAccount(accounts[0]);
    }
  }, [accounts, account]);

  const parsedAmount = parseFloat(amount);
  const isWithdraw = mode === 'withdraw';
  const accentColor = isWithdraw ? C.danger : C.accent;
  const accentGlow = isWithdraw ? C.dangerGlow : C.accentGlow;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!account) {
      e.account = 'Izaberite račun';
      setErrors(e);
      return false;
    }
    if (!amount.trim() || isNaN(parsedAmount) || parsedAmount <= 0)
      e.amount = 'Unesite validan iznos';
    if (isWithdraw && parsedAmount > account.availableBalance)
      e.amount = 'Nedovoljno raspoloživih sredstava';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = () => { if (validate()) setStep('confirm'); };
  const handleConfirm = () => { setStep('success'); };

  const handleModeSwitch = (m: Mode) => {
    setMode(m);
    setAmount('');
    setErrors({});
  };

  if (accountsState.loading) {
    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg }]}>
        <Text style={styles.successSub}>Učitavanje računa...</Text>
      </View>
    );
  }

  if (!account) {
    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg, padding: 24 }]}>
        <Text style={styles.successSub}>Nema dostupnih računa.</Text>
      </View>
    );
  }

  if (step === 'success') {
    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg, padding: 24 }]}>
        <View style={[styles.successCircle, { backgroundColor: accentGlow }]}>
          <Ionicons name={isWithdraw ? 'arrow-up' : 'arrow-down'} size={36} color={accentColor} />
        </View>
        <Text style={styles.successTitle}>
          {isWithdraw ? 'Isplata uspešna!' : 'Uplata uspešna!'}
        </Text>
        <Text style={styles.successSub}>
          {isWithdraw
            ? 'Vaša isplata je uspešno obrađena.'
            : 'Vaša uplata je uspešno obrađena.'}
        </Text>
        <View style={styles.successCard}>
          <View style={styles.successRow}>
            <Text style={styles.successLabel}>Iznos</Text>
            <Text style={[styles.successValue, { color: accentColor, fontSize: 18, fontWeight: '700' }]}>
              {isWithdraw ? '-' : '+'}{fmt(parsedAmount, account.currency)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.successRow}>
            <Text style={styles.successLabel}>Račun</Text>
            <Text style={styles.successValue}>{account.name}</Text>
          </View>
          <View style={styles.successRow}>
            <Text style={styles.successLabel}>Novo stanje</Text>
            <Text style={styles.successValue}>
              {fmt(account.availableBalance + (isWithdraw ? -parsedAmount : parsedAmount), account.currency)}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={onBack} activeOpacity={0.8}>
          <Text style={styles.primaryBtnText}>Nazad na početnu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'confirm') {
    return (
      <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setStep('form')} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>
            {isWithdraw ? 'Potvrda isplate' : 'Potvrda uplate'}
          </Text>
        </View>

        <View style={[styles.amountDisplay, { borderColor: accentColor }]}>
          <Text style={styles.amountDisplayLabel}>
            {isWithdraw ? 'IZNOS ISPLATE' : 'IZNOS UPLATE'}
          </Text>
          <Text style={[styles.amountDisplayValue, { color: accentColor }]}>
            {isWithdraw ? '-' : '+'}{fmt(parsedAmount, account.currency)}
          </Text>
        </View>

        <View style={styles.confirmCard}>
          <View style={styles.confirmRow}>
            <Text style={styles.confirmLabel}>Račun</Text>
            <Text style={styles.confirmValue}>{account.name}</Text>
          </View>
          <View style={[styles.confirmRow, styles.confirmRowBorder]}>
            <Text style={styles.confirmLabel}>Broj računa</Text>
            <Text style={styles.confirmValue}>{account.accountNumber}</Text>
          </View>
          <View style={[styles.confirmRow, styles.confirmRowBorder]}>
            <Text style={styles.confirmLabel}>Raspoloživo nakon</Text>
            <Text style={styles.confirmValue}>
              {fmt(account.availableBalance + (isWithdraw ? -parsedAmount : parsedAmount), account.currency)}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('form')} activeOpacity={0.7}>
            <Text style={styles.secondaryBtnText}>Nazad</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, { flex: 1.5, backgroundColor: accentColor }]}
            onPress={handleConfirm}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>Potvrdi</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Uplata / Isplata</Text>
      </View>

      {/* Mode toggle */}
      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'deposit' && styles.toggleBtnActiveDeposit]}
          onPress={() => handleModeSwitch('deposit')}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-down-circle-outline" size={18} color={mode === 'deposit' ? C.accent : C.textMuted} />
          <Text style={[styles.toggleLabel, mode === 'deposit' && { color: C.accent, fontWeight: '700' }]}>Uplata</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'withdraw' && styles.toggleBtnActiveWithdraw]}
          onPress={() => handleModeSwitch('withdraw')}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-up-circle-outline" size={18} color={mode === 'withdraw' ? C.danger : C.textMuted} />
          <Text style={[styles.toggleLabel, mode === 'withdraw' && { color: C.danger, fontWeight: '700' }]}>Isplata</Text>
        </TouchableOpacity>
      </View>

      {/* Account */}
      <Text style={styles.label}>RAČUN</Text>
      <TouchableOpacity style={styles.selectBtn} onPress={() => setShowAccounts(true)} activeOpacity={0.7}>
        <View style={styles.accountIconWrap}>
          <Ionicons name="wallet" size={18} color={C.primary} />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.selectMain}>{account.name}</Text>
          <Text style={styles.selectSub}>Raspoloživo: {fmt(account.availableBalance, account.currency)}</Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={C.textMuted} />
      </TouchableOpacity>

      {/* Amount */}
      <Text style={[styles.label, { marginTop: 20 }]}>IZNOS</Text>
      <View style={[styles.inputWrap, { borderColor: amount && !errors.amount ? accentColor : C.border }, errors.amount ? styles.inputError : null]}>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={v => { setAmount(v); setErrors({}); }}
          placeholder="0.00"
          placeholderTextColor={C.textMuted}
          keyboardType="decimal-pad"
        />
        <Text style={styles.currBadge}>{account.currency}</Text>
      </View>
      {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}

      {isWithdraw && (
        <Text style={styles.availableHint}>
          Raspoloživo za isplatu: <Text style={{ color: C.textPrimary, fontWeight: '600' }}>{fmt(account.availableBalance, account.currency)}</Text>
        </Text>
      )}

      <TouchableOpacity
        style={[styles.primaryBtn, { marginTop: 28, backgroundColor: accentColor }]}
        onPress={handleContinue}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryBtnText}>{isWithdraw ? 'Isplati sredstva' : 'Uplati sredstva'}</Text>
      </TouchableOpacity>

      {/* Account picker */}
      <Modal visible={showAccounts} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Odaberite račun</Text>
              <TouchableOpacity onPress={() => setShowAccounts(false)}>
                <Ionicons name="close" size={24} color={C.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
              {accounts.map(acc => (
                <TouchableOpacity
                  key={acc.id}
                  style={styles.sheetItem}
                  onPress={() => { setAccount(acc); setShowAccounts(false); }}
                  activeOpacity={0.7}
                >
                  <View style={styles.sheetItemIcon}>
                    <Ionicons name="wallet" size={18} color={C.primary} />
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.sheetItemTitle}>{acc.name}</Text>
                    <Text style={styles.sheetItemSub}>Raspoloživo: {fmt(acc.availableBalance, acc.currency)}</Text>
                  </View>
                  {account.id === acc.id && (
                    <Ionicons name="checkmark-circle" size={20} color={C.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  screenTitle: { color: C.textPrimary, fontSize: 20, fontWeight: '700' },
  toggle: { flexDirection: 'row', backgroundColor: C.bgCard, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 4, marginBottom: 24, gap: 4 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10 },
  toggleBtnActiveDeposit: { backgroundColor: C.accentGlow },
  toggleBtnActiveWithdraw: { backgroundColor: C.dangerGlow },
  toggleLabel: { color: C.textMuted, fontSize: 14, fontWeight: '500' },
  label: { color: C.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, padding: 14, gap: 12 },
  accountIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  selectMain: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
  selectSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  inputWrap: { backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center' },
  inputError: { borderColor: C.danger },
  input: { flex: 1, color: C.textPrimary, fontSize: 22, fontWeight: '600', padding: 16 },
  currBadge: { color: C.textMuted, fontSize: 13, fontWeight: '600', paddingRight: 16 },
  errorText: { color: C.danger, fontSize: 12, marginTop: 4 },
  availableHint: { color: C.textMuted, fontSize: 12, marginTop: 8 },
  primaryBtn: { borderRadius: 14, padding: 16, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { flex: 1, backgroundColor: C.bgCard, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  secondaryBtnText: { color: C.textSecondary, fontSize: 15, fontWeight: '600' },
  amountDisplay: { borderRadius: 18, borderWidth: 2, padding: 24, alignItems: 'center', marginBottom: 20, backgroundColor: C.bgCard },
  amountDisplayLabel: { color: C.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  amountDisplayValue: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  confirmCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 24 },
  confirmRow: { padding: 16, paddingHorizontal: 18 },
  confirmRowBorder: { borderTopWidth: 1, borderTopColor: C.border },
  confirmLabel: { color: C.textMuted, fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  confirmValue: { color: C.textPrimary, fontSize: 14, fontWeight: '500', marginTop: 4 },
  successCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successTitle: { color: C.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 8 },
  successSub: { color: C.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  successCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18, width: '100%', marginBottom: 24 },
  successRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  successLabel: { color: C.textMuted, fontSize: 13 },
  successValue: { color: C.textPrimary, fontSize: 13, fontWeight: '600' },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700' },
  sheetItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 4 },
  sheetItemIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  sheetItemTitle: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
  sheetItemSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },
});
