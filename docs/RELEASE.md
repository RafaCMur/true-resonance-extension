# Release (Chrome Web Store)

## 1) Version bump

Manually update the version in:

- `manifest.json` (`"version": "X.Y.Z"`)
- `package.json` (`"version": "X.Y.Z"`)
- `CHANGELOG.md` — add a new entry at the top

Commit + push on `develop`:

```bash
git add manifest.json package.json CHANGELOG.md
git commit -m "release: vX.Y.Z"
git push origin develop
```

## 2) Release

Make sure everything is committed and pushed on `develop`, then run:

```bash
npm run release -- X.Y.Z
```

This will:

1. Validate `manifest.json` and `package.json` versions match `X.Y.Z` (hard error otherwise).
2. Warn if `CHANGELOG.md` does not mention `X.Y.Z`.
3. Abort if a dirty working tree exists (prompts to confirm).
4. Run `npm run build` (webpack).
5. Zip `dist/` → `releases/true-resonance-X.Y.Z.zip`.
6. Merge `develop` → `main` with `--no-ff`, tag `vX.Y.Z`, push `main --follow-tags`.
7. Switch back to `develop`.

## 3) Upload

Open the Chrome Web Store Developer Dashboard:

https://chrome.google.com/webstore/devconsole

Upload `releases/true-resonance-X.Y.Z.zip` as a new package for the existing listing.

## Notes

- Tag format: `vX.Y.Z` (e.g. `v2.1.6`).
- `dist/` and `releases/` are gitignored — only the zip artifact matters for upload.
- `docs/local/` planning docs are gitignored and stay local-only.
- The script uses the system `zip` CLI (no new npm dependency).
- Develop is NOT pushed by the script — only `main` and the tag.