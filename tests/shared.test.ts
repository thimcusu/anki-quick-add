import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeInline, splitCloze, safeUrl, escapeHtml } from '../src/shared/html.ts';
import { isContentRequest as isRequest, isFallbackEntry, isPageRequest } from '../src/shared/validate.ts';
import { parseTags, normalizeSettings } from '../src/shared/settings.ts';
import { lemmaCandidates } from '../src/background/dictionary.ts';
import { collocationPhrase, sectionPos, highlightTerms } from '../src/content/collocations.ts';
import { formsHtml } from '../src/background/card.ts';
import { containsWord } from '../src/shared/forms.ts';

test('sanitizeInline keeps only safe inline tags', () => {
  assert.equal(sanitizeInline('<b>ok</b> <i>x</i><u>y</u><br>'), '<b>ok</b> <i>x</i><u>y</u><br>');
  assert.equal(sanitizeInline('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(sanitizeInline('<b onclick="x">a</b>'), '&lt;b onclick=&quot;x&quot;&gt;a</b>');
  assert.equal(sanitizeInline('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(sanitizeInline('<span data-cloze="a" style="x">w</span>'), '&lt;span data-cloze=&quot;a&quot; style=&quot;x&quot;&gt;w</span>');
  assert.equal(sanitizeInline('<span data-cloze>w</span> &amp; &foo;'), '<span data-cloze>w</span> &amp; &amp;foo;');
});

test('splitCloze', () => {
  assert.deepEqual(splitCloze('a <span data-cloze>b</span> c'), { before: 'a ', answer: 'b', after: ' c' });
  assert.equal(splitCloze('no cloze'), null);
});

test('safeUrl allows only http(s)', () => {
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl('https://x.com/a?b'), 'https://x.com/a?b');
  assert.equal(escapeHtml('"<x>'), '&quot;&lt;x&gt;');
});

test('isRequest rejects malformed messages', () => {
  assert.equal(isRequest({ type: 'lookupEn', word: 'hello' }), true);
  assert.equal(isRequest({ type: 'lookupEn', word: 'x'.repeat(500) }), false);
  assert.equal(isRequest({ type: 'deleteDeck' }), false);
  assert.equal(isRequest({ type: 'addCard', card: { front: 'x' } }), false);
});

test('lemmaCandidates', () => {
  assert.ok(lemmaCandidates('studied').includes('study'));
  assert.ok(lemmaCandidates('running').includes('run'));
  assert.ok(lemmaCandidates('maintained').includes('maintain'));
});

test('collocationPhrase', () => {
  assert.equal(collocationPhrase('ADJ', 'free', 'access'), 'free access');
  assert.equal(collocationPhrase('VERB + ACCESS', 'give (sb)', 'access'), 'give access');
  assert.equal(collocationPhrase('ACCESS + NOUN', 'road', 'access'), 'access road');
  assert.equal(collocationPhrase('PREP', '~ to', 'access'), 'access to');
  assert.equal(collocationPhrase('ADV', 'briefly', 'speak', 'verb'), 'speak briefly');
  assert.equal(collocationPhrase('ADV', 'extremely', 'resilient', 'adj'), 'extremely resilient');
  assert.equal(collocationPhrase('VERB + SPEAK', 'refuse to', 'speak', 'verb'), 'refuse to speak');
  assert.equal(collocationPhrase('PREP', 'about', 'speak', 'verb'), 'speak about');
  assert.equal(collocationPhrase('PHRASES', 'be on speaking terms (with sb)', 'speak', 'verb'), 'be on speaking terms (with sb)');
  assert.equal(sectionPos('(verb.) have a conversation'), 'verb');
  assert.equal(sectionPos('speak up'), '');
  assert.deepEqual(highlightTerms('give access', 'access'), ['access', 'give']);
});

test('formsHtml lists the other forms only, escaped', () => {
  const t = formsHtml([
    { word: 'happy', pos: ['adjective'], ipa: '/ˈhæpi/', example: 'I am happy.', sound: 'a.mp3' },
    { word: '<x>', pos: ['noun'], ipa: '', example: '', sound: 'b"c.mp3' },
  ]);
  assert.doesNotMatch(t, /happy/);
  assert.match(t, /<div class="form"><span class="fw">&lt;x&gt;<\/span><span class="fp">n<\/span>/);
  assert.match(t, /&lt;x&gt;/);
  assert.match(t, /data-src="b&quot;c.mp3"/);
  assert.equal(formsHtml([{ word: 'a', pos: [], ipa: '', example: '', sound: '' }]), '');
});

test('phrase fallback entries are validated', () => {
  const gt = { head: 'not necessarily', i: '', g: [{ p: 'phrase', m: ['không nhất thiết'] }], s: 'gt' };
  assert.ok(isFallbackEntry(gt));
  assert.ok(!isFallbackEntry({ ...gt, f: [['x', 'noun']] }));
  assert.ok(!isFallbackEntry({ ...gt, s: 'sk' }));
});

test('script results and script sections are validated', async () => {
  const { scriptEntry } = await import('../src/shared/script-result.ts');
  const { isScriptSections, isCardDraft } = await import('../src/shared/validate.ts');
  const e = scriptEntry({ ipa: '/x/', groups: [{ pos: 'noun', meanings: ['a', 42, '<b>b</b>'], examples: ['ex'] }, { meanings: [] }], extra: 'ignored' });
  assert.deepEqual(e, { i: '/x/', g: [{ p: 'noun', m: ['a', '<b>b</b>'], x: ['ex'] }], s: 'sc' });
  assert.equal(scriptEntry({ groups: 'nope' }), null);
  const sec = { name: 'Free Dictionary', entry: { s: 'sc', head: 'word', i: '', g: [{ p: '', m: ['m'] }] } };
  assert.equal(isScriptSections([sec]), true);
  assert.equal(isScriptSections([{ ...sec, entry: { ...sec.entry, ox: {} } }]), false);
  assert.equal(isScriptSections(Array(6).fill(sec)), false);
  const draft = { front: 'w', word: 'w', ipa: '', pos: '', answer: '', forms: [], sentenceHtml: '', pageUrl: '', pageTitle: '', seenAs: '', seenIn: '' };
  assert.equal(isCardDraft({ ...draft, extra: [sec] }), true);
  assert.equal(isCardDraft({ ...draft, extra: [{ name: 'x', entry: { s: 'ox' } }] }), false);
});

test('script hosts', async () => {
  const { hostAllowed } = await import('../src/background/scripts.ts');
  const H = ['https://api.dictionaryapi.dev/*', 'https://*.example.com/*'];
  assert.equal(hostAllowed('https://api.dictionaryapi.dev/api/v2/entries/en/x', H), 'https://api.dictionaryapi.dev/*');
  assert.equal(hostAllowed('http://api.dictionaryapi.dev/x', H), null);
  assert.equal(hostAllowed('https://evil.com/?https://api.dictionaryapi.dev/', H), null);
  assert.equal(hostAllowed('https://a.example.com/x', H), 'https://*.example.com/*');
  assert.equal(hostAllowed('https://example.com.evil.com/', H), null);
  assert.equal(hostAllowed('https://api.dictionaryapi.dev:8443/x', H), null);
});

test('field mapping guess', async () => {
  const { guessFieldMap } = await import('../src/pages/options/services-tab.ts').catch(() => ({ guessFieldMap: null }));
  if (!guessFieldMap) return; // needs DOM-free import
  assert.deepEqual(guessFieldMap(['Front', 'Back', 'Audio', 'Example']), { Front: 'word', Back: 'meanings', Audio: 'audio', Example: 'sentence' });
});

test('user scripts compile (TypeScript → JavaScript)', async () => {
  const { transform } = await import('sucrase');
  const code = transform('async function lookup(word: string, api: { json(u: string): Promise<unknown> }) { return null as unknown; }', { transforms: ['typescript'], disableESTransforms: true }).code;
  assert.match(code, /async function lookup\(word, api\)/);
  assert.equal(transform('async function lookup(word) { return 1 }', { transforms: [], disableESTransforms: true }).code.includes('lookup'), true);
  assert.throws(() => transform('function (', { transforms: [], disableESTransforms: true }));
});

test('blockSite takes no data from the page', () => {
  assert.equal(isRequest({ type: 'blockSite' }), true);
  assert.equal(isRequest({ type: 'blockSite', site: 'evil.com' }), false);
});

test('page requests are separate from content requests', () => {
  assert.equal(isPageRequest({ type: 'getLogs' }), true);
  assert.equal(isRequest({ type: 'getLogs' }), false);
  assert.equal(isPageRequest({ type: 'addCard' }), false);
});

test('settings: tags and normalization', () => {
  assert.deepEqual(parseTags(' anki-web, my tag ,, <b>x</b>, anki-web'), ['anki-web', 'my_tag', 'bxb']);
  const d = normalizeSettings(null);
  assert.deepEqual({ ...d, sections: undefined }, { enabled: true, mouse: true, hotkey: 'alt+a', accent: 'us', deck: 'English', tags: ['anki-quick-add'], noteType: '',
    sections: undefined, fieldMap: {}, allowDuplicate: false, system: { oxford: true, translate: true, collocations: true }, inspect: false, blocklist: [] });
  assert.equal(Object.values(d.sections).every(Boolean), true);
  const n = normalizeSettings({ hotkey: 'evil', accent: 'uk', fieldMap: { Front: 'word', Back: 'bogus', X: 'meanings' }, sections: { audio: false }, system: { oxford: false } });
  assert.equal(n.hotkey, 'alt+a');
  assert.equal(n.accent, 'uk');
  assert.deepEqual(n.fieldMap, { Front: 'word', X: 'meanings' });
  assert.equal(n.sections.audio, false);
  assert.deepEqual(n.system, { oxford: false, translate: true, collocations: true });
  assert.equal(normalizeSettings({ deck: 42, enabled: 'yes' }).deck, 'English');
  assert.deepEqual(normalizeSettings({ deck: 'Web', blocklist: ['https://Chat.Example.com/', 'bad site'] }).blocklist, ['chat.example.com']);
});

test('containsWord accepts inflections, rejects misspellings', () => {
  assert.equal(containsWord('She studied hard.', 'study'), true);
  assert.equal(containsWord('They are studying.', 'study'), true);
  assert.equal(containsWord('They discussed it intellectualli.', 'intellectually'), false);
  assert.equal(containsWord('Good sleep restored her equylibrium.', 'equilibrium'), false);
});

test('Oxford fallback entry validation', async () => {
  const { isFallbackEntry, isCardDraft } = await import('../src/shared/validate.ts');
  const fb = { head: 'serendipitous', i: '/ˌserənˈdɪpətəs/', s: 'ox', f: [['serendipitous', 'adjective'], ['serendipity', 'noun']],
    g: [{ p: 'adjective', m: ['tình cờ may mắn', 'xảy ra tình cờ'], x: ['a serendipitous discovery'] }],
    ox: { audio: 'https://www.oxfordlearnersdictionaries.com/media/english/us_pron/s/ser/seren/serendipitous__us_2.mp3', level: '', defs: ['happening by chance'] } };
  assert.equal(isFallbackEntry(fb), true);
  assert.equal(isFallbackEntry({ ...fb, s: 'sk' }), false);
  assert.equal(isFallbackEntry({ ...fb, g: [{ p: 'x', m: Array(20).fill('a') }] }), false);
  const draft = { front: 'serendipitous', word: 'serendipitous', ipa: '', pos: 'adjective', answer: 'tình cờ', forms: [], sentenceHtml: '', pageUrl: 'https://x.y', pageTitle: 't', seenAs: '', seenIn: '' };
  assert.equal(isCardDraft({ ...draft, fallback: fb }), true);
  assert.equal(isCardDraft({ ...draft, fallback: { evil: true } }), false);
});

test('blocklist patterns', async () => {
  const { isBlocked, normalizePattern, parseBlocklist, siteOf } = await import('../src/shared/blocklist.ts');
  assert.equal(normalizePattern('https://rancher.example.com/'), 'rancher.example.com');
  assert.equal(normalizePattern('http://db.example.org/'), 'db.example.org');
  assert.equal(normalizePattern('  Example.com/Chat/?x=1#y '), 'example.com/chat');
  assert.equal(normalizePattern('*.slack.com'), '*.slack.com');
  assert.equal(normalizePattern('not a site'), null);
  assert.equal(normalizePattern('javascript:alert(1)'), null);
  assert.deepEqual(parseBlocklist('a.com\n\nA.com, b.com/x'), ['a.com', 'b.com/x']);
  const L = ['git.example.com', 'rancher.example.com', 'db.example.org'];
  assert.equal(isBlocked('https://git.example.com/projects/X/repos', L), true);
  assert.equal(isBlocked('https://rancher.example.com/dashboard', L), true);
  assert.equal(isBlocked('http://db.example.org/', L), true);
  assert.equal(isBlocked('https://www.example.com/', L), false);
  assert.equal(isBlocked('https://evil.com/?git.example.com', L), false);
  assert.equal(isBlocked('https://notgit.example.com/', L), false);
  assert.equal(isBlocked('https://app.slack.com/client', ['*.slack.com']), true);
  assert.equal(isBlocked('https://slack.com/', ['*.slack.com']), false);
  assert.equal(isBlocked('https://example.com/chat/room', ['example.com/chat']), true);
  assert.equal(isBlocked('https://example.com/chatter', ['example.com/chat']), false);
  assert.equal(isBlocked('http://10.0.0.5:8080/x', ['10.0.0.5:8080']), true);
  assert.equal(isBlocked('http://10.0.0.5:9090/x', ['10.0.0.5:8080']), false);
  assert.equal(siteOf('https://chat.example.com:8443/a'), 'chat.example.com:8443');
  assert.equal(siteOf('chrome://extensions'), null);
});
