import { C } from '../constants/theme';

export const fmt = (n: number, cur = 'RSD') => {
  const s = Math.abs(n).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? '-' : ''}${s} ${cur}`;
};

export const generateOTP = (): string => Math.floor(100000 + Math.random() * 900000).toString();

