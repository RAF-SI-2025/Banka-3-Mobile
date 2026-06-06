import { useEffect, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approveVerification,
  getPendingVerifications,
  getVerificationHistory,
  type PendingVerification,
  type VerificationHistoryItem,
  type VerificationOutcome,
} from "@/lib/api/verification";
import { keys } from "@/lib/query-keys";
import { apiError } from "@/lib/api/error";
import { formatDateTime } from "@/lib/format";
import {
  Badge,
  type BadgeTone,
  Button,
  Card,
  LoadingState,
  MessageState,
  Screen,
  Title,
} from "@/components/ui";

// Spec p.84 "Stranica Verifikacija". Two parts on one screen:
//   1. Active requests (spec Option 1) — the phone shows the 6-digit
//      code with a live expiry countdown; the client types it back on
//      the web app. Polled every 5s while mounted (no push infra).
//   2. Request history — every request submitted in the client's name,
//      each marked successful/unsuccessful. Durable (user-service
//      backed), so it survives the code's 5-min Redis TTL.

const statusMeta: Record<
  VerificationOutcome,
  { label: string; tone: BadgeTone }
> = {
  success: { label: "Uspešno", tone: "success" },
  failed: { label: "Neuspešno", tone: "danger" },
  expired: { label: "Isteklo", tone: "warning" },
  pending: { label: "U toku", tone: "info" },
};

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const msLeft = new Date(expiresAt).getTime() - now;
  if (!Number.isFinite(msLeft) || msLeft <= 0) {
    return <Text className="text-red-600 text-xs font-semibold">Isteklo</Text>;
  }
  const total = Math.floor(msLeft / 1000);
  const mm = Math.floor(total / 60);
  const ss = String(total % 60).padStart(2, "0");
  return (
    <Text className="text-slate-500 text-xs">
      Ističe za {mm}:{ss}
    </Text>
  );
}

function HistoryRow({ item }: { item: VerificationHistoryItem }) {
  const meta = statusMeta[item.status] ?? statusMeta.pending;
  return (
    <Card>
      <View className="flex-row justify-between items-start">
        <View className="flex-1 pr-3">
          <Text className="text-slate-900 font-medium">{item.action}</Text>
          <Text className="text-slate-400 text-xs mt-0.5">
            {formatDateTime(item.createdAt)}
          </Text>
        </View>
        <Badge label={meta.label} tone={meta.tone} />
      </View>
    </Card>
  );
}

// ActiveRequest renders one pending verification with the quick-approve
// action (todoSpec S12). Tapping "Odobri" marks the request approved on
// the backend; the web app's poll-mode dialog then auto-proceeds with
// the gated action — the client never types the code. The fallback
// (read the code, type it on the web) stays available: the 6-digit code
// is still shown until approval.
function ActiveRequest({ item }: { item: PendingVerification }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const approve = useMutation({
    mutationFn: () => approveVerification(item.id),
    onSuccess: () => {
      setError(null);
      // Refresh so the row reflects approved=true; the web app consuming
      // it will then drop it from the pending set on a later poll.
      void qc.invalidateQueries({ queryKey: keys.verification.pending() });
    },
    onError: (err) =>
      setError(apiError(err, "Odobravanje nije uspelo. Pokušajte ponovo.")),
  });

  const approved = item.approved || approve.isSuccess;

  return (
    <Card>
      <Text className="text-slate-500 text-sm">{item.action}</Text>
      <Text className="text-4xl font-bold tracking-widest text-slate-900 my-2">
        {item.code}
      </Text>
      <View className="flex-row justify-between">
        <Countdown expiresAt={item.expiresAt} />
        <Text className="text-slate-500 text-xs">
          Preostalo pokušaja: {item.attemptsRemaining}
        </Text>
      </View>
      {approved ? (
        <View className="mt-3">
          <Badge label="Odobreno" tone="success" />
          <Text className="text-slate-500 text-xs mt-1">
            Zahtev je odobren. Nastavite na vebu — kod nije potreban.
          </Text>
        </View>
      ) : (
        <View className="mt-3">
          <Button
            label="Odobri"
            loading={approve.isPending}
            onPress={() => approve.mutate()}
          />
        </View>
      )}
      {error && <Text className="text-red-600 text-xs mt-2">{error}</Text>}
    </Card>
  );
}

export default function VerifikacijaScreen() {
  const pending = useQuery({
    queryKey: keys.verification.pending(),
    queryFn: getPendingVerifications,
    refetchInterval: 5000,
    retry: false,
  });
  const history = useQuery({
    queryKey: keys.verification.history(),
    // History only changes when a code is consumed or expires — a
    // slower cadence than the active-code poll is plenty.
    queryFn: getVerificationHistory,
    refetchInterval: 15000,
    retry: false,
  });

  if (pending.isLoading && history.isLoading) return <LoadingState />;

  const activeCodes = pending.data ?? [];
  const past = history.data ?? [];

  if (pending.isError && history.isError) {
    return (
      <Screen>
        <Title>Verifikacija</Title>
        <MessageState message="Trenutno nije moguće učitati zahteve za verifikaciju." />
      </Screen>
    );
  }

  const refreshing = pending.isRefetching || history.isRefetching;
  const onRefresh = () => {
    void pending.refetch();
    void history.refetch();
  };

  return (
    <Screen>
      <Title>Verifikacija</Title>
      <FlatList
        data={past}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View>
            {activeCodes.length > 0 && (
              <>
                <Text className="text-slate-700 font-semibold mb-2">
                  Aktivni zahtevi
                </Text>
                {activeCodes.map((item) => (
                  <ActiveRequest key={item.id} item={item} />
                ))}
              </>
            )}
            <Text className="text-slate-700 font-semibold mb-2 mt-1">
              Istorija zahteva
            </Text>
            {past.length === 0 && (
              <Text className="text-slate-500 text-sm mb-2">
                Još nema zahteva za verifikaciju.
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => <HistoryRow item={item} />}
      />
    </Screen>
  );
}
