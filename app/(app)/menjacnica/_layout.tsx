import { Stack } from "expo-router";

import { useStackHeaderOptions } from "@/lib/theme/header";

export default function MenjacnicaLayout() {
  return (
    <Stack screenOptions={useStackHeaderOptions()}>
      <Stack.Screen name="index" options={{ title: "Menjačnica" }} />
      <Stack.Screen name="kursna-lista" options={{ title: "Kursna lista" }} />
      <Stack.Screen name="istorija" options={{ title: "Istorija kursa" }} />
    </Stack>
  );
}
