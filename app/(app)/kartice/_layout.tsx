import { Stack } from "expo-router";

export default function KarticeLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: "#f8fafc" } }}>
      <Stack.Screen name="index" options={{ title: "Kartice" }} />
      <Stack.Screen name="[id]" options={{ title: "Detalji kartice" }} />
    </Stack>
  );
}
