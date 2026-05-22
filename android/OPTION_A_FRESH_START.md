# Option A — Fresh Play start (HelioPop)

## 1. New upload keystore (done on this Mac)

| Item | Value |
|------|--------|
| File | `android/app/heliopop-upload.keystore` |
| Alias | `heliopop-upload` |
| Config | `android/keystore.properties` (passwords — **back up**, gitignored) |
| SHA1 | `78:64:E9:17:78:79:1D:1D:F4:04:01:71:26:0F:8B:7F:8F:95:04:78` |

**Back up now:** copy `heliopop-upload.keystore` and save passwords from `keystore.properties` in a password manager.

```bash
cp android/app/heliopop-upload.keystore ~/Documents/heliopop-upload-backup.keystore
```

---

## 2. Play Console — remove old listing

You must use a **new** Play app entry so Google does not still expect the old `EC:24:33:...` key.

1. Open [Google Play Console](https://play.google.com/console).
2. Select the **HelioPop** app that shows the signing error.
3. If the app is **only in draft / internal test** and **never in Production**:
   - **Setup** → **Advanced settings** → **Delete app** (wording may vary), **or**
   - Create a **new** app and use package `com.gameapplication` only after the old app is deleted.
4. **Create app** → name **HelioPop** → package **`com.gameapplication`** (must match `android/app/build.gradle`).

Do **not** upload any AAB until step 3 is done.

---

## 3. Build signed AAB

```bash
cd android
chmod +x scripts/verify-play-signing.sh
./scripts/verify-play-signing.sh
./gradlew bundleRelease
```

Upload this file:

`android/app/build/outputs/bundle/release/app-release.aab`

---

## 4. First upload on the new listing

1. **Testing** → **Internal testing** → **Create new release**.
2. Upload `app-release.aab` only (not old `app-release 2.aab` or HP.jks builds).
3. Complete store listing, privacy policy, ads, data safety, content rating.

The **first** successful upload registers SHA1 `78:64:E9:...` as your upload key for this listing.

---

## 5. Every future release

- Sign only with `heliopop-upload.keystore` (via `keystore.properties`).
- Increase `versionCode` in `android/app/build.gradle` before each upload.
- Run `./scripts/verify-play-signing.sh` before uploading.
