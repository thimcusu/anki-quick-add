// Bubble theme: flat zinc neutrals + emerald accent, light and dark.
export const CSS = `
:host { all: initial; }
.bubble {
  --bg: #ffffff; --surface: #f4f4f5; --text: #18181b; --muted: #71717a; --faint: #a1a1aa;
  --border: #e4e4e7; --accent: #059669; --accent-hover: #047857; --accent-soft: #ecfdf5; --accent-text: #047857;
  --danger: #dc2626; --ok: #059669;
  position: fixed; z-index: 2147483647; box-sizing: border-box;
  width: 400px; max-width: calc(100vw - 16px); max-height: min(560px, calc(100vh - 24px));
  display: flex; flex-direction: column; overflow: hidden;
  background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 14px;
  box-shadow: 0 1px 2px rgba(0,0,0,.06), 0 12px 32px rgba(0,0,0,.12);
  font: 14px/1.5 ui-sans-serif, -apple-system, "Segoe UI", Inter, Helvetica, Arial, sans-serif;
  padding: 0; text-align: left;
}
.header { flex: none; padding: 12px 16px 4px; }
.body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 0 16px 12px; overscroll-behavior: contain; }
.footer { flex: none; padding: 10px 16px; border-top: 1px solid var(--border); background: var(--bg); }
@media (prefers-color-scheme: dark) {
  .bubble { --bg: #18181b; --surface: #27272a; --text: #f4f4f5; --muted: #a1a1aa; --faint: #71717a;
    --border: #3f3f46; --accent: #10b981; --accent-hover: #34d399; --accent-soft: rgba(16,185,129,.14); --accent-text: #34d399; }
}
.bubble * { box-sizing: border-box; }
.row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.head { align-items: baseline; }
.word { font-size: 20px; font-weight: 700; letter-spacing: -.01em; }
.ipa { color: var(--muted); }
.muted { color: var(--muted); font-size: 12px; }
.faint { color: var(--faint); font-size: 11px; }
.spacer { flex: 1; }
.section { margin-top: 12px; }
.label { color: var(--accent-text); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 2px; }
ul { margin: 2px 0 0; padding-left: 18px; } li { margin: 2px 0; }
.example { color: var(--muted); font-style: italic; font-size: 12.5px; margin: 4px 0 0 18px; }
.context { margin-top: 12px; padding: 8px 10px; background: var(--surface); border-radius: 10px; color: var(--muted); font-size: 12.5px; }
button { font: inherit; cursor: pointer; color: inherit; background: none; border: 0; }
.btn { border: 1px solid var(--border); border-radius: 8px; padding: 5px 12px; font-weight: 500; background: var(--bg); }
.btn:hover { background: var(--surface); }
.btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
.btn.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.btn:disabled { opacity: .45; cursor: default; }
.icon { padding: 2px 6px; border-radius: 6px; color: var(--muted); }
.icon:hover { background: var(--surface); color: var(--text); }
.link { color: var(--accent-text); font-size: 12px; padding: 0; }
.link:hover { text-decoration: underline; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.chip { border: 1px solid var(--border); border-radius: 999px; padding: 3px 11px; font-size: 13px; font-weight: 500; }
.chip:hover { border-color: var(--accent); color: var(--accent-text); }
.chip.on { background: var(--accent-soft); border-color: var(--accent); color: var(--accent-text); }
details { margin-top: 10px; border-top: 1px solid var(--border); padding-top: 6px; font-size: 12.5px; }
summary { cursor: pointer; color: var(--muted); }
.msg { font-size: 12px; } .msg.ok { color: var(--ok); } .msg.err { color: var(--danger); }
.field { margin-top: 10px; }
.field > span { display: block; font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; }
input, textarea, .editor {
  width: 100%; font: inherit; color: var(--text); background: var(--bg);
  border: 1px solid var(--border); border-radius: 8px; padding: 6px 9px; outline: none;
}
input:focus, textarea:focus, .editor:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
textarea { resize: vertical; min-height: 54px; }
.editor { min-height: 60px; line-height: 1.6; white-space: pre-wrap; }
.editor:empty::before { content: attr(data-placeholder); color: var(--faint); }
.editor [data-cloze] { background: var(--accent-soft); color: var(--accent-text); border-bottom: 2px solid var(--accent); border-radius: 3px; padding: 0 2px; font-weight: 600; }
.toolbar { display: flex; gap: 2px; margin-bottom: 4px; }
.tool { min-width: 28px; height: 26px; border-radius: 6px; color: var(--muted); font-size: 13px; padding: 0 7px; }
.tool:hover { background: var(--surface); color: var(--text); }
.tool.cloze { color: var(--accent-text); font-weight: 600; }
.group-label { font-size: 11px; font-weight: 700; color: var(--accent-text); letter-spacing: .05em; margin-top: 10px; }
.colloc-row { margin-top: 4px; }
.form-item { padding: 5px 0; border-top: 1px dashed var(--border); font-size: 13px; }
.form-item .row { gap: 6px; }
.form-item.main { border-top: 0; border-bottom: 2px solid var(--accent); padding-bottom: 7px; margin-bottom: 2px; font-size: 15px; }
.form-pos { color: var(--muted); font-size: 11px; }
.form-ex { color: var(--muted); font-style: italic; font-size: 12px; }
.form-ex:empty { display: none; }
.form-link { font-size: inherit; font-weight: 500; }
.loading { color: var(--muted); font-size: 13px; margin-top: 10px; }
`;
