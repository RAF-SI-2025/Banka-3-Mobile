// Typed axios-error message extractor. The gateway returns grpc-gateway
// error envelopes ({ message, code, details }) or, for hand-written
// handlers, { error: "..." }. Components/screens render the Serbian
// fallback if nothing usable is present. Keeps `any` out of app code
// (the project bans it outside generated files).
import axios from "axios";

export function apiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: unknown; error?: unknown }
      | undefined;
    if (data) {
      if (typeof data.message === "string" && data.message) return data.message;
      if (typeof data.error === "string" && data.error) return data.error;
    }
    if (err.message) return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
