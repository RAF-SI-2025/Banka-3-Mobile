import { Stack } from "expo-router";

import { useStackHeaderOptions } from "@/lib/theme/header";

export default function KreditiLayout() {
  return (
    <Stack screenOptions={useStackHeaderOptions()}>
      <Stack.Screen name="index" options={{ title: "Krediti" }} />
      <Stack.Screen name="[id]" options={{ title: "Detalji kredita" }} />
    </Stack>
  );
}
