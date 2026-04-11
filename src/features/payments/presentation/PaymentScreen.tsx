import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { compareAccountsByCurrencyAndBalance } from '../../../shared/utils/accountOrder';
import { compareByNameThenAccount } from '../../../shared/utils/recipientOrder';
import { fmt } from '../../../shared/utils/formatters';
import { useAccounts, useRecipients } from '../../../shared/hooks/useFeatures';
import { container } from '../../../core/di/container';
import { API_CONFIG } from '../../../core/network/NetworkClient';
import { Account, PaymentRecipient } from '../../../shared/types/models';

interface Props {
  onBack: () => void;
  initialTotpCode: string;
  onConsumeTotpCode: () => void;
  initialRecipient?: {
    recipientName: string;
    recipientAccount: string;
  } | null;
  onConsumeInitialRecipient?: () => void;
}

type Step = 'form' | 'confirm' | 'success';

export default function PaymentScreen({
  onBack,
  initialTotpCode,
  onConsumeTotpCode,
  initialRecipient,
  onConsumeInitialRecipient,
}: Props) {
  const { state: accountsState, refresh: refreshAccounts } = useAccounts();
  const { state: recipientsState } = useRecipients();

  const accounts = accountsState.data ?? [];
  const sortedAccounts = [...accounts].sort(compareAccountsByCurrencyAndBalance);
  const recipients = [...(recipientsState.data ?? [])].sort((a, b) => compareByNameThenAccount(a, b, r => r.name, r => r.accountNumber));

  const [step, setStep] = useState<Step>('form');
  const [recipientName, setRecipientName] = useState('');
  const [recipientAccount, setRecipientAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [paymentCode, setPaymentCode] = useState('289');
  const [refModel, setRefModel] = useState('');
  const [refNumber, setRefNumber] = useState('');
  const [sourceAccount, setSourceAccount] = useState<Account | null>(null);
  const [showRecipients, setShowRecipients] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingFreshCode, setLoadingFreshCode] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [completedStatus, setCompletedStatus] = useState<string | undefined>();

  useEffect(() => {
    if (!sourceAccount && sortedAccounts.length > 0) {
      setSourceAccount(sortedAccounts[0]);
    }
  }, [sortedAccounts, sourceAccount]);

  useEffect(() => {
    if (initialTotpCode) {
      setTotpCode(initialTotpCode);
    }
  }, [initialTotpCode]);

  useEffect(() => {
    if (!initialRecipient) {
      return;
    }

    setRecipientName(initialRecipient.recipientName);
    setRecipientAccount(initialRecipient.recipientAccount);

    if (!purpose.trim()) {
      setPurpose(initialRecipient.recipientName);
    }

    onConsumeInitialRecipient?.();
  }, [initialRecipient, onConsumeInitialRecipient, purpose]);

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

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!sourceAccount) nextErrors.source = 'Izaberite račun.';
    if (!recipientName.trim()) nextErrors.recipientName = 'Obavezno polje';
    if (!recipientAccount.trim()) nextErrors.recipientAccount = 'Obavezno polje';
    if (!amount.trim() || amountNum <= 0) nextErrors.amount = 'Unesite validan iznos';
    if (sourceAccount && amountNum > sourceAccount.availableBalance) nextErrors.amount = 'Nedovoljno sredstava';
    if (!purpose.trim()) nextErrors.purpose = 'Obavezno polje';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleContinue = () => {
    if (validate()) {
      setStep('confirm');
    }
  };

  const handleConfirm = async () => {
    if (!sourceAccount) return;

    setSubmitting(true);
    try {
      const previousBalance = sourceAccount.availableBalance;
      const result = await container.paymentRepository.submitPayment({
        senderAccountNumber: sourceAccount.accountNumber,
        recipientName: recipientName.trim(),
        recipientAccount: recipientAccount.trim(),
        amount: amountNum,
        paymentCode: paymentCode.trim(),
        referenceNumber: refNumber.trim(),
        purpose: purpose.trim(),
        totpCode: API_CONFIG.USE_MOCK ? undefined : totpCode.trim(),
      });

      const refreshedAccounts = await container.accountRepository.getAccounts();
      const refreshedSource = refreshedAccounts.find(account => account.accountNumber === sourceAccount.accountNumber);

      if (
        !API_CONFIG.USE_MOCK &&
        refreshedSource &&
        refreshedSource.availableBalance === previousBalance
      ) {
        throw new Error('Placanje je prihvaceno, ali backend nije azurirao stanje racuna.');
      }

      setCompletedStatus(result.status);
      setTotpCode('');
      onConsumeTotpCode();
      await refreshAccounts();
      setStep('success');
    } catch (e: any) {
      alert(e.message ?? 'Greška pri plaćanju');
    } finally {
      setSubmitting(false);
    }
  };

  const selectRecipient = (recipient: PaymentRecipient) => {
    setRecipientName(recipient.name);
    setRecipientAccount(recipient.accountNumber);
    setShowRecipients(false);
  };

  if (accountsState.loading || recipientsState.loading) {
    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!sourceAccount) {
    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg, padding: 24 }]}>
        <Text style={styles.helperText}>Nema dostupnih računa za plaćanje.</Text>
      </View>
    );
  }

  if (step === 'success') {
    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg, padding: 24 }]}>
        <Ionicons name="checkmark-circle" size={64} color={C.accent} />
        <Text style={styles.successTitle}>Plaćanje uspešno!</Text>
        <Text style={styles.successSub}>Backend je prihvatio nalog za plaćanje.</Text>
        <View style={styles.successCard}>
          <View style={styles.successRow}><Text style={styles.successLabel}>Primalac</Text><Text style={styles.successValue}>{recipientName}</Text></View>
          <View style={styles.successRow}><Text style={styles.successLabel}>Iznos</Text><Text style={[styles.successValue, { color: C.accent }]}>{fmt(amountNum, sourceAccount.currency)}</Text></View>
          <View style={styles.successRow}><Text style={styles.successLabel}>Sa računa</Text><Text style={styles.successValue}>{sourceAccount.name}</Text></View>
          {completedStatus ? <View style={styles.successRow}><Text style={styles.successLabel}>Status</Text><Text style={styles.successValue}>{completedStatus}</Text></View> : null}
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={onBack} activeOpacity={0.8}>
          <Text style={styles.primaryBtnText}>Nazad na početnu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'confirm') {
    return (
      <ScrollView style={styles.flex1} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setStep('form')} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Potvrda plaćanja</Text>
        </View>

        <View style={styles.confirmCard}>
          {[
            ['Primalac', recipientName],
            ['Račun primaoca', recipientAccount],
            ['Iznos', fmt(amountNum, sourceAccount.currency)],
            ['Sa računa', `${sourceAccount.name}\n${sourceAccount.accountNumber}`],
            ['Šifra plaćanja', paymentCode],
            ['Svrha plaćanja', purpose],
            ...(refModel ? [['Model', refModel]] : []),
            ...(refNumber ? [['Poziv na broj', refNumber]] : []),
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

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('form')} activeOpacity={0.7}>
            <Text style={styles.secondaryBtnText}>Nazad</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, { flex: 1.5, opacity: submitting || (!API_CONFIG.USE_MOCK && !totpCode.trim()) ? 0.7 : 1 }]}
            onPress={handleConfirm}
            activeOpacity={0.8}
            disabled={submitting || (!API_CONFIG.USE_MOCK && !totpCode.trim())}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Potvrdi plaćanje</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Novo plaćanje</Text>
      </View>

      <Text style={styles.label}>SA RAČUNA</Text>
      <TouchableOpacity style={styles.selectBtn} onPress={() => setShowAccounts(true)} activeOpacity={0.7}>
        <View style={styles.flex1}>
          <Text style={styles.selectMain}>{sourceAccount.name}</Text>
          <Text style={styles.selectSub}>Raspoloživo: {fmt(sourceAccount.availableBalance, sourceAccount.currency)}</Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={C.textMuted} />
      </TouchableOpacity>
      {errors.source ? <Text style={styles.errorText}>{errors.source}</Text> : null}

      <View style={[styles.labelRow, { marginTop: 20 }]}>
        <Text style={styles.label}>PRIMALAC</Text>
        <TouchableOpacity onPress={() => setShowRecipients(true)}>
          <Text style={styles.labelLink}>Iz imenika</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.inputWrap}>
        <TextInput style={styles.input} value={recipientName} onChangeText={setRecipientName} placeholder="Naziv primaoca" placeholderTextColor={C.textMuted} />
      </View>
      {errors.recipientName ? <Text style={styles.errorText}>{errors.recipientName}</Text> : null}

      <Text style={[styles.label, { marginTop: 16 }]}>RAČUN PRIMAOCA</Text>
      <View style={styles.inputWrap}>
        <TextInput style={styles.input} value={recipientAccount} onChangeText={setRecipientAccount} placeholder="333000112345678910" placeholderTextColor={C.textMuted} />
      </View>
      {errors.recipientAccount ? <Text style={styles.errorText}>{errors.recipientAccount}</Text> : null}

      <Text style={[styles.label, { marginTop: 16 }]}>IZNOS</Text>
      <View style={styles.inputWrap}>
        <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={C.textMuted} keyboardType="decimal-pad" />
        <Text style={styles.currBadge}>{sourceAccount.currency}</Text>
      </View>
      {errors.amount ? <Text style={styles.errorText}>{errors.amount}</Text> : null}

      <Text style={[styles.label, { marginTop: 16 }]}>ŠIFRA PLAĆANJA</Text>
      <View style={styles.inputWrap}>
        <TextInput style={styles.input} value={paymentCode} onChangeText={setPaymentCode} placeholder="289" placeholderTextColor={C.textMuted} keyboardType="number-pad" maxLength={3} />
      </View>

      <Text style={[styles.label, { marginTop: 16 }]}>SVRHA PLAĆANJA</Text>
      <View style={styles.inputWrap}>
        <TextInput style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]} value={purpose} onChangeText={setPurpose} placeholder="Opis svrhe plaćanja" placeholderTextColor={C.textMuted} multiline />
      </View>
      {errors.purpose ? <Text style={styles.errorText}>{errors.purpose}</Text> : null}

      <Text style={[styles.label, { marginTop: 16 }]}>POZIV NA BROJ</Text>
      <View style={styles.dualRow}>
        <View style={styles.dualField}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={refModel}
              onChangeText={setRefModel}
              placeholder="97"
              placeholderTextColor={C.textMuted}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
          <Text style={styles.fieldHint}>Model</Text>
        </View>

        <View style={[styles.dualField, { flex: 1.6 }]}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={refNumber}
              onChangeText={setRefNumber}
              placeholder="1176926"
              placeholderTextColor={C.textMuted}
              keyboardType="number-pad"
            />
          </View>
          <Text style={styles.fieldHint}>Poziv na broj</Text>
        </View>
      </View>

      <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24 }]} onPress={handleContinue} activeOpacity={0.8}>
        <Text style={styles.primaryBtnText}>Nastavi</Text>
      </TouchableOpacity>

      <Modal visible={showRecipients} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Primaoci plaćanja</Text>
              <TouchableOpacity onPress={() => setShowRecipients(false)}><Ionicons name="close" size={24} color={C.textSecondary} /></TouchableOpacity>
            </View>
            <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
              {recipients.map(recipient => (
                <TouchableOpacity key={recipient.id} style={styles.sheetItem} onPress={() => selectRecipient(recipient)} activeOpacity={0.7}>
                  <View style={styles.sheetItemIcon}><Ionicons name="person" size={18} color={C.primary} /></View>
                  <View style={styles.flex1}>
                    <Text style={styles.sheetItemTitle}>{recipient.name}</Text>
                    <Text style={styles.sheetItemSub}>{recipient.accountNumber}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showAccounts} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Odaberite račun</Text>
              <TouchableOpacity onPress={() => setShowAccounts(false)}><Ionicons name="close" size={24} color={C.textSecondary} /></TouchableOpacity>
            </View>
            <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
              {sortedAccounts.map((account, index) => (
                <TouchableOpacity key={`${account.accountNumber}-${index}`} style={styles.sheetItem} onPress={() => { setSourceAccount(account); setShowAccounts(false); }} activeOpacity={0.7}>
                  <View style={styles.sheetItemIcon}><Ionicons name="wallet" size={18} color={C.primary} /></View>
                  <View style={styles.flex1}>
                    <Text style={styles.sheetItemTitle}>{account.name}</Text>
                    <Text style={styles.sheetItemSub}>{fmt(account.availableBalance, account.currency)} raspoloživo</Text>
                  </View>
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
  content: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  screenTitle: { color: C.textPrimary, fontSize: 20, fontWeight: '700' },
  label: { color: C.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 },
  labelLink: { color: C.primary, fontSize: 12, fontWeight: '500', marginBottom: 8 },
  dualRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  dualField: { flex: 1 },
  fieldHint: { color: C.textMuted, fontSize: 11, marginTop: 6, marginLeft: 4 },
  inputWrap: { backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, color: C.textPrimary, fontSize: 15, padding: 14 },
  currBadge: { color: C.textMuted, fontSize: 13, fontWeight: '600', paddingRight: 14 },
  errorText: { color: C.danger, fontSize: 12, marginTop: 4 },
  helperText: { color: C.textSecondary, fontSize: 14, textAlign: 'center' },
  selectBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, padding: 14 },
  selectMain: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
  selectSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  primaryBtn: { backgroundColor: C.primary, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { flex: 1, backgroundColor: C.bgCard, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  secondaryBtnText: { color: C.textSecondary, fontSize: 15, fontWeight: '600' },
  confirmCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 16 },
  confirmRow: { padding: 14, paddingHorizontal: 18 },
  confirmLabel: { color: C.textMuted, fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  confirmValue: { color: C.textPrimary, fontSize: 14, fontWeight: '500', marginTop: 4 },
  confirmNote: { color: C.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 16 },
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  successTitle: { color: C.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 8, marginTop: 18 },
  successSub: { color: C.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  successCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18, width: '100%', marginBottom: 24 },
  successRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  successLabel: { color: C.textMuted, fontSize: 13 },
  successValue: { color: C.textPrimary, fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '60%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700' },
  sheetItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 4 },
  sheetItemIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  sheetItemTitle: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
  sheetItemSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },
});
