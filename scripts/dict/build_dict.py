#!/usr/bin/env python3
"""Build the offline dictionaries of Anki Quick Add (data/dict/{en,vi}/*.json).

    npm run dict                 # = python3 scripts/dict/build_dict.py
    python3 scripts/dict/build_dict.py --config my.json --txt

Sources are listed in dictionaries.json (open dictionaries, downloaded on the
first run into .cache/dict/) and, optionally, dictionaries.local.json (your own
files, not committed). Python 3.9+, standard library only.

Source types
  en-vi  skypediacode-sqlite  the skypediacode SQLite database
         lingoes              Lingoes .ld2 with "@word /ipa/ *pos -meaning" entries (e.g. Lingoes English-Vietnamese)
         lingoes-html         Lingoes .ld2 with HTML entries (e.g. Free English-Vietnamese)
         lingoes-technical    Lingoes .ld2 technical dictionary (Prodict style): adds a "Technical" section
         tsv                  text file: word <TAB> meaning[; meaning…] [<TAB> /ipa/] [<TAB> part of speech]
  vi-en  yomitan              Yomitan/Yomichan .zip; "style": definitions | words | babylon | spdict
         tsv                  text file: vietnamese <TAB> english[, english…]
  forms  wordnet              WordNet 3.x database dir (npm package wordnet-db) → word families
"""
import argparse, collections, glob, html, io, json, os, re, sqlite3, struct, sys, unicodedata, urllib.request, zipfile, zlib

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CACHE = os.path.join(ROOT, '.cache', 'dict')

# ---------------------------------------------------------------- helpers

def unaccent(s):
    s = s.replace('đ', 'd').replace('Đ', 'D')
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')

def shard_key(word):  # must match src/background/dictionary.ts
    k = re.sub(r'[^a-z]', '_', unaccent(word[:2]).lower())
    return (k + '_')[:2]

POS_VI = [(r'ngoại động từ|nội động từ|động từ', 'verb'), (r'danh từ', 'noun'), (r'tính từ', 'adjective'),
          (r'phó từ|trạng từ', 'adverb'), (r'giới từ', 'preposition'), (r'liên từ', 'conjunction'),
          (r'thán từ', 'interjection'), (r'đại từ', 'pronoun'), (r'mạo từ', 'article'), (r'thành ngữ', 'idiom')]
POS_EN = {'n': 'noun', 'noun': 'noun', 'v': 'verb', 'verb': 'verb', 'adj': 'adjective', 'a': 'adjective', 'adjective': 'adjective',
          'adv': 'adverb', 'adverb': 'adverb', 'prep': 'preposition', 'conj': 'conjunction', 'pron': 'pronoun', 'idiom': 'idiom'}
VI_RE = re.compile('[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]', re.I)

def pos_vi(s):
    for r, p in POS_VI:
        if re.search(r, s): return p
    return s.strip()

def merge_groups(groups):
    """Merge meaning groups with the same part of speech; drop duplicate meanings."""
    out = []
    for g in groups:
        prev = next((x for x in out if x['p'] and x['p'] == g['p']), None)
        if prev: prev['m'] += g['m']; prev['x'] += g.get('x', [])
        else: out.append({'p': g['p'], 'm': list(g['m']), 'x': list(g.get('x', []))})
    for g in out:
        seen = set(); g['m'] = [m for m in g['m'] if not (m.lower() in seen or seen.add(m.lower()))]
        g['x'] = g['x'][:3]
        if not g['x']: del g['x']
    return [g for g in out if g['m']]

def resolve(path):
    return path if os.path.isabs(path) else os.path.join(ROOT, path)

def fetch(src):
    """Local file ("file") or a download ("url", cached in .cache/dict/)."""
    if src.get('file'):
        path = resolve(src['file'])
        if not os.path.exists(path): sys.exit(f"✗ {src['name']}: file not found: {src['file']}")
        return path
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, os.path.basename(src['url'].split('?')[0]))
    if not os.path.exists(path):
        print(f"  downloading {src['url']}")
        tmp = path + '.part'
        with urllib.request.urlopen(src['url'], timeout=120) as r, open(tmp, 'wb') as f:
            while chunk := r.read(1 << 20): f.write(chunk)
        os.replace(tmp, path)
    return path

