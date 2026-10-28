import path from "node:path";

export function getVirtualEnvPython(directory, platform = process.platform) {
  return platform === "win32"
    ? path.win32.join(directory, "Scripts", "python.exe")
    : path.posix.join(directory, "bin", "python");
}

export function getBuildScraperLimit(configuredLimit, isVercel = Boolean(process.env.VERCEL)) {
  return configuredLimit || (isVercel ? "100" : "-1");
}
