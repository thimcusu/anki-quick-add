# Changelog

## 2.0.2 — 2026-10-24

- Card back: the Vietnamese answer is no longer shown twice — Anki's typed-answer comparison already shows it (template v5; the note type in Anki is updated on the next save).

## 2.0.1 — 2026-10-24

- Popup: the current site is a normal **On <site>** switch, at the bottom (above "All options").
- Options: drop-downs next to a label (Hotkey, Pronunciation) have the same width.
- Services tab: clear message when the extension was updated but not reloaded ("Invalid request").

## 2.0.0 — 2026-10-24

Options page rebuilt with tabs, like Online Dictionary Helper: **Extension · Services · Scripts · Logs**.

- **Dictionaries:** import your own in the options page — Lingoes `.ld2` (text, HTML and technical styles detected), StarDict (`.ifo`/`.idx[.gz]`/`.dict[.dz]`), Yomitan `.zip`, TSV/TXT, or a `.zip` containing several (nested zips too). Stored in IndexedDB. Enable/disable and order them; the bubble shows **one section per dictionary**, and cards include every dictionary's meanings.
- **Hotkey:** ⌥A/Alt+A (default), a single Shift / Ctrl / Option(Alt) / Command key pressed alone (ODH style), or off.
- **Pronunciation:** American or British (Google voice `en-US`/`en-GB`, Oxford US/UK recordings).
- **Services:** AnkiConnect status and version, deck, **note type** — the built-in EN-VI Vocab with each card part on/off, or **your own note type** with a field mapping (guessed from field names); tags; **allow duplicates** (off by default).
- **Scripts:** system scripts on/off (Oxford, Google Translate, ozdic collocations); **user scripts in JavaScript or TypeScript** (compiled with sucrase) running in a sandboxed iframe, network only through `api.fetch` to the `// @host` sites the user allowed; Test button; example script (Free Dictionary API). **Custom CSS** for the bubble.
- Popup: link to all options.
- Card template v4 (dictionary names above meanings when several dictionaries are used).
- New permissions: `unlimitedStorage`, `offscreen`; optional host permissions (asked only for your scripts' hosts).

## 1.2.0 — 2026-10-24

- Popup: the current site is shown at the top with a one-click **Block this site** / **Unblock** button (replaces the "On <site>" switch).
- Options: "Reset to defaults" for the blocklist is now **Clear list** (there are no default blocked sites).
- Company hostnames removed from the tests and from the git history (v1.0.0 and v1.1.0 were rewritten).

## 1.1.0 — 2026-10-24

- **Turn off on this site from the bubble** (⊘ → confirm). The site is added to the blocklist; undo from the toolbar popup or the options page.
- **Dictionary build pipeline** `npm run dict` (scripts/dict/build_dict.py): sources in `dictionaries.json` (open dictionaries, downloaded on first run) plus your own files in `dictionaries.local.json` (Lingoes `.ld2`, Yomitan `.zip`, TSV). Word families from the `wordnet-db` npm package.
- **Release packaging** `npm run package`: store/GitHub zip built only from shareable dictionary sources, without source maps.
- Fresh-install defaults moved to `src/shared/defaults.ts` (deck `English`, tag `anki-quick-add`, empty blocklist). Existing settings are kept. The `needs-fill` tag is no longer added automatically — add it to *Tags* if you use it.
- Icons, `.npmrc` (public npm registry), MIT licence, privacy policy, Chrome Web Store kit (`store/`, `PUBLISHING.md`).
- README in Vietnamese (default) and English: install, Anki setup, usage, studying with Anki, custom note types, dictionaries.

## 1.0.0 — 2026-10-24

First tagged release (was 3.6.1 during development).

- Collocations: ozdic pages without a sense heading (e.g. *necessarily*) and labels with a trailing dot (`ADJ.`) are parsed.
- Multi-word selection: drag-select 2–8 English words (Mouse mode) or select + hotkey; looked up as a phrase in the offline dictionary, otherwise translated with Google Translate. Longer selections are ignored.
- Card (note type template v3): article link directly under the sentence on both sides; the word's own form is no longer repeated in *Word forms* (hidden on older cards too); a hint replaces the type-in box where Anki doesn't draw it (Browse → Preview).
- Audio for the word, every form and the sentence is downloaded by the extension and stored in Anki before the note is added.
