import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";

import { Card, Screen, Title } from "@/components/ui";

// Plaćanja menu — entry points to the two money-out flows. Both are
// verification-gated (spec p.11); the gating happens inside each form.
export default function PlacanjaMenu() {
  return (
    <Screen>
      <Title>Plaćanja</Title>
      <MenuItem
        href="/(app)/placanja/novo"
        title="Novo plaćanje"
        subtitle="Uplata na račun primaoca (drugi račun ili druga banka)"
      />
      <MenuItem
        href="/(app)/placanja/prenos"
        title="Prenos sredstava"
        subtitle="Prebacivanje između sopstvenih računa iste valute"
      />
    </Screen>
  );
}

function MenuItem({
  href,
  title,
  subtitle,
}: {
  href: "/(app)/placanja/novo" | "/(app)/placanja/prenos";
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
              <Text className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{subtitle}</Text>
            </View>
            <Text className="text-slate-300 dark:text-slate-600 text-2xl">›</Text>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}
