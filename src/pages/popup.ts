// Toolbar popup: quick settings.
import { el } from '../content/ui/dom.ts';
import { renderSettings } from './settings-form.ts';

const app = document.getElementById('app');
if (app) {
  app.append(el('div', { class: 'title' }, el('h1', {}, 'Anki Quick Add'), el('span', { class: 'version' }, `v${chrome.runtime.getManifest().version}`)));
  void renderSettings(app, 'popup');
}
