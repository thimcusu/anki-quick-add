// Toolbar popup: quick settings.
import { el } from '../content/ui/dom.ts';
import { renderSettings } from './settings-form.ts';

const app = document.getElementById('app');
if (app) {
  app.append(el('div', { class: 'title' }, el('h1', {}, 'Anki Quick Add'), el('span', { class: 'version' }, `v${chrome.runtime.getManifest().version}`)));
  void renderSettings(app);
  app.append(el('div', { class: 'footer-link' }, el('a', { attrs: { href: 'options.html', target: '_blank' } }, 'All options: dictionaries, Anki note type, scripts…')));
}
