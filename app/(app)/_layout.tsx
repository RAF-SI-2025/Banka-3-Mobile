import { Redirect, Tabs } from "expo-router";

import { useAuthStore } from "@/lib/auth/store";
import { LoadingState } from "@/components/ui";

// Authenticated area + the spec p.84 "Meni". The tab bar IS the menu:
// "Verifikacija" is the one mandatory item; "Računi" is the chosen
// optional ("Dodatno") view-only scope. Gate redirects to /login the
// moment the session is cleared (logout, or a failed silent refresh).
export default function AppLayout() {
  const status = useAuthStore((s) => s.status);

  if (status === "loading") return <LoadingState />;
  if (status !== "authenticated") return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#0284c7",
        headerStyle: { backgroundColor: "#f8fafc" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Početna" }} />
      <Tabs.Screen name="verifikacija" options={{ title: "Verifikacija" }} />
      <Tabs.Screen
        name="racuni"
        options={{ title: "Računi", headerShown: false }}
      />
    </Tabs>
  );
}
