import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { listLoans } from "@/lib/api/loans";
import { useAuthStore } from "@/lib/auth/store";
import { keys } from "@/lib/query-keys";
import { loanStatusMeta, loanTypeLabel } from "@/lib/loans-meta";
import { currencyLabel, formatDate, formatMoney } from "@/lib/format";
import {
  Badge,
  Card,
  LoadingState,
  MessageState,
  Screen,
} from "@/components/ui";
import { v1LoanStatus } from "@/lib/api/generated";

// Loan list (todoSpec mobile). Each row surfaces the upcoming
// installment amount + due date at a glance; the detail shows the full
// schedule. Read-only — applying for a loan stays on the web app.
export default function KreditiScreen() {
  const userId = useAuthStore((s) => s.identity?.userId ?? "");

  const { data, isLoading, isError, isRefetching, refetch } = useQuery({
    queryKey: keys.loans.list(),
    queryFn: () => listLoans(userId),
    enabled: !!userId,
  });

  if (isLoading) return <LoadingState />;
  if (isError)
    return (
      <Screen>
        <MessageState message="Nije moguće učitati kredite." />
      </Screen>
    );

  const loans = data ?? [];

  return (
    <Screen>
      {loans.length === 0 ? (
        <MessageState message="Nemate kredita." />
      ) : (
        <FlatList
          data={loans}
          keyExtractor={(l, i) => l.id ?? l.loanNumber ?? String(i)}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
            />
          }
          renderItem={({ item }) => {
            const meta =
              loanStatusMeta[
                item.status ?? v1LoanStatus.LOAN_STATUS_UNSPECIFIED
              ] ?? loanStatusMeta[v1LoanStatus.LOAN_STATUS_UNSPECIFIED]!;
            const cur = currencyLabel(item.currency);
            return (
              <Link href={`/(app)/krediti/${item.id}`} asChild>
                <Pressable>
                  <Card>
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1 pr-3">
                        <Text className="text-slate-900 font-semibold">
                          {loanTypeLabel(item.loanType)}
                        </Text>
                        <Text className="text-slate-500 text-xs mt-0.5">
                          {item.loanNumber}
                        </Text>
                      </View>
                      <Badge label={meta.label} tone={meta.tone} />
                    </View>

                    <View className="flex-row justify-between mt-3">
                      <Text className="text-slate-500 text-xs">
                        Preostali dug
                      </Text>
                      <Text className="text-slate-900 text-sm font-semibold">
                        {formatMoney(item.remainingPrincipal, cur)}
                      </Text>
                    </View>
                    {item.nextInstallmentAmount ? (
                      <View className="flex-row justify-between mt-1">
                        <Text className="text-slate-500 text-xs">
                          Sledeća rata
                          {item.nextInstallmentDate
                            ? ` (${formatDate(item.nextInstallmentDate)})`
                            : ""}
                        </Text>
                        <Text className="text-slate-900 text-sm font-semibold">
                          {formatMoney(item.nextInstallmentAmount, cur)}
                        </Text>
                      </View>
                    ) : null}
                  </Card>
                </Pressable>
              </Link>
            );
          }}
        />
      )}
    </Screen>
  );
}
