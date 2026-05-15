import { FlatList, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { getPendingVerifications } from "@/lib/api/verification";
import { keys } from "@/lib/query-keys";
import { formatDateTime } from "@/lib/format";
import { Card, LoadingState, MessageState, Screen, Title } from "@/components/ui";

// Spec p.84 "Aktivnost" + "Verifikacija" — the mandatory core. Poll-
// first (no push infra): refetch the pending list on an interval while
// the screen is mounted. Spec Option 1 — we display the 6-digit code;
// the client types it back on the web app.
//
// NOTE: GET /v1/verification/pending is the additive P0 backend
// endpoint and is not implemented yet, so this currently resolves to
// the empty state (or an error card if the gateway 404s).
export default function VerifikacijaScreen() {
  const { data, isLoading, isError } = useQuery({
    queryKey: keys.verification.pending(),
    queryFn: getPendingVerifications,
    refetchInterval: 5000,
    retry: false,
  });

  if (isLoading) return <LoadingState />;

  if (isError) {
    return (
      <Screen>
        <Title>Verifikacija</Title>
        <MessageState message="Trenutno nije moguće učitati zahteve za verifikaciju." />
      </Screen>
    );
  }

  const pending = data ?? [];

  return (
    <Screen>
      <Title>Verifikacija</Title>
      {pending.length === 0 ? (
        <MessageState message="Nema zahteva koji čekaju potvrdu." />
      ) : (
        <FlatList
          data={pending}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card>
              <Text className="text-slate-500 text-sm">{item.action}</Text>
              <Text className="text-3xl font-bold tracking-widest text-slate-900 my-2">
                {item.code}
              </Text>
              <View className="flex-row justify-between">
                <Text className="text-slate-500 text-xs">
                  Ističe: {formatDateTime(item.expiresAt)}
                </Text>
                <Text className="text-slate-500 text-xs">
                  Preostalo pokušaja: {item.attemptsRemaining}
                </Text>
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