# ---------------------------------------------------------------- Lingoes .ld2

def read_ld2(path):
    """Lingoes .ld2 → {headword: raw definition}."""
    data = open(path, 'rb').read()
    I = lambda p: struct.unpack_from('<i', data, p)[0]
    off = I(0x5C) + 0x60
    if I(off) != 3: off = I(off + 4) + off + 8  # skip the header section
    limit = I(off + 4) + off + 8
    oidx = off + 0x1C
    ocdh = I(off + 8) + oidx
    wil, wl = I(off + 12), I(off + 16)
    ndef = (ocdh - oidx) // 4
    pos, streams = ocdh + 8, []
    o = I(pos)
    while o + pos < limit:
        o = I(pos); streams.append(o); pos += 4
    raw, start = bytearray(), pos
    for e in streams:
        try: raw += zlib.decompress(data[start:pos + e])
        except zlib.error: pass
        start = pos + e
    raw = bytes(raw)
    R = lambda p: struct.unpack_from('<i', raw, p)[0]
    idx = lambda p: (R(p), R(p + 4), raw[p + 8], raw[p + 9], R(p + 10), R(p + 14))
    def dec(b):
        for enc in ('utf-8', 'utf-16-le'):
            try: return b.decode(enc)
            except UnicodeDecodeError: pass
        return b.decode('utf-8', 'replace')
    ow, ox, out = wil, wil + wl, {}
    for i in range(ndef):
        lw, lx, _, refs, cw, cx = idx(10 * i)
        xml = dec(raw[ox + lx: ox + cx]).strip()
        while refs > 0:
            b = idx(10 * R(ow + lw))
            x2 = dec(raw[ox + b[1]: ox + b[5]]).strip()
            xml = x2 if not xml else x2 + ', ' + xml
            lw += 4; refs -= 1
        word = dec(raw[ow + lw: ow + cw]).strip()
        if word: out[word] = xml
    return out

def clean_markup(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s.replace('<n />', '\n'))).strip()

def old_ipa(s):
    return s.replace("'", 'ˈ').replace(',', 'ˌ').replace(':', 'ː').replace(' /', '/').replace('/ ', '/')

def parse_lingoes_text(text):
    """"@word /ipa/  *part of speech  -meaning" (Lingoes / OVDP style)."""
    secs = [x for x in re.split(r'\n\s*\n', text) if x.strip()]
    if not secs: return None
    score = lambda s: len(re.findall(r'^\s*\*', s, re.M)) * 1000 + len(re.findall(r'^\s*-', s, re.M))
    sec = max(secs, key=score)
    m = re.search(r'^@\S.*?(/[^/\n]+/)', text, re.M)
    groups, cur = [], None
    for line in sec.split('\n')[1:]:
        s = line.strip()
        if s.startswith('*'): cur = {'p': pos_vi(s[1:]), 'm': [], 'x': []}; groups.append(cur)
        elif s.startswith('-'):
            if cur is None: cur = {'p': '', 'm': [], 'x': []}; groups.append(cur)
            cur['m'].append(s[1:].strip())
    g = merge_groups(groups)
    return {'i': old_ipa(m.group(1)) if m else '', 'g': g} if g else None

def parse_lingoes_html(v):
    t = re.sub(r'<b><i>\s*([^<]+)</i></b>', r'\n*\1\n', v)
    t = re.sub(r"<font color='#cc0000'><b>\s*([^<]+)</b></font>", r'\n-\1\n', t)
    head, _, body = t.partition('<ul>')
    t = '@' + clean_markup(re.sub(r'<br\s*/?>', '\n', head)) + '\n' + clean_markup(body)
    return parse_lingoes_text(re.sub(r'\n\s*\n', '\n', t))

