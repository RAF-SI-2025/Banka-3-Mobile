import { C } from '../constants/theme';

export const fmt = (n: number, cur = 'RSD') => {
  const s = Math.abs(n).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? '-' : ''}${s} ${cur}`;
};

export const fmtPrecise = (n: number, cur = 'RSD', maxFractionDigits = 8) => {
  const s = Math.abs(n).toLocaleString('sr-RS', { minimumFractionDigits: 0, maximumFractionDigits: maxFractionDigits });
  return `${n < 0 ? '-' : ''}${s} ${cur}`;
};

const pad2 = (value: number) => value.toString().padStart(2, '0');

const formatDayMonthYear = (date: Date) =>
  `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()}`;

const formatDayMonthYearTime = (date: Date) =>
  `${formatDayMonthYear(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

const parseDateLike = (value: string): Date | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const dayMonthYearMatch = trimmed.match(
    /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (dayMonthYearMatch) {
    const [, dayRaw, monthRaw, yearRaw, hourRaw = '0', minuteRaw = '0', secondRaw = '0'] = dayMonthYearMatch;
    const day = Number.parseInt(dayRaw, 10);
    const month = Number.parseInt(monthRaw, 10) - 1;
    const year = Number.parseInt(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw, 10);
    const hour = Number.parseInt(hourRaw, 10);
    const minute = Number.parseInt(minuteRaw, 10);
    const second = Number.parseInt(secondRaw, 10);
    const parsed = new Date(year, month, day, hour, minute, second);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const monthYearMatch = trimmed.match(/^(\d{1,2})[.\/-](\d{2,4})$/);
  if (monthYearMatch) {
    const [, monthRaw, yearRaw] = monthYearMatch;
    const month = Number.parseInt(monthRaw, 10) - 1;
    const year = Number.parseInt(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw, 10);
    const parsed = new Date(year, month, 1);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const isoParsed = new Date(trimmed);
  return Number.isNaN(isoParsed.getTime()) ? null : isoParsed;
};

export const fmtDate = (value: string): string => {
  const parsed = parseDateLike(value);
  if (!parsed) {
    return value;
  }

  return formatDayMonthYear(parsed);
};

export const fmtDateFromDate = (date: Date): string => formatDayMonthYear(date);

export const fmtDateTime = (value: string): string => {
  const parsed = parseDateLike(value);
  if (!parsed) {
    return value;
  }

  return formatDayMonthYearTime(parsed);
};

export const generateOTP = (): string => Math.floor(100000 + Math.random() * 900000).toString();

export type VStatus = 'confirmed' | 'rejected' | 'expired' | 'pending';

export const statusConfig: Record<VStatus, { color: string; bg: string; label: string; icon: string }> = {
  confirmed: { color: C.accent, bg: C.accentGlow, label: 'Potvrđeno', icon: 'checkmark-circle' },
  rejected: { color: C.danger, bg: C.dangerGlow, label: 'Odbijeno', icon: 'close-circle' },
  expired: { color: C.warning, bg: C.warningGlow, label: 'Isteklo', icon: 'time' },
  pending: { color: C.primary, bg: C.primaryGlow, label: 'Na čekanju', icon: 'hourglass' },
};

export const statusCfg = statusConfig;

export const PAYMENT_CODES = [
  { code: '220', desc: 'Promet robe i usluga - Loss plaćanja' },
  { code: '221', desc: 'Promet robe i usluga - Loss doznake' },
  { code: '240', desc: 'Energija i komunalne usluge' },
  { code: '241', desc: 'Telefonski i poštanski troškovi' },
  { code: '253', desc: 'Zakupnine' },
  { code: '254', desc: 'Članarine i pretplate' },
  { code: '265', desc: 'Kazne' },
  { code: '281', desc: 'Premije osiguranja' },
  { code: '289', desc: 'Ostala plaćanja' },
  { code: '290', desc: 'Lična primanja' },
];
