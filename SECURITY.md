# Security design

The content script runs inside every web page you visit, so the page is treated as hostile.

## Threats and mitigations

| Threat | Mitigation |
|---|---|
| A page forges double-clicks or button clicks to add cards | Handlers require `event.isTrusted`; the bubble lives in a **closed** shadow root page scripts can't reach |
| A page reads or alters the bubble (e.g. changes the card before saving) | Closed shadow root; styles via `adoptedStyleSheets`, no page CSS leaks in |
| XSS in the page through dictionary/ozdic/page text | No `innerHTML`/`outerHTML`/`insertAdjacentHTML` anywhere (enforced by ESLint + `no-unsanitized`); all text goes through `textContent` |
| Malicious HTML in ozdic.com / Oxford responses | Parsed with `DOMParser` into an inert document (scripts never run, nothing attached to the page); only `textContent` is read; response size capped, content-type checked, cookies omitted |
| HTML/script injection into Anki cards (Anki renders fields as HTML) | Background escapes every field; the sentence editor's HTML is re-sanitized in the service worker by an allowlist tokenizer (`<b> <i> <u> <br> <span data-cloze>` only, no attributes); Source links must be `http(s)` |
| Other extensions or pages sending messages to the service worker | No `externally_connectable`; listener checks `sender.id === chrome.runtime.id` and `sender.tab`; every message is validated (`src/shared/validate.ts`) with type and length limits |
| Abusing AnkiConnect through the extension | The client can only send 12 fixed actions (`version`, `modelFieldNames`, `requestPermission`, `deckNames`, `modelNames`, `createDeck`, `canAddNotesWithErrorDetail`, `addNote`, `storeMediaFile` — audio is stored before the note is added, so existing notes are never edited — and `createModel` / `updateModelTemplates` / `updateModelStyling`, only for its own `EN-VI Vocab` note type with templates compiled into the extension); no delete actions; every request has a timeout |
| Settings tampering | Settings live in `chrome.storage.sync` (not reachable by web pages) and are re-validated on every read (`normalizeSettings`): deck length-limited, tags reduced to letters/digits/`_:-.` |
| Popup/options messages from web pages | Page-only requests (`deckNames`, `ankiInfo`, `modelFieldNames`, `getLogs`, `clearLogs`, `scriptFetch`, `testScript`) are accepted only from the extension's own origin; content scripts get a separate, smaller API |
| Over-broad permissions | Only `activeTab` (popup reads the current tab's URL for the per-site switch, only when you click the icon), `storage` and `tts`; host access only to `127.0.0.1:8765` (AnkiConnect), `ozdic.com`, `www.oxfordlearnersdictionaries.com` and `translate.googleapis.com` (fallback for unknown words) and `translate.google.com` (pronunciation audio, downloaded by the extension and handed to Anki as data, size-capped); no cookies sent; content script only on http/https pages |
| Online entries sent with a card (Oxford fallback, Google-translated phrase) | Re-validated in the service worker (`isFallbackEntry`: exact shape, item/length caps; phrase entries may not carry forms or Oxford data); the audio URL must match the Oxford media URL pattern; all text escaped into fields |
| Sites where the extension must not run (company tools, chats) | Blocklist checked by the content script before any listener acts (`isBlocked`, unit-tested: host + subdomains, `*.` wildcard, path prefix, port); patterns normalized and validated on save. The bubble's ⊘ sends a `blockSite` message with **no data**: the service worker takes the site from the sender tab's real URL, so a page can't add other sites |
| Imported dictionary files (untrusted binary/JSON/HTML) | Parsed in the options page with bounds-checked readers (ZIP, Lingoes, StarDict, Yomitan, TSV) — no `eval`, no HTML rendering: markup is stripped to text with regexes; entries are length-capped and stored in IndexedDB; the bubble shows them with `textContent` and the card escapes them |
| User scripts (arbitrary code the user writes) | Run only in a **sandboxed page** (manifest `sandbox`, opaque origin, no `chrome.*` APIs) inside an offscreen document; sandbox CSP `default-src 'none'; connect-src 'none'` blocks all network, so the only way out is `api.fetch`, which the service worker serves **only** for URLs under the script's `// @host` patterns, only after the user granted that host (optional host permission requested on Save), without cookies, with redirect, size and time limits. Results are validated (`scriptEntry`: plain strings, item and length caps) and rendered as text. Scripts never see the page the user is reading |
| Custom CSS | Applied only inside the bubble's shadow root (`adoptedStyleSheets`), written only from the options page; CSS can't run code |
| Card templates | The note type's only script is a fixed play-button handler (`new Audio(data-src)`); all field content is escaped/sanitized, so no page text can become markup or script on the card |
| Code injection in extension pages | Manifest CSP `script-src 'self'; object-src 'none'; base-uri 'none'`; no `eval`/`new Function` (lint-enforced) except the one documented `new Function` in the sandbox that runs user scripts |
| Vulnerable dependencies | Dev-only dependencies, pinned versions; `npm audit` → 0 vulnerabilities. Nothing from npm ships in `dist/` except esbuild's bundle of our own code |

## Checks

```
npm run check      # strict typecheck + lint (security rules) + unit tests (sanitizer, validation)
npm run security   # npm audit + lint
```

## Known trade-offs

- Pronunciation audio uses Google Translate's TTS URL: the service worker downloads it for Anki, and the bubble's 🔊 plays it from the page (the browser may send the page's origin as Referer).
- Google Translate and Oxford endpoints are unofficial for this use and may change or rate-limit.
- Dictionary build (`npm run dict`) downloads sources over HTTPS from fixed URLs in `dictionaries.json`; review `dictionaries.local.json` entries you add.
- Collocations require network access to ozdic.com; the HTML structure of that site can change.
