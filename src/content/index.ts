// Content script: opens the bubble on a real double-click or drag-selection
// (mouse mode) or on the hotkey — Option+A / Alt+A, or a single modifier key
// pressed alone (ODH style) — for the selection or the word under the mouse.
import { type Settings, DEFAULT_SETTINGS, watchSettings } from '../shared/settings.ts';
import { isBlocked } from '../shared/blocklist.ts';
import { looksVietnamese, readContext, vietnamesePhrases } from './context.ts';
import { api, logRemote, setAccent } from './messaging.ts';
import { loadLocal, MAX_CSS } from '../shared/local-settings.ts';
import { lookupWord } from './lookup.ts';
import { Bubble } from './ui/bubble.ts';

const ENGLISH_PHRASE = /^[A-Za-z][A-Za-z'’-]*( [A-Za-z][A-Za-z'’-]*)*$/;
const MAX_WORDS = 8;
let bubble: Bubble | null = null;
let settings: Settings = DEFAULT_SETTINGS;
let pointer = { x: -1, y: -1 };

let blocked = false; // this site is on the blocklist

let customCss = '';
const loadCss = (): void => { loadLocal().then((l) => { customCss = l.customCss.slice(0, MAX_CSS); }, () => undefined); };
loadCss();
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && 'customCss' in changes) loadCss(); });

watchSettings((s) => {
  settings = s;
  setAccent(s.accent);
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
      bubble = new Bubble({ ctx, surface, vi: { phrase: vi.head, entry: vi } }, anchor, { settings, css: customCss });
      bubble.showVietnamese();
      return;
    }
  }
  if (!ENGLISH_PHRASE.test(surface)) return;
  const en = await lookupWord(surface, settings);
  closeBubble();
  bubble = new Bubble({ ctx, surface }, anchor, { settings, css: customCss });
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

const MODIFIER_KEY: Partial<Record<Settings['hotkey'], string>> = { shift: 'Shift', ctrl: 'Control', alt: 'Alt', meta: 'Meta' };

/** Option+A / Alt+A (ev.code is layout-independent: Option+A types "å" on macOS), or one modifier pressed on its own. */
function isHotkey(ev: KeyboardEvent): boolean {
  if (settings.hotkey === 'alt+a') return ev.code === 'KeyA' && ev.altKey && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey;
  const key = MODIFIER_KEY[settings.hotkey];
  if (!key || ev.key !== key || ev.repeat) return false;
  const others = { Shift: ev.shiftKey, Control: ev.ctrlKey, Alt: ev.altKey, Meta: ev.metaKey };
  return Object.entries(others).every(([k, down]) => k === key || !down);
}

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') { closeBubble(); return; }
  if (!ev.isTrusted || !active() || !isHotkey(ev) || isEditable(ev.target) || bubble?.contains(ev)) return;
  // A modifier alone only acts on the word under the mouse; never swallow it.
  if (MODIFIER_KEY[settings.hotkey]) { const range = wordRange(); if (range) open(range).catch((e: unknown) => { logRemote('error', 'open bubble failed', e); }); return; }
  trigger(ev);
}, true);

document.addEventListener('mousemove', (ev) => { pointer = { x: ev.clientX, y: ev.clientY }; }, { passive: true });
document.addEventListener('mousedown', (ev) => { if (bubble && !bubble.contains(ev)) closeBubble(); }, true);
