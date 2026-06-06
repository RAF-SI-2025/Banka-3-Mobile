import { Stack } from "expo-router";

export default function MenjacnicaLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: "#f8fafc" } }}>
      <Stack.Screen name="index" options={{ title: "Menjačnica" }} />
      <Stack.Screen name="kursna-lista" options={{ title: "Kursna lista" }} />
      <Stack.Screen name="istorija" options={{ title: "Istorija kursa" }} />
    </Stack>
  );
}
