// Turns a CardDraft (from the bubble's editor) into an Anki note: the built-in
// "EN-VI Vocab" note type (with the card sections the user switched on) or the
// user's own note type (fields filled through the field mapping).
// Every field is escaped or re-sanitized here, because the draft comes from a
// content script running inside a web page. Meanings, examples and word-form
// details are looked up again in the offline dictionary.
import type { CardDraft, DictSection, EnEntry, Result } from '../shared/types.ts';
import { escapeHtml, safeUrl, sanitizeInline, stripTags } from '../shared/html.ts';
import { containsWord, exampleContaining, POS_SHORT, uniqueLemmas } from '../shared/forms.ts';
import { BACK, CSS, FRONT, MODEL_FIELDS, MODEL_NAME, MODEL_VERSION } from '../shared/note-model.ts';
import { type CardSection, type DataKey, loadSettings, type Settings, ttsUrl } from '../shared/settings.ts';
import { anki, AnkiError, ensurePermission } from './anki.ts';
import { lookupEn } from './dictionary.ts';
import { log } from './log.ts';

const MAX_TTS_CHARS = 200;
const AUDIO_TIMEOUT_MS = 12_000;
const MAX_FORMS = 8;
const MAX_MEANINGS = 5;

type Fields = Record<(typeof MODEL_FIELDS)[number], string>;
interface FormInfo { word: string; pos: string[]; ipa: string; example: string; sound: string }
interface AudioJob { filename: string; url: string }
const OXFORD_AUDIO = /^https:\/\/www\.oxfordlearnersdictionaries\.com\/media\/english\/[a-z_]+\/[\w/.-]+\.mp3$/;

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'audio';

/** A dictionary example that really contains the word (some generated ones are misspelled). */
export function exampleFor(entry: EnEntry | null, word: string): string {
  return exampleContaining(entry?.g ?? [], word);
}

/** The other members of the word family (the card's own word is already in the header). */
export function formsHtml(forms: FormInfo[]): string {
  const others = forms.slice(1);
  if (!others.length) return '';
  return '<div class="forms">' + others.map((f) => {
    const pos = f.pos.map((p) => POS_SHORT[p] ?? p).join(' / ');
    return '<div class="form">' +
      `<span class="fw">${escapeHtml(f.word)}</span>` +
      (pos ? `<span class="fp">${escapeHtml(pos)}</span>` : '') +
      (f.ipa ? `<span class="fi">${escapeHtml(f.ipa)}</span>` : '') +
      `<button class="snd" data-src="${escapeHtml(f.sound)}" title="Play">▶</button>` +
      (f.example ? `<div class="fx">${escapeHtml(f.example)}</div>` : '') +
      '</div>';
  }).join('') + '</div>';
}

/** Meanings of every dictionary; with more than one, each gets its dictionary's name as a heading. */
export function sectionsHtml(sections: DictSection[], word: string): string {
  if (sections.length <= 1) return meaningsHtml(sections[0]?.entry ?? null, word);
  return sections.map((sec) => `<div class="dict"><div class="dn">${escapeHtml(sec.name)}</div>${meaningsHtml(sec.entry, word)}</div>`).join('');
}

export function meaningsHtml(entry: EnEntry | null, word: string): string {
  return (entry?.g ?? []).slice(0, 4).map((g) => {
    const x = g.x?.find((s) => containsWord(s, word)) ?? '';
    return '<div class="meaning-group">' +
      (g.p ? `<div class="mp">${escapeHtml(g.p)}</div>` : '') +
      `<ul>${g.m.slice(0, MAX_MEANINGS).map((m) => `<li>${escapeHtml(m)}</li>`).join('')}</ul>` +
      (x ? `<div class="mx">${escapeHtml(x)}</div>` : '') +
      '</div>';
  }).join('');
}

function technicalHtml(entry: EnEntry | null): string {
  const t = entry?.t;
  if (!t || (!t.m.length && !t.ph.length)) return '';
  return (t.m.length ? `<div>${t.m.slice(0, 8).map(escapeHtml).join('; ')}</div>` : '') +
    (t.ph.length ? `<ul>${t.ph.slice(0, 6).map(([en, vi]) => `<li><b>${escapeHtml(en)}</b>: ${escapeHtml(vi)}</li>`).join('')}</ul>` : '');
}

