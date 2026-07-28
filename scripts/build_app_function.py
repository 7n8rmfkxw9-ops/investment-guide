#!/usr/bin/env python3
"""Genere une version monofichier de l'application (build/app.html).

Le frontend compile (dist/) est inline en un seul fichier HTML autonome
(JS + CSS integres) qui s'ouvre directement dans un navigateur (double-clic)
et se connecte au projet Supabase. C'est le mode de distribution retenu pour
un usage personnel : le domaine partage *.supabase.co refuse volontairement de
servir du HTML (protection anti-hameçonnage), donc pas d'hebergement possible
via une Edge Function sans domaine personnalise.

Usage :
    VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm run build
    python3 scripts/build_app_function.py
    # puis ouvrir build/app.html dans un navigateur
"""

import glob
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
OUT = ROOT / "build"

html = (DIST / "index.html").read_text()
js_files = glob.glob(str(DIST / "assets" / "*.js"))
css_files = glob.glob(str(DIST / "assets" / "*.css"))
if not js_files or not css_files:
    raise SystemExit("dist/ incomplet — lancer `npm run build` d'abord")

js = pathlib.Path(js_files[0]).read_text().replace("</script", "<\\/script")
css = pathlib.Path(css_files[0]).read_text()

html = re.sub(r'<script type="module"[^>]*></script>', "", html)
html = re.sub(r'<link rel="stylesheet"[^>]*>', f"<style>{css}</style>", html)
html = html.replace("</body>", f'<script type="module">{js}</script></body>')

OUT.mkdir(parents=True, exist_ok=True)
(OUT / "app.html").write_text(html)
print(f"Genere : {OUT / 'app.html'} ({len(html)} octets)")
