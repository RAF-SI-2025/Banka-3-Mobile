import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, Text, ScrollView, TextInput, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { pendingRequestsStorage, PendingLoanRequest } from '../../../core/storage/pendingRequestsStorage';
import { tokenStorage } from '../../../core/storage/tokenStorage';
import { fmt, fmtDate, fmtDateTime } from '../../../shared/utils/formatters';
import { useAccounts, useLoans } from '../../../shared/hooks/useFeatures';
import { FeatureHeader, ScreenState, StatusBadge } from '../../../shared/components/FeaturePrimitives';
import { Loan } from '../../../shared/types/models';

interface Props { onBack: () => void; }

const LOAN_TYPES = [
  { value: 'gotovinski', label: 'Gotovinski kredit' },
  { value: 'stambeni', label: 'Stambeni kredit' },
  { value: 'auto', label: 'Auto kredit' },
  { value: 'refinansirajuci', label: 'Refinansirajući kredit' },
  { value: 'studentski', label: 'Studentski kredit' },
];

const INTEREST_TYPES = [
  { value: 'fixed' as const, label: 'Fiksna kamata' },
  { value: 'variable' as const, label: 'Varijabilna kamata' },
];

const BACKEND_LOAN_TYPE_LABELS: Record<string, string> = {
  cash: 'Gotovinski kredit',
  mortgage: 'Stambeni kredit',
  car: 'Auto kredit',
  refinancing: 'Refinansirajući kredit',
  student: 'Studentski kredit',
};

const getLoanTypeLabel = (loanType: string) => BACKEND_LOAN_TYPE_LABELS[loanType.toLowerCase()] ?? loanType;

const MATURITIES = ['12', '24', '36', '48', '60', '84', '120', '180', '240'];

type Step = 'list' | 'detail' | 'apply' | 'applyConfirm' | 'applySuccess';

