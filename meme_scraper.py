"""Scraper de meme.com: descarga los artículos en Markdown, los traduce y los guarda en SQLite.

Uso:
    python meme_scraper.py --limit 10            # prueba con 10 memes
    python meme_scraper.py                       # todo el sitemap (reanudable)
    python meme_scraper.py --no-translate        # solo descargar
    python meme_scraper.py --translate-only      # traducir lo ya descargado
"""
import argparse
import re
import sqlite3
import sys
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

import requests

SITEMAP_URL = "https://meme.com/sitemap.xml"
IMAGE_SITEMAP_URL = "https://meme.com/image-sitemap.xml"
TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single"
NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9",
      "i": "http://www.google.com/schemas/sitemap-image/1.1"}
# Páginas de listado bajo /memes/ que no son artículos
NON_ARTICLES = {"trending", "topics", "recent", "creators", "tags"}
CHUNK_CHARS = 4500  # Google Translate admite ~5000 caracteres por petición
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; meme-scraper/1.0)"}

SCHEMA = """
CREATE TABLE IF NOT EXISTS memes (
    slug          TEXT PRIMARY KEY,
    url           TEXT NOT NULL,
    lastmod       TEXT,
    image_url     TEXT,
    title         TEXT,
    summary       TEXT,
    content_md    TEXT,
    summary_tr    TEXT,
    content_tr    TEXT,
    lang          TEXT,
    status        TEXT NOT NULL DEFAULT 'pending',  -- pending | scraped | translated | error
    error         TEXT,
    scraped_at    TEXT,
    translated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_memes_status ON memes(status);
"""


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def new_session():
    session = requests.Session()
    session.headers.update(HEADERS)
    return session


def get(session, url, retries=3):
    for attempt in range(1, retries + 1):
        try:
            r = session.get(url, timeout=30)
            if r.status_code == 404:
                return None
            if r.status_code == 429 or r.status_code >= 500:
                raise requests.HTTPError(f"HTTP {r.status_code}")
            r.raise_for_status()
            r.encoding = "utf-8"
            return r.text
        except requests.RequestException:
            if attempt == retries:
                raise
            time.sleep(5 * attempt)


def load_sitemap(session):
    root = ET.fromstring(get(session, SITEMAP_URL).encode("utf-8"))
    for u in root.findall("s:url", NS):
        loc = u.find("s:loc", NS).text
        lastmod = u.find("s:lastmod", NS)
        m = re.fullmatch(r"https://meme\.com/memes/([^/]+)", loc)
        if m and m.group(1) not in NON_ARTICLES:
            yield m.group(1), loc, lastmod.text if lastmod is not None else None


def load_image_sitemap(session):
    """Devuelve {url del meme: url de su imagen principal}."""
    root = ET.fromstring(get(session, IMAGE_SITEMAP_URL).encode("utf-8"))
    images = {}
    for u in root.findall("s:url", NS):
        img = u.find("i:image/i:loc", NS)
        if img is not None:
            # El sitemap trae algunas URLs con doble barra (cdn-v2.meme.com//memes/...)
            images[u.find("s:loc", NS).text] = re.sub(r"(?<!:)/{2,}", "/", img.text.strip())
    return images


def parse_md(md):
    """Extrae título (# ...) y resumen (> ...) del Markdown."""
    title = re.search(r"^# (.+)$", md, re.M)
    summary = re.search(r"^> (.+)$", md, re.M)
    return (title.group(1).strip() if title else None,
            summary.group(1).strip() if summary else None)


def chunks(text, size=CHUNK_CHARS):
    """Parte el texto por párrafos sin superar `size` caracteres por bloque."""
    buf = ""
    for para in text.split("\n\n"):
        while len(para) > size:  # párrafo gigante: cortar por líneas/espacios
            cut = para.rfind("\n", 0, size)
            cut = cut if cut > 0 else para.rfind(" ", 0, size)
            cut = cut if cut > 0 else size
            if buf:
                yield buf
                buf = ""
            yield para[:cut]
            para = para[cut:].lstrip()
        if buf and len(buf) + 2 + len(para) > size:
            yield buf
            buf = para
        else:
            buf = f"{buf}\n\n{para}" if buf else para
    if buf:
        yield buf


def google_translate(session, text, lang):
    r = session.post(TRANSLATE_URL, params={"client": "gtx", "sl": "en", "tl": lang, "dt": "t"},
                     data={"q": text}, timeout=60)
    r.raise_for_status()
    return "".join(seg[0] for seg in r.json()[0] if seg[0])


def translate(session, text, lang, delay, image_url=None):
    if not text:
        return text
    # El título (# ...) es el nombre del meme: se conserva en inglés
    head = ""
    if text.startswith("# "):
        head, _, text = text.partition("\n")
        head += "\n\n"
        text = text.lstrip("\n")
        if image_url:
            head += f"![{head[2:].strip()}]({image_url})\n\n"
    out = []
    for chunk in chunks(text):
        for attempt in range(1, 4):
            try:
                out.append(google_translate(session, chunk, lang))
                break
            except Exception:
                if attempt == 3:
                    raise
                time.sleep(10 * attempt)
        time.sleep(delay)
    return head + "\n\n".join(out)


