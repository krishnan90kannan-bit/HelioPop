#!/usr/bin/env bash
# Build iPad App Store screenshots from iPhone 6.7" captures.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-$ROOT/screenshots-6.7}"
PAD_COLOR="${PAD_COLOR:-0d1117}"  # dark letterbox (RGB hex, no #)

OUT_2048="$ROOT/screenshots-ipad-13"       # 2048 × 2732 (13" iPad Pro)
OUT_2064="$ROOT/screenshots-ipad-13-alt"   # 2064 × 2752 (accepted alternate)

mkdir -p "$OUT_2048" "$OUT_2064"

for f in "$SRC"/[0-9]*-heliopop.png; do
  [[ -f "$f" ]] || continue
  base=$(basename "$f")
  echo "→ $base"

  work=$(mktemp "${TMPDIR:-/tmp}/ipad.XXXXXX.png")
  cp "$f" "$work"

  # --- 2048 × 2732 ---
  sips -Z 2732 "$work" >/dev/null
  sips --padToHeightWidth 2732 2048 --padColor "$PAD_COLOR" "$work" >/dev/null
  cp "$work" "$OUT_2048/$base"
  sips -s format png "$OUT_2048/$base" --out "$OUT_2048/$base" >/dev/null

  # --- 2064 × 2752 ---
  cp "$f" "$work"
  sips -Z 2752 "$work" >/dev/null
  sips --padToHeightWidth 2752 2064 --padColor "$PAD_COLOR" "$work" >/dev/null
  cp "$work" "$OUT_2064/$base"
  sips -s format png "$OUT_2064/$base" --out "$OUT_2064/$base" >/dev/null

  rm -f "$work"
done

echo ""
echo "Created:"
echo "  $OUT_2048  (2048 × 2732)"
echo "  $OUT_2064  (2064 × 2752)"
file "$OUT_2048"/*.png | head -3
