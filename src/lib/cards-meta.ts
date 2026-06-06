// Serbian labels for card enums, shared by the kartice list + detail
// screens. (The app keeps copy inline at call sites, but both screens
// need the same status badge + brand name, so colocating the map here
// keeps them in sync — and it lives under src/ so Expo Router doesn't
// treat it as a route.)
import type { BadgeTone } from "@/components/ui";
import { v1CardBrand, v1CardStatus } from "@/lib/api/generated";

export const statusMeta: Record<
  v1CardStatus,
  { label: string; tone: BadgeTone }
> = {
  [v1CardStatus.CARD_STATUS_UNSPECIFIED]: { label: "—", tone: "neutral" },
  [v1CardStatus.CARD_STATUS_ACTIVE]: { label: "Aktivna", tone: "success" },
  [v1CardStatus.CARD_STATUS_BLOCKED]: { label: "Blokirana", tone: "danger" },
  [v1CardStatus.CARD_STATUS_DEACTIVATED]: {
    label: "Deaktivirana",
    tone: "neutral",
  },
};

const brandNames: Record<v1CardBrand, string> = {
  [v1CardBrand.CARD_BRAND_UNSPECIFIED]: "Kartica",
  [v1CardBrand.CARD_BRAND_VISA]: "Visa",
  [v1CardBrand.CARD_BRAND_MASTERCARD]: "Mastercard",
  [v1CardBrand.CARD_BRAND_DINACARD]: "DinaCard",
  [v1CardBrand.CARD_BRAND_AMEX]: "American Express",
};

export function brandLabel(brand: v1CardBrand | undefined): string {
  if (!brand) return "Kartica";
  return brandNames[brand] ?? "Kartica";
}
