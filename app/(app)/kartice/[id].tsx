import { useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { blockCard, listCards, listCardTransactions } from "@/lib/api/cards";
import { apiError } from "@/lib/api/error";
import { keys } from "@/lib/query-keys";
import { brandLabel, statusMeta } from "@/lib/cards-meta";
import { formatDate, formatMoney } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  LoadingState,
  MessageState,
  Screen,
} from "@/components/ui";
import { v1CardStatus } from "@/lib/api/generated";

const PAGE_SIZE = 10;

// Card detail (todoSpec mobile). Shows the card + its transactions
// (the card's account ledger, paginated), and lets the client BLOCK an
// active card. Blocking is one-way here: unblocking is done in branch /
// by phone (spec), so we never offer the reverse action.
export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cardId = id ?? "";
  const qc = useQueryClient();
  const [page, setPage] = useState(0);

  // The list endpoint is the only card read (no GET /cards/{id}); we pick
  // the card out of it. Cheap, and keeps one cache for both screens.
  const cardsQ = useQuery({
    queryKey: keys.cards.list(),
    queryFn: () => listCards(),
  });
  const card = cardsQ.data?.find((c) => c.id === cardId);
  const accountId = card?.accountId ?? "";

  const txQ = useQuery({
    queryKey: keys.cards.transactions(accountId, page),
    queryFn: () => listCardTransactions(accountId, page, PAGE_SIZE),
    enabled: !!accountId,
  });

  const block = useMutation({
    mutationFn: () => blockCard(cardId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.cards.all() });
    },
    onError: (err) => {
      Alert.alert("Greška", apiError(err, "Blokiranje kartice nije uspelo."));
    },
  });

  if (cardsQ.isLoading) return <LoadingState />;
  if (cardsQ.isError || !card)
    return (
      <Screen>
        <MessageState message="Nije moguće učitati karticu." />
      </Screen>
    );

  const meta =
    statusMeta[card.status ?? v1CardStatus.CARD_STATUS_UNSPECIFIED] ??
    statusMeta[v1CardStatus.CARD_STATUS_UNSPECIFIED]!;
  const isActive = card.status === v1CardStatus.CARD_STATUS_ACTIVE;

  const transactions = [...(txQ.data?.transactions ?? [])].sort(
    (x, y) =>
      new Date(y.createdAt ?? 0).getTime() -
      new Date(x.createdAt ?? 0).getTime(),
  );
  const total = Number(txQ.data?.total ?? "0");
  const hasNext = (page + 1) * PAGE_SIZE < total;

  const confirmBlock = () => {
    Alert.alert(
      "Blokiranje kartice",
      "Da li ste sigurni? Karticu kasnije odblokirate u ekspozituri ili pozivom banke.",
      [
        { text: "Odustani", style: "cancel" },
        {
          text: "Blokiraj",
          style: "destructive",
          onPress: () => block.mutate(),
        },
      ],
    );
  };

  return (
    <Screen>
      <Card>
        <View className="flex-row justify-between items-start">
          <View className="flex-1 pr-3">
            <Text className="text-slate-900 font-semibold text-lg">
              {card.name || "Kartica"}
            </Text>
            <Text className="text-slate-500 text-sm mt-1">
              {brandLabel(card.brand)}
            </Text>
            <Text className="text-slate-500 text-sm mt-0.5">{card.number}</Text>
          </View>
          <Badge label={meta.label} tone={meta.tone} />
        </View>
        {card.cardLimit ? (
          <Text className="text-slate-400 text-xs mt-3">
            Limit: {formatMoney(card.cardLimit)}
          </Text>
        ) : null}
        {card.expiresAt ? (
          <Text className="text-slate-400 text-xs mt-0.5">
            Važi do: {formatDate(card.expiresAt)}
          </Text>
        ) : null}
      </Card>

      {isActive ? (
        <View className="mb-3">
          <Button
            label="Blokiraj karticu"
            variant="ghost"
            loading={block.isPending}
            onPress={confirmBlock}
          />
        </View>
      ) : null}

      <Text className="text-slate-700 font-semibold mb-2 mt-1">Transakcije</Text>

      {txQ.isLoading ? (
        <LoadingState />
      ) : transactions.length === 0 ? (
        <MessageState message="Nema transakcija." />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(t, i) => t.id ?? String(i)}
          refreshControl={
            <RefreshControl
              refreshing={txQ.isRefetching}
              onRefresh={() => void txQ.refetch()}
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
          ListFooterComponent={
            page > 0 || hasNext ? (
              <View className="flex-row justify-between gap-3 mt-1 mb-4">
                <View className="flex-1">
                  <Button
                    label="Prethodna"
                    variant="ghost"
                    disabled={page === 0}
                    onPress={() => setPage((p) => Math.max(0, p - 1))}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label="Sledeća"
                    variant="ghost"
                    disabled={!hasNext}
                    onPress={() => setPage((p) => p + 1)}
                  />
                </View>
              </View>
            ) : null
          }
        />
      )}
    </Screen>
  );
}
