// The Anki note type used by the extension and by the Claude "anki-flashcards"
// skill. Same zinc + emerald look as the extension bubble, light and dark.
//
// Fields (all HTML, built by src/background/card.ts — keep in sync with the skill):
//   Word         front text (word or collocation)
//   IPA, POS     pronunciation and part of speech of the dictionary word
//   Audio        [sound:…] of the dictionary word (plays on the front)
//   Answer       short Vietnamese translation
//   Sentence     the example sentence; the highlighted part is <span class="hl">
//   SentenceSound  [sound:…] of the sentence (back side only)
//   Forms        the other words of the family (.forms > .form) with IPA, example and play buttons
//   Meanings     all Vietnamese meanings by part of speech, with dictionary examples
//   Technical    technical meanings (optional)
//   Explanation  simple English explanation + collocations (filled by Claude: "fill my new words")
//   Level        CEFR level, e.g. B2 (filled by Claude)
//   IsSentence   "y" for sentence cards made by Claude (Word then holds a whole sentence)
//   Source       link to the page the word came from
//   Media        [sound:…] refs for every audio file so Anki's "Check Media" keeps them (never shown)
//   Data         JSON with the full bubble context (never shown; for re-rendering / Claude)

export const MODEL_NAME = 'EN-VI Vocab';
/** Bump when templates or CSS change; the extension then updates the note type in Anki. */
export const MODEL_VERSION = 4;

export const MODEL_FIELDS = [
  'Word', 'IPA', 'POS', 'Audio', 'Answer', 'Sentence', 'SentenceSound',
  'Forms', 'Meanings', 'Technical', 'Explanation', 'Level', 'Source', 'IsSentence', 'Media', 'Data',
] as const;

// Play buttons use data-src instead of [sound:] so the back doesn't autoplay every form.
const PLAY_SCRIPT = `<script>
(function () {
  document.querySelectorAll('.snd[data-src]').forEach(function (b) {
    if (!b.getAttribute('data-src')) { b.style.display = 'none'; return; }
    b.onclick = function (e) { e.preventDefault(); e.stopPropagation(); new Audio(b.getAttribute('data-src')).play(); };
  });
})();
</script>`;

// Header without the answer: word, IPA, part of speech, level, word audio.
const HEADER = `
<div class="head">
  <div class="word{{#IsSentence}} is-sentence{{/IsSentence}}">{{Word}}</div>
  <div class="meta">{{#IPA}}<span class="ipa">{{IPA}}</span>{{/IPA}}{{#POS}}<span class="pos">{{POS}}</span>{{/POS}}{{#Level}}<span class="level">{{Level}}</span>{{/Level}}<span class="audio">{{Audio}}</span></div>
</div>`;

// Front: type the Vietnamese meaning. Back: Anki shows what you typed vs. the answer.
const TYPE_ANSWER = `{{#Answer}}<div class="type-answer">{{type:Answer}}</div>{{/Answer}}`;
const ANSWER = `{{#Answer}}<div class="answer-wrap"><div class="answer">{{Answer}}</div></div>{{/Answer}}`;

// The sentence plays on the back only (native Anki sound with replay button).
const SENTENCE_FRONT = `{{#Sentence}}<blockquote class="sentence">{{Sentence}}</blockquote>{{/Sentence}}`;
const SENTENCE_BACK = `{{#Sentence}}<blockquote class="sentence">{{Sentence}}<span class="sentence-audio">{{SentenceSound}}</span></blockquote>{{/Sentence}}`;
const SOURCE = `{{#Source}}<div class="source">{{Source}}</div>{{/Source}}`;
// Anki's previewer (Browse → Preview) and some apps don't draw the type-in box: say where it appears.
const TYPE_HINT = `<script>
(function () {
  var box = document.querySelector('.front .type-answer');
  if (box && !box.querySelector('input, #typeans')) { box.textContent = 'Type the answer while studying'; box.className += ' hint'; }
})();
</script>`;

export const FRONT = `<div class="card-body front">
${HEADER}
${TYPE_ANSWER}
${SENTENCE_FRONT}
${SOURCE}
{{#Forms}}<div class="section"><div class="label">Word forms</div>{{Forms}}</div>{{/Forms}}
</div>
${PLAY_SCRIPT}
${TYPE_HINT}`;

export const BACK = `<div class="card-body back">
${HEADER}
${TYPE_ANSWER}
${ANSWER}
${SENTENCE_BACK}
${SOURCE}
{{#Explanation}}<div class="section"><div class="label">Explanation</div><div class="explanation">{{Explanation}}</div></div>{{/Explanation}}
{{#Meanings}}<div class="section"><div class="label">Meanings</div>{{Meanings}}</div>{{/Meanings}}
{{#Forms}}<div class="section"><div class="label">Word forms</div>{{Forms}}</div>{{/Forms}}
{{#Technical}}<details class="section tech"><summary>Technical</summary>{{Technical}}</details>{{/Technical}}
</div>
${PLAY_SCRIPT}`;

