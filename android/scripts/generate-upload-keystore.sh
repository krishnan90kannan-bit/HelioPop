#!/usr/bin/env bash
# Creates the Play Store upload keystore (run once, keep backups forever).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
KEYSTORE="$ANDROID_DIR/app/heliopop-upload.keystore"
ALIAS="heliopop-upload"

if [[ -f "$KEYSTORE" ]]; then
  echo "Keystore already exists: $KEYSTORE"
  echo "Delete it first if you really need a new one (you cannot reuse the old one on Play)."
  exit 1
fi

echo "Create upload keystore for HelioPop (Google Play)."
echo "Use strong passwords and save them in a password manager."
echo ""

read -r -s -p "Keystore password: " STORE_PASS
echo
read -r -s -p "Confirm keystore password: " STORE_PASS2
echo
if [[ "$STORE_PASS" != "$STORE_PASS2" ]]; then
  echo "Passwords do not match."
  exit 1
fi

read -r -s -p "Key password (Enter for same as keystore): " KEY_PASS
echo
if [[ -z "$KEY_PASS" ]]; then
  KEY_PASS="$STORE_PASS"
fi

read -r -p "Your name (certificate CN): " CN
CN="${CN:-HelioPop Developer}"

keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore "$KEYSTORE" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "$STORE_PASS" \
  -keypass "$KEY_PASS" \
  -dname "CN=$CN, OU=Mobile, O=HelioPop, L=Unknown, ST=Unknown, C=US"

PROPS="$ANDROID_DIR/keystore.properties"
cat > "$PROPS" <<EOF
storeFile=heliopop-upload.keystore
storePassword=$STORE_PASS
keyAlias=$ALIAS
keyPassword=$KEY_PASS
EOF
chmod 600 "$PROPS"

echo ""
echo "Created:"
echo "  $KEYSTORE"
echo "  $PROPS"
echo ""
echo "Back up the .keystore file and passwords. Google Play cannot recover a lost upload key."
echo "Next: open the android/ folder in Android Studio and build a signed App Bundle."
