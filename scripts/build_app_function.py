#!/usr/bin/env python3
"""Genere l'Edge Function `app` qui heberge le frontend sur Supabase.

Le frontend compile (dist/) est inline en un seul fichier HTML (JS + CSS
integres), embarque en base64 dans une Edge Function Deno qui le sert.
Cela permet d'utiliser l'outil via une simple URL, sans hebergement tiers :
    https://<PROJECT_REF>.supabase.co/functions/v1/app

Usage :
    npm run build            # avec VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
    python3 scripts/build_app_function.py
    # puis deployer build/app-fn/index.ts comme fonction `app`
    # (verify_jwt desactive) via le CLI supabase ou l'API de gestion.
"""

import base64
import glob
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
OUT = ROOT / "build" / "app-fn"

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

b64 = base64.b64encode(html.encode()).decode()

function_source = f'''// Edge Function `app` — sert le frontend compile, inline en un seul fichier.
// GENERE par scripts/build_app_function.py — ne pas editer a la main.

const HTML_B64 = "{b64}";
const HTML = new TextDecoder().decode(
  Uint8Array.from(atob(HTML_B64), (c) => c.charCodeAt(0)),
);

Deno.serve(() =>
  new Response(HTML, {{
    headers: {{
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
    }},
  }})
);
'''

OUT.mkdir(parents=True, exist_ok=True)
(OUT / "index.ts").write_text(function_source)
print(f"Genere : {OUT / 'index.ts'} ({len(function_source)} octets)")
