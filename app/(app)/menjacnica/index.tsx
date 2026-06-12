import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link } from "expo-router";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { listAccounts } from "@/lib/api/accounts";
import { quoteExchange, executeExchange } from "@/lib/api/exchange";
import {
  approveVerification,
  requestVerification,
  type IssuedVerification,
} from "@/lib/api/verification";
import { apiError } from "@/lib/api/error";
import { useAuthStore } from "@/lib/auth/store";
import { keys } from "@/lib/query-keys";
import { currencyLabel, formatMoney, formatRate } from "@/lib/format";
import { Button, Card, LoadingState, MessageState, Screen } from "@/components/ui";
import type { v1Account } from "@/lib/api/generated";

const AMOUNT_RE = /^[0-9]+(\.[0-9]{1,2})?$/;

// Menjačnica (todoSpec mobile). Pick two own accounts of different
// currencies + an amount, see the live quote (rate, commission,
// resulting amount), then execute. Execute is a verification-gated
// CrossCurrency transfer (spec p.11): the screen requests a code, shows
// it (spec Option 1, same as the web fake-QR), the user confirms, and we
// attach the proof. The bank routes the FX via RSD internally.
export default function MenjacnicaScreen() {
  const userId = useAuthStore((s) => s.identity?.userId ?? "");
  const qc = useQueryClient();

  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [issued, setIssued] = useState<IssuedVerification | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accountsQ = useQuery({
    queryKey: keys.accounts.list(),
    queryFn: () => listAccounts(userId),
    enabled: !!userId,
  });
  const accounts = accountsQ.data ?? [];
  const fromAcc = accounts.find((a) => a.id === fromId);
  const toAcc = accounts.find((a) => a.id === toId);

  const amountValid = AMOUNT_RE.test(amount) && Number(amount) > 0;
  const sameCurrency =
    !!fromAcc && !!toAcc && fromAcc.currency === toAcc.currency;
  const quoteEnabled =
    !!fromAcc?.currency &&
    !!toAcc?.currency &&
    !sameCurrency &&
    amountValid;

  const quote = useQuery({
    queryKey: keys.exchange.quote(
      fromAcc?.currency ?? "",
      toAcc?.currency ?? "",
      amount,
    ),
    queryFn: () =>
      quoteExchange({
        from: fromAcc!.currency,
        to: toAcc!.currency,
        amount,
        includeCommission: true,
      }),
    enabled: quoteEnabled,
  });

  const exec = useMutation({
    mutationFn: async (issuedCode: IssuedVerification) => {
      return executeExchange(
        { fromAccountId: fromId, toAccountId: toId, amount },
        { id: issuedCode.verificationId, code: "" },
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.accounts.all() });
      setIssued(null);
      setAmount("");
      setError(null);
    },
    onError: (err) => setError(apiError(err, "Zamena valuta nije uspela.")),
  });

  // This device is the second factor, so it approves its own request
  // (no code to type back to itself): request → approve → submit id-only.
  const startVerify = useMutation({
    mutationFn: async () => {
      const issued = await requestVerification("transfer");
      await approveVerification(issued.verificationId);
      return issued;
    },
    onSuccess: (data) => {
      setError(null);
      setIssued(data);
    },
    onError: (err) =>
      setError(apiError(err, "Pokretanje verifikacije nije uspelo.")),
  });

  const canSubmit = quoteEnabled && !!quote.data && !quote.isFetching;

  if (accountsQ.isLoading) return <LoadingState />;
  if (accountsQ.isError)
    return (
      <Screen>
        <MessageState message="Nije moguće učitati račune." />
      </Screen>
    );

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        <AccountPicker
          label="Sa računa"
          accounts={accounts}
          selectedId={fromId}
          onSelect={setFromId}
        />
        <AccountPicker
          label="Na račun"
          accounts={accounts}
          selectedId={toId}
          onSelect={setToId}
        />

        <Text className="text-slate-700 dark:text-slate-200 mb-1 font-medium">
          Iznos {fromAcc ? `(${currencyLabel(fromAcc.currency)})` : ""}
        </Text>
        <TextInput
          className="border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 mb-3"
          placeholder="0,00"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={(t) => setAmount(t.replace(",", "."))}
          editable={!issued}
        />

        {sameCurrency ? (
          <Text className="text-amber-700 text-sm mb-3">
            Računi imaju istu valutu — za istu valutu koristite veb aplikaciju.
          </Text>
        ) : null}

        {quote.data ? (
          <Card>
            <Row label="Kurs" value={formatRate(quote.data.rate)} />
            <Row
              label="Provizija"
              value={formatMoney(
                quote.data.commission,
                currencyLabel(toAcc?.currency),
              )}
            />
            <Row
              label="Dobijate"
              value={formatMoney(
                quote.data.toAmount,
                currencyLabel(toAcc?.currency),
              )}
              strong
            />
          </Card>
        ) : null}

        {error ? <Text className="text-red-600 mb-3">{error}</Text> : null}

        {issued ? (
          <Card>
            <Text className="text-slate-500 dark:text-slate-400 text-sm">
              Potvrda na ovom uređaju
            </Text>
            <Text className="text-slate-900 dark:text-slate-100 text-base my-2">
              Potvrdom premeštate {formatMoney(amount, currencyLabel(fromAcc?.currency))} u{" "}
              {currencyLabel(toAcc?.currency)}.
            </Text>
            <Button
              label="Potvrdi zamenu"
              loading={exec.isPending}
              onPress={() => exec.mutate(issued)}
            />
            <View className="mt-2">
              <Button
                label="Odustani"
                variant="ghost"
                disabled={exec.isPending}
                onPress={() => {
                  setIssued(null);
                  setError(null);
                }}
              />
            </View>
          </Card>
        ) : (
          <Button
            label="Realizuj"
            loading={startVerify.isPending}
            disabled={!canSubmit}
            onPress={() => startVerify.mutate()}
          />
        )}

        <View className="mt-4 mb-6">
          <Link href="/(app)/menjacnica/kursna-lista" asChild>
            <Pressable>
              <Text className="text-sky-600 text-center font-medium">
                Pogledaj kursnu listu
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View className="flex-row justify-between py-0.5">
      <Text className="text-slate-500 dark:text-slate-400 text-sm">{label}</Text>
      <Text
        className={
          strong
            ? "text-slate-900 dark:text-slate-100 font-bold"
            : "text-slate-900 dark:text-slate-100 text-sm font-medium"
        }
      >
        {value}
      </Text>
    </View>
  );
}

