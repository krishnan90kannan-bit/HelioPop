#!/usr/bin/env bash
# Exports upload_certificate.pem from keystore.properties (for Play upload key reset).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROPS="$ANDROID_DIR/keystore.properties"
OUT="$ANDROID_DIR/app/upload_certificate.pem"

if [[ ! -f "$PROPS" ]]; then
  echo "Missing $PROPS"
  exit 1
fi

storeFile=$(grep '^storeFile=' "$PROPS" | cut -d= -f2-)
storePassword=$(grep '^storePassword=' "$PROPS" | cut -d= -f2-)
keyAlias=$(grep '^keyAlias=' "$PROPS" | cut -d= -f2-)

if [[ "$storeFile" != /* ]]; then
  storeFile="$ANDROID_DIR/app/$storeFile"
fi

keytool -export -rfc \
  -keystore "$storeFile" \
  -alias "$keyAlias" \
  -file "$OUT" \
  -storepass "$storePassword"

echo "Created: $OUT"
echo "Upload this file in Play Console → Setup → App signing → Request upload key reset"
