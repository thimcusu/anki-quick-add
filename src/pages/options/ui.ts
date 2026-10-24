// Small helpers shared by the option tabs.
import { el } from '../../content/ui/dom.ts';

export interface Status { node: HTMLElement; ok: (msg: string) => void; err: (msg: string) => void; clear: () => void }

export function status(): Status {
  const node = el('div', { class: 'status' });
  return {
    node,
    ok: (msg) => { node.className = 'status'; node.textContent = msg; },
    err: (msg) => { node.className = 'status err'; node.textContent = msg; },
    clear: () => { node.textContent = ''; },
  };
}

export function select<T extends string>(options: [T, string][], value: T, onChange: (v: T) => void): HTMLSelectElement {
  const s = el('select', {}, ...options.map(([v, label]) => el('option', { value: v }, label)));
  s.value = value;
  s.addEventListener('change', () => { onChange(s.value as T); });
  return s;
}

export function btn(label: string, onClick: () => void, cls = 'btn', title = ''): HTMLButtonElement {
  const b = el('button', { class: cls, type: 'button', title }, label);
  b.addEventListener('click', onClick);
  return b;
}

export const hint = (text: string): HTMLElement => el('p', { class: 'hint' }, text);
