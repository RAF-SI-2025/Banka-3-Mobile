import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Link, router } from "expo-router";

import { useAuthStore } from "@/lib/auth/store";
import { signOut } from "@/lib/auth/session";
import { Button, Card, Screen, Title } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";

// Spec p.84 "Početna stranica": basic client info (ime/prezime, email),
// logout, and the menu. The bottom tab bar carries the frequent actions
// (Računi, Plaćanja, Menjačnica, Verifikacija); this hub additionally
// links the less-frequent screens (Kartice, Krediti) so the tab bar
// stays uncluttered, and hosts the theme switch.
export default function HomeScreen() {
  const identity = useAuthStore((s) => s.identity);
  const [signingOut, setSigningOut] = useState(false);

  const onSignOut = async () => {
    setSigningOut(true);
    await signOut();
    router.replace("/login");
  };

  const fullName = identity
    ? `${identity.firstName} ${identity.lastName}`.trim()
    : "—";

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Title>Dobrodošli</Title>

        <Card>
          <Text className="text-slate-500 dark:text-slate-400 text-sm">
            Klijent
          </Text>
          <Text className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {fullName || "—"}
          </Text>
          {/* Spec p.84 Početna — osnovni podaci: ime i prezime + email
              (klijent nema poseban username). */}
          <Text className="text-slate-500 dark:text-slate-400 text-sm mt-2">
            Email
          </Text>
          <Text className="text-base text-slate-900 dark:text-slate-100">
            {identity?.email || "—"}
          </Text>
        </Card>

        <Text className="text-slate-700 dark:text-slate-200 font-semibold mb-2 mt-1">
          Meni
        </Text>
        <MenuLink href="/(app)/kartice" title="Kartice" subtitle="Pregled i blokada kartica" />
        <MenuLink href="/(app)/krediti" title="Krediti" subtitle="Pregled kredita i rata" />

        <View className="mt-3 mb-4">
          <ThemeToggle />
        </View>

        <View className="pb-4">
          <Button
            label="Odjavi se"
            variant="ghost"
            loading={signingOut}
            onPress={onSignOut}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function MenuLink({
  href,
  title,
  subtitle,
}: {
  href: "/(app)/kartice" | "/(app)/krediti";
  title: string;
  subtitle: string;
}) {
  return (
    <Link href={href} asChild>
      <Pressable>
        <Card>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-slate-900 dark:text-slate-100 font-semibold text-base">
                {title}
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                {subtitle}
              </Text>
            </View>
            <Text className="text-slate-300 dark:text-slate-600 text-2xl">›</Text>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}
