import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { fmt } from '../../../shared/utils/formatters';
import { useAccounts } from '../../../shared/hooks/useFeatures';
import { container } from '../../../core/di/container';
import { API_CONFIG } from '../../../core/network/NetworkClient';
import { Account } from '../../../shared/types/models';

interface Props {
  onBack: () => void;
  initialAccountId: number | null;
  onConsumeInitialAccountId: () => void;
  initialTotpCode: string;
  onConsumeTotpCode: () => void;
}

type Step = 'form' | 'confirm' | 'success';

export default function TransferScreen({ onBack, initialAccountId, onConsumeInitialAccountId, initialTotpCode, onConsumeTotpCode }: Props) {
  const { state: accountsState, refresh: refreshAccounts } = useAccounts();
  const accounts = accountsState.data ?? [];

  const [fromAcc, setFromAcc] = useState<Account | null>(null);
  const [toAcc, setToAcc] = useState<Account | null>(null);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loadingFreshCode, setLoadingFreshCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completedStatus, setCompletedStatus] = useState<string | undefined>();

  const pickPreferredTarget = (source: Account | null, availableAccounts: Account[]) => {
    if (!source) {
      return availableAccounts[1] ?? availableAccounts[0] ?? null;
    }

    const sameCurrency = availableAccounts.find(
      account =>
        account.accountNumber !== source.accountNumber &&
        account.currency === source.currency
    );

    if (sameCurrency) {
      return sameCurrency;
    }

    return availableAccounts.find(account => account.accountNumber !== source.accountNumber) ?? null;
  };

  useEffect(() => {
    if (!accounts.length) {
      return;
    }

    const candidateSource = initialAccountId !== null
      ? accounts.find(account => account.id === initialAccountId) ?? null
      : fromAcc ?? accounts[0] ?? null;

    const validSource = candidateSource && accounts.some(account => account.accountNumber === candidateSource.accountNumber)
      ? candidateSource
      : accounts[0] ?? null;

    if (!validSource) {
      return;
    }

    const validTarget = pickPreferredTarget(validSource, accounts);

    if (!fromAcc || fromAcc.accountNumber !== validSource.accountNumber) {
      setFromAcc(validSource);
    }

    if (!toAcc || toAcc.accountNumber === validSource.accountNumber) {
      setToAcc(validTarget);
    } else if (!accounts.some(account => account.accountNumber === toAcc.accountNumber)) {
      setToAcc(validTarget);
    } else if (toAcc && toAcc.currency !== validSource.currency) {
      const sameCurrencyTarget = pickPreferredTarget(validSource, accounts);
      if (sameCurrencyTarget && sameCurrencyTarget.accountNumber !== toAcc.accountNumber) {
        setToAcc(sameCurrencyTarget);
      }
    }

    if (initialAccountId !== null) {
      onConsumeInitialAccountId();
    }
  }, [accounts, initialAccountId, onConsumeInitialAccountId, fromAcc, toAcc]);

  useEffect(() => {
    if (initialTotpCode) {
      setTotpCode(initialTotpCode);
    }
  }, [initialTotpCode]);

  useEffect(() => {
    if (step !== 'confirm' || API_CONFIG.USE_MOCK) {
      return;
    }

    let cancelled = false;

    const loadFreshCode = async () => {
      setLoadingFreshCode(true);
      setInfoMessage('');
      try {
        const result = await container.totpRepository.requestTransactionCode();
        if (!cancelled) {
          setTotpCode(result.code);
          setInfoMessage('Ucitan je svez verification kod sa backend-a.');
        }
      } catch (e: any) {
        if (!cancelled) {
          setInfoMessage(e.message ?? 'Neuspesno ucitavanje verification koda.');
        }
      } finally {
        if (!cancelled) {
          setLoadingFreshCode(false);
        }
      }
    };

    loadFreshCode();
    return () => {
      cancelled = true;
    };
  }, [step]);

  const amountNum = useMemo(() => {
    const parsed = parseFloat(amount.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }, [amount]);

  const sameAccounts = !!fromAcc && !!toAcc && fromAcc.accountNumber === toAcc.accountNumber;
  const sameCurrency = !!fromAcc && !!toAcc && fromAcc.currency === toAcc.currency;

  const validate = () => {
    if (!fromAcc || !toAcc) {
      setError('Potrebna su oba računa za prenos.');
      return false;
    }
    if (!amount.trim() || amountNum <= 0) {
      setError('Unesite validan iznos');
      return false;
    }
    if (amountNum > fromAcc.availableBalance) {
      setError('Nedovoljno sredstava');
      return false;
    }
    if (sameAccounts) {
      setError('Odaberite različite račune');
      return false;
    }
    if (!sameCurrency) {
      setError('Prenos je moguć samo između računa iste valute. Za konverziju koristite menjačnicu.');
      return false;
    }

    setError('');
    return true;
  };

  const handleContinue = () => {
    if (validate()) {
      setStep('confirm');
    }
  };

  const handleSwap = () => {
    if (!fromAcc || !toAcc) {
      return;
    }
    setFromAcc(toAcc);
    setToAcc(pickPreferredTarget(toAcc, accounts) ?? fromAcc);
  };

  const handleConfirm = async () => {
    if (!fromAcc || !toAcc) {
      return;
    }

    setSubmitting(true);
    try {
      const previousBalance = fromAcc.availableBalance;
      const result = await container.paymentRepository.submitTransfer({
        fromAccountNumber: fromAcc.accountNumber,
        toAccountNumber: toAcc.accountNumber,
        amount: amountNum,
        totpCode: API_CONFIG.USE_MOCK ? undefined : totpCode.trim(),
      });

      const refreshedAccounts = await container.accountRepository.getAccounts();
      const refreshedSource = refreshedAccounts.find(account => account.accountNumber === fromAcc.accountNumber);

      if (!API_CONFIG.USE_MOCK && refreshedSource && refreshedSource.availableBalance === previousBalance) {
        throw new Error('Prenos je prihvaćen, ali backend nije ažurirao stanje računa.');
      }

      setCompletedStatus(result.status);
      setTotpCode('');
      onConsumeTotpCode();
      await refreshAccounts();
      setStep('success');
    } catch (e: any) {
      alert(e.message ?? 'Greška pri prenosu');
    } finally {
      setSubmitting(false);
    }
  };

  if (accountsState.loading) {
    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!fromAcc || !toAcc) {
    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg, padding: 24 }]}>
        <Text style={styles.helperText}>Nema dovoljno računa za prenos.</Text>
      </View>
    );
  }

  if (step === 'success') {
    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg, padding: 24 }]}>
        <Ionicons name="checkmark-circle" size={64} color={C.accent} />
        <Text style={styles.successTitle}>Prenos uspešan!</Text>
        <Text style={styles.successSub}>Backend je ažurirao sredstva između vaših računa.</Text>
        <View style={styles.successCard}>
          <View style={styles.sRow}><Text style={styles.sLabel}>Sa</Text><Text style={styles.sValue}>{fromAcc.name}</Text></View>
          <View style={styles.sRow}><Text style={styles.sLabel}>Na</Text><Text style={styles.sValue}>{toAcc.name}</Text></View>
          <View style={styles.sRow}><Text style={styles.sLabel}>Iznos</Text><Text style={[styles.sValue, { color: C.accent }]}>{fmt(amountNum, fromAcc.currency)}</Text></View>
          {completedStatus ? <View style={styles.sRow}><Text style={styles.sLabel}>Status</Text><Text style={styles.sValue}>{completedStatus}</Text></View> : null}
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={onBack}>
          <Text style={styles.primaryBtnText}>Nazad na početnu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'confirm') {
    return (
      <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setStep('form')} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>Potvrda prenosa</Text>
        </View>
        <View style={styles.confirmCard}>
          {[
            ['Sa računa', `${fromAcc.name}\n${fromAcc.accountNumber}`],
            ['Na račun', `${toAcc.name}\n${toAcc.accountNumber}`],
            ['Iznos', fmt(amountNum, fromAcc.currency)],
          ].map(([label, value], index) => (
            <View key={label} style={[styles.confirmRow, index > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
              <Text style={styles.confirmLabel}>{label}</Text>
              <Text style={styles.confirmValue}>{value}</Text>
            </View>
          ))}
        </View>

        {!API_CONFIG.USE_MOCK && (
          <>
            <Text style={styles.label}>TOTP KOD</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={totpCode}
                onChangeText={setTotpCode}
                placeholder="Unesite 6-cifreni TOTP kod"
                placeholderTextColor={C.textMuted}
                keyboardType="number-pad"
                maxLength={12}
              />
            </View>
            <Text style={styles.confirmNote}>
              {loadingFreshCode ? 'Ucitavam svez verification kod sa backend-a...' : infoMessage || 'Verification kod se automatski ucitava kada je dostupan.'}
            </Text>
          </>
        )}

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('form')}>
            <Text style={styles.secondaryBtnText}>Nazad</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, { flex: 1.5, opacity: submitting || (!API_CONFIG.USE_MOCK && !totpCode.trim()) ? 0.7 : 1 }]}
            onPress={handleConfirm}
            disabled={submitting || (!API_CONFIG.USE_MOCK && !totpCode.trim())}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Potvrdi prenos</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const AccSelector = ({ label, acc, onPress }: { label: string; acc: Account; onPress: () => void }) => (
    <>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.accSelect} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.accSelectIcon}><Ionicons name="wallet" size={18} color={C.primary} /></View>
        <View style={styles.flexGrow}>
          <Text style={styles.accSelectName}>{acc.name}</Text>
          <Text style={styles.accSelectBal}>{fmt(acc.availableBalance, acc.currency)} raspoloživo</Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={C.textMuted} />
      </TouchableOpacity>
    </>
  );

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>Prenosi</Text>
      </View>

      <AccSelector label="SA RAČUNA" acc={fromAcc} onPress={() => setShowFrom(true)} />

      <TouchableOpacity style={styles.swapBtn} onPress={handleSwap} activeOpacity={0.7}>
        <Ionicons name="swap-vertical" size={22} color={C.primary} />
      </TouchableOpacity>

      <AccSelector label="NA RAČUN" acc={toAcc} onPress={() => setShowTo(true)} />

      {sameAccounts && <Text style={styles.warnText}>Odaberite različite račune</Text>}
      {!sameAccounts && !sameCurrency && <Text style={styles.warnText}>Prenos je moguć samo između računa iste valute. Za konverziju koristite menjačnicu.</Text>}

      <Text style={[styles.label, { marginTop: 20 }]}>IZNOS</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={C.textMuted}
          keyboardType="decimal-pad"
        />
        <Text style={styles.currBadge}>{fromAcc.currency}</Text>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24 }]} onPress={handleContinue}>
        <Text style={styles.primaryBtnText}>Nastavi</Text>
      </TouchableOpacity>

      {[
        { visible: showFrom, setVisible: setShowFrom, onSelect: setFromAcc },
        { visible: showTo, setVisible: setShowTo, onSelect: setToAcc },
      ].map((picker, index) => (
        <Modal key={index} visible={picker.visible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Odaberite račun</Text>
                <TouchableOpacity onPress={() => picker.setVisible(false)}>
                  <Ionicons name="close" size={24} color={C.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
                {accounts.map((account, accountIndex) => (
                  <TouchableOpacity
                    key={`${account.accountNumber}-${accountIndex}`}
                    style={styles.sheetItem}
                    onPress={() => {
                      if (picker.onSelect === setFromAcc) {
                        const target = pickPreferredTarget(account, accounts);
                        setFromAcc(account);
                        setToAcc(target);
                      } else {
                        if (account.accountNumber !== fromAcc?.accountNumber) {
                          picker.onSelect(account);
                        }
                      }
                      picker.setVisible(false);
                    }}
                  >
                    <View style={styles.sheetItemIcon}><Ionicons name="wallet" size={18} color={C.primary} /></View>
                    <View style={styles.flexGrow}>
                      <Text style={styles.sheetItemTitle}>{account.name}</Text>
                      <Text style={styles.sheetItemSub}>{fmt(account.availableBalance, account.currency)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  flexGrow: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  title: { color: C.textPrimary, fontSize: 20, fontWeight: '700' },
  helperText: { color: C.textSecondary, fontSize: 14, textAlign: 'center' },
  label: { color: C.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  accSelect: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, padding: 14 },
  accSelectIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  accSelectName: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
  accSelectBal: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  swapBtn: { alignSelf: 'center', width: 42, height: 42, borderRadius: 21, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center', marginVertical: 12, borderWidth: 1, borderColor: C.border },
  inputWrap: { backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, color: C.textPrimary, fontSize: 15, padding: 14 },
  currBadge: { color: C.textMuted, fontSize: 13, fontWeight: '600', paddingRight: 14 },
  errorText: { color: C.danger, fontSize: 12, marginTop: 4 },
  warnText: { color: C.warning, fontSize: 12, marginTop: 8 },
  primaryBtn: { backgroundColor: C.primary, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { flex: 1, backgroundColor: C.bgCard, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  secondaryBtnText: { color: C.textSecondary, fontSize: 15, fontWeight: '600' },
  confirmCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 20 },
  confirmRow: { padding: 14, paddingHorizontal: 18 },
  confirmLabel: { color: C.textMuted, fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  confirmValue: { color: C.textPrimary, fontSize: 14, fontWeight: '500', marginTop: 4 },
  confirmNote: { color: C.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 16 },
  successTitle: { color: C.textPrimary, fontSize: 22, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  successSub: { color: C.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  successCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18, width: '100%', marginBottom: 24 },
  sRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sLabel: { color: C.textMuted, fontSize: 13 },
  sValue: { color: C.textPrimary, fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700' },
  sheetItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 4 },
  sheetItemIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  sheetItemTitle: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
  sheetItemSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },
});
