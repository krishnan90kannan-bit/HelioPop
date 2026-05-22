#!/usr/bin/env bash
# Verifies android/keystore.properties signs with the SHA1 Play Console expects.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROPS="$ANDROID_DIR/keystore.properties"

# From Play Console upload error (update if Play shows a new fingerprint).
# HP.jks (Documents/HP.jks, alias key0) — use after Play upload key reset is approved.
PLAY_EXPECTED_SHA1="7E:A1:5E:5D:4C:80:FA:0D:3E:32:CD:79:61:AE:6C:9E:74:AD:D3:EB"
# Play may still show this until reset completes:
PLAY_CURRENT_UPLOAD_KEY_SHA1="EC:24:33:14:46:29:71:D1:4C:B0:2B:86:D0:4D:D4:FF:EC:6F:86:B5"

if [[ ! -f "$PROPS" ]]; then
  echo "Missing $PROPS — copy keystore.properties.example and fill in your keystore."
  exit 1
fi

storeFile=$(grep '^storeFile=' "$PROPS" | cut -d= -f2-)
storePassword=$(grep '^storePassword=' "$PROPS" | cut -d= -f2-)
keyAlias=$(grep '^keyAlias=' "$PROPS" | cut -d= -f2-)

if [[ -z "$storeFile" || -z "$storePassword" || -z "$keyAlias" ]]; then
  echo "keystore.properties must set storeFile, storePassword, and keyAlias."
  exit 1
fi

if [[ "$storeFile" != /* ]]; then
  storeFile="$ANDROID_DIR/app/$storeFile"
fi

if [[ ! -f "$storeFile" ]]; then
  echo "Keystore not found: $storeFile"
  exit 1
fi

actual=$(keytool -list -v -keystore "$storeFile" -alias "$keyAlias" -storepass "$storePassword" 2>/dev/null \
  | grep 'SHA1:' | head -1 | sed 's/.*SHA1: //' | tr -d ' ')

if [[ -z "$actual" ]]; then
  echo "Could not read certificate (wrong password or alias?)."
  exit 1
fi

echo "Keystore: $storeFile"
echo "Alias:    $keyAlias"
echo "SHA1:     $actual"
echo "HP.jks (use for builds): $PLAY_EXPECTED_SHA1"
echo "Play listing (until reset): $PLAY_CURRENT_UPLOAD_KEY_SHA1"

if [[ "$actual" == "$PLAY_EXPECTED_SHA1" ]]; then
  echo "OK — HP.jks is configured. Run: cd android && ./gradlew bundleRelease"
  if [[ "$PLAY_CURRENT_UPLOAD_KEY_SHA1" != "$PLAY_EXPECTED_SHA1" ]]; then
    echo ""
    echo "Note: Play still expects EC:24:33 until upload key reset is approved."
    echo "      Submit upload_certificate.pem — see android/USE_HP_JKS_EXISTING_APP.md"
  fi
  exit 0
fi

echo ""
echo "MISMATCH — keystore.properties is not HP.jks. See android/USE_HP_JKS_EXISTING_APP.md"
exit 1
