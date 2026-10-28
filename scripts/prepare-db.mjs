import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import Database from "better-sqlite3";
import { getVirtualEnvPython } from "./python-env.mjs";

const databasePath = process.env.MEME_DB_PATH || "./memes.db";

if (existsSync(databasePath)) {
  const db = new Database(databasePath, { readonly: true });
  const { total } = db.prepare("SELECT COUNT(*) AS total FROM memes").get();
  db.close();
  console.log(`[prepare-db] ${databasePath} existe con ${total} URLs.`);
  process.exit(0);
}

console.log(`[prepare-db] ${databasePath} no existe. Ejecutando meme_scraper.py...`);
const python = process.env.PYTHON_EXECUTABLE || (process.platform === "win32" ? "python" : "python3");
const contentColumn = process.env.MEME_CONTENT_COLUMN || "content_md";
const requestsCheck = spawnSync(python, ["-c", "import requests"], { stdio: "ignore" });
let scraperPython = python;
if (requestsCheck.status !== 0) {
  const virtualEnv = path.resolve(".python-build");
  console.log(`[prepare-db] Creando entorno virtual Python en ${virtualEnv}...`);
  const createEnvironment = spawnSync(python, ["-m", "venv", virtualEnv], { stdio: "inherit" });
  if (createEnvironment.status !== 0) {
    console.error("[prepare-db] No se pudo crear el entorno virtual de Python.");
    process.exit(createEnvironment.status || 1);
  }
  scraperPython = getVirtualEnvPython(virtualEnv);
  console.log("[prepare-db] Instalando 'requests' dentro del entorno virtual...");
  const install = spawnSync(scraperPython, ["-m", "pip", "install", "requests"], { stdio: "inherit" });
  if (install.status !== 0) process.exit(install.status || 1);
}
const args = ["meme_scraper.py", "--db", databasePath, "--delay", process.env.SCRAPER_BUILD_DELAY || "0.1"];
if (process.env.SCRAPER_BUILD_LANG) args.push("--lang", process.env.SCRAPER_BUILD_LANG);
if (contentColumn !== "content_tr" && contentColumn !== "summary_tr") args.push("--no-translate");

const result = spawnSync(scraperPython, args, { stdio: "inherit", env: process.env });
if (result.error) {
  console.error(`[prepare-db] No se pudo iniciar ${scraperPython}: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0 || !existsSync(databasePath)) {
  console.error(`[prepare-db] El scraper terminó con código ${result.status} y no preparó la base.`);
  process.exit(result.status || 1);
}
console.log(`[prepare-db] Base creada correctamente en ${databasePath}.`);
