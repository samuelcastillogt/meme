import { describe, expect, it } from "vitest";
import { getBuildScraperLimit, getVirtualEnvPython } from "./python-env.mjs";

describe("getVirtualEnvPython", () => {
  it("uses the POSIX virtual environment interpreter", () => {
    expect(getVirtualEnvPython("/build/.python-build", "linux")).toBe("/build/.python-build/bin/python");
  });

  it("uses the Windows virtual environment interpreter", () => {
    expect(getVirtualEnvPython("C:\\build\\.python-build", "win32")).toBe(
      "C:\\build\\.python-build\\Scripts\\python.exe",
    );
  });
});

describe("getBuildScraperLimit", () => {
  it("limits Vercel fallback builds to 100 posts", () => {
    expect(getBuildScraperLimit(undefined, true)).toBe("100");
  });

  it("respects an explicit limit", () => {
    expect(getBuildScraperLimit("25", true)).toBe("25");
  });

  it("keeps unlimited processing outside Vercel", () => {
    expect(getBuildScraperLimit(undefined, false)).toBe("-1");
  });
});
