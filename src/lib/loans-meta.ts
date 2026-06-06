// Serbian labels for loan enums, shared by the krediti list + detail
// screens. Lives under src/ so Expo Router doesn't treat it as a route.
import type { BadgeTone } from "@/components/ui";
import {
  v1InstallmentStatus,
  v1LoanStatus,
  v1LoanType,
} from "@/lib/api/generated";

export const loanStatusMeta: Record<
  v1LoanStatus,
  { label: string; tone: BadgeTone }
> = {
  [v1LoanStatus.LOAN_STATUS_UNSPECIFIED]: { label: "—", tone: "neutral" },
  [v1LoanStatus.LOAN_STATUS_APPROVED]: { label: "Aktivan", tone: "success" },
  [v1LoanStatus.LOAN_STATUS_REJECTED]: { label: "Odbijen", tone: "danger" },
  [v1LoanStatus.LOAN_STATUS_PAID_OFF]: { label: "Otplaćen", tone: "neutral" },
  [v1LoanStatus.LOAN_STATUS_OVERDUE]: { label: "U docnji", tone: "warning" },
};

const loanTypeNames: Record<v1LoanType, string> = {
  [v1LoanType.LOAN_TYPE_UNSPECIFIED]: "Kredit",
  [v1LoanType.LOAN_TYPE_CASH]: "Gotovinski kredit",
  [v1LoanType.LOAN_TYPE_HOUSING]: "Stambeni kredit",
  [v1LoanType.LOAN_TYPE_AUTO]: "Auto kredit",
  [v1LoanType.LOAN_TYPE_REFINANCE]: "Kredit za refinansiranje",
  [v1LoanType.LOAN_TYPE_STUDENT]: "Studentski kredit",
};

export function loanTypeLabel(type: v1LoanType | undefined): string {
  if (!type) return "Kredit";
  return loanTypeNames[type] ?? "Kredit";
}

export const installmentStatusMeta: Record<
  v1InstallmentStatus,
  { label: string; tone: BadgeTone }
> = {
  [v1InstallmentStatus.INSTALLMENT_STATUS_UNSPECIFIED]: {
    label: "—",
    tone: "neutral",
  },
  [v1InstallmentStatus.INSTALLMENT_STATUS_PAID]: {
    label: "Plaćena",
    tone: "success",
  },
  [v1InstallmentStatus.INSTALLMENT_STATUS_UNPAID]: {
    label: "Neplaćena",
    tone: "info",
  },
  [v1InstallmentStatus.INSTALLMENT_STATUS_OVERDUE]: {
    label: "U docnji",
    tone: "warning",
  },
};
