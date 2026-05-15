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
| `smoke.yaml` | Spec p.84 core: long-lived login → Početna email → Verifikacija (live code + countdown + durable history) → Računi graceful-degrade. |
| `../scripts/e2e.sh` | Runner: gateway sanity → issues one fresh verification code for the seeded klijent → `maestro test smoke.yaml`. |

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
export JAVA_HOME=$(echo ~/android-tools/jdk-17*)
export ANDROID_HOME=~/Android/Sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH

# 1. boot the emulator headless (KVM-accelerated, ~1 min)
emulator -avd banka -no-window -no-audio -no-boot-anim \
         -gpu swiftshader_indirect -no-snapshot -accel on &
adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 2; done

# 2. backend (host stack — see Banka-3-Backend; tools image is blocked
#    here so run binaries on the host) then bridge it into the emulator
adb reverse tcp:8080 tcp:8080      # in-emulator localhost:8080 → host gateway
adb reverse tcp:8081 tcp:8081      # Metro

# 3. load the app in Expo Go (auto-installs the SDK-matched Expo Go)
cd Banka-3-Mobile
echo 'EXPO_PUBLIC_API_BASE_URL=http://localhost:8080/api' > .env
npx expo start --android --port 8081 &

# 4. run the suite
MAESTRO=~/.maestro-dist/maestro/bin/maestro npm run e2e
```

## Notes / gotchas

- **Black screenshots are expected.** The `aosp_atd` image uses
  software GL (swiftshader); `adb screencap` is a black frame. Maestro
  drives the **accessibility tree**, not pixels, so flows work fine —
  `takeScreenshot` artifacts will just be black.
- The user-service health probe defaults to `:8081`, which collides
  with Metro. Run the user service with `PROBE_PORT=8091` (or similar)
  when validating with Expo on `:8081`.
- Expo Go persists the secure-store session across runs; `login.yaml`
  is conditional so re-runs that are already authenticated still pass.
- Bank service is optional for this smoke — `Računi` asserts the
  graceful "cannot load / no accounts" state, so the suite is green
  with only postgres+redis+user+gateway up.
- `aosp_atd` has no Google Play; Expo Go needs none.
