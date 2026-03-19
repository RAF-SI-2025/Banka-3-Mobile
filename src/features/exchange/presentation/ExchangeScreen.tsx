import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { MOCK_ACCOUNTS } from '../../../shared/data/mockData';
import { fmt } from '../../../shared/utils/formatters';
import { MockExchangeRepository } from '../data/MockExchangeRepository';
import { ExchangeRate } from '../../../shared/types/models';

interface Props { onBack: () => void; }

export default function ExchangeScreen({ onBack }: Props) {
  const exchangeRepo = useMemo(() => new MockExchangeRepository(), []);

  const rsdAccounts = MOCK_ACCOUNTS.filter(a => a.currency === 'RSD');
  const forAccounts = MOCK_ACCOUNTS.filter(a => a.currency !== 'RSD');

  const initialFromAcc = rsdAccounts[0] ?? MOCK_ACCOUNTS[0];
  const initialToAcc =
    forAccounts[0] ??
    MOCK_ACCOUNTS.find(a => a.id !== initialFromAcc?.id) ??
    MOCK_ACCOUNTS[0];

  const [fromAcc, setFromAcc] = useState(initialFromAcc);
  const [toAcc, setToAcc] = useState(initialToAcc);
  const [amount, setAmount] = useState('');
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [step, setStep] = useState<'rates' | 'convert' | 'confirm' | 'success'>('rates');
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadRates = async () => {
      try {
        setLoading(true);
        setLoadError('');
        const data = await exchangeRepo.getRates();
        if (!cancelled) {
          setRates(data);
        }
      } catch {
        if (!cancelled) {
          setLoadError('Greška pri učitavanju kursne liste.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadRates();

    return () => {
      cancelled = true;
    };
  }, [exchangeRepo]);

  const buying = fromAcc.currency === 'RSD';
  const foreignCur = buying ? toAcc.currency : fromAcc.currency;
  const rateObj = rates.find(r => r.fromCurrency === foreignCur);

  const activeRate = buying
    ? (rateObj?.sellRate ?? 0)
    : (rateObj?.buyRate ?? 0);

  const amountNum = useMemo(() => {
    const normalized = amount.replace(',', '.');
    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [amount]);

  const hasTypedAmount = amount.trim() !== '';
  const hasPositiveAmount = amountNum > 0;
  const hasEnoughFunds = amountNum <= fromAcc.available;
  const differentAccounts = fromAcc.id !== toAcc.id;
  const differentCurrencies = fromAcc.currency !== toAcc.currency;
  const hasRate = activeRate > 0;

  const isValid =
    hasTypedAmount &&
    hasPositiveAmount &&
    hasEnoughFunds &&
    differentAccounts &&
    differentCurrencies &&
    hasRate;

  const validationMessage = useMemo(() => {
    if (!hasTypedAmount) return '';
    if (!hasPositiveAmount) return 'Unesite ispravan iznos.';
    if (!differentAccounts) return 'Izaberite različite račune.';
    if (!differentCurrencies) return 'Računi moraju biti u različitim valutama.';
    if (!hasRate) return 'Kurs za izabranu valutu nije dostupan.';
    if (!hasEnoughFunds) return 'Nedovoljno sredstava na računu.';
    return '';
  }, [hasTypedAmount, hasPositiveAmount, differentAccounts, differentCurrencies, hasRate, hasEnoughFunds]);

  const converted = useMemo(() => {
    if (!isValid) return 0;
    if (buying) return amountNum / activeRate;
    return amountNum * activeRate;
  }, [amountNum, activeRate, buying, isValid]);

  const handleSwap = () => {
    const t = fromAcc;
    setFromAcc(toAcc);
    setToAcc(t);
  };

  const handleAmountChange = (text: string) => {
    const normalized = text.replace(/,/g, '.').replace(/[^0-9.]/g, '');
    const parts = normalized.split('.');
    const safeValue =
      parts.length <= 2
        ? normalized
        : `${parts[0]}.${parts.slice(1).join('')}`;

    setAmount(safeValue);
  };

  const fromPickerAccounts = MOCK_ACCOUNTS.filter(a => a.id !== toAcc.id);
  const toPickerAccounts = MOCK_ACCOUNTS.filter(a => a.id !== fromAcc.id);

  if (!fromAcc || !toAcc) {
    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg, padding: 24 }]}>
        <Text style={styles.successSub}>Nema dostupnih računa.</Text>
        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 20 }]} onPress={onBack}>
          <Text style={styles.primaryBtnText}>Nazad</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg, padding: 24 }]}>
        <Text style={styles.successSub}>Loading...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg, padding: 24 }]}>
        <Ionicons name="alert-circle-outline" size={48} color={C.textSecondary} />
        <Text style={[styles.successSub, { marginTop: 12 }]}>{loadError}</Text>
        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 20 }]} onPress={onBack}>
          <Text style={styles.primaryBtnText}>Nazad</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'success') {
    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg, padding: 24 }]}>
        <Ionicons name="checkmark-circle" size={64} color={C.accent} />
        <Text style={styles.successTitle}>Konverzija uspešna!</Text>
        <Text style={styles.successSub}>Sredstva su konvertovana između računa.</Text>
        <View style={styles.card}>
          <View style={styles.sRow}><Text style={styles.sLabel}>Sa</Text><Text style={styles.sVal}>{fromAcc.name}</Text></View>
          <View style={styles.sRow}><Text style={styles.sLabel}>Na</Text><Text style={styles.sVal}>{toAcc.name}</Text></View>
          <View style={styles.sRow}><Text style={styles.sLabel}>Iznos</Text><Text style={styles.sVal}>{fmt(amountNum, fromAcc.currency)}</Text></View>
          <View style={styles.sRow}><Text style={styles.sLabel}>Dobijate</Text><Text style={[styles.sVal, { color: C.accent }]}>{fmt(converted, toAcc.currency)}</Text></View>
          <View style={styles.sRow}><Text style={styles.sLabel}>Kurs</Text><Text style={styles.sVal}>1 {foreignCur} = {activeRate.toFixed(2)} RSD</Text></View>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={onBack}><Text style={styles.primaryBtnText}>Nazad na početnu</Text></TouchableOpacity>
      </View>
    );
  }

  if (step === 'confirm') {
    return (
      <ScrollView style={styles.screenScroll} contentContainerStyle={{ padding: 20 }}>
        <View style={styles.hRow}>
          <TouchableOpacity onPress={() => setStep('convert')} style={styles.backBtn}><Ionicons name="chevron-back" size={20} color={C.textSecondary} /></TouchableOpacity>
          <Text style={styles.title}>Potvrda konverzije</Text>
        </View>
        <View style={styles.confirmCard}>
          {[
            ['Sa računa', `${fromAcc.name} (${fromAcc.currency})`],
            ['Na račun', `${toAcc.name} (${toAcc.currency})`],
            ['Iznos', fmt(amountNum, fromAcc.currency)],
            ['Dobijate', fmt(converted, toAcc.currency)],
            ['Kurs', `1 ${foreignCur} = ${activeRate.toFixed(4)} RSD`],
          ].map(([l, v], i) => (
            <View key={l} style={[styles.cRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
              <Text style={styles.cLabel}>{l}</Text><Text style={styles.cVal}>{v}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={styles.secBtn} onPress={() => setStep('convert')}><Text style={styles.secBtnText}>Nazad</Text></TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, { flex: 1.5, opacity: isValid ? 1 : 0.5 }]}
            disabled={!isValid}
            onPress={() => setStep('success')}
          >
            <Text style={styles.primaryBtnText}>Potvrdi</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (step === 'convert') {
    return (
      <ScrollView style={styles.screenScroll} contentContainerStyle={{ padding: 20 }}>
        <View style={styles.hRow}>
          <TouchableOpacity onPress={() => setStep('rates')} style={styles.backBtn}><Ionicons name="chevron-back" size={20} color={C.textSecondary} /></TouchableOpacity>
          <Text style={styles.title}>Konverzija</Text>
        </View>

        <Text style={styles.label}>SA RAČUNA</Text>
        <TouchableOpacity style={styles.accSel} onPress={() => setShowFrom(true)}>
          <Ionicons name="wallet" size={18} color={C.primary} />
          <View style={styles.flex1}><Text style={styles.accSelName}>{fromAcc.name} ({fromAcc.currency})</Text><Text style={styles.accSelBal}>{fmt(fromAcc.available, fromAcc.currency)}</Text></View>
          <Ionicons name="chevron-down" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.swapBtn} onPress={handleSwap}><Ionicons name="swap-vertical" size={22} color={C.primary} /></TouchableOpacity>

        <Text style={styles.label}>NA RAČUN</Text>
        <TouchableOpacity style={styles.accSel} onPress={() => setShowTo(true)}>
          <Ionicons name="wallet" size={18} color={C.accent} />
          <View style={styles.flex1}><Text style={styles.accSelName}>{toAcc.name} ({toAcc.currency})</Text><Text style={styles.accSelBal}>{fmt(toAcc.available, toAcc.currency)}</Text></View>
          <Ionicons name="chevron-down" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 20 }]}>IZNOS ({fromAcc.currency})</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={handleAmountChange}
            placeholder="0.00"
            placeholderTextColor={C.textMuted}
            keyboardType="decimal-pad"
          />
          <Text style={styles.cur}>{fromAcc.currency}</Text>
        </View>

        {!!validationMessage && (
          <Text style={styles.errorText}>{validationMessage}</Text>
        )}

        {isValid && (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Dobijate približno</Text>
            <Text style={styles.previewAmount}>{fmt(converted, toAcc.currency)}</Text>
            <Text style={styles.previewRate}>Kurs: 1 {foreignCur} = {activeRate.toFixed(2)} RSD ({buying ? 'prodajni' : 'kupovni'})</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 20, opacity: isValid ? 1 : 0.5 }]}
          disabled={!isValid}
          onPress={() => setStep('confirm')}
        >
          <Text style={styles.primaryBtnText}>Nastavi</Text>
        </TouchableOpacity>

        {[{ v: showFrom, sv: setShowFrom, set: setFromAcc, accs: fromPickerAccounts }, { v: showTo, sv: setShowTo, set: setToAcc, accs: toPickerAccounts }].map((p, i) => (
          <Modal key={i} visible={p.v} transparent animationType="slide">
            <View style={styles.mOverlay}><View style={styles.mSheet}>
              <View style={styles.mHead}><Text style={styles.mTitle}>Odaberite račun</Text><TouchableOpacity onPress={() => p.sv(false)}><Ionicons name="close" size={24} color={C.textSecondary} /></TouchableOpacity></View>
              {p.accs.map(a => (
                <TouchableOpacity key={a.id} style={styles.mItem} onPress={() => { p.set(a); p.sv(false); }}>
                  <View style={styles.mItemIcon}><Ionicons name="wallet" size={18} color={C.primary} /></View>
                  <View style={styles.flex1}><Text style={styles.mItemTitle}>{a.name} ({a.currency})</Text><Text style={styles.mItemSub}>{fmt(a.available, a.currency)}</Text></View>
                </TouchableOpacity>
              ))}
            </View></View>
          </Modal>
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screenScroll} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.hRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><Ionicons name="chevron-back" size={20} color={C.textSecondary} /></TouchableOpacity>
        <Text style={styles.title}>Menjačnica</Text>
      </View>

      <TouchableOpacity style={styles.convertBanner} onPress={() => setStep('convert')} activeOpacity={0.8}>
        <Ionicons name="swap-horizontal" size={22} color="#fff" />
        <View style={styles.flex1}>
          <Text style={styles.bannerTitle}>Konvertuj valutu</Text>
          <Text style={styles.bannerSub}>Prenos između tekućeg i deviznog računa</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 4 }]}>Kursna lista</Text>
      <Text style={styles.rateDate}>Datum: {new Date().toLocaleDateString('sr-RS')}</Text>

      <View style={styles.rateHeader}>
        <Text style={[styles.rateHText, { flex: 1 }]}>Valuta</Text>
        <Text style={[styles.rateHText, { width: 80, textAlign: 'right' }]}>Kupovni</Text>
        <Text style={[styles.rateHText, { width: 80, textAlign: 'right' }]}>Srednji</Text>
        <Text style={[styles.rateHText, { width: 80, textAlign: 'right' }]}>Prodajni</Text>
      </View>

      {rates.map(r => (
        <View key={r.fromCurrency} style={styles.rateRow}>
          <View style={[styles.row, { flex: 1, gap: 8 }]}>
            <View style={styles.flagBadge}><Text style={styles.flagText}>{r.fromCurrency}</Text></View>
            <Text style={styles.rateCur}>{r.fromCurrency}/RSD</Text>
          </View>
          <Text style={[styles.rateVal, { width: 80, textAlign: 'right' }]}>{r.buyRate.toFixed(2)}</Text>
          <Text style={[styles.rateVal, { width: 80, textAlign: 'right', color: C.textSecondary }]}>{r.middleRate.toFixed(2)}</Text>
          <Text style={[styles.rateVal, { width: 80, textAlign: 'right' }]}>{r.sellRate.toFixed(2)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  screenScroll: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  hRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  title: { color: C.textPrimary, fontSize: 20, fontWeight: '700' },
  label: { color: C.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  sectionTitle: { color: C.textPrimary, fontSize: 16, fontWeight: '600' },
  convertBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.primary, borderRadius: 18, padding: 18, shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  bannerTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  bannerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  rateDate: { color: C.textMuted, fontSize: 12, marginBottom: 14 },
  rateHeader: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  rateHText: { color: C.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  rateRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  flagBadge: { width: 32, height: 22, borderRadius: 4, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  flagText: { color: C.primary, fontSize: 10, fontWeight: '700' },
  rateCur: { color: C.textPrimary, fontSize: 13, fontWeight: '500' },
  rateVal: { color: C.textPrimary, fontSize: 13, fontWeight: '600' },

  accSel: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, padding: 14 },
  accSelName: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
  accSelBal: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  swapBtn: { alignSelf: 'center', width: 42, height: 42, borderRadius: 21, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center', marginVertical: 12, borderWidth: 1, borderColor: C.border },
  inputWrap: { backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, color: C.textPrimary, fontSize: 15, padding: 14 },
  cur: { color: C.textMuted, fontSize: 13, fontWeight: '600', paddingRight: 14 },
  previewCard: { backgroundColor: C.accentGlow, borderRadius: 16, padding: 18, marginTop: 16, borderWidth: 1, borderColor: 'rgba(6,214,160,0.2)', alignItems: 'center' },
  previewLabel: { color: C.textSecondary, fontSize: 12 },
  previewAmount: { color: C.accent, fontSize: 24, fontWeight: '800', marginTop: 4, letterSpacing: -0.5 },
  previewRate: { color: C.textMuted, fontSize: 11, marginTop: 6 },
  errorText: { color: '#ff6b6b', fontSize: 12, marginTop: 8 },

  primaryBtn: { backgroundColor: C.primary, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secBtn: { flex: 1, backgroundColor: C.bgCard, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  secBtnText: { color: C.textSecondary, fontSize: 15, fontWeight: '600' },
  confirmCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 20 },
  cRow: { padding: 14, paddingHorizontal: 18 },
  cLabel: { color: C.textMuted, fontSize: 11, fontWeight: '500', textTransform: 'uppercase' },
  cVal: { color: C.textPrimary, fontSize: 14, fontWeight: '500', marginTop: 4 },
  card: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18, width: '100%', marginBottom: 24 },
  sRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sLabel: { color: C.textMuted, fontSize: 13 },
  sVal: { color: C.textPrimary, fontSize: 13, fontWeight: '600' },
  successTitle: { color: C.textPrimary, fontSize: 22, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  successSub: { color: C.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  mOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  mSheet: { backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  mHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  mTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700' },
  mItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 4 },
  mItemIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  mItemTitle: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
  mItemSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },
});