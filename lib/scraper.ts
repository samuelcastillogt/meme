import { spawn } from "node:child_process";
import path from "node:path";
import {
  appendScraperJobOutput,
  createScraperJob,
  finishScraperJob,
  setScraperJobPid,
} from "./db";

export type ScraperMode = "full" | "scrape" | "translate";
export type ScraperOptions = { mode: ScraperMode; lang: string; limit: number };

export function buildScraperArgs(options: ScraperOptions, databasePath: string, scriptPath: string) {
  if (!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(options.lang)) throw new Error("Idioma inválido");
  if (!Number.isInteger(options.limit) || options.limit === 0 || options.limit < -1 || options.limit > 10000) {
    throw new Error("Límite inválido");
  }

  const args = [scriptPath, "--db", databasePath, "--lang", options.lang, "--limit", String(options.limit)];
  if (options.mode === "scrape") args.push("--no-translate");
  if (options.mode === "translate") args.push("--translate-only");
  return args;
}

export function startScraper(options: ScraperOptions) {
  const databasePath = path.resolve(/* turbopackIgnore: true */ process.env.MEME_DB_PATH ?? "./memes.db");
  const scriptPath = path.join(process.cwd(), "meme_scraper.py");
  const args = buildScraperArgs(options, databasePath, scriptPath);
  const jobId = createScraperJob(options.mode, options.lang, options.limit);
  const child = spawn(/* turbopackIgnore: true */ process.env.PYTHON_EXECUTABLE || "python", args, {
    cwd: process.cwd(),
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let spawnFailed = false;

  setScraperJobPid(jobId, child.pid);
  child.stdout.on("data", (chunk: Buffer) => appendScraperJobOutput(jobId, chunk.toString("utf8")));
  child.stderr.on("data", (chunk: Buffer) => appendScraperJobOutput(jobId, chunk.toString("utf8")));
  child.on("error", (error) => {
    spawnFailed = true;
    appendScraperJobOutput(jobId, `\nNo se pudo iniciar Python: ${error.message}\n`);
    finishScraperJob(jobId, "failed");
  });
  child.on("close", (code) => {
    if (spawnFailed) return;
    appendScraperJobOutput(jobId, `\nProceso finalizado con código ${code ?? "desconocido"}.\n`);
    finishScraperJob(jobId, code === 0 ? "completed" : "failed");
  });

  return jobId;
}
