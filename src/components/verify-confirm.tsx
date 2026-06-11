// Verification confirm step (spec p.11 / spec p.84 Option 1). After the
// caller requests a code, this renders it big (the fake-QR substitute the
// web app uses) plus a summary line and Confirm/Cancel. The caller owns
// the request + the gated mutation; this is presentation only.
import { Text, View } from "react-native";

import { Button, Card } from "./ui";

export function VerifyConfirm({
  code,
  summary,
  confirmLabel,
  loading,
  onConfirm,
  onCancel,
}: {
  code: string;
  summary: string;
  confirmLabel: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Card>
      <Text className="text-slate-500 dark:text-slate-400 text-sm">Verifikacioni kod</Text>
      <Text className="text-4xl font-bold tracking-widest text-slate-900 dark:text-slate-100 my-2">
        {code}
      </Text>
      <Text className="text-slate-400 dark:text-slate-500 text-xs mb-3">{summary}</Text>
      <Button label={confirmLabel} loading={loading} onPress={onConfirm} />
      <View className="mt-2">
        <Button
          label="Odustani"
          variant="ghost"
          disabled={loading}
          onPress={onCancel}
        />
      </View>
    </Card>
  );
}
