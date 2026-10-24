// Content script: opens the bubble on a real double-click (mouse mode) or on
// the hotkey (Option+A on macOS, Alt+A elsewhere) for the selected word or the
// word under the mouse pointer. Respects the settings from the popup.
import { type Settings, DEFAULT_SETTINGS, watchSettings } from '../shared/settings.ts';
import { isBlocked } from '../shared/blocklist.ts';
import { looksVietnamese, readContext, vietnamesePhrases } from './context.ts';
import { api, logRemote } from './messaging.ts';
import { lookupWord } from './lookup.ts';
import { Bubble } from './ui/bubble.ts';

const ENGLISH_PHRASE = /^[A-Za-z][A-Za-z'’-]*( [A-Za-z][A-Za-z'’-]*)*$/;
const MAX_WORDS = 8;
let bubble: Bubble | null = null;
let settings: Settings = DEFAULT_SETTINGS;
let pointer = { x: -1, y: -1 };

let blocked = false; // this site is on the blocklist

watchSettings((s) => {
  settings = s;
  blocked = isBlocked(location.href, s.blocklist);
  if (!s.enabled || blocked) closeBubble();
});

const active = (): boolean => settings.enabled && !blocked && !isBlocked(location.href, settings.blocklist);

function closeBubble(): void {
  bubble?.close();
  bubble = null;
}

function isEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

/** The current selection, or the word under the mouse pointer (hotkey without a selection). */
function wordRange(): Range | null {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0 && !selection.isCollapsed) return selection.getRangeAt(0).cloneRange();
  if (pointer.x < 0) return null;
  const caret = document.caretPositionFromPoint(pointer.x, pointer.y);
  const node = caret?.offsetNode;
  if (!caret || !(node instanceof Text)) return null;
  const text = node.data;
  let start = caret.offset;
  let end = caret.offset;
  while (start > 0 && /[\p{L}\p{M}'’-]/u.test(text.charAt(start - 1))) start--;
  while (end < text.length && /[\p{L}\p{M}'’-]/u.test(text.charAt(end))) end++;
  if (start === end) return null;
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  return range;
}

async function open(range: Range): Promise<void> {
  const surface = range.toString().replace(/\s+/g, ' ').trim();
  if (!surface || surface.length > 80 || surface.split(' ').length > MAX_WORDS) return;
  const ctx = readContext(range);
  const anchor = range.cloneRange();

  if (looksVietnamese(surface, ctx)) {
    const vi = await api.lookupVi(vietnamesePhrases(ctx));
    if (vi.found) {
      closeBubble();
      bubble = new Bubble({ ctx, surface, vi: { phrase: vi.head, entry: vi } }, anchor);
      bubble.showVietnamese();
      return;
    }
  }
  if (!ENGLISH_PHRASE.test(surface)) return;
  const en = await lookupWord(surface);
  closeBubble();
  bubble = new Bubble({ ctx, surface }, anchor);
  bubble.showWord(en.found ? en : { head: en.head, i: '', g: [], s: 'lv' });
}

function trigger(ev: Event): void {
  const range = wordRange();
  if (!range) return;
  open(range).catch((e: unknown) => { logRemote('error', 'open bubble failed', e); });
  ev.preventDefault();
}

document.addEventListener('dblclick', (ev) => {
  // isTrusted: ignore events forged by the page.
  if (!ev.isTrusted || !active() || !settings.mouse || isEditable(ev.target) || bubble?.contains(ev)) return;
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;
  open(selection.getRangeAt(0).cloneRange()).catch((e: unknown) => { logRemote('error', 'open bubble failed', e); });
});

// Mouse mode also opens on a selection of 2–8 words (drag-select), like a
// double-click does for one word. Longer selections are left alone (copying text).
document.addEventListener('mouseup', (ev) => {
  if (!ev.isTrusted || ev.button !== 0 || ev.detail > 1 || !active() || !settings.mouse || isEditable(ev.target) || bubble?.contains(ev)) return;
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;
  const words = selection.toString().trim().split(/\s+/);
  if (words.length < 2 || words.length > MAX_WORDS) return;
  open(selection.getRangeAt(0).cloneRange()).catch((e: unknown) => { logRemote('error', 'open bubble failed', e); });
});

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') { closeBubble(); return; }
  // ev.code is layout-independent (Option+A types "å" on macOS).
  const hotkey = ev.code === 'KeyA' && ev.altKey && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey;
  if (!hotkey || !ev.isTrusted || !active() || isEditable(ev.target) || bubble?.contains(ev)) return;
  trigger(ev);
}, true);

document.addEventListener('mousemove', (ev) => { pointer = { x: ev.clientX, y: ev.clientY }; }, { passive: true });
document.addEventListener('mousedown', (ev) => { if (bubble && !bubble.contains(ev)) closeBubble(); }, true);
