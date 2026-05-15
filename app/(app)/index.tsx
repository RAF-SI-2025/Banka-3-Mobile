import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";

import { useAuthStore } from "@/lib/auth/store";
import { signOut } from "@/lib/auth/session";
import { Button, Card, Screen, Title } from "@/components/ui";

// Spec p.84 "Početna stranica": basic client info (ime/prezime, email),
// logout, and the menu (the tab bar). The account/transaction overview
// is the chosen optional extra and lives under the "Računi" tab.
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
      <Title>Dobrodošli</Title>

      <Card>
        <Text className="text-slate-500 text-sm">Klijent</Text>
        <Text className="text-lg font-semibold text-slate-900">
          {fullName || "—"}
        </Text>
      </Card>

      <Card>
        <Text className="text-slate-600 leading-5">
          Mobilna aplikacija služi za potvrdu zahteva (verifikacija) i
          pregled računa. Verifikacione zahteve pokrenute na veb aplikaciji
          potvrđujete na kartici „Verifikacija“.
        </Text>
      </Card>

      <View className="flex-1 justify-end pb-4">
        <Button
          label="Odjavi se"
          variant="ghost"
          loading={signingOut}
          onPress={onSignOut}
        />
      </View>
    </Screen>
  );
}
