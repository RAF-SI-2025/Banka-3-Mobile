import { Stack } from "expo-router";

import { useStackHeaderOptions } from "@/lib/theme/header";

export default function KarticeLayout() {
  return (
    <Stack screenOptions={useStackHeaderOptions()}>
      <Stack.Screen name="index" options={{ title: "Kartice" }} />
      <Stack.Screen name="[id]" options={{ title: "Detalji kartice" }} />
    </Stack>
  );
}
