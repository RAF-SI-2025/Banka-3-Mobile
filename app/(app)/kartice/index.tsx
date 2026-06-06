import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { listCards } from "@/lib/api/cards";
import { keys } from "@/lib/query-keys";
import { formatMoney } from "@/lib/format";
import {
  Badge,
  type BadgeTone,
  Card,
  LoadingState,
  MessageState,
  Screen,
} from "@/components/ui";
import { v1CardStatus } from "@/lib/api/generated";
import { brandLabel, statusMeta } from "@/lib/cards-meta";

// Card list (todoSpec mobile). Tapping a card opens its detail, where it
// can be blocked and its transactions viewed. Numbers come back masked
// for clients (4111********1111) — we display them as-is.
export default function KarticeScreen() {
  const { data, isLoading, isError, isRefetching, refetch } = useQuery({
    queryKey: keys.cards.list(),
    queryFn: () => listCards(),
  });

  if (isLoading) return <LoadingState />;
  if (isError)
    return (
      <Screen>
        <MessageState message="Nije moguće učitati kartice." />
      </Screen>
    );

  const cards = data ?? [];

  return (
    <Screen>
      {cards.length === 0 ? (
        <MessageState message="Nemate kartica." />
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(c, i) => c.id ?? String(i)}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
            />
          }
          renderItem={({ item }) => {
            const meta =
              statusMeta[item.status ?? v1CardStatus.CARD_STATUS_UNSPECIFIED] ??
              ({ label: "—", tone: "neutral" } as {
                label: string;
                tone: BadgeTone;
              });
            return (
              <Link href={`/(app)/kartice/${item.id}`} asChild>
                <Pressable>
                  <Card>
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1 pr-3">
                        <Text className="text-slate-900 font-semibold">
                          {item.name || "Kartica"}
                        </Text>
                        <Text className="text-slate-500 text-xs mt-0.5">
                          {brandLabel(item.brand)} · {item.number}
                        </Text>
                      </View>
                      <Badge label={meta.label} tone={meta.tone} />
                    </View>
                    {item.cardLimit ? (
                      <Text className="text-slate-400 text-xs mt-2">
                        Limit: {formatMoney(item.cardLimit)}
                      </Text>
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