/** The editor's highlight (<span data-cloze>) becomes <span class="hl">; everything else was allowlisted. */
function sentenceHtml(draft: CardDraft): string {
  return sanitizeInline(draft.sentenceHtml).trim().replace(/<span data-cloze>/g, '<span class="hl">');
}

function sourceHtml(draft: CardDraft): string {
  const url = safeUrl(draft.pageUrl);
  const link = url ? `<a href="${escapeHtml(url)}">${escapeHtml(draft.pageTitle.trim() || new URL(url).hostname)}</a>` : '';
  if (!draft.seenAs) return link;
  const seen = `Seen as “${escapeHtml(draft.seenAs)}”` + (draft.seenIn ? ` in <i>${escapeHtml(draft.seenIn)}</i>` : '');
  return link ? `${seen} — ${link}` : seen;
}

async function wordForms(draft: CardDraft, entry: EnEntry | null, stamp: string): Promise<FormInfo[]> {
  const lemmas = uniqueLemmas([[draft.word, draft.pos], ...draft.forms]).slice(0, MAX_FORMS);
  const forms: FormInfo[] = [];
  for (const lemma of lemmas) {
    const found = lemma === draft.word ? entry : await lookupEn(lemma).then((r) => (r.found && r.head === lemma ? r : null));
    const pos = draft.forms.filter(([w]) => w === lemma).map(([, p]) => p);
    forms.push({
      word: lemma,
      pos: pos.length ? pos : [draft.pos].filter(Boolean),
      ipa: lemma === draft.word ? draft.ipa || (found?.i ?? '') : (found?.i ?? ''),
      example: exampleFor(found, lemma),
      sound: `qa_${slug(lemma)}-${stamp}.mp3`,
    });
  }
  return forms;
}

let modelChecked = false;
/** Create the note type, or update its templates/CSS when MODEL_VERSION changed. */
async function ensureModel(): Promise<void> {
  if (modelChecked) return;
  const models = await anki<string[]>('modelNames');
  const { modelVersion } = await chrome.storage.local.get('modelVersion');
  if (!models.includes(MODEL_NAME)) {
    await anki('createModel', {
      modelName: MODEL_NAME, inOrderFields: [...MODEL_FIELDS], css: CSS, isCloze: false,
      cardTemplates: [{ Name: 'Card 1', Front: FRONT, Back: BACK }],
    });
    log('info', 'created note type', MODEL_NAME);
  } else if (modelVersion !== MODEL_VERSION) {
    try {
      await anki('updateModelTemplates', { model: { name: MODEL_NAME, templates: { 'Card 1': { Front: FRONT, Back: BACK } } } });
      await anki('updateModelStyling', { model: { name: MODEL_NAME, css: CSS } });
      log('info', 'updated note type', { MODEL_NAME, MODEL_VERSION });
    } catch (e) {
      // e.g. an Anki editor window is open: keep saving cards, retry the update next time.
      log('error', 'note type update postponed', e);
      return;
    }
  }
  await chrome.storage.local.set({ modelVersion: MODEL_VERSION });
  modelChecked = true;
}

/** Everything a card can contain, as HTML-safe strings (keys = DataKey). */
type CardData = Record<Exclude<DataKey, ''>, string>;