export const CSS = `
.card {
  --bg: #ffffff; --surface: #f4f4f5; --text: #18181b; --muted: #71717a; --faint: #a1a1aa;
  --border: #e4e4e7; --accent: #059669; --accent-text: #047857; --accent-soft: #ecfdf5;
  font-family: ui-sans-serif, -apple-system, "Segoe UI", Inter, Helvetica, Arial, sans-serif;
  font-size: 16px; line-height: 1.5; color: var(--text); background: var(--bg); text-align: left;
}
.card.nightMode, .nightMode .card, .night_mode .card {
  --bg: #18181b; --surface: #27272a; --text: #f4f4f5; --muted: #a1a1aa; --faint: #71717a;
  --border: #3f3f46; --accent: #10b981; --accent-text: #34d399; --accent-soft: rgba(16,185,129,.14);
}
.card-body { max-width: 560px; margin: 0 auto; padding: 18px 16px 28px; }
.head { text-align: center; }
.word { font-size: 34px; font-weight: 700; letter-spacing: -.02em; line-height: 1.2; }
.meta { margin-top: 4px; display: flex; gap: 10px; justify-content: center; align-items: center; flex-wrap: wrap; }
.ipa { color: var(--muted); font-size: 18px; }
.pos { color: var(--accent-text); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
.word.is-sentence { font-size: 22px; font-weight: 600; letter-spacing: 0; line-height: 1.4; }
.level { font-size: 11px; font-weight: 600; color: var(--muted); border: 1px solid var(--border); border-radius: 6px; padding: 0 6px; }
.explanation { font-size: 15px; }
.type-answer { margin-top: 14px; text-align: center; }
.type-answer input, #typeans { width: 100%; max-width: 360px; box-sizing: border-box; font: inherit; font-size: 18px; text-align: center; padding: 8px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); color: var(--text); outline: none; }
.type-answer input:focus, #typeans:focus { border-color: var(--accent); }
.type-answer code, #typeans code { font-family: inherit; font-size: 16px; }
.typeGood { background: var(--accent-soft) !important; color: var(--accent-text) !important; }
.typeBad { background: rgba(220,38,38,.12) !important; color: #dc2626 !important; }
.typeMissed { background: rgba(161,161,170,.25) !important; }
.answer-wrap { text-align: center; }
.sentence-audio { margin-left: 6px; }
.type-answer.hint { font-size: 12px; color: var(--faint); font-style: italic; }
.answer { display: inline-block; margin-top: 12px; padding: 6px 14px; border-radius: 999px; background: var(--accent-soft); color: var(--accent-text); font-weight: 600; font-size: 18px; }
.sentence { position: relative; margin: 20px 0 0; padding: 14px 18px 14px 40px; background: var(--surface); border-radius: 12px; border: 0; font-size: 17px; line-height: 1.6; font-style: italic; }
.sentence::before { content: "“"; position: absolute; left: 12px; top: 2px; font-size: 44px; line-height: 1; color: var(--accent); font-style: normal; font-family: Georgia, serif; }
.sentence .hl, .sentence b { font-style: normal; font-weight: 700; color: var(--accent-text); }
.section { margin-top: 22px; }
.label { color: var(--accent-text); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; padding-bottom: 4px; border-bottom: 1px solid var(--border); margin-bottom: 8px; }
.forms { font-size: 14px; }
.form { padding: 5px 0; }
.form + .form { border-top: 1px dashed var(--border); }
.form .fw { font-weight: 600; }
.form .fp { color: var(--muted); font-size: 12px; margin-left: 6px; }
.form .fi { color: var(--muted); margin-left: 6px; }
.form .fx { color: var(--muted); font-style: italic; font-size: 13px; margin-top: 1px; }
/* Cards saved before 1.0.0 still list the word itself first: hide it. */
.forms .form.main { display: none; }
.forms .form.main + .form { border-top: 0; }
.meaning-group + .meaning-group { margin-top: 10px; }
.dict + .dict { margin-top: 14px; }
.dict .dn { font-size: 11px; font-weight: 600; color: var(--muted); margin-bottom: 4px; }
.meaning-group .mp { color: var(--accent-text); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
.meaning-group ul { margin: 2px 0 0; padding-left: 20px; }
.meaning-group .mx { color: var(--muted); font-style: italic; font-size: 14px; margin-left: 20px; }
.tech summary { cursor: pointer; color: var(--muted); font-size: 13px; }
.tech { font-size: 14px; color: var(--muted); }
.source { margin-top: 6px; font-size: 13px; color: var(--muted); text-align: right; }
.source a { color: var(--accent-text); text-decoration: none; border-bottom: 1px solid var(--accent-soft); }
.snd { cursor: pointer; border: 1px solid var(--border); background: var(--bg); color: var(--accent-text); border-radius: 999px; font-size: 11px; width: 24px; height: 24px; padding: 0; margin-left: 6px; vertical-align: middle; }
/* Front: only the word's own audio; form sounds are on the back. */
.front .forms .snd { display: none; }
.replay-button svg { width: 26px; height: 26px; }
.replay-button svg circle { fill: var(--accent); }
.replay-button svg path { fill: #fff; stroke: none; }
`;
