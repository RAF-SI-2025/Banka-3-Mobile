import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listAccounts } from "@/lib/api/accounts";
import { createTransfer } from "@/lib/api/transfers";
import {
  requestVerification,
  type IssuedVerification,
} from "@/lib/api/verification";
import { apiError } from "@/lib/api/error";
import { useAuthStore } from "@/lib/auth/store";
import { keys } from "@/lib/query-keys";
import { currencyLabel, formatMoney } from "@/lib/format";
import {
  Button,
  Field,
  LoadingState,
  MessageState,
  Screen,
} from "@/components/ui";
import { AccountSelect } from "@/components/account-select";
import { VerifyConfirm } from "@/components/verify-confirm";

const AMOUNT_RE = /^[0-9]+(\.[0-9]{1,2})?$/;

// Prenos sredstava — move between two of the client's OWN accounts of the
// same currency (spec p.24 "Interni prenos", Celina 2). Cross-currency
// conversion is the menjačnica screen's job. Verification-gated (spec
// p.11): request code → show → confirm → POST /v1/transfers with proof.
export default function PrenosScreen() {
  const userId = useAuthStore((s) => s.identity?.userId ?? "");
  const qc = useQueryClient();

  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
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
  // Destination list excludes the chosen source account.
  const toAccounts = accounts.filter((a) => a.id !== fromId);

  const amountValid = AMOUNT_RE.test(amount) && Number(amount) > 0;
  const sameAccount = !!fromId && fromId === toId;
  const diffCurrency =
    !!fromAcc && !!toAcc && fromAcc.currency !== toAcc.currency;
  const overBalance =
    amountValid &&
    !!fromAcc &&
    Number(amount) > Number(fromAcc.availableBalance ?? "0");
  const canSubmit =
    !!fromId &&
    !!toId &&
    !sameAccount &&
    !diffCurrency &&
    amountValid &&
    !overBalance;

  const transfer = useMutation({
    mutationFn: async (proof: IssuedVerification) =>
      createTransfer(
        {
          fromAccountId: fromId,
          toAccountId: toId,
          amount,
          purpose: purpose || undefined,
        },
        { id: proof.verificationId, code: proof.code },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.accounts.all() });
      router.back();
    },
    onError: (err) => setError(apiError(err, "Prenos nije uspeo.")),
  });

  const startVerify = useMutation({
    mutationFn: () => requestVerification("transfer"),
    onSuccess: (data) => {
      setError(null);
      setIssued(data);
    },
    onError: (err) =>
      setError(apiError(err, "Pokretanje verifikacije nije uspelo.")),
  });

  if (accountsQ.isLoading) return <LoadingState />;
  if (accountsQ.isError)
    return (
      <Screen>
        <MessageState message="Nije moguće učitati račune." />
      </Screen>
    );

  const cur = currencyLabel(fromAcc?.currency);

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        <AccountSelect
          label="Sa računa"
          accounts={accounts}
          selectedId={fromId}
          onSelect={(id) => {
            setFromId(id);
            if (id === toId) setToId("");
          }}
        />
        <AccountSelect
          label="Na račun"
          accounts={toAccounts}
          selectedId={toId}
          onSelect={setToId}
        />
        <Field
          label={`Iznos ${cur ? `(${cur})` : ""}`}
          placeholder="0,00"
          keyboardType="decimal-pad"
          value={amount}
          editable={!issued}
          onChangeText={(t) => setAmount(t.replace(",", "."))}
          error={overBalance}
          hint={overBalance ? "Iznos prelazi raspoloživo stanje." : undefined}
        />
        <Field
          label="Svrha (opciono)"
          placeholder="npr. Štednja"
          value={purpose}
          editable={!issued}
          onChangeText={setPurpose}
        />

        {diffCurrency ? (
          <Text className="text-amber-700 text-sm mb-3">
            Računi imaju različite valute — za konverziju koristite Menjačnicu.
          </Text>
        ) : null}
        {error ? <Text className="text-red-600 mb-3">{error}</Text> : null}

        {issued ? (
          <VerifyConfirm
            code={issued.code}
            summary={`Potvrdom prenosite ${formatMoney(amount, cur)} na ${toAcc?.number ?? ""}.`}
            confirmLabel="Potvrdi prenos"
            loading={transfer.isPending}
            onConfirm={() => transfer.mutate(issued)}
            onCancel={() => {
              setIssued(null);
              setError(null);
            }}
          />
        ) : (
          <Button
            label="Nastavi"
            loading={startVerify.isPending}
            disabled={!canSubmit}
            onPress={() => startVerify.mutate()}
          />
        )}
      </ScrollView>
    </Screen>
  );
}
