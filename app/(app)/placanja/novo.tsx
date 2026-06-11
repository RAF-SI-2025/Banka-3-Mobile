import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listAccounts } from "@/lib/api/accounts";
import { createPayment } from "@/lib/api/payments";
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
const ACCOUNT_RE = /^[0-9]{18}$/;
// Spec p.21: payment code is 3 digits. Optional here — the gateway fills
// the default (289, online bezgotovinsko) when empty.
const CODE_RE = /^[0-9]{3}$/;

// Novo plaćanje — uplata to a recipient account (spec p.21 "Plaćanje",
// Celina 2). Verification-gated (spec p.11): the screen requests a code,
// shows it (spec Option 1, same as the web fake-QR dialog), the user
// confirms, and we attach the proof to POST /v1/payments.
export default function NovoPlacanjeScreen() {
  const userId = useAuthStore((s) => s.identity?.userId ?? "");
  const qc = useQueryClient();

  const [fromId, setFromId] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentCode, setPaymentCode] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
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

  const amountValid = AMOUNT_RE.test(amount) && Number(amount) > 0;
  const accountValid = ACCOUNT_RE.test(toAccount);
  const codeValid = paymentCode === "" || CODE_RE.test(paymentCode);
  const overBalance =
    amountValid &&
    !!fromAcc &&
    Number(amount) > Number(fromAcc.availableBalance ?? "0");
  const canSubmit =
    !!fromId && accountValid && amountValid && codeValid && !overBalance;

  const pay = useMutation({
    mutationFn: async (proof: IssuedVerification) =>
      createPayment(
        {
          fromAccountId: fromId,
          toAccountNumber: toAccount,
          amount,
          recipientName: recipientName || undefined,
          paymentCode: paymentCode || undefined,
          referenceNumber: referenceNumber || undefined,
          purpose: purpose || undefined,
        },
        { id: proof.verificationId, code: proof.code },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.accounts.all() });
      router.back();
    },
    onError: (err) => setError(apiError(err, "Plaćanje nije uspelo.")),
  });

  const startVerify = useMutation({
    mutationFn: () => requestVerification("payment"),
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
          onSelect={setFromId}
        />
        <Field
          label="Račun primaoca"
          placeholder="18 cifara"
          keyboardType="number-pad"
          value={toAccount}
          editable={!issued}
          onChangeText={(t) => setToAccount(t.replace(/[^0-9]/g, ""))}
          maxLength={18}
          error={toAccount.length > 0 && !accountValid}
          hint={
            toAccount.length > 0 && !accountValid
              ? "Broj računa mora imati 18 cifara."
              : undefined
          }
        />
        <Field
          label="Primalac (opciono)"
          placeholder="Ime primaoca"
          value={recipientName}
          editable={!issued}
          onChangeText={setRecipientName}
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
          label="Šifra plaćanja (opciono)"
          placeholder="289"
          keyboardType="number-pad"
          value={paymentCode}
          editable={!issued}
          onChangeText={(t) => setPaymentCode(t.replace(/[^0-9]/g, ""))}
          maxLength={3}
          error={!codeValid}
          hint={!codeValid ? "Šifra plaćanja ima 3 cifre." : undefined}
        />
        <Field
          label="Poziv na broj (opciono)"
          placeholder="npr. 97-1234"
          value={referenceNumber}
          editable={!issued}
          onChangeText={setReferenceNumber}
        />
        <Field
          label="Svrha plaćanja (opciono)"
          placeholder="npr. Računi"
          value={purpose}
          editable={!issued}
          onChangeText={setPurpose}
        />

        {error ? <Text className="text-red-600 mb-3">{error}</Text> : null}

        {issued ? (
          <VerifyConfirm
            code={issued.code}
            summary={`Potvrdom plaćate ${formatMoney(amount, cur)} na račun ${toAccount}.`}
            confirmLabel="Potvrdi plaćanje"
            loading={pay.isPending}
            onConfirm={() => pay.mutate(issued)}
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