def parse_technical(v):
    v = html.unescape(v.replace('&nbsp;', ' '))
    mean = [m.strip() for m in re.findall(r'<IMG[^>]*>\s*<FONT color="#000000">([^<]+)</FONT>', v)]
    ph = re.findall(r'<FONT face="Tahoma" color=#ff3300 >([^<]+)</FONT><FONT face="Tahoma" color=#282828>:?\s*([^<]*)</FONT>', v)
    seen = set(); mean = [m for m in mean if m and not (m in seen or seen.add(m))]
    return {'m': mean[:10], 'ph': [[a.strip(), b.strip()] for a, b in ph[:6]]} if (mean or ph) else None

# ---------------------------------------------------------------- English → Vietnamese

def en_skypediacode(path):
    c = sqlite3.connect(path)
    ipa = {}
    for wid, i in c.execute('select word_id, ipa from pronunciations order by (region is not null), id'):
        ipa.setdefault(wid, i)
    POS = {'N': 'noun', 'V': 'verb', 'A': 'adjective', 'D': 'adverb', 'C': 'conjunction', 'P': 'pronoun',
           'E': 'preposition', 'O': 'interjection', 'M': 'number', 'name': 'name', **POS_EN}
    tmp = collections.OrderedDict()
    for wid, word, de, pos, ex in c.execute('''select w.id, w.word, d.definition, d.pos, wd.example from words w
            join word_definitions wd on wd.word_id = w.id join definitions d on d.id = wd.definition_id order by w.id, wd.id'''):
        e = tmp.setdefault(word.strip().lower(), {'i': ipa.get(wid, ''), 'g': []})
        if not e['i'] and ipa.get(wid): e['i'] = ipa[wid]
        e['g'].append({'p': POS.get(pos, ''), 'm': [de.strip().rstrip('.')], 'x': [ex.strip()] if ex else []})
    for e in tmp.values(): e['g'] = merge_groups(e['g'])
    return tmp

def en_tsv(path):
    out = {}
    for line in open(path, encoding='utf-8'):
        if not line.strip() or line.startswith('#'): continue
        cols = line.rstrip('\n').split('\t')
        if len(cols) < 2: continue
        word, meanings = cols[0].strip().lower(), [m.strip() for m in cols[1].split(';') if m.strip()]
        ipa = cols[2].strip() if len(cols) > 2 else ''
        pos = POS_EN.get(cols[3].strip().lower(), cols[3].strip()) if len(cols) > 3 else ''
        if word and meanings:
            e = out.setdefault(word, {'i': ipa, 'g': []})
            e['g'] = merge_groups(e['g'] + [{'p': pos, 'm': meanings}])
    return out

def build_en(sources):
    EN = {}
    for src in sources:
        path, t = fetch(src), src['type']
        before = len(EN)
        if t == 'lingoes-technical':
            extra = only = 0
            for w, v in read_ld2(path).items():
                k, tech = w.strip().lower(), parse_technical(v)
                if not tech: continue
                if k in EN:
                    if 't' not in EN[k]: EN[k]['t'] = tech; extra += 1
                else:
                    EN[k] = {'i': '', 'g': [], 't': tech, 's': 'pd'}; only += 1
            print(f"✓ {src['name']}: technical meanings for {extra} words, {only} technical-only words")
            continue
        if t == 'skypediacode-sqlite': entries, tag = en_skypediacode(path), 'sk'
        elif t == 'tsv': entries, tag = en_tsv(path), 'lv'
        elif t in ('lingoes', 'lingoes-html'):
            parse = parse_lingoes_text if t == 'lingoes' else parse_lingoes_html
            raw, entries, tag = read_ld2(path), {}, 'lv'
            for w, v in raw.items():
                p = parse(clean_markup(v) if t == 'lingoes' else v)
                if p: entries[w.strip().lower()] = p
        else:
            sys.exit(f"✗ {src['name']}: unknown en-vi type {t!r}")
        for k, e in entries.items():
            if k and k not in EN: EN[k] = {**e, 's': tag}
        print(f"✓ {src['name']}: +{len(EN) - before} words (total {len(EN)})")
    return EN

# ---------------------------------------------------------------- Vietnamese → English

