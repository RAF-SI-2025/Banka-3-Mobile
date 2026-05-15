import { FlatList, RefreshControl, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { getAccount, listTransactions } from "@/lib/api/accounts";
import { keys } from "@/lib/query-keys";
import { formatDate, formatMoney } from "@/lib/format";
import { Card, LoadingState, MessageState, Screen } from "@/components/ui";

// View-only account detail + transaction history (sorted newest first,
// spec p.20 transaction list). Read-only — initiating payments from the
// phone is explicitly out of the chosen scope.
export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const accountId = id ?? "";

  const account = useQuery({
    queryKey: keys.accounts.detail(accountId),
    queryFn: () => getAccount(accountId),
    enabled: !!accountId,
  });
  const tx = useQuery({
    queryKey: keys.accounts.transactions(accountId),
    queryFn: () => listTransactions(accountId),
    enabled: !!accountId,
  });

  if (account.isLoading) return <LoadingState />;
  if (account.isError || !account.data)
    return (
      <Screen>
        <MessageState message="Nije moguće učitati račun." />
      </Screen>
    );

  const a = account.data;
  const transactions = [...(tx.data?.transactions ?? [])].sort(
    (x, y) =>
      new Date(y.createdAt ?? 0).getTime() -
      new Date(x.createdAt ?? 0).getTime(),
  );

  return (
    <Screen>
      <Card>
        <Text className="text-slate-500 text-xs">{a.number}</Text>
        <Text className="text-3xl font-bold text-slate-900 mt-1">
          {formatMoney(a.availableBalance, a.currency)}
        </Text>
        <Text className="text-slate-400 text-xs mt-1">
          Ukupno stanje: {formatMoney(a.balance, a.currency)}
        </Text>
      </Card>

      <Text className="text-slate-700 font-semibold mb-2 mt-1">
        Transakcije
      </Text>

      {tx.isLoading ? (
        <LoadingState />
      ) : transactions.length === 0 ? (
        <MessageState message="Nema transakcija." />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(t, i) => t.id ?? String(i)}
          refreshControl={
            <RefreshControl
              refreshing={account.isRefetching || tx.isRefetching}
              onRefresh={() => {
                void account.refetch();
                void tx.refetch();
              }}
            />
          }
          renderItem={({ item }) => {
            const outgoing = item.fromAccountId === accountId;
            const amount = outgoing ? item.fromAmount : item.toAmount;
            return (
              <Card>
                <View className="flex-row justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-slate-900">
                      {item.purpose || item.recipientName || "Transakcija"}
                    </Text>
                    <Text className="text-slate-400 text-xs mt-0.5">
                      {formatDate(item.createdAt)}
                    </Text>
                  </View>
                  <Text
                    className={
                      outgoing
                        ? "text-red-600 font-semibold"
                        : "text-emerald-600 font-semibold"
                    }
                  >
                    {outgoing ? "-" : "+"}
                    {formatMoney(amount)}
                  </Text>
                </View>
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}
