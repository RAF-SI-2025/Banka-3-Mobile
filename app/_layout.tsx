import "../global.css";

import { useEffect } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  focusManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { bootstrapSession } from "@/lib/auth/session";

// refetchOnWindowFocus is meaningful on RN only once focusManager is
// driven by AppState (below) — TanStack Query has no DOM focus event.
// With both wired, returning to the app from the web flow refetches
// the pending verification code immediately instead of waiting out
// the 5s poll (spec p.84 Option 1: code shown here, typed on web).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: true },
  },
});

function onAppStateChange(status: AppStateStatus) {
  // No-op on web (real window-focus events already fire there).
  if (Platform.OS !== "web") {
    focusManager.setFocused(status === "active");
  }
}

export default function RootLayout() {
  // Cold-start session restore (silent refresh with the stored
  // long-lived token). The router gate keys off the resulting status.
  useEffect(() => {
    void bootstrapSession();
  }, []);

  // Bridge OS foreground/background → TanStack Query focus so polled
  // screens pause in the background (battery) and refresh on return.
  useEffect(() => {
    const sub = AppState.addEventListener("change", onAppStateChange);
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Slot />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
