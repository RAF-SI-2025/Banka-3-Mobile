// Minimal shared UI primitives so screens stay DRY without pulling in a
// full RN component library. NativeWind `className` styling. Serbian
// copy lives at the call sites (project convention).
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top", "bottom"]}>
      <View className="flex-1 px-5 pt-2">{children}</View>
    </SafeAreaView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">{children}</Text>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 border border-slate-200 dark:border-slate-800">
      {children}
    </View>
  );
}

export function Button({
  label,
  loading,
  variant = "primary",
  ...rest
}: PressableProps & {
  label: string;
  loading?: boolean;
  variant?: "primary" | "ghost" | "danger";
}) {
  const base =
    variant === "primary"
      ? "bg-sky-600 active:bg-sky-700"
      : variant === "danger"
        ? "bg-red-600 active:bg-red-700"
        : "bg-transparent border border-slate-300 dark:border-slate-700 active:bg-slate-100 dark:active:bg-slate-800";
  const text = variant === "ghost" ? "text-slate-700 dark:text-slate-200" : "text-white";
  return (
    <Pressable
      className={`rounded-xl py-3 items-center ${base}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === "ghost" ? "#334155" : "#fff"} />
      ) : (
        <Text className={`font-semibold ${text}`}>{label}</Text>
      )}
    </Pressable>
  );
}

// Labeled text input. `hint` renders small helper/validation copy under
// the field (red when `error`). Forwards all TextInput props.
export function Field({
  label,
  hint,
  error,
  ...rest
}: TextInputProps & {
  label: string;
  hint?: string;
  error?: boolean;
}) {
  return (
    <View className="mb-3">
      <Text className="text-slate-700 dark:text-slate-200 mb-1 font-medium">{label}</Text>
      <TextInput
        className={`border rounded-xl px-4 py-3 bg-white dark:bg-slate-900 ${
          error ? "border-red-400" : "border-slate-300 dark:border-slate-700"
        }`}
        placeholderTextColor="#94a3b8"
        {...rest}
      />
      {hint ? (
        <Text
          className={`text-xs mt-1 ${error ? "text-red-600" : "text-slate-400 dark:text-slate-500"}`}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function Centered({ children }: { children: ReactNode }) {
  return (
    <View className="flex-1 items-center justify-center px-8">{children}</View>
  );
}

export function LoadingState() {
  return (
    <Centered>
      <ActivityIndicator size="large" color="#0284c7" />
    </Centered>
  );
}

export function MessageState({ message }: { message: string }) {
  return (
    <Centered>
      <Text className="text-center text-slate-500 dark:text-slate-400">{message}</Text>
    </Centered>
  );
}

export type BadgeTone = "success" | "danger" | "warning" | "info" | "neutral";

const badgeTones: Record<BadgeTone, string> = {
  success: "bg-emerald-100 text-emerald-700",
  danger: "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
  info: "bg-sky-100 text-sky-700",
  neutral: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
};

export function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: BadgeTone;
}) {
  const cls = badgeTones[tone];
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${cls}`}>
      <Text className={`text-xs font-semibold ${cls}`}>{label}</Text>
    </View>
  );
}
