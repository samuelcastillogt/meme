import Database from "better-sqlite3";
import { getContentColumn, type ContentColumn } from "./content-column";
import { prepareDatabasePath } from "./database-path";

export type Meme = {
  slug: string;
  url: string;
  title: string;
  summary: string;
  summaryTr: string;
  contentMd: string;
  contentTr: string;
  status: string;
  lang: string | null;
  views: number;
  lastmod: string | null;
};

export type ScraperJob = {
  id: number;
  mode: string;
  lang: string;
  limit: number;
  status: "running" | "completed" | "failed";
  pid: number | null;
  output: string;
  startedAt: string;
  finishedAt: string | null;
};

type MemeRow = {
  slug: string;
  url: string;
  title: string | null;
  summary: string | null;
  summary_tr: string | null;
  content_md: string | null;
  content_tr: string | null;
  status: string;
  lang: string | null;
  views: number;
  lastmod: string | null;
};

const connections = new Map<string, Database.Database>();

function getDatabase(databasePath = process.env.MEME_DB_PATH ?? "./memes.db") {
  const key = databasePath === ":memory:" ? databasePath : prepareDatabasePath({ configuredPath: databasePath });
  const existing = connections.get(key);
  if (existing) return existing;

  const db = new Database(key);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS meme_views (
      slug TEXT PRIMARY KEY,
      views INTEGER NOT NULL DEFAULT 0,
      last_viewed_at TEXT,
      FOREIGN KEY (slug) REFERENCES memes(slug) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS scraper_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mode TEXT NOT NULL,
      lang TEXT NOT NULL,
      job_limit INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      pid INTEGER,
      output TEXT NOT NULL DEFAULT '',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT
    );
  `);
  connections.set(key, db);
  return db;
}

function toMeme(row: MemeRow): Meme {
  return {
    slug: row.slug,
    url: row.url,
    title: row.title || row.slug.replaceAll("-", " "),
    summary: row.summary || "Sin resumen disponible.",
    summaryTr: row.summary_tr || "",
    contentMd: row.content_md || "",
    contentTr: row.content_tr || "",
    status: row.status,
    lang: row.lang,
    views: row.views,
    lastmod: row.lastmod,
  };
}

const SELECT_FIELDS = `
  SELECT m.slug, m.url, m.title, m.summary, m.summary_tr, m.content_md, m.content_tr, m.status, m.lang, m.lastmod,
         COALESCE(v.views, 0) AS views
  FROM memes m
  LEFT JOIN meme_views v ON v.slug = m.slug
`;

export function getMemes(databasePath?: string, limit = 24, offset = 0, column: ContentColumn = getContentColumn()): Meme[] {
  const rows = getDatabase(databasePath).prepare(`${SELECT_FIELDS}
    WHERE m.title IS NOT NULL AND m.${column} IS NOT NULL AND length(trim(m.${column})) > 0
    ORDER BY COALESCE(m.lastmod, m.scraped_at, m.translated_at) DESC, m.slug
    LIMIT ? OFFSET ?`).all(limit, offset) as MemeRow[];
  return rows.map(toMeme);
}

export function getMeme(slug: string, databasePath?: string): Meme | null {
  const row = getDatabase(databasePath).prepare(`${SELECT_FIELDS} WHERE m.slug = ?`).get(slug) as MemeRow | undefined;
  return row ? toMeme(row) : null;
}

export function getAdminMemes(databasePath?: string, limit = 50, offset = 0): Meme[] {
  const rows = getDatabase(databasePath).prepare(
    `${SELECT_FIELDS} ORDER BY views DESC, m.title LIMIT ? OFFSET ?`,
  ).all(limit, offset) as MemeRow[];
  return rows.map(toMeme);
}

export function getAdminStats(databasePath?: string) {
  return getDatabase(databasePath).prepare(`
    SELECT COUNT(m.slug) AS entries,
           COALESCE(SUM(v.views), 0) AS totalViews,
           COALESCE(MAX(v.views), 0) AS topViews
    FROM memes m
    LEFT JOIN meme_views v ON v.slug = m.slug
  `).get() as { entries: number; totalViews: number; topViews: number };
}

export function getMemeCount(databasePath?: string, column: ContentColumn = getContentColumn()): number {
  const row = getDatabase(databasePath).prepare(
    `SELECT COUNT(*) AS count FROM memes WHERE title IS NOT NULL AND ${column} IS NOT NULL AND length(trim(${column})) > 0`,
  ).get() as { count: number };
  return row.count;
}

export function recordView(slug: string, databasePath?: string) {
  getDatabase(databasePath).prepare(`
    INSERT INTO meme_views (slug, views, last_viewed_at) VALUES (?, 1, datetime('now'))
    ON CONFLICT(slug) DO UPDATE SET views = views + 1, last_viewed_at = datetime('now')
  `).run(slug);
}

export function updateMeme(
  slug: string,
  values: { title: string; summary: string; contentTr: string },
  databasePath?: string,
) {
  getDatabase(databasePath).prepare(`
    UPDATE memes SET title = ?, summary = ?, content_tr = ? WHERE slug = ?
  `).run(values.title.trim(), values.summary.trim(), values.contentTr.trim(), slug);
}

export function deleteMeme(slug: string, databasePath?: string) {
  getDatabase(databasePath).prepare("DELETE FROM memes WHERE slug = ?").run(slug);
}

export function createScraperJob(mode: string, lang: string, limit: number, databasePath?: string) {
  const result = getDatabase(databasePath).prepare(
    "INSERT INTO scraper_jobs (mode, lang, job_limit) VALUES (?, ?, ?)",
  ).run(mode, lang, limit);
  return Number(result.lastInsertRowid);
}

export function setScraperJobPid(id: number, pid: number | undefined, databasePath?: string) {
  getDatabase(databasePath).prepare("UPDATE scraper_jobs SET pid = ? WHERE id = ?").run(pid ?? null, id);
}

export function appendScraperJobOutput(id: number, output: string, databasePath?: string) {
  getDatabase(databasePath).prepare(`
    UPDATE scraper_jobs SET output = substr(output || ?, -20000) WHERE id = ?
  `).run(output, id);
}

export function finishScraperJob(id: number, status: "completed" | "failed", databasePath?: string) {
  getDatabase(databasePath).prepare(`
    UPDATE scraper_jobs SET status = ?, finished_at = datetime('now') WHERE id = ?
  `).run(status, id);
}

export function getRecentScraperJobs(databasePath?: string, limit = 5): ScraperJob[] {
  return getDatabase(databasePath).prepare(`
    SELECT id, mode, lang, job_limit AS "limit", status, pid, output,
           started_at AS startedAt, finished_at AS finishedAt
    FROM scraper_jobs ORDER BY id DESC LIMIT ?
  `).all(limit) as ScraperJob[];
}

export function closeDatabase(databasePath = process.env.MEME_DB_PATH ?? "./memes.db") {
  const key = databasePath === ":memory:" ? databasePath : prepareDatabasePath({ configuredPath: databasePath });
  connections.get(key)?.close();
  connections.delete(key);
}