function AccountPicker({
  label,
  accounts,
  selectedId,
  onSelect,
}: {
  label: string;
  accounts: v1Account[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(
    () => accounts.find((a) => a.id === selectedId),
    [accounts, selectedId],
  );
  return (
    <View className="mb-3">
      <Text className="text-slate-700 dark:text-slate-200 mb-1 font-medium">{label}</Text>
      <Pressable
        className="border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 bg-white dark:bg-slate-900"
        onPress={() => setOpen((o) => !o)}
      >
        <Text className={selected ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"}>
          {selected
            ? `${selected.number} · ${currencyLabel(selected.currency)}`
            : "— izaberite račun —"}
        </Text>
      </Pressable>
      {open ? (
        <View className="border border-slate-200 dark:border-slate-800 rounded-xl mt-1 bg-white dark:bg-slate-900 overflow-hidden">
          {accounts.map((a) => (
            <Pressable
              key={a.id}
              className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 active:bg-slate-50 dark:active:bg-slate-800"
              onPress={() => {
                onSelect(a.id ?? "");
                setOpen(false);
              }}
            >
              <Text className="text-slate-900 dark:text-slate-100">
                {a.number} · {currencyLabel(a.currency)}
              </Text>
              <Text className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">
                {formatMoney(a.availableBalance, currencyLabel(a.currency))}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