def read_yomitan(path):
    terms = collections.defaultdict(list)
    with zipfile.ZipFile(path) as z:
        for name in z.namelist():
            if re.search(r'(^|/)term_bank_\d+\.json$', name):
                for t in json.load(io.TextIOWrapper(z.open(name), encoding='utf-8')):
                    for gl in t[5]:
                        if isinstance(gl, str): terms[t[0].strip().lower()].append(gl)
    return terms

def chips_from(text):
    """English words/short phrases ("chips") in a definition."""
    out = []
    for part in re.split(r'[;,]|\n', text):
        s = re.sub(r'\([^)]*\)|\[[^\]]*\]', '', part).strip().strip('-*.').strip()
        s = re.sub(r'\s+', ' ', s)
        if not s or VI_RE.search(s) or not re.match(r"^[A-Za-z][A-Za-z' .-]*$", s): continue
        if len(s.split()) > 4 or len(s) > 32: continue
        out.append(s[0].lower() + s[1:] if not s[:2].isupper() else s)
    return out

def definition_lines(gl):
    res, pos = [], ''
    for line in gl.split('\n'):
        line = line.strip()
        if line.startswith('*'): pos = pos_vi(line[1:].strip()) if VI_RE.search(line) else line[1:].strip()
        elif line.startswith('@Chuyên ngành'): break
        elif line.startswith('-'): res.append((pos, line[1:].strip()))
    return res

def build_vi(sources):
    VI = collections.OrderedDict()
    def entry(k):
        return VI.setdefault(k, {'c': [], 'g': collections.OrderedDict(), 'x': [], 't': []})
    def add_chips(e, chips):
        have = {re.sub(r'^to ', '', x.lower()) for x in e['c']}
        for c in chips:
            n = re.sub(r'^to ', '', c.lower())
            if n not in have: e['c'].append(c); have.add(n)
    for src in sources:
        path, t = fetch(src), src['type']
        if t == 'tsv':
            terms = collections.defaultdict(list)
            for line in open(path, encoding='utf-8'):
                cols = line.rstrip('\n').split('\t')
                if len(cols) >= 2 and not line.startswith('#'): terms[cols[0].strip().lower()].append(cols[1])
            style = 'words'
        elif t == 'yomitan':
            terms, style = read_yomitan(path), src.get('style', 'definitions')
        else:
            sys.exit(f"✗ {src['name']}: unknown vi-en type {t!r}")
        for k, glosses in terms.items():
            if style == 'spdict' and k not in VI and not VI_RE.search(k): continue  # its unaccented heads are mostly English
            e = entry(k)
            for gl in glosses:
                if style == 'definitions':
                    for pos, d in definition_lines(gl):
                        group = e['g'].setdefault(pos, [])
                        if d not in group: group.append(d)
                        add_chips(e, chips_from(d))
                    for m in re.finditer(r'^[=→](.+?)(?:\+|\n)(.+)$', gl, re.M):
                        e['x'].append([m.group(1).strip(), m.group(2).strip()])
                elif style == 'words':
                    add_chips(e, chips_from(gl))
                elif style == 'babylon':
                    lines = [x.strip() for x in gl.split('\n') if x.strip()]
                    if not lines: continue
                    first = re.sub(r'^\[[^\]]*\]\s*', '', lines[0])
                    if not e['c']: add_chips(e, chips_from(first))
                    if not e['g']: e['g'].setdefault('', []).append(first)
                    rest, i = lines[1:], 0
                    while i + 1 < len(rest) and len(e['x']) < 4:
                        if VI_RE.search(rest[i]) and not VI_RE.search(rest[i + 1]): e['x'].append([rest[i], rest[i + 1]]); i += 2
                        else: i += 1
                elif style == 'spdict':
                    if not e['c']:
                        for _, d in definition_lines(gl): add_chips(e, chips_from(d))
                    for m in re.finditer(r'@Chuyên ngành ([^\n]+)\n((?:-[^\n]*\n?)+)', gl):
                        items = [x.strip('- ').strip() for x in m.group(2).split('\n') if x.strip('- ').strip()]
                        if [m.group(1).strip(), items[:6]] not in e['t']: e['t'].append([m.group(1).strip(), items[:6]])
        print(f"✓ {src['name']}: {len(terms)} entries")
    out = {}
    for k, e in VI.items():
        if not e['c'] and not e['g']: continue
        r = {'c': e['c'][:10]}
        g = [{'p': p, 'm': m[:6]} for p, m in e['g'].items() if m]
        if g: r['g'] = g[:4]
        if e['x']:
            seen = set(); r['x'] = [x for x in e['x'] if not (x[0] in seen or seen.add(x[0]))][:3]
        if e['t']: r['t'] = e['t'][:4]
        out[k] = r
    print(f"  Vietnamese headwords: {len(out)}")
    return out

