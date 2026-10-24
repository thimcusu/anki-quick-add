// Options page (toolbar icon → "All options", or chrome://extensions → Details → Extension options).
// Tabs like Online Dictionary Helper: Extension · Services · Scripts · Logs.
import { el } from '../content/ui/dom.ts';
import { renderExtensionTab } from './options/extension-tab.ts';
import { renderServicesTab } from './options/services-tab.ts';
import { renderScriptsTab } from './options/scripts-tab.ts';
import { renderLogsTab } from './options/logs-tab.ts';

const TABS = [
  ['extension', 'Extension', renderExtensionTab],
  ['services', 'Services', renderServicesTab],
  ['scripts', 'Scripts', renderScriptsTab],
  ['logs', 'Logs', renderLogsTab],
] as const;
type TabId = (typeof TABS)[number][0];

function main(root: HTMLElement): void {
  root.append(el('div', { class: 'title' }, el('h1', {}, 'Anki Quick Add'), el('span', { class: 'version' }, `v${chrome.runtime.getManifest().version}`)));
  const nav = el('nav', { class: 'tabs' });
  const panel = el('section', { class: 'panel' });
  root.append(nav, panel);
  const show = (id: TabId): void => {
    const tab = TABS.find((t) => t[0] === id) ?? TABS[0];
    for (const b of nav.children) b.classList.toggle('active', (b as HTMLElement).dataset.tab === tab[0]);
    panel.replaceChildren();
    history.replaceState(null, '', `#${tab[0]}`);
    tab[2](panel).catch((e: unknown) => { panel.append(el('div', { class: 'status err' }, `Could not load this tab: ${String(e)}`)); });
  };
  for (const [id, label] of TABS) {
    const b = el('button', { class: 'tab', type: 'button', data: { tab: id } }, label);
    b.addEventListener('click', () => { show(id); });
    nav.append(b);
  }
  show((location.hash.slice(1) || 'extension') as TabId);
}

const app = document.getElementById('app');
if (app) main(app);
