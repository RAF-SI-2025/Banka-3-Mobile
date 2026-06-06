import { FlatList, RefreshControl, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { getLoan } from "@/lib/api/loans";
import { keys } from "@/lib/query-keys";
import {
  installmentStatusMeta,
  loanStatusMeta,
  loanTypeLabel,
} from "@/lib/loans-meta";
import { currencyLabel, formatDate, formatMoney } from "@/lib/format";
import {
  Badge,
  Card,
  LoadingState,
  MessageState,
  Screen,
} from "@/components/ui";
import { v1InstallmentStatus, v1LoanStatus } from "@/lib/api/generated";

// Loan detail (todoSpec mobile). Header summarises the loan + the
// upcoming installment; the list below is the full repayment schedule.
export default function LoanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const loanId = id ?? "";

  const { data, isLoading, isError, isRefetching, refetch } = useQuery({
    queryKey: keys.loans.detail(loanId),
    queryFn: () => getLoan(loanId),
    enabled: !!loanId,
  });

  if (isLoading) return <LoadingState />;
  if (isError || !data?.loan)
    return (
      <Screen>
        <MessageState message="Nije moguće učitati kredit." />
      </Screen>
    );

  const loan = data.loan;
  const cur = currencyLabel(loan.currency);
  const meta =
    loanStatusMeta[loan.status ?? v1LoanStatus.LOAN_STATUS_UNSPECIFIED] ??
    loanStatusMeta[v1LoanStatus.LOAN_STATUS_UNSPECIFIED]!;
  const installments = [...(data.installments ?? [])].sort(
    (a, b) => (a.sequenceNumber ?? 0) - (b.sequenceNumber ?? 0),
  );

  return (
    <Screen>
      <Card>
        <View className="flex-row justify-between items-start">
          <View className="flex-1 pr-3">
            <Text className="text-slate-900 font-semibold text-lg">
              {loanTypeLabel(loan.loanType)}
            </Text>
            <Text className="text-slate-500 text-xs mt-0.5">
              {loan.loanNumber}
            </Text>
          </View>
          <Badge label={meta.label} tone={meta.tone} />
        </View>

        <View className="flex-row justify-between mt-4">
          <Text className="text-slate-500 text-sm">Iznos kredita</Text>
          <Text className="text-slate-900 text-sm">
            {formatMoney(loan.principal, cur)}
          </Text>
        </View>
        <View className="flex-row justify-between mt-1">
          <Text className="text-slate-500 text-sm">Preostali dug</Text>
          <Text className="text-slate-900 text-sm font-semibold">
            {formatMoney(loan.remainingPrincipal, cur)}
          </Text>
        </View>
        {loan.effectiveRate ? (
          <View className="flex-row justify-between mt-1">
            <Text className="text-slate-500 text-sm">Nominalna kamata</Text>
            <Text className="text-slate-900 text-sm">
              {loan.effectiveRate}%
            </Text>
          </View>
        ) : null}
        {loan.maturesAt ? (
          <View className="flex-row justify-between mt-1">
            <Text className="text-slate-500 text-sm">Datum dospeća</Text>
            <Text className="text-slate-900 text-sm">
              {formatDate(loan.maturesAt)}
            </Text>
          </View>
        ) : null}
      </Card>

      {loan.nextInstallmentAmount ? (
        <Card>
          <Text className="text-slate-500 text-sm">Sledeća rata</Text>
          <Text className="text-2xl font-bold text-slate-900 mt-1">
            {formatMoney(loan.nextInstallmentAmount, cur)}
          </Text>
          {loan.nextInstallmentDate ? (
            <Text className="text-slate-400 text-xs mt-1">
              Dospeva: {formatDate(loan.nextInstallmentDate)}
            </Text>
          ) : null}
        </Card>
      ) : null}

      <Text className="text-slate-700 font-semibold mb-2 mt-1">
        Plan otplate
      </Text>

      {installments.length === 0 ? (
        <MessageState message="Nema rata." />
      ) : (
        <FlatList
          data={installments}
          keyExtractor={(it, i) => it.id ?? String(i)}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
            />
          }
          renderItem={({ item }) => {
            const im =
              installmentStatusMeta[
                item.status ??
                  v1InstallmentStatus.INSTALLMENT_STATUS_UNSPECIFIED
              ] ??
              installmentStatusMeta[
                v1InstallmentStatus.INSTALLMENT_STATUS_UNSPECIFIED
              ]!;
            return (
              <Card>
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 pr-3">
                    <Text className="text-slate-900">
                      Rata {item.sequenceNumber}
                    </Text>
                    <Text className="text-slate-400 text-xs mt-0.5">
                      Dospeva: {formatDate(item.expectedDueDate)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-slate-900 font-semibold">
                      {formatMoney(item.amount, currencyLabel(item.currency))}
                    </Text>
                    <View className="mt-1">
                      <Badge label={im.label} tone={im.tone} />
                    </View>
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}
