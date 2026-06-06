import { FlatList, RefreshControl, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { listRates } from "@/lib/api/rates";
import { keys } from "@/lib/query-keys";
import { currencyLabel, formatDateTime, formatRate } from "@/lib/format";
import { Card, LoadingState, MessageState, Screen } from "@/components/ui";
import { bankaExchangeV1Currency } from "@/lib/api/generated";

// Kursna lista (todoSpec mobile). Current rate list, RSD pairs only
// (the dimension a client cares about), kupovni (bid) / prodajni (ask)
// like the web app. Read-only; reuses GET /v1/exchange/rates.
export default function KursnaListaScreen() {
  const { data, isLoading, isError, isRefetching, refetch } = useQuery({
    queryKey: keys.rates.all(),
    queryFn: () => listRates(),
  });

  if (isLoading) return <LoadingState />;
  if (isError)
    return (
      <Screen>
        <MessageState message="Kursna lista trenutno nije dostupna." />
      </Screen>
    );

  const rates = (data ?? []).filter(
    (r) =>
      r.from === bankaExchangeV1Currency.CURRENCY_RSD ||
      r.to === bankaExchangeV1Currency.CURRENCY_RSD,
  );

  return (
    <Screen>
      {rates.length === 0 ? (
        <MessageState message="Kursna lista trenutno nije dostupna." />
      ) : (
        <FlatList
          data={rates}
          keyExtractor={(r, i) => `${r.from}-${r.to}-${i}`}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
            />
          }
          ListHeaderComponent={
            <View className="flex-row px-4 mb-1">
              <Text className="flex-1 text-slate-400 text-xs">Valutni par</Text>
              <Text className="w-24 text-right text-slate-400 text-xs">
                Kupovni
              </Text>
              <Text className="w-24 text-right text-slate-400 text-xs">
                Prodajni
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card>
              <View className="flex-row items-center">
                <View className="flex-1">
                  <Text className="text-slate-900 font-medium">
                    {currencyLabel(item.from)}/{currencyLabel(item.to)}
                  </Text>
                  {item.updatedAt ? (
                    <Text className="text-slate-400 text-xs mt-0.5">
                      {formatDateTime(item.updatedAt)}
                    </Text>
                  ) : null}
                </View>
                <Text className="w-24 text-right text-slate-900 font-mono">
                  {formatRate(item.bid)}
                </Text>
                <Text className="w-24 text-right text-slate-900 font-mono">
                  {formatRate(item.ask)}
                </Text>
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
