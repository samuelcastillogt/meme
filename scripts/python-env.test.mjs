import { describe, expect, it } from "vitest";
import { getVirtualEnvPython } from "./python-env.mjs";

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
