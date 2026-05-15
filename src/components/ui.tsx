// Minimal shared UI primitives so screens stay DRY without pulling in a
// full RN component library. NativeWind `className` styling. Serbian
// copy lives at the call sites (project convention).
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type PressableProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <View className="flex-1 px-5 pt-2">{children}</View>
    </SafeAreaView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <Text className="text-2xl font-bold text-slate-900 mb-4">{children}</Text>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-slate-200">
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
  variant?: "primary" | "ghost";
}) {
  const base =
    variant === "primary"
      ? "bg-sky-600 active:bg-sky-700"
      : "bg-transparent border border-slate-300 active:bg-slate-100";
  const text = variant === "primary" ? "text-white" : "text-slate-700";
  return (
    <Pressable
      className={`rounded-xl py-3 items-center ${base}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : "#334155"} />
      ) : (
        <Text className={`font-semibold ${text}`}>{label}</Text>
      )}
    </Pressable>
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
      <Text className="text-center text-slate-500">{message}</Text>
    </Centered>
  );
}

export type BadgeTone = "success" | "danger" | "warning" | "info" | "neutral";

const badgeTones: Record<BadgeTone, string> = {
  success: "bg-emerald-100 text-emerald-700",
  danger: "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
  info: "bg-sky-100 text-sky-700",
  neutral: "bg-slate-100 text-slate-600",
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
