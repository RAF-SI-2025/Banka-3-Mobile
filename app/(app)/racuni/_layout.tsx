import { Stack } from "expo-router";

import { useStackHeaderOptions } from "@/lib/theme/header";

export default function RacuniLayout() {
  return (
    <Stack screenOptions={useStackHeaderOptions()}>
      <Stack.Screen name="index" options={{ title: "Računi" }} />
      <Stack.Screen name="[id]" options={{ title: "Detalji računa" }} />
    </Stack>
  );
}
