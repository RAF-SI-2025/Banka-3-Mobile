import { FlatList, Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { listAccounts } from "@/lib/api/accounts";
import { useAuthStore } from "@/lib/auth/store";
import { keys } from "@/lib/query-keys";
import { formatMoney } from "@/lib/format";
import { Card, LoadingState, MessageState, Screen } from "@/components/ui";

// View-only account list (chosen "Dodatno", spec p.84). Sorted by
// available balance desc to match the web app / spec p.19.
export default function RacuniScreen() {
  const userId = useAuthStore((s) => s.identity?.userId ?? "");

  const { data, isLoading, isError } = useQuery({
    queryKey: keys.accounts.list(),
    queryFn: () => listAccounts(userId),
    enabled: !!userId,
  });

  if (isLoading) return <LoadingState />;
  if (isError)
    return (
      <Screen>
        <MessageState message="Nije moguće učitati račune." />
      </Screen>
    );

  const accounts = [...(data ?? [])].sort(
    (a, b) => Number(b.availableBalance ?? 0) - Number(a.availableBalance ?? 0),
  );

  return (
    <Screen>
      {accounts.length === 0 ? (
        <MessageState message="Nemate računa." />
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(a) => a.id ?? a.number ?? Math.random().toString()}
          renderItem={({ item }) => (
            <Link href={`/(app)/racuni/${item.id}`} asChild>
              <Pressable>
                <Card>
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 pr-3">
                      <Text className="text-slate-900 font-semibold">
                        {item.name || "Račun"}
                      </Text>
                      <Text className="text-slate-500 text-xs mt-0.5">
                        {item.number}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-slate-900 font-bold">
                        {formatMoney(item.availableBalance, item.currency)}
                      </Text>
                      <Text className="text-slate-400 text-xs mt-0.5">
                        Raspoloživo
                      </Text>
                    </View>
                  </View>
                </Card>
              </Pressable>
            </Link>
          )}
        />
      )}
    </Screen>
  );
}
