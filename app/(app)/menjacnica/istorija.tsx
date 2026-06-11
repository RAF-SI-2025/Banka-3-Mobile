import { FlatList, RefreshControl, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { listRateHistory } from "@/lib/api/rates";
import { keys } from "@/lib/query-keys";
import { currencyLabel, formatDateTime, formatRate } from "@/lib/format";
import { Card, LoadingState, MessageState, Screen } from "@/components/ui";
import { bankaExchangeV1Currency } from "@/lib/api/generated";

// Kursna lista — zadnjih mesec dana (todoSpec mobile). Recorded bid/ask
// points for one pair over the last 30 days, newest first. Read-only;
// reuses GET /v1/exchange/rates/history (ListRateHistory). History
// accrues from the running FX feed, so a fresh stack starts empty and
// fills in over time.
const HISTORY_DAYS = 30;

function asCurrency(v: string | undefined): bankaExchangeV1Currency {
  return (v ?? "CURRENCY_UNSPECIFIED") as bankaExchangeV1Currency;
}

export default function KursnaListaIstorijaScreen() {
  const params = useLocalSearchParams<{ from?: string; to?: string }>();
  const from = asCurrency(params.from);
  const to = asCurrency(params.to);
  const valid =
    from !== bankaExchangeV1Currency.CURRENCY_UNSPECIFIED &&
    to !== bankaExchangeV1Currency.CURRENCY_UNSPECIFIED;

  const { data, isLoading, isError, isRefetching, refetch } = useQuery({
    queryKey: keys.rates.history(from, to, HISTORY_DAYS),
    queryFn: () => listRateHistory(from, to, HISTORY_DAYS),
    enabled: valid,
  });

  if (!valid)
    return (
      <Screen>
        <MessageState message="Valutni par nije prepoznat." />
      </Screen>
    );

  if (isLoading) return <LoadingState />;
  if (isError)
    return (
      <Screen>
        <MessageState message="Istorija kursa trenutno nije dostupna." />
      </Screen>
    );

  const points = data ?? [];

  return (
    <Screen>
      <Card>
        <Text className="text-slate-900 dark:text-slate-100 font-medium">
          {currencyLabel(from)}/{currencyLabel(to)}
        </Text>
        <Text className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">
          Kurs u zadnjih mesec dana
        </Text>
      </Card>

      {points.length === 0 ? (
        <MessageState message="Nema zabeleženih kurseva za izabrani period." />
      ) : (
        <FlatList
          data={points}
          keyExtractor={(p, i) => `${p.recordedAt ?? ""}-${i}`}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
            />
          }
          ListHeaderComponent={
            <View className="flex-row px-4 mb-1">
              <Text className="flex-1 text-slate-400 dark:text-slate-500 text-xs">Datum</Text>
              <Text className="w-24 text-right text-slate-400 dark:text-slate-500 text-xs">
                Kupovni
              </Text>
              <Text className="w-24 text-right text-slate-400 dark:text-slate-500 text-xs">
                Prodajni
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card>
              <View className="flex-row items-center">
                <Text className="flex-1 text-slate-700 dark:text-slate-200 text-xs">
                  {formatDateTime(item.recordedAt)}
                </Text>
                <Text className="w-24 text-right text-slate-900 dark:text-slate-100 font-mono">
                  {formatRate(item.bid)}
                </Text>
                <Text className="w-24 text-right text-slate-900 dark:text-slate-100 font-mono">
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
