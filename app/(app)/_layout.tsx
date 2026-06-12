import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useColorScheme } from "nativewind";

import { useAuthStore } from "@/lib/auth/store";
import { LoadingState } from "@/components/ui";

// Build a tabBarIcon that swaps between the filled (focused) and the
// outline (inactive) Ionicons glyph. @expo/vector-icons bundles its
// fonts into the app automatically, so these render on device (the bar
// previously fell back to React Navigation's placeholder box because no
// tabBarIcon was set).
type IoniconName = keyof typeof Ionicons.glyphMap;
function tabIcon(active: IoniconName, inactive: IoniconName) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
}

// Authenticated area + the spec p.84 "Meni". The bottom tab bar carries
// the frequent items — "Verifikacija" is the one mandatory item; Računi,
// Plaćanja and Menjačnica are the chosen optional ("Dodatno") Celina-2
// scope. The less-frequent Kartice/Krediti are reachable from the
// Početna hub (href:null keeps them routable but off the bar). Gate
// redirects to /login the moment the session is cleared.
export default function AppLayout() {
  const status = useAuthStore((s) => s.status);
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === "dark";

  if (status === "loading") return <LoadingState />;
  if (status !== "authenticated") return <Redirect href="/login" />;

  const surface = dark ? "#0f172a" : "#f8fafc";
  const border = dark ? "#1e293b" : "#e2e8f0";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#0284c7",
        tabBarInactiveTintColor: dark ? "#94a3b8" : "#64748b",
        tabBarStyle: { backgroundColor: surface, borderTopColor: border },
        headerStyle: { backgroundColor: surface },
        headerTintColor: dark ? "#f1f5f9" : "#0f172a",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Početna",
          tabBarIcon: tabIcon("home", "home-outline"),
        }}
      />
      <Tabs.Screen
        name="racuni"
        options={{
          title: "Računi",
          headerShown: false,
          tabBarIcon: tabIcon("wallet", "wallet-outline"),
        }}
      />
      <Tabs.Screen
        name="placanja"
        options={{
          title: "Plaćanja",
          headerShown: false,
          tabBarIcon: tabIcon("paper-plane", "paper-plane-outline"),
        }}
      />
      <Tabs.Screen
        name="menjacnica"
        options={{
          title: "Menjačnica",
          headerShown: false,
          tabBarIcon: tabIcon("swap-horizontal", "swap-horizontal-outline"),
        }}
      />
      <Tabs.Screen
        name="verifikacija"
        options={{
          title: "Verifikacija",
          tabBarIcon: tabIcon("shield-checkmark", "shield-checkmark-outline"),
        }}
      />
      {/* Routable from the Početna hub, hidden from the tab bar. */}
      <Tabs.Screen
        name="kartice"
        options={{ title: "Kartice", headerShown: false, href: null }}
      />
      <Tabs.Screen
        name="krediti"
        options={{ title: "Krediti", headerShown: false, href: null }}
      />
    </Tabs>
  );
}
