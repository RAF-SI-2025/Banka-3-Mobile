# Mobile E2E (Maestro + headless Android emulator)

End-to-end tests that drive the **real app in Expo Go on an Android
emulator** against a **live backend**. This exercises the native RN
runtime (expo-secure-store, AppState focus, FlatList, the axios refresh
flow) — higher fidelity than an RN-web/browser harness.

No app code is touched: Expo Go runs the unmodified JS bundle and
Maestro flows are plain YAML test artifacts.

## Layout

| File | Purpose |
|---|---|
| `login.yaml` | Reusable, idempotent login subflow (handles the Expo Go dev overlay + an already-restored session). |
| `smoke.yaml` | Spec p.84 **core, bank-independent**: long-lived login → Početna email → Verifikacija (live code + countdown + durable history). Does not touch Računi. |
| `accounts.yaml` | Spec p.84 "Dodatno" **positive path, requires bank up**: real seeded accounts render in Računi → detail screen shows the balance card + transaction section (not the degrade state). |
| `../scripts/e2e.sh` | Runner: gateway sanity → issues one fresh verification code → asserts the bank precondition (`GET /v1/accounts`) → `maestro test` of **both** `smoke.yaml` then `accounts.yaml`. |

## One-time machine setup (all unprivileged, no root)

No Android SDK / JDK is required system-wide; everything lives under
`$HOME`. `/dev/kvm` must be present (it is here) for an accelerated
headless emulator.

```bash
# 1. JDK 17 (Temurin) + Android command-line tools
mkdir -p ~/android-tools ~/Android/Sdk
curl -L -o ~/android-tools/jdk17.tgz \
  "https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse"
tar -C ~/android-tools -xzf ~/android-tools/jdk17.tgz
curl -L -o /tmp/cmdline.zip \
  "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
unzip -q /tmp/cmdline.zip -d ~/Android/Sdk
mkdir -p ~/Android/Sdk/cmdline-tools/latest
mv ~/Android/Sdk/cmdline-tools/{bin,lib} ~/Android/Sdk/cmdline-tools/latest/

export JAVA_HOME=$(echo ~/android-tools/jdk-17*)
export ANDROID_HOME=~/Android/Sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH

# 2. SDK packages + AVD (aosp_atd = small, headless-test-optimized)
yes | sdkmanager --licenses
sdkmanager "platform-tools" "emulator" "platforms;android-34" \
           "system-images;android-34;aosp_atd;x86_64"
echo no | avdmanager create avd -n banka \
  -k "system-images;android-34;aosp_atd;x86_64" -d pixel_5 --force

# 3. Maestro (release artifact, JDK 17 on PATH)
curl -L -o /tmp/maestro.zip \
  https://github.com/mobile-dev-inc/maestro/releases/latest/download/maestro.zip
mkdir -p ~/.maestro-dist && unzip -q /tmp/maestro.zip -d ~/.maestro-dist
```

## Per-run

```bash
source ~/android-tools/env.sh        # JAVA_HOME + ANDROID_HOME + PATH

# 1. boot the emulator headless (KVM-accelerated, ~1 min)
emulator -avd banka -no-window -no-audio -no-boot-anim \
         -gpu swiftshader_indirect -no-snapshot -accel on &
adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 2; done

# 2. backend: the full stack must be up INCLUDING bank (accounts.yaml
#    needs it). The canonical stack is the containerized one
#    (`docker compose up` in Banka-3-Backend). Bridge it in:
adb reverse tcp:8080 tcp:8080      # in-emulator localhost:8080 → host gateway
adb reverse tcp:8090 tcp:8090      # Metro (NOT 8081 — see gotchas)

# 3. load the app in Expo Go (auto-installs the SDK-matched Expo Go)
cd Banka-3-Mobile
echo 'EXPO_PUBLIC_API_BASE_URL=http://localhost:8080/api' > .env
npx expo start --android --port 8090 &

# 4. run the suite (smoke.yaml + accounts.yaml)
MAESTRO=~/.maestro-dist/maestro/bin/maestro npm run e2e
```

## Notes / gotchas

- **Black screenshots are expected.** The `aosp_atd` image uses
  software GL (swiftshader); `adb screencap` is a black frame. Maestro
  drives the **accessibility tree**, not pixels, so flows work fine —
  `takeScreenshot` artifacts will just be black.
- **Metro must not use `:8081`.** With the containerized backend
  stack, the user service's published probe port is mapped to host
  `:8081`, so Metro collides there. Run Expo on `:8090` (per the
  recipe above) and `adb reverse tcp:8090`. (The old `PROBE_PORT`
  workaround only applied to a host-binary user service, not the
  container — the published port mapping is what collides now.)
- Expo Go persists the secure-store session across runs; `login.yaml`
  is conditional so re-runs that are already authenticated still pass.
- **The bank service must be up.** `accounts.yaml` asserts the real
  Računi render; `e2e.sh` fails fast with a clear message (via
  `GET /v1/accounts`) if bank is absent. `smoke.yaml` itself is
  bank-independent (it never opens Računi), so a quick core-only
  check is still `maestro test .maestro/smoke.yaml`.
- `aosp_atd` has no Google Play; Expo Go needs none.
