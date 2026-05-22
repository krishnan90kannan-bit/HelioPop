# Play Store signing — existing app + HP.jks

**Do not delete the Play app.** Use **`Documents/HP.jks`** and request an **upload key reset**.

| Key | SHA1 |
|-----|------|
| Play (current upload key) | `EC:24:33:14:46:29:71:D1:4C:B0:2B:86:D0:4D:D4:FF:EC:6F:86:B5` |
| **HP.jks** (alias `key0`) | `7E:A1:5E:5D:4C:80:FA:0D:3E:32:CD:79:61:AE:6C:9E:74:AD:D3:EB` |

Full steps: **`USE_HP_JKS_EXISTING_APP.md`**

Quick commands:

```bash
cd android
./scripts/export-upload-certificate.sh   # upload .pem in Play Console
./scripts/verify-play-signing.sh
./gradlew bundleRelease
```

Upload `app-release.aab` only **after** Google approves the key reset.
