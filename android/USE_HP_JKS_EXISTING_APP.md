# Use HP.jks on your existing Play app (no delete)

Play registered upload key **`EC:24:33:...`** from an earlier test upload.  
Your **`Documents/HP.jks`** uses **`7E:A1:5E:...`**.  

You keep the same Play listing; Google must **approve an upload key reset** to accept HP.jks.

---

## Step 1 — Request upload key reset (Play Console)

1. [Google Play Console](https://play.google.com/console) → your **HelioPop** app.
2. **Setup** → **App signing**.
3. Under **Upload key**, choose **Request upload key reset** (wording may vary).
4. When asked for a certificate, upload:

   **`android/app/upload_certificate.pem`**

   (Generated from HP.jks — see Step 2 if missing.)

5. Submit and wait for Google (often **1–3 days**, sometimes faster).  
   You can still use internal testing drafts; you cannot publish with HP.jks until approval.

---

## Step 2 — Certificate file (already generated from HP.jks)

If you need to regenerate:

```bash
cd android
chmod +x scripts/export-upload-certificate.sh
./scripts/export-upload-certificate.sh
```

Output: `android/app/upload_certificate.pem`

---

## Step 3 — Build with HP.jks (configured)

Signing is set in `android/keystore.properties` → `/Users/krishnan/Documents/HP.jks`, alias `key0`.

```bash
cd android
./scripts/verify-play-signing.sh
./gradlew bundleRelease
```

Upload after reset is approved:

`android/app/build/outputs/bundle/release/app-release.aab`

**Do not upload** until Play accepts HP.jks, or you will see the EC vs 7E fingerprint error again.

---

## Step 4 — After Google approves

1. Run `./scripts/verify-play-signing.sh` (should still show OK for HP.jks).
2. Upload the new `app-release.aab` to **Internal testing** (or your track).
3. Increase `versionCode` in `android/app/build.gradle` for each new upload.

---

## Summary

| Item | Value |
|------|--------|
| Keystore | `/Users/krishnan/Documents/HP.jks` |
| Alias | `key0` |
| SHA1 | `7E:A1:5E:5D:4C:80:FA:0D:3E:32:CD:79:61:AE:6C:9E:74:AD:D3:EB` |
| Play (until reset) | `EC:24:33:14:46:29:71:D1:4C:B0:2B:86:D0:4D:D4:FF:EC:6F:86:B5` |

Back up **HP.jks** and passwords. Never commit `keystore.properties`.
