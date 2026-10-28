import Database from "better-sqlite3";
import { unlinkSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, deleteMeme, getAdminMemes, getAdminStats, getMeme, recordView, updateMeme } from "./db";

const TEST_DB = "./test-memes.db";

beforeEach(() => {
  try {
    unlinkSync(TEST_DB);
  } catch {}
  const db = new Database(TEST_DB);
  db.exec(`
    CREATE TABLE memes (
      slug TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      title TEXT,
      summary TEXT,
      content_md TEXT,
      summary_tr TEXT,
      content_tr TEXT,
      status TEXT NOT NULL DEFAULT 'translated',
      lastmod TEXT,
      lang TEXT,
      error TEXT,
      scraped_at TEXT,
      translated_at TEXT
    );
    INSERT INTO memes (slug, url, title, summary, content_tr)
    VALUES ('distracted-boyfriend', 'https://example.com', 'Distracted Boyfriend', 'English summary', '# Título traducido');
  `);
  db.close();
});

afterEach(() => {
  closeDatabase(TEST_DB);
  try {
    unlinkSync(TEST_DB);
  } catch {}
});

describe("meme database", () => {
  it("records and aggregates post visits", () => {
    recordView("distracted-boyfriend", TEST_DB);
    recordView("distracted-boyfriend", TEST_DB);

    expect(getMeme("distracted-boyfriend", TEST_DB)?.views).toBe(2);
    expect(getAdminMemes(TEST_DB)[0].views).toBe(2);
    expect(getAdminStats(TEST_DB)).toEqual({ entries: 1, totalViews: 2, topViews: 2 });
  });

  it("edits fields owned by the administrator", () => {
    updateMeme("distracted-boyfriend", {
      title: "Nuevo título",
      summary: "Nuevo resumen",
      contentTr: "# Contenido nuevo",
    }, TEST_DB);

    expect(getMeme("distracted-boyfriend", TEST_DB)).toMatchObject({
      title: "Nuevo título",
      summary: "Nuevo resumen",
      contentTr: "# Contenido nuevo",
    });
  });

  it("deletes a meme and its visit history", () => {
    recordView("distracted-boyfriend", TEST_DB);
    deleteMeme("distracted-boyfriend", TEST_DB);

    expect(getMeme("distracted-boyfriend", TEST_DB)).toBeNull();
    expect(getAdminMemes(TEST_DB)).toHaveLength(0);
  });
});
