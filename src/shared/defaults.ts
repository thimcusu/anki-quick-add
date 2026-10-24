// Defaults for a fresh install. Settings the user changes are stored in
// chrome.storage.sync and win over these.

export const DEFAULTS = {
  /** Anki deck for new cards. */
  deck: 'English',
  /** Tags added to every new card (editable in the settings). */
  tags: ['anki-quick-add'],
  /** Sites where the extension starts disabled (see blocklist.ts for the pattern syntax). */
  blocklist: [] as string[],
};
