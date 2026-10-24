# Publishing

Everything the Chrome Web Store and GitHub need is in this repo:

| What | Where |
|---|---|
| Store package | `npm run package` → `release/anki-quick-add-<version>.zip` (open dictionaries only, no source maps) |
| Listing texts (vi + en), category, single purpose, permission justifications, data-usage answers | [`store/listing.md`](store/listing.md) |
| Icon, screenshots (1280×800), promo tile (440×280) | `static/icons/icon-128.png`, `store/*.png` |
| Privacy policy | [`PRIVACY.md`](PRIVACY.md) — link to it on GitHub |
| Licence | [`LICENSE`](LICENSE) (MIT) |

No signing key is needed: the Chrome Web Store signs the package and assigns the extension ID. (The old `anki-quick-add.pem` is only for self-packed `.crx` files and must never be committed.)

## Release checklist (every version)

1. Update the version in **`static/manifest.json`** and **`package.json`** (same number, `X.Y.Z`).
2. Add the changes to **`CHANGELOG.md`**.
3. `npm run package` — runs typecheck/lint/tests, builds the public dictionary into `.cache/public-dict`, builds `release/dist`, zips it.
4. Smoke-test the package: `chrome://extensions` → Load unpacked → `release/dist` → double-click a word, save a card. (Remove it again afterwards; keep using your own `dist/`.)
5. Commit, then tag: `git tag -a vX.Y.Z -m "Anki Quick Add X.Y.Z"`.
6. `git push origin main --tags`.

## GitHub release

1. GitHub → repository → **Releases → Draft a new release** → choose tag `vX.Y.Z`.
2. Title `Anki Quick Add X.Y.Z`; paste the version's section of `CHANGELOG.md`.
3. Attach `release/anki-quick-add-X.Y.Z.zip` → **Publish release**.
4. Repository **About**: description = the manifest description; topics `anki`, `chrome-extension`, `vocabulary`, `vietnamese`, `english`, `flashcards`.

## Chrome Web Store — first publication

1. Register at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) with a Google account (one-time US$5 fee; 2-step verification required). Fill in the developer contact e-mail and verify it.
2. **Items → New item** → upload `release/anki-quick-add-X.Y.Z.zip`.
3. **Store listing** tab: copy from `store/listing.md` (Vietnamese as default language, then *Add language → English*). Upload the icon, the four screenshots and the promo tile. Replace `<GitHub URL>` with the repository link.
4. **Privacy** tab: single purpose, one justification per permission, "No remote code", data usage — all from `store/listing.md`. Privacy policy URL: `https://github.com/<user>/<repo>/blob/main/PRIVACY.md`.
5. **Distribution** tab: Public (or *Unlisted* to share by link first), all regions, free.
6. **Submit for review.** Reviews usually take a few days; host permissions and an all-sites content script can make it longer. Answer reviewer questions with the justifications above.
7. After approval, add the store link to both READMEs (Install → Option 1).

## Chrome Web Store — updates

Release checklist steps 1–6, then Developer Dashboard → the item → **Package → Upload new package** → `release/anki-quick-add-X.Y.Z.zip` → **Submit for review**. Users get the update automatically.

## When you ask Claude to publish

Claude can prepare and verify everything (version bump, changelog, `npm run package`, tag, release notes, listing text). The steps that need you: paying the developer fee, signing in to your Google and GitHub accounts, and confirming the final **Submit** / **Publish** clicks.

## Known review risks

- **Name:** "Anki" is a third-party name; the listing says the extension is not affiliated with Anki. If the store objects, rename to e.g. "Quick Add for Anki".
- **Online services:** Google Translate and Oxford are used through unofficial endpoints for words missing offline; they are disclosed in the privacy policy and can change without notice.
- **User scripts:** reviewers may ask about `new Function` in `sandbox.js`. Answer: it runs only code the user typed into the options page, inside a manifest sandbox page with CSP `default-src 'none'; connect-src 'none'`; nothing is downloaded.
- **Package size:** ~9 MB zipped (~31 MB unpacked) because the dictionary is bundled.
