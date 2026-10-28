import { describe, expect, it } from "vitest";
import { buildScraperArgs } from "./scraper";

describe("buildScraperArgs", () => {
  it("builds a limited translation job", () => {
    expect(buildScraperArgs({ mode: "translate", lang: "es", limit: 10 }, "memes.db", "meme_scraper.py")).toEqual([
      "meme_scraper.py", "--db", "memes.db", "--lang", "es", "--limit", "10", "--translate-only",
    ]);
  });

  it("builds a scrape-only job", () => {
    expect(buildScraperArgs({ mode: "scrape", lang: "pt", limit: -1 }, "data.db", "scraper.py")).toEqual([
      "scraper.py", "--db", "data.db", "--lang", "pt", "--limit", "-1", "--no-translate",
    ]);
  });

  it("rejects invalid input instead of passing it to Python", () => {
    expect(() => buildScraperArgs({ mode: "full", lang: "es; rm", limit: 1 }, "db", "script")).toThrow("Idioma inválido");
    expect(() => buildScraperArgs({ mode: "full", lang: "es", limit: 0 }, "db", "script")).toThrow("Límite inválido");
  });
});
