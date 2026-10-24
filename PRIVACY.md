# Privacy policy — Anki Quick Add

*Last updated: 2026-10-24 (version 2.0)*

Anki Quick Add is a browser extension that looks up words you select on web pages and saves flashcards to the Anki application on your own computer. It has no server, no account, no analytics and no advertising.

## What the extension handles

| Data | Where it goes | Why |
|---|---|---|
| The word or phrase you double-click or select, and its sentence | Stays in your browser; sent to the services below only as described | To show the translation |
| Card content (word, answer, sentence, page title and address) and audio | **Anki on your computer** via AnkiConnect (`http://127.0.0.1:8765`) | To create the flashcard you asked for |
| The word, phrase or sentence to be read aloud | Google Translate text-to-speech (`translate.google.com`) | Pronunciation audio |
| A word or phrase that is not in the offline dictionary | Google Translate (`translate.googleapis.com`), Oxford Learner's Dictionaries (`www.oxfordlearnersdictionaries.com`) | Translation and definitions |
| The word whose collocations you request | ozdic.com | Collocations |
| Dictionaries you import, your scripts and custom CSS | IndexedDB / `chrome.storage.local` on your device; never sent anywhere | Your own dictionaries and lookups |
| Requests made by **your own** lookup scripts | Only the sites you list with `// @host` and allow | Whatever your script requests (usually the word) |
| Your settings (on/off, deck, tags, note type and field mapping, list of disabled sites) | `chrome.storage.sync` (your Chrome profile; synced by Chrome if you use Chrome sync) | Remember your settings |
| Error log (and, if you turn on "Record detailed logs", lookups and Anki requests) | `chrome.storage.local` on your device; never sent anywhere | Troubleshooting |

Requests to online services carry only the text needed for the lookup, without cookies. When you click 🔊 inside the lookup bubble, the audio is loaded by the web page, so the browser may include that page's origin (Referer) in the request to Google. These services have their own privacy policies.

## What the extension does not do

- It does not collect, sell or share personal data, browsing history or page contents.
- It only reads the text around the word you pick (double-click, selection or hotkey), and it does nothing on sites you have disabled.
- It does not load remote code. User scripts are code you write yourself; they run in a sandbox and can only reach the sites you allow.

## Contact

Open an issue on the project's GitHub repository.
