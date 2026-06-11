// Dark-aware navigation header options, shared by every Stack layout so
// the header chrome tracks the theme. Returns plain options consumed by
// expo-router's <Stack screenOptions={...}>.
import { useColorScheme } from "nativewind";

export function useStackHeaderOptions() {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === "dark";
  return {
    headerStyle: { backgroundColor: dark ? "#0f172a" : "#f8fafc" },
    headerTintColor: dark ? "#f1f5f9" : "#0f172a",
  };
}