export async function addCard(draft: CardDraft): Promise<Result> {
  const settings = await loadSettings();
  const deck = settings.deck;
  const front = draft.front.trim();
  const builtIn = !settings.noteType;
  log('info', 'addCard start', { front, deck, noteType: settings.noteType || MODEL_NAME });
  try {
    await ensurePermission();
    if (builtIn) await ensureModel();
    const fieldNames = builtIn ? [...MODEL_FIELDS] : await anki<string[]>('modelFieldNames', { modelName: settings.noteType });
    const used = usedData(settings, fieldNames);

    // Dictionaries are looked up again here (the draft comes from a web page); online and script results are validated.
    const lookup = await lookupEn(draft.word);
    const fallback = draft.fallback ?? null;
    const sections: DictSection[] = lookup.found && lookup.sections?.length ? lookup.sections : fallback ? [{ id: 'online', name: 'Online', entry: fallback }] : [];
    sections.push(...(draft.extra ?? []).map((x) => ({ id: 'script', name: x.name, entry: x.entry })));
    const entry: EnEntry | null = sections[0]?.entry ?? null;
    const oxford = entry === fallback ? fallback?.ox : undefined;
    const stamp = Date.now().toString(36);
    const forms = await wordForms(draft, entry, stamp);
    const sentence = sentenceHtml(draft);
    const plainSentence = stripTags(sentence);
    const sentenceFile = used.has('sentenceAudio') && plainSentence && plainSentence.length <= MAX_TTS_CHARS ? `qa_s-${slug(front)}-${stamp}.mp3` : '';

    // Download all audio into Anki BEFORE adding the note, so every sound field is
    // filled in the same write (a later edit fails while the note is open in Anki).
    const wordFile = forms.find((f) => f.word === draft.word)?.sound ?? `qa_${slug(draft.word)}-${stamp}.mp3`;
    const oxfordAudio = oxford && OXFORD_AUDIO.test(oxford.audio) ? oxford.audio : '';
    const jobs = new Map<string, string>();
    if (used.has('audio')) jobs.set(wordFile, oxfordAudio || ttsUrl(draft.word, settings.accent)); // Oxford's real voice if we have it
    if (used.has('forms')) for (const f of forms.slice(1)) if (!jobs.has(f.sound)) jobs.set(f.sound, ttsUrl(f.word, settings.accent));
    if (sentenceFile) jobs.set(sentenceFile, ttsUrl(plainSentence, settings.accent));
    const stored = await downloadAudio([...jobs].map(([filename, url]) => ({ filename, url })));
    const wordSound = stored.get(wordFile);
    const sentenceSound = stored.get(sentenceFile);
    for (const f of forms) f.sound = stored.get(f.sound) ?? '';

    const url = safeUrl(draft.pageUrl);
    const data: CardData = {
      word: escapeHtml(front),
      answer: escapeHtml(draft.answer.trim()),
      ipa: escapeHtml(draft.ipa || (entry?.i ?? '')),
      pos: escapeHtml(draft.pos),
      audio: wordSound ? `[sound:${wordSound}]` : '',
      sentence,
      sentenceAudio: sentenceSound ? `[sound:${sentenceSound}]` : '',
      meanings: sectionsHtml(sections, draft.word),
      meaningsText: escapeHtml(sections.flatMap((x) => x.entry.g.flatMap((g) => g.m.slice(0, MAX_MEANINGS))).slice(0, 8).join('; ')),
      forms: formsHtml(forms),
      technical: technicalHtml(entry),
      // From Oxford: English definitions and CEFR level (otherwise left for the user / Claude).
      explanation: oxford?.defs.length ? `<ul>${oxford.defs.slice(0, 3).map((d) => `<li>${escapeHtml(d)}</li>`).join('')}</ul>` : '',
      level: escapeHtml(oxford?.level ?? ''),
      source: sourceHtml(draft),
      url: url ? escapeHtml(url) : '',
      pageTitle: escapeHtml(draft.pageTitle.trim()),
    };

    const fields = builtIn ? builtInFields(data, settings, [...stored.values()], draft, entry, forms) : mappedFields(data, settings, fieldNames);
    if (!Object.values(fields).some((v) => v.trim())) return fail('The field mapping leaves every field empty — check Options → Anki.');
    const note = {
      deckName: deck,
      modelName: builtIn ? MODEL_NAME : settings.noteType,
      fields,
      // "from-vi" marks cards picked on Vietnamese pages.
      tags: [...new Set([...settings.tags, ...(draft.seenAs ? ['from-vi'] : [])])],
      options: { allowDuplicate: settings.allowDuplicate, duplicateScope: 'collection' },
    };

    await anki('createDeck', { deck });
    const [check] = await anki<{ canAdd: boolean; error?: string }[]>('canAddNotesWithErrorDetail', { notes: [note] });
    if (!check?.canAdd) {
      const err = check?.error ?? 'unknown error';
      return fail(/duplicate/i.test(err) ? `“${front}” is already in Anki.` : err);
    }
    const noteId = await anki<number>('addNote', { note });
    log('info', 'addCard ok', { front, deck, noteId, audio: stored.size });
    return { ok: true, msg: `Added “${front}” to ${deck}` };
  } catch (e) {
    log('error', 'addCard failed', e);
    return fail(e instanceof AnkiError ? e.message : 'Unexpected error while talking to Anki.');
  }
}

