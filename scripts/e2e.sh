#!/usr/bin/env bash
# Maestro E2E runner — drives the app in Expo Go on a running Android
# emulator against a LIVE backend.
#
# This is a test harness, not app code. It does NOT modify the app.
#
# Prerequisites (see .maestro/README.md for the full one-time setup):
#   - Android emulator booted (adb sees a device)
#   - `npx expo start --android` running (app loaded in Expo Go)
#   - backend gateway reachable from the host on $GATEWAY
#   - `adb reverse tcp:8080 tcp:8080` so the in-emulator app reaches it
#   - the bank service is up (accounts.yaml asserts the real Računi
#     path — the runner fails fast below if it isn't)
#
# What it does:
#   1. sanity-checks the gateway
#   2. logs in as the seeded klijent via the gateway and issues ONE
#      fresh verification code (actionKind=limit_change). That makes
#      the Verifikacija screen's "Aktivni zahtevi" section non-empty
#      (live pending poll) and writes a durable "Promena limita"
#      history row — so the smoke flow asserts real data.
#   3. asserts the bank service is reachable (GET /v1/accounts), so
#      accounts.yaml's precondition fails fast with a clear message
#      instead of a confusing in-emulator Maestro timeout.
#   4. runs BOTH Maestro flows:
#        - smoke.yaml    — spec p.84 core, bank-independent
#        - accounts.yaml — view-only accounts POSITIVE path, bank up
#
# Env overrides:
#   GATEWAY        gateway REST base (default http://localhost:8080/api)
#   SEED_CLIENT_EMAIL / SEED_CLIENT_PASSWORD (defaults match the seed)
#   MAESTRO        path to the maestro binary (auto-detected otherwise)
#   JAVA_HOME      JDK 17+ (auto-detected from ~/android-tools otherwise)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GATEWAY="${GATEWAY:-http://localhost:8080/api}"
EMAIL="${SEED_CLIENT_EMAIL:-klijent@banka.local}"
PASSWORD="${SEED_CLIENT_PASSWORD:-Klijent123!}"

: "${JAVA_HOME:=$(find "$HOME/android-tools" -maxdepth 1 -type d -name 'jdk-17*' 2>/dev/null | head -1)}"
export JAVA_HOME
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

MAESTRO="${MAESTRO:-$(command -v maestro || find "$HOME"/.maestro* -type f -name maestro -path '*/bin/*' 2>/dev/null | head -1)}"
[ -x "$MAESTRO" ] || { echo "FATAL: maestro binary not found (set \$MAESTRO)"; exit 1; }

echo "==> gateway sanity ($GATEWAY)"
curl -fsS -m5 "$GATEWAY/v1/ping" >/dev/null || { echo "FATAL: gateway not reachable at $GATEWAY"; exit 1; }

echo "==> login $EMAIL + issue a fresh verification code"
TOKEN=$(curl -fsS -m5 -X POST "$GATEWAY/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"longLivedSession\":true}" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["accessToken"])')

curl -fsS -m5 -X POST "$GATEWAY/v1/verification/request" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"actionKind":"limit_change"}' \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("   issued code",d["code"],"id",d["verificationId"][:8])'

echo "==> bank precondition (accounts.yaml needs the bank service up)"
curl -fsS -m5 "$GATEWAY/v1/accounts" -H "Authorization: Bearer $TOKEN" \
  | python3 -c 'import sys,json; a=json.load(sys.stdin).get("accounts",[]); print("   bank up,",len(a),"accounts"); sys.exit(0 if a else 1)' \
  || { echo "FATAL: bank service unreachable or no accounts for the seeded klijent — accounts.yaml would fail. Bring the bank service up (full stack)."; exit 1; }

echo "==> maestro test: smoke.yaml (spec p.84 core, bank-independent)"
cd "$ROOT"
"$MAESTRO" test .maestro/smoke.yaml

echo "==> maestro test: accounts.yaml (view-only accounts, bank up)"
"$MAESTRO" test .maestro/accounts.yaml
