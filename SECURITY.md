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
| Abusing AnkiConnect through the extension | The client can only send 10 fixed actions (`requestPermission`, `deckNames`, `modelNames`, `createDeck`, `canAddNotesWithErrorDetail`, `addNote`, `storeMediaFile` — audio is stored before the note is added, so existing notes are never edited — and `createModel` / `updateModelTemplates` / `updateModelStyling`, only for its own `EN-VI Vocab` note type with templates compiled into the extension); no delete actions; every request has a timeout |
| Settings tampering | Settings live in `chrome.storage.sync` (not reachable by web pages) and are re-validated on every read (`normalizeSettings`): deck length-limited, tags reduced to letters/digits/`_:-.` |
| Popup/options messages from web pages | Page-only requests (`deckNames`, `getLogs`, `clearLogs`) are accepted only from the extension's own origin; content scripts get a separate, smaller API |
| Over-broad permissions | Only `activeTab` (popup reads the current tab's URL for the per-site switch, only when you click the icon), `storage` and `tts`; host access only to `127.0.0.1:8765` (AnkiConnect), `ozdic.com`, `www.oxfordlearnersdictionaries.com` and `translate.googleapis.com` (fallback for unknown words) and `translate.google.com` (pronunciation audio, downloaded by the extension and handed to Anki as data, size-capped); no cookies sent; content script only on http/https pages |
| Oxford fallback data sent with a card | Re-validated in the service worker (`isFallbackEntry`: exact shape, item/length caps); the audio URL must match the Oxford media URL pattern; all text escaped into fields |
| Sites where the extension must not run (company tools, chats) | Blocklist checked by the content script before any listener acts (`isBlocked`, unit-tested: host + subdomains, `*.` wildcard, path prefix, port); patterns normalized and validated on save |
| Card templates | The note type's only script is a fixed play-button handler (`new Audio(data-src)`); all field content is escaped/sanitized, so no page text can become markup or script on the card |
| Code injection in extension pages | Manifest CSP `script-src 'self'; object-src 'none'; base-uri 'none'`; no `eval`/`new Function` (lint-enforced) |
| Vulnerable dependencies | Dev-only dependencies, pinned versions; `npm audit` → 0 vulnerabilities. Nothing from npm ships in `dist/` except esbuild's bundle of our own code |

## Checks

```
npm run check      # strict typecheck + lint (security rules) + unit tests (sanitizer, validation)
npm run security   # npm audit + lint
```

## Known trade-offs

- Pronunciation audio uses Google Translate's TTS URL; Anki downloads it, and the bubble's 🔊 plays it from the page.
- Collocations require network access to ozdic.com; the HTML structure of that site can change.
