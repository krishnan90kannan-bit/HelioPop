# AdMob app-ads.txt (HelioPop)

## File content

```
google.com, pub-9178149071836882, DIRECT, f08c47fec0942fa0
```

This matches your AdMob publisher ID (`pub-9178149071836882`).

## Where it must be live

Your store URLs use GitHub Pages:

| File | Public URL |
|------|------------|
| `docs/app-ads.txt` | https://krishnan90kannan-bit.github.io/HelioPop/app-ads.txt |

After you push to GitHub, open that URL in a browser. You should see the single line above (plain text), not a 404.

## Play Console & App Store

The **developer website** domain/path in the stores must match where you host the file:

- If your listing website is `https://krishnan90kannan-bit.github.io/HelioPop` (or support/privacy under that path), `app-ads.txt` at `/HelioPop/app-ads.txt` is correct.
- If you only entered `krishnan90kannan-bit.github.io` without `/HelioPop`, Google may look at `https://krishnan90kannan-bit.github.io/app-ads.txt` instead — then you need a **user/org** GitHub Pages site at the account root, not only the project site.

**Recommendation:** In Google Play → **Store settings** → **Store listing contact details**, set **Website** to:

`https://krishnan90kannan-bit.github.io/HelioPop`

Use the same base URL for App Store **Marketing URL** / support if asked.

## Deploy (GitHub Pages)

1. Commit `docs/app-ads.txt` (and push to the branch GitHub Pages uses, usually `main`).
2. Repo **Settings** → **Pages** → source: **Deploy from branch** → folder **`/docs`** (if that is how privacy policy is already hosted).
3. Wait a few minutes, then verify: https://krishnan90kannan-bit.github.io/HelioPop/app-ads.txt

## AdMob verification

1. Wait **at least 24 hours** after the URL returns 200 OK.
2. AdMob → **Apps** → your app → **app-ads.txt** tab → check status.

## Repo copies

| Path | Purpose |
|------|---------|
| `docs/app-ads.txt` | Served by GitHub Pages (`/docs` folder) |
| `app-ads.txt` (repo root) | Backup copy; only used if Pages serves from repo root |
