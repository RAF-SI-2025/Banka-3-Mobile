import { Stack } from "expo-router";

import { useStackHeaderOptions } from "@/lib/theme/header";

// "Plaćanja" tab — a Stack grouping the two Celina-2 money-out actions
// (plaćanje to another account, prenos between own accounts) behind one
// menu so the bottom tab bar stays uncluttered.
export default function PlacanjaLayout() {
  return (
    <Stack screenOptions={useStackHeaderOptions()}>
      <Stack.Screen name="index" options={{ title: "Plaćanja" }} />
      <Stack.Screen name="novo" options={{ title: "Novo plaćanje" }} />
      <Stack.Screen name="prenos" options={{ title: "Prenos sredstava" }} />
    </Stack>
  );
}
