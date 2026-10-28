import { describe, expect, it } from "vitest";
import { getContentColumn, getPostContent } from "./content-column";

describe("getContentColumn", () => {
  it("uses content_md when the environment value is missing", () => {
    expect(getContentColumn(undefined)).toBe("content_md");
  });

  it("accepts a configured content column", () => {
    expect(getContentColumn("content_tr")).toBe("content_tr");
    expect(getContentColumn("summary")).toBe("summary");
  });

  it("rejects values that are not content columns", () => {
    expect(() => getContentColumn("title; DROP TABLE memes")).toThrow("MEME_CONTENT_COLUMN");
  });

  it("reads the selected value from a post", () => {
    const post = { summary: "Summary", summaryTr: "Resumen", contentMd: "# English", contentTr: "# Español" };
    expect(getPostContent(post, "content_md")).toBe("# English");
    expect(getPostContent(post, "summary_tr")).toBe("Resumen");
  });
});
