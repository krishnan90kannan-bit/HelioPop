# iOS App Store screenshots

## Accepted sizes (portrait)

| Size | Folder | Use in App Store Connect |
|------|--------|---------------------------|
| **1284 × 2778** | `screenshots-6.7/` | **6.7" display** (iPhone 14 Pro Max, 15 Pro Max, 16 Pro Max, etc.) — **use this** |
| **1242 × 2688** | `screenshots-6.5-1242/` | Alternative accepted size (6.5" / legacy slot) |

Landscape (if needed): **2778 × 1284** or **2688 × 1242** — not generated; game is portrait-only.

## iPad (portrait)

| Size | Folder | App Store Connect |
|------|--------|-------------------|
| **2048 × 2732** | `screenshots-ipad-13/` | **13" iPad Pro** — use this |
| **2064 × 2752** | `screenshots-ipad-13-alt/` | Alternate accepted size |

Generated from iPhone screenshots (scaled to fit height, dark letterbox sides).  
Regenerate: `ios/scripts/generate-ipad-screenshots.sh`

Landscape **2732 × 2048** / **2752 × 2064** — not generated (portrait-only game).

## Upload

1. App Store Connect → your app → **App Store** tab → **Screenshots**
2. Select **6.7" Display** (or the size slot that matches your upload)
3. Upload `screenshots-6.7/01-heliopop.png` … `06-heliopop.png`

## Regenerate after UI changes

From project root (macOS):

```bash
# 6.7" — 1284 × 2778
for f in assets/store/ios/screenshots-6.7/originals-backup/*.png; do
  b=$(basename "$f")
  sips -z 2778 1284 "$f" --out "assets/store/ios/screenshots-6.7/$b"
  sips -s format png "assets/store/ios/screenshots-6.7/$b" --out "assets/store/ios/screenshots-6.7/$b"
done
```

Original captures (1290 × 2796) are in `screenshots-6.7/originals-backup/`.
