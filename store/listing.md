# Chrome Web Store listing — Anki Quick Add

Copy these into the Developer Dashboard (see PUBLISHING.md). Default language: **Vietnamese**; add **English** as a second language.

## Store listing

**Name** (from manifest): `Anki Quick Add (EN ⇄ VI)`

**Short description** (manifest `description`, max 132 characters):
`Double-click an English word (→ Vietnamese) or a Vietnamese word (→ English), edit the card and add it to Anki. Works offline.`

**Category:** Education
**Language:** Vietnamese (+ English)

### Detailed description — Tiếng Việt

```
Học từ vựng tiếng Anh ngay khi đọc: nhấp đúp vào một từ để xem nghĩa tiếng Việt, phát âm và các dạng từ, rồi lưu thành thẻ Anki chỉ với một cú nhấp.

TÍNH NĂNG
• Từ điển Anh → Việt offline: nghĩa theo từ loại, phiên âm IPA, câu ví dụ, nghĩa chuyên ngành
• Dạng từ (necessary → necessity, necessarily…) kèm phát âm và ví dụ
• Bôi đen 2–8 từ để tra cả cụm
• Từ tiếng Việt → tiếng Anh
• Collocations (cụm từ hay đi kèm) từ ozdic.com
• Từ chưa có trong từ điển: tra Oxford Learner's Dictionaries và Google Translate
• Lưu thẻ vào Anki: sửa mặt trước, đáp án, câu ví dụ (in đậm, tô sáng); âm thanh được lưu kèm thẻ
• Thẻ đẹp, có ô gõ đáp án, chế độ sáng/tối
• Thêm từ điển của bạn (Lingoes, StarDict, Yomitan, TSV) và viết script tra từ
• Dùng loại thẻ Anki của riêng bạn, tự chọn dữ liệu cho từng trường
• Tắt tiện ích trên từng trang web (trang công ty, trang chat…)

CẦN CÓ
• Anki trên máy tính (apps.ankiweb.net) và add-on AnkiConnect (mã 2055492159)

CÁCH DÙNG
1. Mở Anki.
2. Nhấp đúp vào một từ trên trang web (hoặc ⌥A / Alt+A).
3. Bấm "+ Anki" → "Save to Anki".

Mã nguồn mở, không thu thập dữ liệu: <GitHub URL>
```

### Detailed description — English

```
Learn English vocabulary while you read: double-click a word to see its Vietnamese meanings, pronunciation and word forms, then save it as an Anki card in one click.

FEATURES
• Offline English → Vietnamese dictionary: meanings by part of speech, IPA, examples, technical meanings
• Word family (necessary → necessity, necessarily…) with audio and examples
• Select 2–8 words to look up a phrase
• Vietnamese → English
• Collocations from ozdic.com
• Words missing offline: Oxford Learner's Dictionaries and Google Translate
• Save to Anki: edit the front, the answer and the sentence (bold, highlight); audio is stored with the card
• Clean cards with a type-in answer box, light and dark mode
• Import your own dictionaries (Lingoes, StarDict, Yomitan, TSV) and write lookup scripts
• Use your own Anki note type with a field mapping
• Turn the extension off on any site (work tools, chats…)

REQUIRES
• Anki desktop (apps.ankiweb.net) with the AnkiConnect add-on (code 2055492159)

HOW TO USE
1. Open Anki.
2. Double-click a word on a web page (or press ⌥A / Alt+A).
3. Click "+ Anki" → "Save to Anki".

Open source, collects no data: <GitHub URL>
```

## Graphics (in this folder)

| Asset | File | Size |
|---|---|---|
| Store icon | `../static/icons/icon-128.png` | 128×128 |
| Screenshot 1 — lookup bubble | `screenshot-1.png` | 1280×800 |
| Screenshot 2 — card editor | `screenshot-2.png` | 1280×800 |
| Screenshot 3 — Anki card front/back | `screenshot-3.png` | 1280×800 |
| Screenshot 4 — options: dictionaries | `screenshot-4.png` | 1280×800 |
| Small promo tile | `promo-440x280.png` | 440×280 |

## Privacy tab

**Single purpose:**
`Look up English and Vietnamese words selected on web pages and save them as flashcards to the user's own Anki desktop application.`

**Permission justifications:**

| Permission | Justification |
|---|---|
| `activeTab` | When the user clicks the toolbar icon, the popup reads the current tab's address to show the "On <this site>" switch. |
| `storage` | Saves the user's settings (on/off, deck, tags, disabled sites) and a local error log. |
| `tts` | Fallback pronunciation with the system voice when online audio can't play on a page. |
| `unlimitedStorage` | Dictionaries the user imports (often 100,000+ entries, tens of MB) are stored locally in IndexedDB. |
| `offscreen` | Hosts a sandboxed iframe that runs the dictionary scripts the user writes (MV3 service workers can't host iframes). |
| Optional hosts `https://*/*`, `http://*/*` | Requested only when the user saves their own lookup script, and only for the sites that script declares with `// @host`; nothing is requested otherwise. |
| Host `http://127.0.0.1:8765/*` | Talks to the AnkiConnect add-on of the user's own Anki application to list decks and add the flashcards the user saves. |
| Host `https://ozdic.com/*` | Loads collocations for a word when the user clicks "Collocations". |
| Host `https://www.oxfordlearnersdictionaries.com/*` | Looks up definitions, pronunciation and level for words missing from the offline dictionary. |
| Host `https://translate.googleapis.com/*` | Translates words and phrases missing from the offline dictionary into Vietnamese. |
| Host `https://translate.google.com/*` | Downloads pronunciation audio for the word, its forms and the sentence, which is stored with the Anki card. |
| Content script on all http/https pages | The user can double-click or select a word on any page they read; the script does nothing until then and nothing on sites the user disabled. |

**Remote code:** No, I am not using remote code. (Users can write their own dictionary scripts in the options page; they are stored locally and run in a manifest `sandbox` page with no extension API and no direct network access.)

**Data usage** — tick only:
- *Website content* — the selected word/sentence and page title/address are used to build the card the user saves (sent only to the user's own Anki, and the word to the translation services listed in the privacy policy).

Then tick all three certifications (not sold to third parties; not used for unrelated purposes; not used for creditworthiness).

**Privacy policy URL:** `https://github.com/<user>/<repo>/blob/main/PRIVACY.md`

## Distribution

- Visibility: **Public** (or *Unlisted* to share only by link with friends first).
- Regions: all.
- Price: free.
