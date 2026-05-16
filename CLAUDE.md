# Banka-3-Mobile

Expo / React Native client for Banka 3. **Client-only** (spec p.84
"namenjena samo Klijentima"). Ground-up rewrite on the orphan `rewrite`
branch — old `main` is dead, same as the backend/frontend repos.

The top-level `/home/user/si/CLAUDE.md` is the architecture overview;
this file is the mobile-specific working memory.

## Scope (spec p.84)

The spec section is one page and listed under *Dodatni poeni*. Mandatory
core is **verification** (the 2FA companion for web actions, gating
spec p.11). Chosen optional extra: **view-only** account balance + tx
history. Initiating payments from the phone is explicitly out of scope.

## Stack (locked)

- **Expo SDK 55** / React 19 / RN 0.83, **Expo Router** (file-based,
  mirrors the web app's TanStack Router model)
- **NativeWind 4** + **tailwindcss 3.4** (NativeWind 4 requires TW 3.4,
  not 4) — `global.css` is the Tailwind entry, compiled by Metro
- **TanStack Query 5** — server state
- **Zustand 5** — auth/session store (readable by the non-React axios
  interceptor via `getState()`, exactly like the web app)
- **React Hook Form 7 + Zod 4** — forms
- **Axios** — transport; hand-written wrappers over **types-only**
  OpenAPI codegen (same convention as the web app)
- **expo-secure-store** (refresh token), **expo-crypto** (Idempotency
  UUID)

## Layout

```
app/                       # Expo Router file routes
├── _layout.tsx            # providers (Query, SafeArea, Gesture) + bootstrap
├── index.tsx              # auth-status redirect (splash while loading)
├── login.tsx              # email + lozinka (RHF + Zod)
└── (app)/                 # authed group — Tabs == spec p.84 "Meni"
    ├── _layout.tsx        # auth gate + Tabs
    ├── index.tsx          # Početna (identity, logout)
    ├── verifikacija.tsx   # MANDATORY core — poll-first code viewer
    └── racuni/            # view-only accounts (Stack)
        ├── index.tsx      # list (sorted by raspoloživo desc, spec p.19)
        └── [id].tsx       # balance + tx history
src/
├── lib/
│   ├── api/               # client.ts (axios+refresh), auth/accounts/
│   │   │                  #   verification wrappers, error.ts
│   │   └── generated/     # OpenAPI types (checked in, types-only)
│   ├── auth/              # store (Zustand), storage (secure-store),
│   │                      #   session (login/bootstrap/signOut)
│   ├── query-keys.ts      # key factory
│   └── format.ts          # Serbian money/date formatting
└── components/ui.tsx      # shared primitives (NativeWind)
```

## Auth — the key divergence from web

Web keeps the refresh token in an httpOnly cookie. RN has no cookie
jar, so mobile holds a **long-lived refresh token in the OS secure
store** and sends it in the refresh body. The backend **already
supports this** — `v1LoginResponse.refreshToken` /
`v1RefreshRequest{refreshToken}` exist (the web app just opts for the
cookie path). The backend P0 work is **DONE** (2026-05-15):

1. Long-lived refresh-token lifetime for mobile logins
   (`longLivedSession:true` → `JWT_MOBILE_REFRESH_TTL` ~1y, token
   in the response body, not a cookie).
2. `GET /api/v1/verification/pending` (active codes) **and**
   `GET /api/v1/verification/history` (durable request history,
   spec p.84) — both live and wired into the Verifikacija screen.

Cold start: `bootstrapSession()` → no stored token → `/login`; else
hit `/auth/me`, the 401 interceptor silently refreshes (rotating the
stored token), identity is filled from the response.

## Conventions

- **TypeScript strict** (+ `noUncheckedIndexedAccess`). No `any`
  outside `src/lib/api/generated/`. Axios errors go through
  `apiError(err, fallback)`.
- **Verification endpoints are hand-typed.** They live in gateway
  handlers OUTSIDE the proto/grpc-gateway surface, so they never
  appear in `banka.swagger.json` — same as the web app's
  `verification.ts`.
- **Spec Option 1**: the phone displays the 6-digit code; the user
  types it back on the web app. Poll-first (`refetchInterval`), no
  push infra — Expo Push is a possible later upgrade.
- **Strings are Serbian**, written inline at call sites.
- **Money/dates** via `src/lib/format.ts`: `180.000,00 RSD` (amount
  then currency), dates `DD.MM.YYYY`.
- **Idempotency-Key** (UUID) on every mutating request — axios request
  interceptor, like the web app.
- `legacy-peer-deps=true` in `.npmrc` is required (Expo devtools'
  react-dom peer graph). Don't remove it.

## Commands

```
npm run api:gen     # regen src/lib/api/generated from
                    #   ../Banka-3-Backend/gen/openapi/banka.swagger.json
                    #   (run `make proto` in the backend first)
npm run typecheck   # tsc --noEmit
npm run doctor      # expo-doctor
npm start           # expo start (needs a device/emulator/Expo Go)
npm run web         # expo start --web (quick preview, no device)
npm run build:android  # local APK for a real device (see below)
```

`.env` (copy from `.env.example`) sets `EXPO_PUBLIC_API_BASE_URL` —
the gateway REST base. It is **baked into the JS bundle at build
time**, not read at runtime. For dev/emulator use `localhost`
(`adb reverse`) or `http://10.0.2.2:8080/api`; for a real-device
build it MUST be a LAN-reachable / deployed gateway (the build
script refuses a loopback base unless `ALLOW_LOCALHOST=1`).

## Device build (Android only)

iOS is **out of scope** — it needs macOS + Xcode + an Apple
Developer account, none of which exist here. Android only.

This is a managed / Continuous-Native-Generation app: there is no
tracked `android/` (or `ios/`) project. `npm run build:android`
(`scripts/build-android.sh`) runs `expo prebuild` to generate the
native project from `app.json` (identifiers are already set:
`rs.raf.banka3.mobile`), provisions exactly the SDK packages the
generated project needs, and runs Gradle. The generated `android/`
is gitignored — ephemeral build output, never hand-edit or commit.

- **No Expo cloud / EAS / account** — deliberate, matches the
  project's Docker-only, no-external-services stance. (`expo prebuild`
  also rewrites the `android`/`ios` package.json scripts to
  `expo run:*`; those are intentionally kept as `expo start --*`
  for the Expo Go dev/E2E workflow — revert them if prebuild flips
  them again.)