# ---------------------------------------------------------------- word families (WordNet)

def add_forms(EN, wn_dir):
    if not os.path.isdir(wn_dir):
        print(f"! WordNet not found at {wn_dir} (run npm install) — word forms skipped"); return
    POS = {'n': 'noun', 'v': 'verb', 'a': 'adjective', 'r': 'adverb'}
    files = {'n': 'data.noun', 'v': 'data.verb', 'a': 'data.adj', 'r': 'data.adv'}
    words, edges = {}, []
    for pl, fn in files.items():
        for line in open(os.path.join(wn_dir, fn), encoding='latin-1'):
            if line.startswith('  '): continue
            parts = line.split(' | ')[0].split()
            off, ss_type, wcnt = parts[0], parts[2], int(parts[3], 16)
            key = ('a' if ss_type == 's' else ss_type, off)
            words[key] = [parts[4 + 2 * i].lower() for i in range(wcnt)]
            i = 4 + 2 * wcnt
            for _ in range(int(parts[i])):
                sym, poff, ppos, st = parts[i + 1:i + 5]; i += 4
                if sym in ('+', '\\', '<') and st != '0000':  # derivation, pertainym, participle
                    edges.append((key, int(st[:2], 16), ('a' if ppos == 's' else ppos, poff), int(st[2:], 16)))
    graph, lemma_pos = collections.defaultdict(set), collections.defaultdict(set)
    for key, ws in words.items():
        for w in ws: lemma_pos[w].add(key[0])
    for src, si, tgt, ti in edges:
        try: a, b = (words[src][si - 1], src[0]), (words[tgt][ti - 1], tgt[0])
        except (KeyError, IndexError): continue
        if a != b: graph[a].add(b); graph[b].add(a)
    ok = lambda w: w.isalpha() and len(w) > 1
    general = {k for k, e in EN.items() if e.get('g')}
    order = {'n': 0, 'v': 1, 'a': 2, 'r': 3}
    def family(word):
        seen = {(word, p) for p in lemma_pos.get(word, ())}
        frontier = list(seen)
        for _ in range(2):
            nxt = []
            for node in frontier:
                for nb in graph.get(node, ()):
                    if nb not in seen and ok(nb[0]) and nb[0][:3] == word[:3]: seen.add(nb); nxt.append(nb)
            frontier = nxt
        fam = [[w, POS[p]] for w, p in sorted(seen, key=lambda x: (x[0] != word, order[x[1]], len(x[0]), x[0]))
               if w == word or w in general][:12]
        have = {tuple(x) for x in fam}
        for w, p in list(fam):
            if p == 'adjective':
                for adv in [w + 'ly'] + ([w[:-1] + 'ily'] if w.endswith('y') else []) + ([w[:-1] + 'y'] if w.endswith('le') else []) + ([w + 'ally'] if w.endswith('ic') else []):
                    if adv in general and (adv, 'adverb') not in have: fam.append([adv, 'adverb']); have.add((adv, 'adverb'))
        return fam
    n = 0
    for k, e in EN.items():
        if ' ' in k or not ok(k): continue
        fam = family(k)
        if len(fam) > 1: e['f'] = fam; n += 1
    print(f"✓ WordNet word families: {n} words")

# ---------------------------------------------------------------- output