def sync_sitemap(db, session):
    """Inserta memes nuevos y marca como pendientes los que cambiaron de lastmod."""
    images = load_image_sitemap(session)
    urls = list(load_sitemap(session))
    new = changed = 0
    print(f"Sitemap: {len(urls)} URLs de artículos encontradas", flush=True)
    for index, (slug, url, lastmod) in enumerate(urls, 1):
        row = db.execute("SELECT lastmod FROM memes WHERE slug=?", (slug,)).fetchone()
        if row is None:
            db.execute("INSERT INTO memes(slug, url, lastmod) VALUES (?,?,?)", (slug, url, lastmod))
            new += 1
        elif row[0] != lastmod:
            db.execute("UPDATE memes SET lastmod=?, status='pending' WHERE slug=?", (lastmod, slug))
            changed += 1
        db.execute("UPDATE memes SET image_url=? WHERE slug=?", (images.get(url), slug))
        if index % 250 == 0 or index == len(urls):
            print(f"[sitemap {index}/{len(urls)}] URLs revisadas", flush=True)
    db.commit()
    print(f"Sitemap: {new} nuevas, {changed} actualizadas, {len(images)} imágenes", flush=True)


def scrape(db, session, limit, delay):
    # Pendientes, más los que fallaron por red (los 404 no se reintentan)
    rows = db.execute("SELECT slug, url FROM memes WHERE status='pending' OR "
                      "(status='error' AND content_md IS NULL AND error != 'md 404') LIMIT ?",
                      (limit,)).fetchall()
    print(f"Descarga: {len(rows)} URLs por procesar", flush=True)
    for i, (slug, url) in enumerate(rows, 1):
        try:
            md = get(session, f"{url}/md")
            if md is None:
                db.execute("UPDATE memes SET status='error', error='md 404' WHERE slug=?", (slug,))
            else:
                title, summary = parse_md(md)
                db.execute("UPDATE memes SET title=?, summary=?, content_md=?, status='scraped', "
                           "error=NULL, scraped_at=? WHERE slug=?", (title, summary, md, now(), slug))
            print(f"[descarga {i}/{len(rows)}] {slug}", flush=True)
        except Exception as e:
            db.execute("UPDATE memes SET status='error', error=? WHERE slug=?", (str(e)[:500], slug))
            print(f"[descarga {i}/{len(rows)}] {slug} ERROR: {e}", file=sys.stderr)
        db.commit()
        time.sleep(delay)


def translate_all(db, lang, limit, delay):
    session = new_session()
    rows = db.execute("SELECT slug, summary, content_md, image_url FROM memes "
                      "WHERE status='scraped' LIMIT ?", (limit,)).fetchall()
    print(f"Traducción: {len(rows)} URLs por procesar a '{lang}'", flush=True)
    for i, (slug, summary, md, image_url) in enumerate(rows, 1):
        try:
            db.execute("UPDATE memes SET summary_tr=?, content_tr=?, lang=?, "
                       "status='translated', error=NULL, translated_at=? WHERE slug=?",
                       (translate(session, summary, lang, delay),
                        translate(session, md, lang, delay, image_url), lang, now(), slug))
            print(f"[traducción {i}/{len(rows)}] {slug}", flush=True)
        except Exception as e:
            # Se queda en 'scraped' para reintentar la traducción en la siguiente ejecución
            db.execute("UPDATE memes SET error=? WHERE slug=?", (f"traducción: {e}"[:500], slug))
            print(f"[traducción {i}/{len(rows)}] {slug} ERROR: {e}", file=sys.stderr)
        db.commit()


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--db", default="memes.db")
    p.add_argument("--lang", default="es", help="idioma destino (código ISO, ej. es, pt, fr)")
    p.add_argument("--limit", type=int, default=-1, help="máximo de memes a procesar (-1 = todos)")
    p.add_argument("--delay", type=float, default=1.0, help="segundos entre peticiones")
    p.add_argument("--no-translate", action="store_true")
    p.add_argument("--translate-only", action="store_true")
    args = p.parse_args()

    db = sqlite3.connect(args.db)
    db.executescript(SCHEMA)
    # Migración para bases creadas antes de añadir image_url
    if "image_url" not in {c[1] for c in db.execute("PRAGMA table_info(memes)")}:
        db.execute("ALTER TABLE memes ADD COLUMN image_url TEXT")
    if not args.translate_only:
        session = new_session()
        sync_sitemap(db, session)
        scrape(db, session, args.limit, args.delay)
    if not args.no_translate:
        translate_all(db, args.lang, args.limit, args.delay)

    print("\nEstado:", dict(db.execute("SELECT status, COUNT(*) FROM memes GROUP BY status").fetchall()))
    db.close()


if __name__ == "__main__":
    main()
