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
#
# What it does:
#   1. sanity-checks the gateway
#   2. logs in as the seeded klijent via the gateway and issues ONE
#      fresh verification code (actionKind=limit_change). That makes
#      the Verifikacija screen's "Aktivni zahtevi" section non-empty
#      (live pending poll) and writes a durable "Promena limita"
#      history row — so the smoke flow asserts real data.
#   3. runs the Maestro smoke flow.
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

echo "==> maestro test"
cd "$ROOT"
exec "$MAESTRO" test .maestro/smoke.yaml
