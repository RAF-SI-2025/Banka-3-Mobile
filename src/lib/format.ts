// Serbian display formatting (mirrors the web app's conventions):
//   - money: thousands ".", decimal ",", amount THEN currency code
//     e.g. "180.000,00 RSD"
//   - dates: DD.MM.YYYY (API sends ISO)
// Money arrives from the API as a decimal string ("180.00") to avoid
// float precision loss; we parse only for display.

export function formatMoney(amount: string | undefined, currency?: string): string {
  const n = Number(amount ?? "0");
  const safe = Number.isFinite(n) ? n : 0;
  const formatted = new Intl.NumberFormat("sr-RS", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
  return currency ? `${formatted} ${currency}` : formatted;
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(iso)} ${hh}:${mi}`;
}
