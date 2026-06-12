// Verification confirm step (spec p.11 / spec p.84). The phone is the
// second factor, so an action the user starts ON the phone needs no
// typed code: the screen self-approves the request (approveVerification)
// and this renders just the summary + Confirm/Cancel. The caller owns
// the request, the approve, and the gated mutation; this is
// presentation only.
import { Text, View } from "react-native";

import { Button, Card } from "./ui";

export function VerifyConfirm({
  summary,
  confirmLabel,
  loading,
  onConfirm,
  onCancel,
}: {
  summary: string;
  confirmLabel: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Card>
      <Text className="text-slate-500 dark:text-slate-400 text-sm">
        Potvrda na ovom uređaju
      </Text>
      <Text className="text-slate-900 dark:text-slate-100 text-base my-2">
        {summary}
      </Text>
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
