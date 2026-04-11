const currencyPriority: Record<string, number> = {
  RSD: 0,
  EUR: 1,
  USD: 2,
};

export function compareAccountsByCurrencyAndBalance<T extends { currency: string; availableBalance: number }>(a: T, b: T): number {
  const currencyDiff = (currencyPriority[a.currency] ?? 99) - (currencyPriority[b.currency] ?? 99);
  if (currencyDiff !== 0) {
    return currencyDiff;
  }

  return b.availableBalance - a.availableBalance;
}