def write_shards(D, out_dir):
    shards = collections.defaultdict(dict)
    for k, v in D.items(): shards[shard_key(k)][k] = v
    os.makedirs(out_dir, exist_ok=True)
    for f in glob.glob(os.path.join(out_dir, '*.json')): os.remove(f)
    for s, d in shards.items():
        with open(os.path.join(out_dir, s + '.json'), 'w', encoding='utf-8') as f:
            json.dump(d, f, ensure_ascii=False, separators=(',', ':'))

def write_txt(EN, VI, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, 'en-vi.txt'), 'w', encoding='utf-8') as f:
        for k in sorted(EN):
            e = EN[k]
            parts = [('[' + g['p'] + '] ' if g['p'] else '') + '; '.join(g['m']) for g in e['g']]
            if 't' in e: parts.append('[tech] ' + '; '.join(e['t']['m']))
            f.write(f"{k}\t{e['i']}\t{' | '.join(parts)}\t{e['s']}\n")
    with open(os.path.join(out_dir, 'vi-en.txt'), 'w', encoding='utf-8') as f:
        for k in sorted(VI):
            e = VI[k]
            f.write(f"{k}\t{', '.join(e['c'])}\t{' | '.join(('[' + g['p'] + '] ' if g['p'] else '') + '; '.join(g['m']) for g in e.get('g', []))}\n")

def load_config(path, use_local=True):
    cfg = json.load(open(path, encoding='utf-8'))
    for lang in ('en-vi', 'vi-en'):
        for s in cfg.get(lang, []): s['shared'] = s.get('enabled', True)  # open source, on by default
    local = os.path.join(ROOT, 'dictionaries.local.json')
    if use_local and path == os.path.join(ROOT, 'dictionaries.json') and os.path.exists(local):
        extra = json.load(open(local, encoding='utf-8'))
        print('using dictionaries.local.json')
        for lang in ('en-vi', 'vi-en'):
            shared = cfg.get(lang, [])
            names = {s['name']: i for i, s in enumerate(shared)}
            first, last = [], []
            for s in extra.get(lang, []):
                if s['name'] in names: shared[names[s['name']]] = {**shared[names[s['name']]], **s}  # e.g. {"name": …, "enabled": true}
                elif s.get('first'): first.append(s)  # before the shared sources: wins
                else: last.append(s)  # after: only fills gaps
            cfg[lang] = first + shared + last
        if 'forms' in extra: cfg['forms'] = extra['forms']
    return cfg

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--config', default=os.path.join(ROOT, 'dictionaries.json'))
    ap.add_argument('--out', default=os.path.join(ROOT, 'data', 'dict'))
    ap.add_argument('--txt', action='store_true', help='also write plain-text copies to resources/')
    ap.add_argument('--public', action='store_true', help='only the shareable sources of dictionaries.json (for releases)')
    a = ap.parse_args()
    cfg = load_config(os.path.abspath(a.config), use_local=not a.public)
    enabled = lambda lang: [s for s in cfg.get(lang, []) if s.get('enabled', True)]
    print('English → Vietnamese'); EN = build_en(enabled('en-vi'))
    forms = cfg.get('forms')
    if forms and forms.get('enabled', True): add_forms(EN, resolve(forms['dir']))
    print('Vietnamese → English'); VI = build_vi(enabled('vi-en'))
    write_shards(EN, os.path.join(a.out, 'en'))
    write_shards(VI, os.path.join(a.out, 'vi'))
    # What went into this build — `npm run package` refuses builds with private sources.
    used = [{'lang': lang, 'name': s['name'], 'license': s.get('license', ''), 'home': s.get('home', ''), 'shareable': s.get('shared') is True}
            for lang in ('en-vi', 'vi-en') for s in enabled(lang)]
    with open(os.path.join(a.out, 'sources.json'), 'w', encoding='utf-8') as f:
        json.dump(used, f, ensure_ascii=False, indent=1)
    if a.txt: write_txt(EN, VI, os.path.join(ROOT, 'resources'))
    print(f"done → {os.path.relpath(a.out, ROOT)}: {len(EN)} English, {len(VI)} Vietnamese headwords. Run `npm run build:data`.")

if __name__ == '__main__':
    main()
