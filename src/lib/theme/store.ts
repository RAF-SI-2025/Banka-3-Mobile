// Theme preference store. Drives NativeWind's color scheme so the user
// can force Light/Dark or follow the OS ("system"). The choice is
// persisted (AsyncStorage) so it survives restarts. Kept separate from
// the auth store — theme is a device preference, not session state.
//
// NativeWind owns the actual `dark:` variant resolution via its
// `colorScheme` API; this store is just the persisted source of truth +
// a thin setter that pushes the value into NativeWind.
import { colorScheme } from "nativewind";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";

// expo-secure-store is already a dependency (refresh token). A theme
// preference isn't a secret, but reusing it avoids adding AsyncStorage
// just for one small string.
const STORAGE_KEY = "banka.theme";

interface ThemeState {
  mode: ThemeMode;
  hydrated: boolean;
  setMode: (mode: ThemeMode) => void;
  /** Read the persisted preference and apply it. Call once at boot. */
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: "system",
  hydrated: false,
  setMode: (mode) => {
    colorScheme.set(mode);
    set({ mode });
    void SecureStore.setItemAsync(STORAGE_KEY, mode);
  },
  hydrate: async () => {
    const saved = (await SecureStore.getItemAsync(
      STORAGE_KEY,
    )) as ThemeMode | null;
    const mode: ThemeMode =
      saved === "light" || saved === "dark" || saved === "system"
        ? saved
        : "system";
    colorScheme.set(mode);
    set({ mode, hydrated: true });
  },
}));
