import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { prepareDatabasePath } from "./database-path";

describe("prepareDatabasePath", () => {
  it("uses the configured database directly outside Vercel", () => {
    expect(prepareDatabasePath({ configuredPath: "./memes.db", cwd: "/app", isVercel: false })).toBe(
      path.resolve("/app", "memes.db"),
    );
  });

  it("copies the packaged database to Vercel temporary storage", () => {
    const copyFile = vi.fn();
    const exists = vi.fn((file: string) => file === path.resolve("/app", "memes.db"));
    const result = prepareDatabasePath({
      configuredPath: "./memes.db",
      cwd: "/app",
      isVercel: true,
      tempDirectory: "/tmp",
      exists,
      copyFile,
    });

    expect(result).toBe(path.resolve("/tmp", "memes.db"));
    expect(copyFile).toHaveBeenCalledWith(path.resolve("/app", "memes.db"), path.resolve("/tmp", "memes.db"));
  });

  it("reports a missing packaged database clearly", () => {
    expect(() => prepareDatabasePath({
      configuredPath: "./memes.db",
      cwd: "/app",
      isVercel: true,
      exists: () => false,
      copyFile: vi.fn(),
    })).toThrow("memes.db no fue incluida");
  });
});
