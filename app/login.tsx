import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { loginWithCredentials } from "@/lib/auth/session";
import { apiError } from "@/lib/api/error";
import { Button, Screen, Title } from "@/components/ui";

// Spec p.84: identical to the web login (email + lozinka). Login only on
// first open / after logout — there is no session interval, so there is
// no "remember me" toggle; the stored refresh token is long-lived.
const schema = z.object({
  email: z.string().min(1, "Unesite email.").email("Neispravan email."),
  password: z.string().min(1, "Unesite lozinku."),
});
type FormValues = z.infer<typeof schema>;

export default function LoginScreen() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await loginWithCredentials(values.email.trim(), values.password);
      router.replace("/(app)");
    } catch (err) {
      setServerError(apiError(err, "Prijava nije uspela."));
    }
  });

  return (
    <Screen>
      <View className="flex-1 justify-center">
        <Title>Banka 3</Title>
        <Text className="text-slate-500 mb-6">Prijava na nalog</Text>

        <Field label="Email" error={errors.email?.message}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border border-slate-300 rounded-xl px-4 py-3 bg-white"
                placeholder="ime@primer.rs"
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
              />
            )}
          />
        </Field>

        <Field label="Lozinka" error={errors.password?.message}>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border border-slate-300 rounded-xl px-4 py-3 bg-white"
                placeholder="••••••••"
                secureTextEntry
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
              />
            )}
          />
        </Field>

        {serverError ? (
          <Text className="text-red-600 mb-3">{serverError}</Text>
        ) : null}

        <Button
          label="Prijavi se"
          loading={isSubmitting}
          onPress={onSubmit}
        />
      </View>
    </Screen>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-4">
      <Text className="text-slate-700 mb-1 font-medium">{label}</Text>
      {children}
      {error ? <Text className="text-red-600 mt-1 text-sm">{error}</Text> : null}
    </View>
  );
}
