#!/bin/bash
# Generates hermes.framework.dSYM for App Store Connect (RN 0.71 + pre-built Hermes).
set -euo pipefail

if [[ "${CONFIGURATION:-}" != "Release" ]]; then
  exit 0
fi

if [[ -z "${DWARF_DSYM_FOLDER_PATH:-}" ]]; then
  echo "note: DWARF_DSYM_FOLDER_PATH not set; skipping Hermes dSYM"
  exit 0
fi

HERMES_BIN=""
for candidate in \
  "${TARGET_BUILD_DIR}/${FRAMEWORKS_FOLDER_PATH}/hermes.framework/hermes" \
  "${PODS_ROOT}/hermes-engine/destroot/Library/Frameworks/universal/hermes.xcframework/ios-arm64/hermes.framework/hermes" \
  "${PODS_XCFRAMEWORKS_BUILD_DIR}/hermes-engine/Pre-built/hermes.framework/hermes"
do
  if [[ -f "${candidate}" ]]; then
    HERMES_BIN="${candidate}"
    break
  fi
done

if [[ -z "${HERMES_BIN}" ]]; then
  echo "warning: Hermes binary not found; archive may warn about missing hermes.framework dSYM"
  exit 0
fi

DSYM_DEST="${DWARF_DSYM_FOLDER_PATH}/hermes.framework.dSYM"
echo "Generating Hermes dSYM from ${HERMES_BIN}"
rm -rf "${DSYM_DEST}"
/usr/bin/dsymutil "${HERMES_BIN}" -o "${DSYM_DEST}"
echo "Hermes dSYM created at ${DSYM_DEST}"
