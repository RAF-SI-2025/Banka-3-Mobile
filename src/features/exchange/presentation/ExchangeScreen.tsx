import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { fmtDateFromDate } from '../../../shared/utils/formatters';
import { fmt } from '../../../shared/utils/formatters';
import { useAccounts } from '../../../shared/hooks/useFeatures';
import { useExchangeRates } from '../../../shared/hooks/useFeatures';
import { container } from '../../../core/di/container';
import { API_CONFIG } from '../../../core/network/NetworkClient';
import { Account } from '../../../shared/types/models';

interface Props {
  onBack: () => void;
  onRequireTotpSetup: () => void;
  initialTotpCode: string;
  onConsumeTotpCode: () => void;
}

export default function ExchangeScreen({ onBack, onRequireTotpSetup, initialTotpCode, onConsumeTotpCode }: Props) {
  const { state: accountsState, refresh: refreshAccounts } = useAccounts();
  const { state: ratesState } = useExchangeRates();

  const accounts = accountsState.data ?? [];
  const rates = ratesState.data ?? [];

  const supportedCurrencies = useMemo(() => {
    const currencies = new Set<string>(['RSD']);
    rates.forEach(rate => currencies.add(rate.fromCurrency));
    return currencies;
  }, [rates]);

  const exchangeAccounts = useMemo(
    () => accounts.filter(account => supportedCurrencies.has(account.currency)),
    [accounts, supportedCurrencies]
  );

  const rsdAccounts = exchangeAccounts.filter(a => a.currency === 'RSD');
  const forAccounts = exchangeAccounts.filter(a => a.currency !== 'RSD');

  const [fromAcc, setFromAcc] = useState<Account | null>(null);
  const [toAcc, setToAcc]     = useState<Account | null>(null);
  const [amount, setAmount]   = useState('');
  const [step, setStep]       = useState<'rates' | 'convert' | 'confirm' | 'success'>('rates');
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingFreshCode, setLoadingFreshCode] = useState(false);
  const [codeInfo, setCodeInfo] = useState('');
  const [completedConversion, setCompletedConversion] = useState<{ convertedAmount: number; rate: number; fee?: number; status?: string; purpose?: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');

  useEffect(() => {
    if (initialTotpCode) {
      setTotpCode(initialTotpCode);
    }
  }, [initialTotpCode]);

  useEffect(() => {
    if (fromAcc && !supportedCurrencies.has(fromAcc.currency)) {
      setFromAcc(null);
    }
    if (toAcc && !supportedCurrencies.has(toAcc.currency)) {
      setToAcc(null);
    }
  }, [fromAcc, toAcc, supportedCurrencies]);

  useEffect(() => {
    if (step !== 'confirm' || API_CONFIG.USE_MOCK) {
      return;
    }

    let cancelled = false;

    const loadFreshCode = async () => {
      setLoadingFreshCode(true);
      setCodeInfo('');
      try {
        const result = await container.totpRepository.requestTransactionCode();
        if (!cancelled) {
          setTotpCode(result.code);
          setCodeInfo('Ucitan je svez verification kod sa backend-a.');
        }
      } catch (e: any) {
        if (!cancelled) {
          setCodeInfo(e.message ?? 'Neuspesno osvezavanje verification koda.');
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

  const resolvedFrom = fromAcc ?? rsdAccounts[0] ?? accounts[0] ?? null;
  const resolvedTo   = toAcc   ?? forAccounts[0] ?? accounts.find(a => a.accountNumber !== resolvedFrom?.accountNumber) ?? null;
  const fromRateObj = !resolvedFrom || resolvedFrom.currency === 'RSD'
    ? null
    : rates.find(r => r.fromCurrency === resolvedFrom.currency) ?? null;
  const toRateObj = !resolvedTo || resolvedTo.currency === 'RSD'
    ? null
    : rates.find(r => r.fromCurrency === resolvedTo.currency) ?? null;
  const conversionMode = !resolvedFrom || !resolvedTo
    ? 'buy'
    : resolvedFrom.currency === 'RSD'
      ? 'buy'
      : resolvedTo.currency === 'RSD'
        ? 'sell'
        : 'cross';
  const activeRate = useMemo(() => {
    if (!resolvedFrom || !resolvedTo) return 0;
    if (conversionMode === 'buy') {
      return toRateObj?.sellRate ?? 0;
    }
    if (conversionMode === 'sell') {
      return fromRateObj?.buyRate ?? 0;
    }
    const sourceBuyRate = fromRateObj?.buyRate ?? 0;
    const targetSellRate = toRateObj?.sellRate ?? 0;
    if (sourceBuyRate <= 0 || targetSellRate <= 0) return 0;
    return sourceBuyRate / targetSellRate;
  }, [conversionMode, fromRateObj, toRateObj, resolvedFrom, resolvedTo]);
  const foreignCur = !resolvedFrom || !resolvedTo
    ? undefined
    : resolvedFrom.currency === 'RSD'
      ? resolvedTo.currency
      : resolvedFrom.currency;

  const amountNum = useMemo(() => {
    const normalized = amount.replace(',', '.');
    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [amount]);

  const hasTypedAmount      = amount.trim() !== '';
  const hasPositiveAmount   = amountNum > 0;
  const hasEnoughFunds      = amountNum <= (resolvedFrom?.availableBalance ?? 0);
  const differentAccounts   = resolvedFrom?.accountNumber !== resolvedTo?.accountNumber;
  const differentCurrencies = resolvedFrom?.currency !== resolvedTo?.currency;
  const hasRate             = activeRate > 0;

  const isValid =
    hasTypedAmount && hasPositiveAmount && hasEnoughFunds &&
    differentAccounts && differentCurrencies && hasRate;

  const validationMessage = useMemo(() => {
    if (!hasTypedAmount)      return '';
    if (!hasPositiveAmount)   return 'Unesite ispravan iznos.';
    if (!differentAccounts)   return 'Izaberite različite račune.';
    if (!differentCurrencies) return 'Računi moraju biti u različitim valutama.';
    if (!hasRate)             return 'Kurs za izabranu valutu nije dostupan.';
    if (!hasEnoughFunds)      return 'Nedovoljno sredstava na računu.';
    return '';
  }, [hasTypedAmount, hasPositiveAmount, differentAccounts, differentCurrencies, hasRate, hasEnoughFunds]);

  const converted = useMemo(() => {
    if (!isValid) return 0;
    if (conversionMode === 'buy') {
      return amountNum / activeRate;
    }
    if (conversionMode === 'sell') {
      return amountNum * activeRate;
    }
    const sourceBuyRate = fromRateObj?.buyRate ?? 0;
    const targetSellRate = toRateObj?.sellRate ?? 0;
    if (sourceBuyRate <= 0 || targetSellRate <= 0) return 0;
    return (amountNum * sourceBuyRate) / targetSellRate;
  }, [amountNum, activeRate, conversionMode, fromRateObj, toRateObj, isValid]);
  const rateLabel = useMemo(() => {
    if (conversionMode === 'cross') {
      return `Efektivno: 1 ${foreignCur} = ${activeRate.toFixed(4)} ${resolvedTo?.currency} (preko RSD)`;
    }

    return `1 ${foreignCur} = ${activeRate.toFixed(2)} RSD (${conversionMode === 'buy' ? 'prodajni' : 'kupovni'})`;
  }, [activeRate, conversionMode, foreignCur, resolvedTo?.currency]);

  const handleSwap = () => {
    const prev = resolvedFrom;
    setFromAcc(resolvedTo);
    setToAcc(prev);
  };

  const handleAmountChange = (text: string) => {
    const normalized = text.replace(/,/g, '.').replace(/[^0-9.]/g, '');
    const parts = normalized.split('.');
    setAmount(parts.length <= 2 ? normalized : `${parts[0]}.${parts.slice(1).join('')}`);
  };

  const handleConfirm = async () => {
    if (!isValid || !resolvedFrom || !resolvedTo) return;
    setSubmitting(true);
    try {
      const previousFromBalance = resolvedFrom.availableBalance;
      const previousToBalance = resolvedTo.availableBalance;
      const result = await container.exchangeRepository.convert({
        fromAccountId: resolvedFrom.id,
        toAccountId: resolvedTo.id,
        fromAccountNumber: resolvedFrom.accountNumber,
        toAccountNumber: resolvedTo.accountNumber,
        fromCurrency: resolvedFrom.currency,
        toCurrency: resolvedTo.currency,
        amount: amountNum,
        description: `${resolvedFrom.name} ${resolvedFrom.currency} -> ${resolvedTo.currency} ${amountNum}`,
        totpCode: API_CONFIG.USE_MOCK ? undefined : totpCode.trim(),
      });

      const refreshedAccounts = await container.accountRepository.getAccounts();
      const refreshedFrom = refreshedAccounts.find(account => account.accountNumber === resolvedFrom.accountNumber);
      const refreshedTo = refreshedAccounts.find(account => account.accountNumber === resolvedTo.accountNumber);

      if (
        !API_CONFIG.USE_MOCK &&
        refreshedFrom &&
        refreshedTo &&
        refreshedFrom.availableBalance === previousFromBalance &&
        refreshedTo.availableBalance === previousToBalance
      ) {
        throw new Error('Konverzija je izracunata, ali backend nije azurirao stanje racuna u bazi.');
      }

      setCompletedConversion(result);
      setTotpCode('');
      onConsumeTotpCode();
      await refreshAccounts();
      setStep('success');
    } catch (e: any) {
      if (String(e?.message ?? '').toLowerCase().includes("user doesn't have totp setup")) {
        onRequireTotpSetup();
        return;
      }
      alert(e.message ?? 'Greška pri konverziji');
    } finally {
      setSubmitting(false);
    }
  };

  if (accountsState.loading || ratesState.loading) {
    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  if (accountsState.error || ratesState.error) {
    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg, padding: 24 }]}>
        <Ionicons name="alert-circle-outline" size={48} color={C.textSecondary} />
        <Text style={[styles.successSub, { marginTop: 12 }]}>
          {accountsState.error ?? ratesState.error}
        </Text>
        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 20 }]} onPress={onBack}>
          <Text style={styles.primaryBtnText}>Nazad</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!resolvedFrom || !resolvedTo) {
    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg, padding: 24 }]}>
        <Text style={styles.successSub}>Nema dostupnih računa.</Text>
        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 20 }]} onPress={onBack}>
          <Text style={styles.primaryBtnText}>Nazad</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fromPickerAccounts = exchangeAccounts.filter(a => a.accountNumber !== resolvedTo.accountNumber);
  const toPickerAccounts   = exchangeAccounts.filter(a => a.accountNumber !== resolvedFrom.accountNumber);

  if (step === 'success') {
    const successConvertedAmount = completedConversion?.convertedAmount ?? converted;

    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg, padding: 24 }]}>
        <Ionicons name="checkmark-circle" size={64} color={C.accent} />
        <Text style={styles.successTitle}>Konverzija uspešna!</Text>
        <Text style={styles.successSub}>Sredstva su konvertovana između računa.</Text>
        <View style={styles.card}>
          <View style={styles.sRow}><Text style={styles.sLabel}>Sa</Text><Text style={styles.sVal}>{resolvedFrom.name}</Text></View>
          <View style={styles.sRow}><Text style={styles.sLabel}>Na</Text><Text style={styles.sVal}>{resolvedTo.name}</Text></View>
          <View style={styles.sRow}><Text style={styles.sLabel}>Iznos</Text><Text style={styles.sVal}>{fmt(amountNum, resolvedFrom.currency)}</Text></View>
          <View style={styles.sRow}><Text style={styles.sLabel}>Dobijate</Text><Text style={[styles.sVal, { color: C.accent }]}>{fmt(successConvertedAmount, resolvedTo.currency)}</Text></View>
          {completedConversion?.fee !== undefined && <View style={styles.sRow}><Text style={styles.sLabel}>Provizija</Text><Text style={styles.sVal}>{completedConversion.fee}</Text></View>}
          {completedConversion?.status && <View style={styles.sRow}><Text style={styles.sLabel}>Status</Text><Text style={styles.sVal}>{completedConversion.status}</Text></View>}
          <View style={styles.sRow}><Text style={styles.sLabel}>Kurs</Text><Text style={styles.sVal}>{rateLabel}</Text></View>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={onBack}>
          <Text style={styles.primaryBtnText}>Nazad na početnu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'confirm') {
    return (
      <ScrollView style={styles.screenScroll} contentContainerStyle={{ padding: 20 }}>
        <View style={styles.hRow}>
          <TouchableOpacity onPress={() => setStep('convert')} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>Potvrda konverzije</Text>
        </View>
        <View style={styles.confirmCard}>
          {[
            ['Sa računa', `${resolvedFrom.name} (${resolvedFrom.currency})`],
            ['Na račun',  `${resolvedTo.name} (${resolvedTo.currency})`],
            ['Iznos',     fmt(amountNum, resolvedFrom.currency)],
            ['Dobijate',  fmt(converted, resolvedTo.currency)],
            ['Kurs',      rateLabel],
          ].map(([l, v], i) => (
            <View key={l} style={[styles.cRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
              <Text style={styles.cLabel}>{l}</Text>
              <Text style={styles.cVal}>{v}</Text>
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
            <Text style={styles.helperText}>
              {loadingFreshCode
                ? 'Ucitavam svezi verification kod sa backend-a...'
                : codeInfo || 'Kod sa mobilnog verification ekrana se ovde popunjava automatski kada je dostupan.'}
            </Text>
          </>
        )}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={styles.secBtn} onPress={() => setStep('convert')}>
            <Text style={styles.secBtnText}>Nazad</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, { flex: 1.5, opacity: isValid && !submitting && (API_CONFIG.USE_MOCK || !!totpCode.trim()) ? 1 : 0.5 }]}
            disabled={!isValid || submitting || (!API_CONFIG.USE_MOCK && !totpCode.trim())}
            onPress={handleConfirm}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Potvrdi</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (step === 'convert') {
    return (
      <ScrollView style={styles.screenScroll} contentContainerStyle={{ padding: 20 }}>
        <View style={styles.hRow}>
          <TouchableOpacity onPress={() => setStep('rates')} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>Konverzija</Text>
        </View>

        <Text style={styles.label}>SA RAČUNA</Text>
        <TouchableOpacity style={styles.accSel} onPress={() => setShowFrom(true)}>
          <Ionicons name="wallet" size={18} color={C.primary} />
          <View style={styles.flex1}>
            <Text style={styles.accSelName}>{resolvedFrom.name} ({resolvedFrom.currency})</Text>
            <Text style={styles.accSelBal}>{fmt(resolvedFrom.availableBalance, resolvedFrom.currency)}</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.swapBtn} onPress={handleSwap}>
          <Ionicons name="swap-vertical" size={22} color={C.primary} />
        </TouchableOpacity>

        <Text style={styles.label}>NA RAČUN</Text>
        <TouchableOpacity style={styles.accSel} onPress={() => setShowTo(true)}>
          <Ionicons name="wallet" size={18} color={C.accent} />
          <View style={styles.flex1}>
            <Text style={styles.accSelName}>{resolvedTo.name} ({resolvedTo.currency})</Text>
            <Text style={styles.accSelBal}>{fmt(resolvedTo.availableBalance, resolvedTo.currency)}</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 20 }]}>IZNOS ({resolvedFrom.currency})</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={handleAmountChange}
            placeholder="0.00"
            placeholderTextColor={C.textMuted}
            keyboardType="decimal-pad"
          />
          <Text style={styles.cur}>{resolvedFrom.currency}</Text>
        </View>

        {!!validationMessage && <Text style={styles.errorText}>{validationMessage}</Text>}

        {isValid && (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Dobijate približno</Text>
            <Text style={styles.previewAmount}>{fmt(converted, resolvedTo.currency)}</Text>
            <Text style={styles.previewRate}>{rateLabel}</Text>
          </View>
        )}

        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 20, opacity: isValid ? 1 : 0.5 }]} disabled={!isValid} onPress={() => setStep('confirm')}>
          <Text style={styles.primaryBtnText}>Nastavi</Text>
        </TouchableOpacity>

        {[ 
          { visible: showFrom, setVisible: setShowFrom, setAcc: setFromAcc, accs: fromPickerAccounts },
          { visible: showTo,   setVisible: setShowTo,   setAcc: setToAcc,   accs: toPickerAccounts  },
        ].map((p, i) => (
          <Modal key={i} visible={p.visible} transparent animationType="slide">
            <View style={styles.mOverlay}>
              <View style={styles.mSheet}>
                <View style={styles.mHead}>
                  <Text style={styles.mTitle}>Odaberite račun</Text>
                  <TouchableOpacity onPress={() => p.setVisible(false)}>
                    <Ionicons name="close" size={24} color={C.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
                  {p.accs.map((a, index) => (
                    <TouchableOpacity key={`${a.accountNumber}-${index}`} style={styles.mItem} onPress={() => { p.setAcc(a); p.setVisible(false); }}>
                      <View style={styles.mItemIcon}><Ionicons name="wallet" size={18} color={C.primary} /></View>
                      <View style={styles.flex1}>
                        <Text style={styles.mItemTitle}>{a.name} ({a.currency})</Text>
                        <Text style={styles.mItemSub}>{fmt(a.availableBalance, a.currency)}</Text>
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

  return (
    <ScrollView style={styles.screenScroll} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.hRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>Menjačnica</Text>
      </View>

      <TouchableOpacity style={styles.convertBanner} onPress={() => setStep('convert')} activeOpacity={0.8}>
        <Ionicons name="swap-horizontal" size={22} color="#fff" />
        <View style={styles.flex1}>
          <Text style={styles.bannerTitle}>Konvertuj valutu</Text>
          <Text style={styles.bannerSub}>Menjačnica između tekućeg i deviznog računa</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 4 }]}>Kursna lista</Text>
      <Text style={styles.rateDate}>Datum: {fmtDateFromDate(new Date())}</Text>

      <View style={styles.rateHeader}>
        <Text style={[styles.rateHText, { flex: 1 }]}>Valuta</Text>
        <Text style={[styles.rateHText, { width: 80, textAlign: 'right' }]}>Kupovni</Text>
        <Text style={[styles.rateHText, { width: 80, textAlign: 'right' }]}>Srednji</Text>
        <Text style={[styles.rateHText, { width: 80, textAlign: 'right' }]}>Prodajni</Text>
      </View>

      {rates.map((r, index) => (
        <View key={`${r.fromCurrency}-${r.toCurrency}-${r.buyRate}-${r.sellRate}-${index}`} style={styles.rateRow}>
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
  helperText: { color: C.textMuted, fontSize: 12, marginTop: 8, marginBottom: 16 },
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
