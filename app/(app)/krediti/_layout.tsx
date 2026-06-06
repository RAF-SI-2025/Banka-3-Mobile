import { Stack } from "expo-router";

export default function KreditiLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: "#f8fafc" } }}>
      <Stack.Screen name="index" options={{ title: "Krediti" }} />
      <Stack.Screen name="[id]" options={{ title: "Detalji kredita" }} />
    </Stack>
  );
}
