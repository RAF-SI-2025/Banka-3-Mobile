import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Modal, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { fmt } from '../../../shared/utils/formatters';
import { useLoans } from '../../../shared/hooks/useFeatures';
import { useAccounts } from '../../../shared/hooks/useFeatures';
import { Loan } from '../../../shared/types/models';

interface Props { onBack: () => void; }

const LOAN_TYPES = [
  { value: 'GOTOVINSKI', label: 'Gotovinski kredit' },
  { value: 'STAMBENI', label: 'Stambeni kredit' },
  { value: 'AUTO', label: 'Auto kredit' },
  { value: 'REFINANSIRAJUCI', label: 'Refinansirajući kredit' },
  { value: 'STUDENTSKI', label: 'Studentski kredit' },
];

const MATURITIES = ['12', '24', '36', '48', '60', '84', '120', '180', '240'];

type Step = 'list' | 'detail' | 'apply' | 'applyConfirm' | 'applySuccess';

export default function LoansScreen({ onBack }: Props) {
  const { state: loansState, actions } = useLoans();
  const { state: accountsState } = useAccounts();
  const loans = loansState.data ?? [];
  const accounts = accountsState.data ?? [];

  const [step, setStep] = useState<Step>('list');
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Application form state
  const [loanType, setLoanType] = useState('GOTOVINSKI');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanPurpose, setLoanPurpose] = useState('');
  const [salary, setSalary] = useState('');
  const [permanent, setPermanent] = useState(true);
  const [employmentYears, setEmploymentYears] = useState('');
  const [maturity, setMaturity] = useState('60');
  const [phone, setPhone] = useState('');
  const [selectedAccountIdx, setSelectedAccountIdx] = useState(0);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showMaturityPicker, setShowMaturityPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!loanAmount || parseFloat(loanAmount) <= 0) e.amount = 'Unesite iznos kredita';
    if (!loanPurpose.trim()) e.purpose = 'Unesite svrhu kredita';
    if (!salary || parseFloat(salary) <= 0) e.salary = 'Unesite mesečna primanja';
    if (!employmentYears.trim()) e.employment = 'Unesite period zaposlenja';
    if (!phone.trim()) e.phone = 'Unesite broj telefona';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resetForm = () => {
    setLoanType('GOTOVINSKI'); setLoanAmount(''); setLoanPurpose(''); setSalary('');
    setPermanent(true); setEmploymentYears(''); setMaturity('60'); setPhone('');
    setErrors({});
  };

  const handleSubmit = async () => {
    const acc = accounts[selectedAccountIdx];
    if (!acc) return;
    setSubmitting(true);
    try {
      await actions.apply({
        loanType,
        amount: parseFloat(loanAmount),
        currency: 'RSD',
        purpose: loanPurpose,
        monthlySalary: parseFloat(salary),
        permanentEmployment: permanent,
        employmentYears: parseInt(employmentYears) || 0,
        maturityMonths: parseInt(maturity),
        accountNumber: acc.accountNumber,
        phone,
      });
      setStep('applySuccess');
    } catch (e: any) {
      setErrors({ submit: e.message || 'Greška pri slanju zahteva' });
    } finally {
      setSubmitting(false);
    }
  };

  // ===== LOADING =====
  if (loansState.loading && loans.length === 0) {
    return (
      <View style={[styles.flex1, styles.center]}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  // ===== SUCCESS =====
  if (step === 'applySuccess') {
    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg, padding: 24 }]}>
        <Ionicons name="checkmark-circle" size={64} color={C.accent} />
        <Text style={styles.successTitle}>Zahtev podnet!</Text>
        <Text style={styles.successSub}>Vaš zahtev za kredit je uspešno podnet. Bićete obavešteni o odluci.</Text>
        <View style={styles.card}>
          <View style={styles.sRow}><Text style={styles.sLabel}>Tip</Text><Text style={styles.sVal}>{LOAN_TYPES.find(t => t.value === loanType)?.label}</Text></View>
          <View style={styles.sRow}><Text style={styles.sLabel}>Iznos</Text><Text style={[styles.sVal, { color: C.accent }]}>{fmt(parseFloat(loanAmount))}</Text></View>
          <View style={styles.sRow}><Text style={styles.sLabel}>Ročnost</Text><Text style={styles.sVal}>{maturity} meseci</Text></View>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => { resetForm(); setStep('list'); }}>
          <Text style={styles.primaryBtnText}>Nazad na kredite</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ===== CONFIRM =====
  if (step === 'applyConfirm') {
    const acc = accounts[selectedAccountIdx];
    return (
      <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }}>
        <View style={styles.hRow}>
          <TouchableOpacity onPress={() => setStep('apply')} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>Potvrda zahteva</Text>
        </View>
        <View style={styles.confirmCard}>
          {([
            ['Tip kredita', LOAN_TYPES.find(t => t.value === loanType)?.label || ''],
            ['Iznos', fmt(parseFloat(loanAmount))],
            ['Svrha', loanPurpose],
            ['Mesečna primanja', fmt(parseFloat(salary))],
            ['Stalni radni odnos', permanent ? 'Da' : 'Ne'],
            ['Period zaposlenja', `${employmentYears} god.`],
            ['Ročnost', `${maturity} meseci`],
            ['Račun', acc ? `${acc.name} (${acc.accountNumber})` : '-'],
            ['Telefon', phone],
          ] as [string, string][]).map(([l, v], i) => (
            <View key={l} style={[styles.cRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
              <Text style={styles.cLabel}>{l}</Text>
              <Text style={styles.cVal}>{v}</Text>
            </View>
          ))}
        </View>
        {errors.submit && <Text style={[styles.errText, { marginBottom: 12 }]}>{errors.submit}</Text>}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={styles.secBtn} onPress={() => setStep('apply')}>
            <Text style={styles.secBtnText}>Nazad</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, { flex: 1.5 }, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.primaryBtnText}>Pošalji zahtev</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ===== APPLICATION FORM =====
  if (step === 'apply') {
    const selectedAcc = accounts[selectedAccountIdx];
    return (
      <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hRow}>
          <TouchableOpacity onPress={() => setStep('list')} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>Zahtev za kredit</Text>
        </View>

        <Text style={styles.label}>VRSTA KREDITA</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowTypePicker(true)}>
          <Text style={styles.selectMain}>{LOAN_TYPES.find(t => t.value === loanType)?.label}</Text>
          <Ionicons name="chevron-down" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 16 }]}>IZNOS KREDITA</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} value={loanAmount} onChangeText={setLoanAmount} placeholder="0.00" placeholderTextColor={C.textMuted} keyboardType="decimal-pad" />
          <Text style={styles.cur}>RSD</Text>
        </View>
        {errors.amount && <Text style={styles.errText}>{errors.amount}</Text>}

        <Text style={[styles.label, { marginTop: 16 }]}>SVRHA KREDITA</Text>
        <View style={styles.inputWrap}>
          <TextInput style={[styles.input, { minHeight: 50, textAlignVertical: 'top' }]} value={loanPurpose} onChangeText={setLoanPurpose} placeholder="Opis svrhe kredita" placeholderTextColor={C.textMuted} multiline />
        </View>
        {errors.purpose && <Text style={styles.errText}>{errors.purpose}</Text>}

        <Text style={[styles.label, { marginTop: 16 }]}>IZNOS MESEČNIH PRIMANJA</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} value={salary} onChangeText={setSalary} placeholder="0.00" placeholderTextColor={C.textMuted} keyboardType="decimal-pad" />
          <Text style={styles.cur}>RSD</Text>
        </View>
        {errors.salary && <Text style={styles.errText}>{errors.salary}</Text>}

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

        <Text style={[styles.label, { marginTop: 16 }]}>PERIOD ZAPOSLENJA (godine)</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} value={employmentYears} onChangeText={setEmploymentYears} placeholder="npr. 3" placeholderTextColor={C.textMuted} keyboardType="numeric" />
        </View>
        {errors.employment && <Text style={styles.errText}>{errors.employment}</Text>}

        <Text style={[styles.label, { marginTop: 16 }]}>ROČNOST (meseci)</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowMaturityPicker(true)}>
          <Text style={styles.selectMain}>{maturity} meseci</Text>
          <Ionicons name="chevron-down" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 16 }]}>RAČUN ZA ISPLATU</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowAccountPicker(true)}>
          <Text style={styles.selectMain}>
            {selectedAcc ? `${selectedAcc.name} (${selectedAcc.accountNumber})` : 'Izaberite račun'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 16 }]}>BROJ TELEFONA</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+381..." placeholderTextColor={C.textMuted} keyboardType="phone-pad" />
        </View>
        {errors.phone && <Text style={styles.errText}>{errors.phone}</Text>}

        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24 }]} onPress={() => { if (validate()) setStep('applyConfirm'); }}>
          <Text style={styles.primaryBtnText}>Nastavi</Text>
        </TouchableOpacity>

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

        <BottomSheet visible={showAccountPicker} onClose={() => setShowAccountPicker(false)} title="Račun">
          {accounts.map((a, idx) => (
            <TouchableOpacity key={a.accountNumber} style={styles.sheetItem} onPress={() => { setSelectedAccountIdx(idx); setShowAccountPicker(false); }}>
              <View style={styles.flex1}>
                <Text style={styles.sheetItemText}>{a.name}</Text>
                <Text style={{ color: C.textMuted, fontSize: 12 }}>{a.accountNumber}</Text>
              </View>
              {selectedAccountIdx === idx && <Ionicons name="checkmark" size={18} color={C.primary} />}
            </TouchableOpacity>
          ))}
        </BottomSheet>
      </ScrollView>
    );
  }

  // ===== DETAIL =====
  if (step === 'detail' && selectedLoan) {
    const l = selectedLoan;
    const progressPct = l.amount > 0 ? Math.min(100, Math.round((l.paid / l.amount) * 100)) : 0;
    return (
      <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hRow}>
          <TouchableOpacity onPress={() => setStep('list')} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>{l.name}</Text>
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.progressLabel}>Otplaćeno</Text>
          <Text style={styles.progressPct}>{progressPct}%</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressSmall}>Otplaćeno: {fmt(l.paid, l.currency)}</Text>
            <Text style={styles.progressSmall}>Preostalo: {fmt(l.remaining, l.currency)}</Text>
          </View>
        </View>

        <View style={styles.nextPayment}>
          <View style={styles.npIcon}><Ionicons name="calendar" size={20} color={C.warning} /></View>
          <View style={styles.flex1}>
            <Text style={styles.npTitle}>Sledeća rata</Text>
            <Text style={styles.npDate}>{l.nextPayment}</Text>
          </View>
          <Text style={styles.npAmount}>{fmt(l.installment, l.currency)}</Text>
        </View>

        <View style={styles.detailCard}>
          {([
            ['Broj kredita', l.number],
            ['Iznos kredita', fmt(l.amount, l.currency)],
            ['Period otplate', `${l.period} meseci`],
            ['Nominalna kamatna stopa', `${l.nominalRate}%`],
            ['Efektivna kamatna stopa', `${l.effectiveRate.toFixed(2)}%`],
            ['Datum ugovaranja', l.startDate],
            ['Datum dospeća', l.endDate],
            ['Iznos rate', fmt(l.installment, l.currency)],
            ['Preostalo dugovanje', fmt(l.remaining, l.currency)],
            ['Valuta', l.currency],
          ] as [string, string][]).map(([label, value], i) => (
            <View key={label} style={[styles.dRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
              <Text style={styles.dLabel}>{label}</Text>
              <Text style={styles.dValue}>{value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  // ===== LIST =====
  return (
    <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
      <View style={styles.hRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>Krediti</Text>
      </View>

      <TouchableOpacity style={styles.applyBanner} onPress={() => { resetForm(); setStep('apply'); }} activeOpacity={0.8}>
        <Ionicons name="add-circle" size={24} color="#fff" />
        <View style={styles.flex1}>
          <Text style={styles.bannerTitle}>Podnesi zahtev za kredit</Text>
          <Text style={styles.bannerSub}>Gotovinski, stambeni, auto kredit</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>

      {loansState.error && (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Ionicons name="alert-circle-outline" size={40} color={C.danger} />
          <Text style={{ color: C.textSecondary, marginTop: 8 }}>{loansState.error}</Text>
        </View>
      )}

      {loans.length === 0 && !loansState.loading && !loansState.error && (
        <View style={{ alignItems: 'center', marginTop: 60 }}>
          <Ionicons name="document-text-outline" size={48} color={C.textMuted} />
          <Text style={{ color: C.textMuted, marginTop: 12 }}>Nema aktivnih kredita</Text>
        </View>
      )}

      {loans.length > 0 && (
        <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 14 }]}>Aktivni krediti</Text>
      )}

      {loans.map(loan => {
        const pct = loan.amount > 0 ? Math.min(100, Math.round((loan.paid / loan.amount) * 100)) : 0;
        return (
          <TouchableOpacity key={loan.number || loan.id} style={styles.loanRow}
            onPress={() => { setSelectedLoan(loan); setStep('detail'); }} activeOpacity={0.7}>
            <View style={styles.loanIconWrap}>
              <Ionicons name="document-text" size={22} color={C.primary} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.loanName}>{loan.name}</Text>
              <Text style={styles.loanNum}>{loan.number}</Text>
              <View style={styles.miniBar}>
                <View style={[styles.miniFill, { width: `${pct}%` }]} />
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.loanAmount}>{fmt(loan.remaining, loan.currency)}</Text>
              <Text style={styles.loanSub}>preostalo</Text>
              <Ionicons name="chevron-forward" size={14} color={C.textMuted} style={{ marginTop: 4 }} />
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

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
  hRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  title: { color: C.textPrimary, fontSize: 20, fontWeight: '700' },
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
  applyBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.primary, borderRadius: 18, padding: 18, shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  bannerTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  bannerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  loanRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.bgCard, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 10 },
  loanIconWrap: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  loanName: { color: C.textPrimary, fontSize: 15, fontWeight: '600' },
  loanNum: { color: C.textMuted, fontSize: 11, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  loanAmount: { color: C.textPrimary, fontSize: 15, fontWeight: '700' },
  loanSub: { color: C.textMuted, fontSize: 10, marginTop: 1 },
  miniBar: { height: 4, backgroundColor: C.border, borderRadius: 2, marginTop: 8 },
  miniFill: { height: 4, backgroundColor: C.accent, borderRadius: 2 },
  progressCard: { backgroundColor: C.bgCard, borderRadius: 20, padding: 22, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
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
  confirmCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 20 },
  cRow: { padding: 14, paddingHorizontal: 18 },
  cLabel: { color: C.textMuted, fontSize: 11, fontWeight: '500', textTransform: 'uppercase' },
  cVal: { color: C.textPrimary, fontSize: 14, fontWeight: '500', marginTop: 4 },
  successTitle: { color: C.textPrimary, fontSize: 22, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  successSub: { color: C.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 },
  card: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18, width: '100%', marginBottom: 24 },
  sRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sLabel: { color: C.textMuted, fontSize: 13 },
  sVal: { color: C.textPrimary, fontSize: 13, fontWeight: '600' },
  mOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  mSheet: { backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '60%' },
  mHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  mTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700' },
  sheetItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, marginBottom: 2 },
  sheetItemText: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
});