import { copyFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

type Options = {
  configuredPath: string;
  cwd?: string;
  isVercel?: boolean;
  tempDirectory?: string;
  exists?: (file: string) => boolean;
  copyFile?: (source: string, destination: string) => void;
};

export function prepareDatabasePath({
  configuredPath,
  cwd = process.cwd(),
  isVercel = Boolean(process.env.VERCEL),
  tempDirectory = tmpdir(),
  exists = existsSync,
  copyFile = copyFileSync,
}: Options) {
  const source = path.resolve(/* turbopackIgnore: true */ cwd, configuredPath);
  if (!isVercel) return source;

  const destination = path.resolve(tempDirectory, "memes.db");
  if (exists(destination)) return destination;
  if (!exists(source)) {
    throw new Error("memes.db no fue incluida en el deployment. Revisa el paso prepare-db del build.");
  }
  copyFile(source, destination);
  return destination;
}
