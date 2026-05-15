// Query-key factory. Screens use these instead of hand-written string
// arrays so cache invalidation can target key prefixes (mirrors the web
// app's src/lib/query-keys.ts convention).
export const keys = {
  auth: {
    me: () => ["auth", "me"] as const,
  },
  accounts: {
    all: () => ["accounts"] as const,
    list: () => ["accounts", "list"] as const,
    detail: (id: string) => ["accounts", "detail", id] as const,
    transactions: (id: string) => ["accounts", id, "transactions"] as const,
  },
  verification: {
    // Poll-first verification viewer (spec p.84 / spec p.11). The
    // GET /verification/pending endpoint is the P0 backend addition.
    pending: () => ["verification", "pending"] as const,
  },
} as const;