/** Which data the current note type actually needs (so unneeded audio isn't downloaded). */
function usedData(settings: Settings, fieldNames: string[]): Set<DataKey> {
  if (!settings.noteType) {
    const on = (k: CardSection): boolean => settings.sections[k];
    return new Set<DataKey>([
      ...(on('audio') ? ['audio' as const] : []), ...(on('sentenceAudio') && on('sentence') ? ['sentenceAudio' as const] : []), ...(on('forms') ? ['forms' as const] : []),
    ]);
  }
  return new Set(fieldNames.map((f) => settings.fieldMap[f] ?? ''));
}

const SECTION_FIELDS: Record<CardSection, (keyof Fields)[]> = {
  ipa: ['IPA'], pos: ['POS'], audio: ['Audio'], answer: ['Answer'], sentence: ['Sentence', 'SentenceSound'], sentenceAudio: ['SentenceSound'],
  forms: ['Forms'], meanings: ['Meanings'], technical: ['Technical'], explanation: ['Explanation', 'Level'], source: ['Source'],
};

function builtInFields(data: CardData, settings: Settings, media: string[], draft: CardDraft, entry: EnEntry | null, forms: FormInfo[]): Fields {
  const fields: Fields = {
    Word: data.word, IPA: data.ipa, POS: data.pos, Audio: data.audio, Answer: data.answer, Sentence: data.sentence,
    SentenceSound: data.sentenceAudio, Forms: data.forms, Meanings: data.meanings, Technical: data.technical,
    Explanation: data.explanation, Level: data.level, Source: data.source, IsSentence: '',
    // Every file, so Anki's "Check Media" keeps the ones only used by play buttons.
    Media: media.map((f) => `[sound:${f}]`).join(''),
    Data: escapeHtml(JSON.stringify({ v: 2, draft: { ...draft, sentenceHtml: data.sentence }, forms, entry })),
  };
  for (const [section, names] of Object.entries(SECTION_FIELDS) as [CardSection, (keyof Fields)[]][]) {
    if (!settings.sections[section]) for (const n of names) fields[n] = '';
  }
  return fields;
}

function mappedFields(data: CardData, settings: Settings, fieldNames: string[]): Record<string, string> {
  return Object.fromEntries(fieldNames.map((f) => {
    const key = settings.fieldMap[f] ?? '';
    return [f, key ? data[key] : ''];
  }));
}

function fail(msg: string): Result {
  log('error', 'addCard rejected', msg);
  return { ok: false, msg };
}

/**
 * Download the audio files in the extension (Anki's own downloader can hang on
 * slow networks) and store them in Anki as data. In parallel, each with a
 * timeout. Returns requested file name → name Anki stored it under; failures
 * are skipped so a card is never blocked by audio.
 */
async function downloadAudio(jobs: AudioJob[]): Promise<Map<string, string>> {
  const results = await Promise.all(jobs.map(async (job) => {
    try {
      const data = await fetchMp3(job.url);
      return [job.filename, await anki<string>('storeMediaFile', { filename: job.filename, data }, AUDIO_TIMEOUT_MS)] as const;
    } catch (e) {
      log('error', `audio failed (${job.filename})`, e);
      return null;
    }
  }));
  return new Map(results.filter((r): r is readonly [string, string] => r !== null));
}

const MAX_AUDIO_BYTES = 2_000_000;

/** Fetch an mp3 and return it base64-encoded. */
async function fetchMp3(url: string): Promise<string> {
  const res = await fetch(url, { credentials: 'omit', signal: AbortSignal.timeout(AUDIO_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length < 100 || bytes.length > MAX_AUDIO_BYTES) throw new Error(`unexpected size ${bytes.length}`);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
