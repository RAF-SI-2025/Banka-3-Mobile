# Banka 3 — Mobilna aplikacija

Expo / React Native client for Banka 3. Client-only: a 2FA verification
companion for the web app, plus a view-only account/transaction
overview. See `CLAUDE.md` for architecture and conventions.

## Setup

```bash
npm install
cp .env.example .env          # set EXPO_PUBLIC_API_BASE_URL (LAN IP on a device)
npm start                     # then scan the QR with Expo Go, or:
npm run web                   # browser preview, no device needed
```

The backend gateway must be reachable at `EXPO_PUBLIC_API_BASE_URL`
(default port `:8080`, API under `/v1`). Bring it up from
`../Banka-3-Backend` (`make up`).

## Common tasks

| Command | What |
|---|---|
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run doctor` | `expo-doctor` |
| `npm run api:gen` | regenerate API types from the backend OpenAPI doc |

Regenerate types after the backend's `.proto` surface changes:
`make proto` in `../Banka-3-Backend`, then `npm run api:gen` here.
