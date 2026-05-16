# Banka 3 — Mobilna aplikacija

Expo / React Native client for Banka 3. Client-only: a 2FA verification
companion for the web app, plus a view-only account/transaction
overview. See `CLAUDE.md` for architecture and conventions.

> **Differs from the other two repos.** `Banka-3-Backend` and
> `Banka-3-Frontend` are Docker + GNU Make with no host toolchain.
> This one is **host Node + Expo**: there is no Makefile or container
> path (Expo's device/emulator tooling doesn't containerize cleanly),
> so you need Node (current LTS) and `npm` on the host.

## Setup

```bash
npm install                   # keeps the repo .npmrc (legacy-peer-deps);
                              #   required for Expo's peer graph — don't strip it
cp .env.example .env          # then set EXPO_PUBLIC_API_BASE_URL (see below)
npm start                     # then scan the QR with Expo Go, or:
npm run web                   # browser preview, no device needed
```

The backend must be up **and seeded** (you log in as a seeded client) —
bring it up from the sibling repo:

```bash
# in ../Banka-3-Backend:
cp .env.example .env && make up && make seed     # gateway on :8080
```

`EXPO_PUBLIC_API_BASE_URL` points at the gateway and **ends at `/api`**
(the client appends `/v1/...`). On a physical device or emulator it
MUST be the dev machine's LAN IP, not `localhost` (the phone resolves
`localhost` to itself); the Android emulator can use
`http://10.0.2.2:8080/api`. `.env.example` documents this.

## Common tasks

| Command | What |
|---|---|
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run doctor` | `expo-doctor` |
| `npm run api:gen` | regenerate API types from the backend OpenAPI doc |
| `npm run e2e` | Maestro E2E on a headless Android emulator (see `.maestro/README.md`) |

Regenerate types after the backend's `.proto` surface changes:
`make proto` in `../Banka-3-Backend`, then `npm run api:gen` here.
