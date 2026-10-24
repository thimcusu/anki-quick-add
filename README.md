# Anki Quick Add (EN ⇄ VI)

Chrome extension: double-click a word on any page.

- **English word** → Vietnamese meanings, IPA, English word forms (noun / verb / adj / adverb, with IPA and audio), technical meanings.
- **Not in the offline dictionary?** → falls back to the **Oxford Learner's Dictionary** online (IPA, real-voice audio, CEFR level, definitions, examples, related forms) with Vietnamese translations from Google Translate. The bubble shows the source as "Oxford".
- **Several English words** (drag-select 2–8 words, or select + hotkey) → the phrase from the offline dictionary, otherwise Google Translate.
- **Vietnamese word** → English options → pick one → same English view.
- **Collocations** → common combinations from [ozdic.com](https://ozdic.com) (e.g. *access* → *free access*, *speak* → *speak briefly*). Pick one: it becomes the card front and ozdic's example becomes the sentence.
- **+ Anki** → card editor: Front, **Answer** (short Vietnamese, prefilled), sentence editor (bold / italic / underline / **highlight**) → **Save to Anki**.

Cards go to the deck chosen in settings (default `Web`), note type **`EN-VI Vocab`** (created automatically on the first save; its look is in `src/shared/note-model.ts`), with your tags (default `anki-web`) plus `needs-fill`.

### The card

- **Front:** word, IPA, part of speech, word audio, a **type-in box for the Vietnamese answer** (drawn by Anki while studying — not in Browse → Preview), the sentence (quoted, word highlighted) with the article link right under it, the other word forms with dictionary examples.
- **Back:** your typed answer compared with the correct one, the Answer, the sentence with its audio and the link, Explanation, all meanings, the other word forms with a ▶ each, technical meanings.
- Audio is downloaded into Anki before the note is added (word: Oxford's recording when available, otherwise Google's voice).
- Light and dark mode follow Anki's night mode. Bump `MODEL_VERSION` in `note-model.ts` after changing templates/CSS — the extension updates the note type in Anki on the next save.

## Settings

- **Toolbar icon → popup:** Enabled, **On <this site>** (switch the extension off for the current site), Mouse (double-click) on/off, Deck (list from Anki), Tags (comma-separated).
- **Blocklist:** the extension does nothing on listed sites. Defaults: `git.example.com`, `rancher.example.com`, `db.example.org`. Edit the full list on the options page (one per line): `example.com` (and its subdomains), `*.example.com` (subdomains only), `example.com/path`, a full URL, or `host:port`.
- **Hotkey:** ⌥ Option + A on macOS, Alt + A on Windows/Linux — works on the selected word, or the word under the mouse. With Mouse off, this is the only trigger.
- **chrome://extensions → Details → Extension options:** the same settings plus the **blocklist editor**, **Inspect mode** and the **Logs** viewer (errors are always logged; Inspect mode logs every lookup and Anki request).

Ask Claude "fill my new words" to add the explanation and level.

## Versions

Releases are git tags (`v1.0.0`, …) on `main`; see [CHANGELOG.md](CHANGELOG.md). The dictionary data (`data/`, `resources/`) is not in git.

## Install / update

1. `npm install` (once), then `npm run build`.
2. Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → choose the **`dist/`** folder.
3. After code changes: `npm run build`, then click ↻ on the extension card and reload your tabs.

Anki must be open with the AnkiConnect add-on. The first save asks you (in Anki) to allow the extension.

## Scripts

| Command | What it does |
|---|---|
| `npm run build` | Bundle `src/**/*.ts` → `dist/*.js` (esbuild), copy manifest, copy `data/dict` → `dist/dict` if missing |
| `npm run build:data` | Same, but always re-copy the dictionary data |
| `npm run watch` | Rebuild on save |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint (typescript-eslint strict + security rules) |
| `npm test` | Unit tests (sanitizer, validation, lemmatizer, collocations) |
| `npm run security` | `npm audit` + lint |
| `npm run check` | typecheck + lint + tests |

## Layout

```
src/
  shared/      types, HTML escaping/sanitizing, message validation, word-form helpers
  background/  service worker: dictionary lookups, AnkiConnect client, card builder, ozdic fetch
  content/     content script: click context, ozdic parser, UI (bubble, sentence editor, DOM helper, theme)
static/manifest.json
scripts/build.mjs
data/dict/{en,vi}/   offline dictionaries (JSON shards by first two letters)
resources/           the same dictionaries as plain text, for reference only
dist/                build output — load this folder in Chrome
```

## Card fields (note type "EN-VI Vocab")

| Field | From |
|---|---|
| Word | Front (word or collocation) |
| Audio / IPA / POS | the dictionary word (stay the same when you pick a collocation) |
| Answer | Answer box (typed on the front, shown on the back) |
| Sentence / SentenceSound | Sentence editor (highlight → `<span class="hl">`) and its `[sound:]` (back side) |
| Forms / Meanings / Technical | built from the offline dictionary (forms: the other words of the family, with IPA, example, ▶) |
| Explanation / Level | empty; Claude fills them ("fill my new words") |
| Source | page link titled with the page title (and the Vietnamese phrase/sentence when picked from a Vietnamese page) |
| Media / Data | hidden: audio references (so Check Media keeps them) and the full bubble context as JSON |

## Data sources

- English → Vietnamese: skypediacode/english-vietnamese-dictionary (CC BY-SA 4.0; from minhqnd/dictionary, Wiktionary, vntk, Hồ Ngọc Đức), Lingoes English-Vietnamese + Free English-Vietnamese, Lingoes Prodict technical dictionary.
- Word families: WordNet 3.1 derivational links (Princeton WordNet licence) + `-ly` adverbs found in the dictionary.
- Vietnamese → English: thu-tram/viet-yomitan (OVDP, Hồ Ngọc Đức, VNEDICT, Apple, Babylon, SPDict).
- Collocations: fetched live from ozdic.com when you click the button.
- Fallback for unknown words: oxfordlearnersdictionaries.com (fetched live, parsed locally) + translate.googleapis.com for Vietnamese.

See [SECURITY.md](SECURITY.md) for the security design.
