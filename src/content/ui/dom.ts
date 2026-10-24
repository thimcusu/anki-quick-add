// Tiny DOM builder. All text goes through textContent, so page or dictionary
// data can never become markup.

type Child = Node | string | null | undefined | false;
interface Props {
  class?: string;
  title?: string;
  type?: string;
  value?: string;
  placeholder?: string;
  hidden?: boolean;
  disabled?: boolean;
  data?: Record<string, string>;
  attrs?: Record<string, string>;
  on?: Partial<Record<keyof HTMLElementEventMap, (ev: Event) => void>>;
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props.class) node.className = props.class;
  if (props.title) node.title = props.title;
  if (props.hidden) node.hidden = true;
  if (props.type) node.setAttribute('type', props.type);
  if (props.placeholder) node.setAttribute('placeholder', props.placeholder);
  if (props.value !== undefined && 'value' in node) (node as HTMLInputElement).value = props.value;
  if (props.disabled && 'disabled' in node) (node as HTMLButtonElement).disabled = true;
  for (const [k, v] of Object.entries(props.data ?? {})) node.dataset[k] = v;
  for (const [k, v] of Object.entries(props.attrs ?? {})) node.setAttribute(k, v);
  for (const [evt, fn] of Object.entries(props.on ?? {})) node.addEventListener(evt, fn);
  for (const c of children) if (c !== null && c !== undefined && c !== false) node.append(c);
  return node;
}

/** A button that only reacts to real user clicks. */
export function button(label: string, onClick: () => void, cls = 'btn', title = ''): HTMLButtonElement {
  return el('button', {
    class: cls, type: 'button', title,
    on: { click: (ev) => { if (ev.isTrusted) onClick(); } },
  }, label);
}