- **Debug is the default** (`VARIANT=debug`, no keystore) — fine for
  sideloading via `adb install -r`. `VARIANT=release` needs a signing
  config + keystore (keystores are gitignored; never commit one).
- **The API-base gotcha is the one that bites**: it is embedded at
  build time, so a `localhost` build is dead on a real phone. Pass
  `EXPO_PUBLIC_API_BASE_URL=http://<lan-or-deployed>:8080/api`.
- Toolchain (JDK 17 + Android SDK) is discovered the same way as
  `scripts/e2e.sh` (`~/android-tools`, `~/Android/Sdk`).

## Status (2026-05-16)

P0 backend DONE (long-lived mobile refresh, body refresh token,
`GET /verification/pending`). **Verification core complete + spec
p.84 conformant**: the Verifikacija screen shows active codes (live
mm:ss countdown) AND the durable request history marked
successful/unsuccessful — the spec mandates the history, not just
live codes. Backed by a new `"user".verification_events` table +
internal user RPCs + a gateway `RecordingVerifier` decorator +
`GET /api/v1/verification/history` (stale-pending → "expired"
projected gateway-side). Početna now shows email (spec p.84
"username/email"); `AuthIdentity.email` filled from `/auth/me`
(login response has none). Device-readiness polish landed:
pull-to-refresh on all list screens, AppState→`focusManager` +
`refetchOnWindowFocus:true` (RN needs the bridge or focus refetch
is dead). `tsc` clean.

**Device E2E (2026-05-15):** validated on a headless Android
emulator (Expo Go, SDK 55, live backend) via Maestro — see
`.maestro/README.md` + `npm run e2e`. The on-device run caught and
fixed a **critical login bug**: `loginWithCredentials` compared the
gateway's lowercase wire `userKind` ("client") to the generated
proto enum (`USER_KIND_CLIENT`) and rejected *every* login. The
auth endpoints are hand-written in the gateway and bypass swagger —
trust the handler's wire contract, not the codegen, for `/auth/*`.
Final smoke: 26/0 (login → Početna email → Verifikacija live
code+countdown+history → Računi graceful-degrade).

**All committed and pushed** to `origin/rewrite` (the prior "NOT
committed/pushed" note is stale — git is the source of truth).

**View-only accounts live-validated 2026-05-16** against the full
containerized stack with the bank service up — the last un-validated
path. The Maestro suite is now split so neither flow is fragile to
stack composition: `smoke.yaml` is the bank-independent spec p.84
core (it no longer touches Računi), and `accounts.yaml` asserts the
**positive** Računi render (real seeded accounts → detail with
balance + transaction section). `scripts/e2e.sh` runs both and
fails fast (`GET /v1/accounts`) if bank is down. So the chosen spec
p.84 scope is code-complete, pushed, and fully live-validated.

Push notifications were evaluated and **dropped** (2026-05-16):
remote push needs an SDK 53+ dev build + FCM, regressing the
deliberate Expo-Go / Docker-only sim property for a non-spec bonus.
