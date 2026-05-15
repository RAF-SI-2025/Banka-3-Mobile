import { Redirect } from "expo-router";

import { useAuthStore } from "@/lib/auth/store";
import { LoadingState } from "@/components/ui";

// Entry redirect. While the cold-start refresh is in flight we hold on a
// spinner so we never flash /login for a user who has a valid stored
// session.
export default function Index() {
  const status = useAuthStore((s) => s.status);

  if (status === "loading") return <LoadingState />;
  return (
    <Redirect href={status === "authenticated" ? "/(app)" : "/login"} />
  );
}