export default function LoansScreen({ onBack }: Props) {
  const { state: loansState, actions: loanActions } = useLoans();
  const { state: accountsState } = useAccounts();

  const loans = loansState.data ?? [];
  const accounts = accountsState.data ?? [];

  const [step, setStep] = useState<Step>('list');
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);

  // Application form state
  const [loanType, setLoanType] = useState('gotovinski');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanPurpose, setLoanPurpose] = useState('');
  const [salary, setSalary] = useState('');
  const [permanent, setPermanent] = useState(true);
  const [employmentYears, setEmploymentYears] = useState('');
  const [maturity, setMaturity] = useState('60');
  const [interestRateType, setInterestRateType] = useState<'fixed' | 'variable'>('fixed');
  const [phone, setPhone] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showMaturityPicker, setShowMaturityPicker] = useState(false);
  const [showInterestPicker, setShowInterestPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [applicationAccepted, setApplicationAccepted] = useState(false);
  const [pendingLoanRequests, setPendingLoanRequests] = useState<PendingLoanRequest[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (loans.length === 0) {
      setSelectedLoanId(null);
      return;
    }

    setSelectedLoanId(prev => (prev && loans.some(loan => loan.id === prev) ? prev : loans[0].id));
  }, [loans]);

  useEffect(() => {
    if (accounts.length === 0) {
      setSelectedAccountId(null);
      return;
    }

    setSelectedAccountId(prev => (prev && accounts.some(account => account.id === prev) ? prev : accounts[0].id));
  }, [accounts]);

  useEffect(() => {
    let alive = true;

    const restorePendingRequests = async () => {
      const sessionId = await tokenStorage.getSessionId();
      const pending = (await pendingRequestsStorage.listByKind(sessionId, 'loan')) as PendingLoanRequest[];
      if (alive) {
        setPendingLoanRequests(pending);
      }
    };

    restorePendingRequests();

    return () => {
      alive = false;
    };
  }, []);

  const selectedLoan = useMemo(
    () => (selectedLoanId ? loans.find(loan => loan.id === selectedLoanId) ?? null : null),
    [loans, selectedLoanId]
  );

  const selectedLoanAccount = useMemo(
    () => {
      if (!selectedLoan) {
        return null;
      }

      return (
        accounts.find(account => account.accountNumber === selectedLoan.accountNumber) ??
        accounts.find(account => account.id === selectedLoan.accountId) ??
        null
      );
    },
    [accounts, selectedLoan]
  );

  const selectedAccount = useMemo(
    () => (selectedAccountId ? accounts.find(account => account.id === selectedAccountId) ?? null : null),
    [accounts, selectedAccountId]
  );

  const loanStatusCfg: Record<Loan['status'], { color: string; bg: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
    active: { color: C.accent, bg: C.accentGlow, label: 'Aktivan', icon: 'checkmark-circle' },
    paid: { color: C.primary, bg: C.primarySoft, label: 'Otplaćen', icon: 'wallet' },
    defaulted: { color: C.danger, bg: C.dangerGlow, label: 'U kašnjenju', icon: 'warning' },
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!loanAmount || parseFloat(loanAmount) <= 0) e.amount = 'Unesite iznos kredita';
    if (!loanPurpose.trim()) e.purpose = 'Unesite svrhu kredita';
    if (!salary || parseFloat(salary) <= 0) e.salary = 'Unesite mesečna primanja';
    if (!employmentYears.trim()) e.employment = 'Unesite period zaposlenja';
    if (!phone.trim()) e.phone = 'Unesite broj telefona';
    if (!selectedAccount) e.account = 'Izaberite račun za isplatu';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resetForm = () => {
    setLoanType('gotovinski'); setLoanAmount(''); setLoanPurpose(''); setSalary('');
    setPermanent(true); setEmploymentYears(''); setMaturity('60'); setInterestRateType('fixed'); setPhone('');
    setErrors({});
    setApplicationAccepted(false);
    setSubmissionError(null);
  };

  const submitApplication = async () => {
    if (!validate() || !selectedAccount) {
      return;
    }

    setSubmitting(true);
    setSubmissionError(null);
    try {
      const result = await loanActions.apply({
        loanType,
        interestRateType,
        amount: parseFloat(loanAmount),
        currency: selectedAccount.currency,
        purpose: loanPurpose,
        monthlySalary: parseFloat(salary),
        permanentEmployment: permanent,
        employmentYears: parseInt(employmentYears, 10),
        maturityMonths: parseInt(maturity, 10),
        accountNumber: selectedAccount.accountNumber,
        accountId: selectedAccount.id,
        phone,
      });
      setApplicationAccepted(result.accepted);
      const sessionId = await tokenStorage.getSessionId();
      await pendingRequestsStorage.addLoan(sessionId, {
        id: `loan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'loan',
        createdAt: new Date().toISOString(),
        accountName: selectedAccount.name,
        accountNumber: selectedAccount.accountNumber,
        loanType,
        interestRateType,
        amount: parseFloat(loanAmount),
        currency: selectedAccount.currency,
        maturityMonths: parseInt(maturity, 10),
      });
      setPendingLoanRequests((await pendingRequestsStorage.listByKind(sessionId, 'loan')) as PendingLoanRequest[]);
      setStep('applySuccess');
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Neuspešno podnošenje zahteva.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = loansState.loading || accountsState.loading;

  if (isLoading || loansState.error) {
    return (
      <ScreenState
        title="Krediti"
        onBack={onBack}
        loading={isLoading}
        error={loansState.error}
      />
    );
  }

  // ===== SUCCESS =====
  if (step === 'applySuccess') {
    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg, padding: 24 }]}>
        <Ionicons name="checkmark-circle" size={64} color={C.accent} />
        <Text style={styles.successTitle}>Zahtev za kredit je poslat</Text>
        <Text style={styles.successSub}>Čeka odluku banke</Text>
        <Text style={styles.successSub}>Bićeš obavešten o ishodu</Text>
        <View style={styles.card}>
          <View style={styles.sRow}><Text style={styles.sLabel}>Tip</Text><Text style={styles.sVal}>{LOAN_TYPES.find(t => t.value === loanType)?.label}</Text></View>
          <View style={styles.sRow}><Text style={styles.sLabel}>Tip kamate</Text><Text style={styles.sVal}>{INTEREST_TYPES.find(t => t.value === interestRateType)?.label}</Text></View>
          <View style={styles.sRow}><Text style={styles.sLabel}>Iznos</Text><Text style={[styles.sVal, { color: C.accent }]}>{fmt(parseFloat(loanAmount), selectedAccount?.currency ?? 'RSD')}</Text></View>
          <View style={styles.sRow}><Text style={styles.sLabel}>Ročnost</Text><Text style={styles.sVal}>{maturity} meseci</Text></View>
          <View style={styles.sRow}><Text style={styles.sLabel}>Status</Text><Text style={styles.sVal}>{applicationAccepted ? 'Poslat' : 'U obradi'}</Text></View>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => { resetForm(); setStep('list'); }}><Text style={styles.primaryBtnText}>Nazad na kredite</Text></TouchableOpacity>
      </View>
    );
  }

  // ===== CONFIRM =====
  if (step === 'applyConfirm') {
    return (
      <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }}>
        <FeatureHeader title="Potvrda zahteva" onBack={() => setStep('apply')} />
        <View style={styles.confirmCard}>
          {[
            ['Tip kredita', LOAN_TYPES.find(t => t.value === loanType)?.label || ''],
            ['Tip kamate', INTEREST_TYPES.find(t => t.value === interestRateType)?.label || ''],
            ['Iznos', fmt(parseFloat(loanAmount), selectedAccount?.currency ?? 'RSD')],
            ['Svrha', loanPurpose],
            ['Mesečna primanja', fmt(parseFloat(salary), selectedAccount?.currency ?? 'RSD')],
            ['Stalni radni odnos', permanent ? 'Da' : 'Ne'],
            ['Period zaposlenja', `${employmentYears} god.`],
            ['Ročnost', `${maturity} meseci`],
            ['Račun', selectedAccount ? `${selectedAccount.name} (${selectedAccount.accountNumber})` : '-'],
            ['Telefon', phone],
          ].map(([l, v], i) => (
            <View key={l} style={[styles.cRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
              <Text style={styles.cLabel}>{l}</Text><Text style={styles.cVal}>{v}</Text>
            </View>
          ))}
        </View>
        {submissionError ? <Text style={styles.errText}>{submissionError}</Text> : null}
        {errors.account ? <Text style={styles.errText}>{errors.account}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={styles.secBtn} onPress={() => setStep('apply')}><Text style={styles.secBtnText}>Nazad</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.primaryBtn, { flex: 1.5 }]} onPress={submitApplication} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Pošalji zahtev</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ===== APPLICATION FORM =====
  if (step === 'apply') {
    return (
      <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <FeatureHeader title="Zahtev za novi kredit" onBack={() => setStep('list')} />

        {/* Loan type */}
        <Text style={styles.label}>VRSTA KREDITA</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowTypePicker(true)}>
          <Text style={styles.selectMain}>{LOAN_TYPES.find(t => t.value === loanType)?.label}</Text>
          <Ionicons name="chevron-down" size={18} color={C.textMuted} />
        </TouchableOpacity>

        {/* Amount */}
        <Text style={[styles.label, { marginTop: 16 }]}>IZNOS KREDITA</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} value={loanAmount} onChangeText={setLoanAmount} placeholder="0.00" placeholderTextColor={C.textMuted} keyboardType="decimal-pad" />
          <Text style={styles.cur}>{selectedAccount?.currency ?? 'RSD'}</Text>
        </View>
        {errors.amount && <Text style={styles.errText}>{errors.amount}</Text>}

        {/* Purpose */}
        <Text style={[styles.label, { marginTop: 16 }]}>SVRHA KREDITA</Text>
        <View style={styles.inputWrap}>
          <TextInput style={[styles.input, { minHeight: 50, textAlignVertical: 'top' }]} value={loanPurpose} onChangeText={setLoanPurpose} placeholder="Opis svrhe kredita" placeholderTextColor={C.textMuted} multiline />
        </View>
        {errors.purpose && <Text style={styles.errText}>{errors.purpose}</Text>}

        {/* Salary */}
        <Text style={[styles.label, { marginTop: 16 }]}>IZNOS MESEČNIH PRIMANJA</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} value={salary} onChangeText={setSalary} placeholder="0.00" placeholderTextColor={C.textMuted} keyboardType="decimal-pad" />
          <Text style={styles.cur}>{selectedAccount?.currency ?? 'RSD'}</Text>
        </View>
        {errors.salary && <Text style={styles.errText}>{errors.salary}</Text>}

        {/* Permanent employment toggle */}
        <Text style={[styles.label, { marginTop: 16 }]}>RADNI ODNOS</Text>
        <View style={styles.toggleRow}>
          {['Da', 'Ne'].map(opt => (
            <TouchableOpacity key={opt} style={[styles.toggleBtn, (opt === 'Da' ? permanent : !permanent) && styles.toggleActive]}
              onPress={() => setPermanent(opt === 'Da')}>
              <Text style={[styles.toggleText, (opt === 'Da' ? permanent : !permanent) && { color: C.primary }]}>
                {opt === 'Da' ? 'Stalni odnos' : 'Privremeni'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Employment period */}
        <Text style={[styles.label, { marginTop: 16 }]}>PERIOD ZAPOSLENJA (godine)</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} value={employmentYears} onChangeText={setEmploymentYears} placeholder="npr. 3" placeholderTextColor={C.textMuted} keyboardType="numeric" />
        </View>
        {errors.employment && <Text style={styles.errText}>{errors.employment}</Text>}

        {/* Maturity */}
        <Text style={[styles.label, { marginTop: 16 }]}>ROČNOST (meseci)</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowMaturityPicker(true)}>
          <Text style={styles.selectMain}>{maturity} meseci</Text>
          <Ionicons name="chevron-down" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 16 }]}>TIP KAMATNE STOPE</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowInterestPicker(true)}>
          <Text style={styles.selectMain}>{INTEREST_TYPES.find(t => t.value === interestRateType)?.label}</Text>
          <Ionicons name="chevron-down" size={18} color={C.textMuted} />
        </TouchableOpacity>

        {/* Account */}
        <Text style={[styles.label, { marginTop: 16 }]}>RAČUN ZA ISPLATU</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowAccountPicker(true)}>
          <Text style={styles.selectMain}>{selectedAccount ? `${selectedAccount.name} (${selectedAccount.accountNumber})` : 'Izaberite račun'}</Text>
          <Ionicons name="chevron-down" size={18} color={C.textMuted} />
        </TouchableOpacity>
        {errors.account && <Text style={styles.errText}>{errors.account}</Text>}

        {/* Phone */}
        <Text style={[styles.label, { marginTop: 16 }]}>BROJ TELEFONA</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+381..." placeholderTextColor={C.textMuted} keyboardType="phone-pad" />
        </View>
        {errors.phone && <Text style={styles.errText}>{errors.phone}</Text>}

        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24 }]} onPress={() => { if (validate()) setStep('applyConfirm'); }}>
          <Text style={styles.primaryBtnText}>Nastavi</Text>
        </TouchableOpacity>
        <Text style={styles.helperNote}>
          Zahtev ide preko izabranog računa i koristi podatke koje uneseš u ovoj formi.
        </Text>

        {/* Pickers */}
        <BottomSheet visible={showTypePicker} onClose={() => setShowTypePicker(false)} title="Vrsta kredita">
          {LOAN_TYPES.map(t => (
            <TouchableOpacity key={t.value} style={styles.sheetItem} onPress={() => { setLoanType(t.value); setShowTypePicker(false); }}>
              <Text style={[styles.sheetItemText, loanType === t.value && { color: C.primary, fontWeight: '600' }]}>{t.label}</Text>
              {loanType === t.value && <Ionicons name="checkmark" size={18} color={C.primary} />}
            </TouchableOpacity>
          ))}
        </BottomSheet>

        <BottomSheet visible={showMaturityPicker} onClose={() => setShowMaturityPicker(false)} title="Ročnost">
          {MATURITIES.map(m => (
            <TouchableOpacity key={m} style={styles.sheetItem} onPress={() => { setMaturity(m); setShowMaturityPicker(false); }}>
              <Text style={[styles.sheetItemText, maturity === m && { color: C.primary, fontWeight: '600' }]}>{m} meseci</Text>
              {maturity === m && <Ionicons name="checkmark" size={18} color={C.primary} />}
            </TouchableOpacity>
          ))}
        </BottomSheet>

        <BottomSheet visible={showInterestPicker} onClose={() => setShowInterestPicker(false)} title="Tip kamatne stope">
          {INTEREST_TYPES.map(option => (
            <TouchableOpacity key={option.value} style={styles.sheetItem} onPress={() => { setInterestRateType(option.value); setShowInterestPicker(false); }}>
              <Text style={[styles.sheetItemText, interestRateType === option.value && { color: C.primary, fontWeight: '600' }]}>{option.label}</Text>
              {interestRateType === option.value && <Ionicons name="checkmark" size={18} color={C.primary} />}
            </TouchableOpacity>
          ))}
        </BottomSheet>

        <BottomSheet visible={showAccountPicker} onClose={() => setShowAccountPicker(false)} title="Račun">
          {accounts.map(a => (
            <TouchableOpacity key={a.id} style={styles.sheetItem} onPress={() => { setSelectedAccountId(a.id); setShowAccountPicker(false); }}>
              <View style={styles.flex1}>
                <Text style={styles.sheetItemText}>{a.name}</Text>
                <Text style={{ color: C.textMuted, fontSize: 12 }}>{a.accountNumber}</Text>
              </View>
              {selectedAccountId === a.id && <Ionicons name="checkmark" size={18} color={C.primary} />}
            </TouchableOpacity>
          ))}
        </BottomSheet>
      </ScrollView>
    );
  }

  // ===== DETAIL =====
  if (step === 'detail' && selectedLoan) {
    const l = selectedLoan;
    const cfg = loanStatusCfg[l.status];
    const paidAmount = Math.max(l.amount - l.remainingDebt, 0);
    const progressPct = l.amount > 0 ? Math.min(100, Math.max(0, Math.round((paidAmount / l.amount) * 100))) : 0;
    return (
      <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <FeatureHeader title={l.name} onBack={() => setStep('list')} />

        {/* Progress card */}
        <View style={styles.progressCard}>
          <View style={styles.progressTopRow}>
            <StatusBadge color={cfg.color} bg={cfg.bg} icon={cfg.icon} label={cfg.label} />
            <Text style={styles.progressLabel}>Otplaćeno</Text>
          </View>
          <Text style={styles.progressPct}>{progressPct}%</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressSmall}>Otplaćeno: {fmt(paidAmount, l.currency)}</Text>
            <Text style={styles.progressSmall}>Preostalo: {fmt(l.remainingDebt, l.currency)}</Text>
          </View>
        </View>

        {/* Next payment */}
        <View style={styles.nextPayment}>
          <View style={styles.npIcon}><Ionicons name="calendar" size={20} color={C.warning} /></View>
          <View style={styles.flex1}>
            <Text style={styles.npTitle}>Sledeća rata</Text>
            <Text style={styles.npDate}>{fmtDate(l.nextInstallmentDate || l.nextPayment)}</Text>
          </View>
          <Text style={styles.npAmount}>{fmt(l.nextInstallmentAmount || l.installment, l.currency)}</Text>
        </View>

        {/* Detail info */}
        <View style={styles.detailCard}>
          {[
            ['Vrsta kredita', getLoanTypeLabel(l.loanType)],
            ['Broj kredita', l.number],
            ['Broj računa', l.accountNumber || selectedLoanAccount?.accountNumber || '-'],
            ['Račun', selectedLoanAccount ? `${selectedLoanAccount.name} (${selectedLoanAccount.currency})` : '-'],
            ['Iznos kredita', fmt(l.amount, l.currency)],
            ['Period otplate', `${l.period} meseci`],
            ['Nominalna kamatna stopa', `${l.nominalRate}%`],
            ['Efektivna kamatna stopa', `${l.effectiveRate}%`],
            ['Datum ugovaranja', fmtDate(l.agreementDate || l.startDate)],
            ['Datum dospeća', fmtDate(l.maturityDate || l.endDate)],
            ['Iznos sledeće rate', fmt(l.nextInstallmentAmount ?? l.installment, l.currency)],
            ['Datum sledeće rate', fmtDate(l.nextInstallmentDate || l.nextPayment)],
            ['Preostalo dugovanje', fmt(l.remainingDebt ?? l.remaining, l.currency)],
            ['Valuta', l.currency],
            ['Status', cfg.label],
          ].map(([label, value], i) => (
            <View key={label} style={[styles.dRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
              <Text style={styles.dLabel}>{label}</Text>
              <Text style={styles.dValue}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 14 }]}>Istorija rata</Text>
        <View style={styles.historyCard}>
          <Ionicons name="time-outline" size={20} color={C.warning} />
          <View style={styles.flex1}>
            <Text style={styles.historyTitle}>Istorija rata nije izložena kroz trenutni API</Text>
            <Text style={styles.historySub}>Backend sada vraća sledeću ratu i stanje kredita, ali ne i kompletnu listu prethodnih rata.</Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  // ===== LIST =====
  return (
    <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
      <FeatureHeader title="Krediti" onBack={onBack} />

      {/* Apply button */}
      <TouchableOpacity style={styles.applyBanner} onPress={() => { resetForm(); setStep('apply'); }} activeOpacity={0.8}>
        <View style={styles.applyIconWrap}>
          <Ionicons name="add-circle" size={22} color={C.primary} />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.bannerTitle}>Zahtev za novi kredit</Text>
          <Text style={styles.bannerSub}>Gotovinski, stambeni, auto i refinansirajući kredit</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={C.textMuted} />
      </TouchableOpacity>

      {pendingLoanRequests.length > 0 ? (
        <View style={{ gap: 12, marginTop: 6 }}>
          <Text style={styles.sectionTitle}>Zahtevi na čekanju</Text>
          {pendingLoanRequests.map(request => (
            <View key={request.id} style={styles.pendingCard}>
              <Ionicons name="time-outline" size={20} color={C.warning} />
              <View style={styles.flex1}>
                <Text style={styles.pendingTitle}>Zahtev za kredit je poslat</Text>
                <Text style={styles.pendingSub}>Čeka odluku banke</Text>
                <Text style={styles.pendingSub}>Bićeš obavešten o ishodu</Text>
                <Text style={[styles.pendingSub, { marginTop: 8 }]}>
                  {LOAN_TYPES.find(type => type.value === request.loanType)?.label ?? getLoanTypeLabel(request.loanType)} • {fmt(request.amount, request.currency)} • {request.accountName}
                </Text>
                <Text style={styles.pendingSub}>
                  {INTEREST_TYPES.find(type => type.value === request.interestRateType)?.label ?? 'Fiksna kamata'}
                </Text>
                <Text style={[styles.pendingSub, { marginTop: 4 }]}>
                  Podneto: {fmtDateTime(request.createdAt)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {loans.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="document-text-outline" size={34} color={C.textMuted} />
          <Text style={styles.emptyTitle}>Nema dostupnih kredita</Text>
          <Text style={styles.emptySub}>Možeš odmah da podneseš zahtev za kredit iz ove sekcije.</Text>
        </View>
      ) : (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 14 }]}>Aktivni krediti</Text>
          {loans.map(loan => {
            const pct = loan.amount > 0 ? Math.min(100, Math.max(0, Math.round(((loan.amount - loan.remainingDebt) / loan.amount) * 100))) : 0;
            const cfg = loanStatusCfg[loan.status];
            return (
              <TouchableOpacity key={loan.id} style={styles.loanRow} onPress={() => { setSelectedLoanId(loan.id); setStep('detail'); }} activeOpacity={0.7}>
                <View style={styles.loanIconWrap}><Ionicons name="document-text" size={22} color={C.primary} /></View>
                <View style={styles.flex1}>
                  <Text style={styles.loanName}>{loan.name}</Text>
                  <Text style={styles.loanNum}>{loan.number}</Text>
                  <Text style={styles.loanMeta}>{getLoanTypeLabel(loan.loanType)}</Text>
                  <View style={styles.miniBar}><View style={[styles.miniFill, { width: `${pct}%` }]} /></View>
                  <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                    <StatusBadge color={cfg.color} bg={cfg.bg} icon={cfg.icon} label={cfg.label} />
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.loanAmount}>{fmt(loan.remainingDebt, loan.currency)}</Text>
                  <Text style={styles.loanSub}>preostalo</Text>
                  <Ionicons name="chevron-forward" size={14} color={C.textMuted} style={{ marginTop: 4 }} />
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

// Reusable bottom sheet
function BottomSheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.mOverlay}>
        <View style={styles.mSheet}>
          <View style={styles.mHead}>
            <Text style={styles.mTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={C.textSecondary} /></TouchableOpacity>
          </View>
          <ScrollView>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { color: C.textPrimary, fontSize: 16, fontWeight: '600' },
  label: { color: C.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  inputWrap: { backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, color: C.textPrimary, fontSize: 15, padding: 14 },
  cur: { color: C.textMuted, fontSize: 13, fontWeight: '600', paddingRight: 14 },
  errText: { color: C.danger, fontSize: 12, marginTop: 4 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, padding: 14 },
  selectMain: { color: C.textPrimary, fontSize: 14, fontWeight: '500', flex: 1 },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: C.bgInput, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  toggleActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  toggleText: { color: C.textSecondary, fontSize: 14, fontWeight: '500' },
  primaryBtn: { backgroundColor: C.primary, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secBtn: { flex: 1, backgroundColor: C.bgCard, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  secBtnText: { color: C.textSecondary, fontSize: 15, fontWeight: '600' },
  // Banner
  applyBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.bgCard, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 4 },
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
  // Loan list
  loanRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.bgCard, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 10 },
  loanIconWrap: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  loanName: { color: C.textPrimary, fontSize: 15, fontWeight: '600' },
  loanNum: { color: C.textMuted, fontSize: 11, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  loanMeta: { color: C.textSecondary, fontSize: 11, marginTop: 2 },
  loanAmount: { color: C.textPrimary, fontSize: 15, fontWeight: '700' },
  loanSub: { color: C.textMuted, fontSize: 10, marginTop: 1 },
  miniBar: { height: 4, backgroundColor: C.border, borderRadius: 2, marginTop: 8 },
  miniFill: { height: 4, backgroundColor: C.accent, borderRadius: 2 },
  // Detail
  progressCard: { backgroundColor: C.bgCard, borderRadius: 20, padding: 22, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  progressTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: C.textSecondary, fontSize: 13 },
  progressPct: { color: C.accent, fontSize: 36, fontWeight: '800', letterSpacing: -1, marginVertical: 4 },
  progressBar: { height: 8, backgroundColor: C.border, borderRadius: 4, marginBottom: 10 },
  progressFill: { height: 8, backgroundColor: C.accent, borderRadius: 4 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressSmall: { color: C.textMuted, fontSize: 11 },
  nextPayment: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.warningGlow, borderRadius: 16, padding: 14, paddingHorizontal: 18, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', marginBottom: 16 },
  npIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.15)', justifyContent: 'center', alignItems: 'center' },
  npTitle: { color: C.warning, fontSize: 13, fontWeight: '600' },
  npDate: { color: C.textSecondary, fontSize: 12, marginTop: 1 },
  npAmount: { color: C.textPrimary, fontSize: 15, fontWeight: '700' },
  detailCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  dRow: { padding: 14, paddingHorizontal: 18 },
  dLabel: { color: C.textMuted, fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  dValue: { color: C.textPrimary, fontSize: 14, fontWeight: '500', marginTop: 4 },
  historyCard: { flexDirection: 'row', gap: 12, backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 16, alignItems: 'flex-start' },
  historyTitle: { color: C.textPrimary, fontSize: 14, fontWeight: '700' },
  historySub: { color: C.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 4 },
  // Confirm
  confirmCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 20 },
  cRow: { padding: 14, paddingHorizontal: 18 },
  cLabel: { color: C.textMuted, fontSize: 11, fontWeight: '500', textTransform: 'uppercase' },
  cVal: { color: C.textPrimary, fontSize: 14, fontWeight: '500', marginTop: 4 },
  // Success
  successTitle: { color: C.textPrimary, fontSize: 22, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  successSub: { color: C.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 },
  card: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18, width: '100%', marginBottom: 24 },
  sRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sLabel: { color: C.textMuted, fontSize: 13 },
  sVal: { color: C.textPrimary, fontSize: 13, fontWeight: '600' },
  emptyCard: {
    backgroundColor: C.bgCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: { color: C.textPrimary, fontSize: 15, fontWeight: '700', marginTop: 10 },
  emptySub: { color: C.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  // Modals
  mOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  mSheet: { backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '60%' },
  mHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  mTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700' },
  sheetItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, marginBottom: 2 },
  sheetItemText: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
});
