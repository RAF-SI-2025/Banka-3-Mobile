import { Stack } from "expo-router";

export default function RacuniLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: "#f8fafc" } }}>
      <Stack.Screen name="index" options={{ title: "Računi" }} />
      <Stack.Screen name="[id]" options={{ title: "Detalji računa" }} />
    </Stack>
  );
}
