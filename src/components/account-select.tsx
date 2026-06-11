// Shared account picker — a tap-to-expand dropdown over the client's own
// accounts, showing number · currency with the available balance as a
// subtitle. Used by menjačnica, plaćanje and prenos so the three
// money-moving screens stay consistent. Serbian copy at the call site
// (project convention) via the `placeholder` prop.
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { currencyLabel, formatMoney } from "@/lib/format";
import type { v1Account } from "@/lib/api/generated";

export function AccountSelect({
  label,
  accounts,
  selectedId,
  onSelect,
  placeholder = "— izaberite račun —",
}: {
  label: string;
  accounts: v1Account[];
  selectedId: string;
  onSelect: (id: string) => void;
  placeholder?: string;
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
            : placeholder}
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
