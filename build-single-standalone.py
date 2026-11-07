#!/usr/bin/env python3
"""Build a self-contained EXTRACTION DOOM HTML using a browser import map.
All JS modules and local media assets are embedded as data URLs; no Vite runtime/server is required.
"""
from pathlib import Path
import base64, json, mimetypes, posixpath, re
mimetypes.add_type('image/webp', '.webp')

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'src'
OUT = ROOT / 'dist-single'
OUT.mkdir(parents=True, exist_ok=True)


def data_url(path: Path) -> str:
    mime = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
    raw = path.read_bytes()
    return f'data:{mime};base64,' + base64.b64encode(raw).decode('ascii')

asset_cache = {}
def asset_data(rel: str, base_dir: str) -> str:
    resolved = posixpath.normpath(posixpath.join(base_dir, rel)).lstrip('/')
    # new URL() paths are relative to a module under src; CSS paths are relative to src/styles.
    p = ROOT / resolved
    if not p.is_file():
        raise FileNotFoundError(f'No se encontró recurso: {resolved}')
    if resolved not in asset_cache:
        asset_cache[resolved] = data_url(p)
    return asset_cache[resolved]

module_files = sorted(SRC.rglob('*.js'))
imports_map = {}
module_sources = {}
import_re = re.compile(r"(?P<prefix>\bfrom\s*|\bimport\s*)(?P<q>['\"])(?P<spec>\.{1,2}/[^'\"]+\.js)(?P=q)")
url_re = re.compile(r"new\s+URL\(\s*(['\"])(?P<path>\.\.?/[^'\"]+)\1\s*,\s*import\.meta\.url\s*\)\.href")

for f in module_files:
    rel = f.relative_to(ROOT).as_posix()
    source = f.read_text(encoding='utf-8')
    # Rewrite static relative module imports to import-map aliases.
    def rewrite_import(m):
        target = posixpath.normpath(posixpath.join(posixpath.dirname(rel), m.group('spec')))
        if not (ROOT / target).is_file():
            raise FileNotFoundError(f'{rel}: import no encontrado {m.group("spec")} -> {target}')
        return m.group('prefix') + m.group('q') + 'edm/' + target + m.group('q')
    source = import_re.sub(rewrite_import, source)
    # Resolve asset URLs that were normally made relative to import.meta.url.
    def rewrite_asset(m):
        return json.dumps(asset_data(m.group('path'), posixpath.dirname(rel)))
    source = url_re.sub(rewrite_asset, source)
    if 'import.meta.url' in source:
        raise RuntimeError(f'import.meta.url no resuelto en {rel}')
    module_sources['edm/' + rel] = source

for spec, source in module_sources.items():
    imports_map[spec] = 'data:text/javascript;base64,' + base64.b64encode(source.encode('utf-8')).decode('ascii')

# Inline all CSS in the same order as the source index.
css_names = ['base', 'skin-tactico', 'boot-screen', 'armor-icons', 'bigmap-zoom']
css_parts = []
css_url_re = re.compile(r"url\(\s*(['\"]?)(?P<path>\.\.?/[^)'\"]+)\1\s*\)")
for name in css_names:
    css_path = SRC / 'styles' / f'{name}.css'
    css = css_path.read_text(encoding='utf-8')
    css = css_url_re.sub(lambda m: 'url(' + asset_data(m.group('path'), 'src/styles') + ')', css)
    css_parts.append(css)
css_text = '\n'.join(css_parts)

html = (ROOT / 'index.html').read_text(encoding='utf-8')
# Remove external CSS links and Google font fetch; include CSS inline.
html = re.sub(r'<link[^>]+href="/src/styles/[^\"]+"[^>]*>\s*', '', html)
html = re.sub(r'<link[^>]+fonts\.googleapis\.com[^>]*>\s*', '', html)
html = re.sub(r'<link[^>]+fonts\.gstatic\.com[^>]*>\s*', '', html)
html = html.replace('</head>', '<style>\n' + css_text + '\n</style>\n</head>')

# Inline local assets referenced directly by the HTML (intro video, logos, menu thumbnails).
html_asset_re = re.compile(r'(?P<attr>src|href)="/src/assets/(?P<path>[^"]+)"')
def rewrite_html_asset(m):
    return m.group('attr') + '=' + json.dumps(asset_data('src/assets/' + m.group('path'), ''))
html = html_asset_re.sub(rewrite_html_asset, html)

# Replace all four external module script tags with a single bootstrap and import map.
html = re.sub(r'<script type="module" src="/src/[^\"]+"><\/script>\s*', '', html)
entry = '''<script type="importmap">''' + json.dumps({'imports': imports_map}, separators=(',', ':')) + '''</script>
<script type="module">
import 'edm/src/main.js';
import 'edm/src/iconos-tacticos.js';
import 'edm/src/boot-loader.js';
import 'edm/src/orientation.js';
</script>'''
html = html.replace('</body>', entry + '\n</body>')
# Verify that no root-relative source or asset URLs remain in the HTML.
if re.search(r'[\"\']/(?:src|assets)/', html):
    raise RuntimeError('Quedaron rutas absolutas a /src/ o /assets/ en el HTML')

out_file = OUT / 'index.html'
out_file.write_text(html, encoding='utf-8')
print(f'OK: {out_file} ({out_file.stat().st_size:,} bytes)')
print(f'Módulos embebidos: {len(module_files)} | Recursos embebidos: {len(asset_cache)}')
