# HelioPop — Android Play Store build (Android Studio)

## App identity (must match Play Console)

| Field | Value |
|--------|--------|
| App name | HelioPop |
| Package name | `com.gameapplication` |
| Version | `1.0.0` (versionCode `1`) |

When creating the app in Play Console, use package name **`com.gameapplication`** exactly.

---

## One-time: upload keystore

Google Play requires a **signed Android App Bundle (AAB)**, not a debug build.

### Option A — Script (terminal)

```bash
cd android
chmod +x scripts/generate-upload-keystore.sh
./scripts/generate-upload-keystore.sh
```

This creates `app/heliopop-upload.keystore` and `keystore.properties`.

### Option B — Android Studio wizard

1. Open **`android/`** in Android Studio (File → Open → select the `android` folder).
2. **Build → Generate Signed App Bundle / APK…**
3. Choose **Android App Bundle**.
4. **Create new…** keystore → save as `android/app/heliopop-upload.keystore`, alias `heliopop-upload`.
5. Copy passwords to `android/keystore.properties` (see `keystore.properties.example`).

**Back up** the keystore and passwords. If you lose them, you cannot update the app on Play.

---

## Build from Android Studio

1. Install **Node** dependencies at project root: `npm install`
2. Open **`android/`** in Android Studio and wait for **Gradle sync** to finish.
3. **Build → Generate Signed App Bundle / APK…**
4. Select **Android App Bundle** → **release** → your upload keystore.
5. Output AAB (typical path):

   `android/app/build/outputs/bundle/release/app-release.aab`

Upload that file in Play Console → **Release** → **Production** (or testing track).

### Alternative: Gradle task

With `android/keystore.properties` in place:

```bash
cd android
./gradlew bundleRelease
```

Same AAB path as above.

---

## Play Console checklist (policy)

Complete these in Play Console (not in code):

| Item | Where |
|------|--------|
| Privacy policy URL | App content → Privacy policy |
| App category | Store settings → App category → **Game** / **Casual** |
| Ads declaration | App content → Ads → **Yes** (AdMob rewarded ads) |
| Data safety | App content → Data safety (device storage, ads, Wi‑Fi for 2‑player) |
| Content rating | App content → Content rating questionnaire |
| Target audience | App content → Target audience (if ads + kids, follow Families policy) |

Privacy policy file: `docs/privacy-policy.html` (host on GitHub Pages, then paste URL).

---

## Before each new upload

In `android/app/build.gradle`, increase:

- `versionCode` — integer, must be **higher** than the last upload (e.g. `2`, `3`, …)
- `versionName` — user-visible string (e.g. `"1.0.1"`)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| **Incompatible Gradle JVM** | Use **Gradle 8.10** (included) with **Java 17 or 21** (Android Studio **jbr-21** is fine). Sync again after opening the `android/` folder. |
| Gradle sync failed | Set SDK path: Android Studio → SDK Manager; ensure API 35 installed |
| `keystore.properties` not found | Copy `keystore.properties.example` → `keystore.properties` and fill in |
| Metro / JS bundle missing in release | From project root run `npm start` once, or let Gradle bundle JS during `bundleRelease` |
| **`createBundleReleaseJsAndAssets` — cannot start `node`** | Android Studio does not see Homebrew `node`. The project auto-detects common paths; or add to `android/local.properties`: `node.binary=/opt/homebrew/opt/node@22/bin/node` (run `which node` in Terminal). Or set env `NODE_BINARY` before building. |
| Wrong package on Play | Package `com.gameapplication` is fixed after first upload |

---

## What was configured in this project

- Release signing via `keystore.properties`
- Play-oriented manifest (AdMob app ID, `AD_ID` permission)
- Network security (HTTPS by default; limited cleartext for localhost)
- App Bundle settings for release
- React Native **0.76.9**, Gradle **8.10**, `minSdk` **24**, `targetSdk` **35**
- No Flipper (smaller debug builds)
