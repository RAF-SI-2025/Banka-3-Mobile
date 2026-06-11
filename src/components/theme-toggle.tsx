// Three-way theme switch (Svetla / Tamna / Sistem) — a small segmented
// control bound to the persisted theme store. Dropped on Početna.
import { Pressable, Text, View } from "react-native";

import { useThemeStore, type ThemeMode } from "@/lib/theme/store";

const OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: "light", label: "Svetla" },
  { mode: "dark", label: "Tamna" },
  { mode: "system", label: "Sistem" },
];

export function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <View>
      <Text className="text-slate-500 dark:text-slate-400 text-sm mb-2">
        Tema
      </Text>
      <View className="flex-row rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden">
        {OPTIONS.map((opt, i) => {
          const active = mode === opt.mode;
          return (
            <Pressable
              key={opt.mode}
              className={`flex-1 py-2.5 items-center ${
                active ? "bg-sky-600" : "bg-transparent active:bg-slate-100 dark:active:bg-slate-800"
              } ${i > 0 ? "border-l border-slate-300 dark:border-slate-700" : ""}`}
              onPress={() => setMode(opt.mode)}
            >
              <Text
                className={`font-medium ${
                  active ? "text-white" : "text-slate-700 dark:text-slate-200"
                }`}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
