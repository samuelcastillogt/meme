import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingIncludes: {
    "/*": ["./memes.db", "./meme_scraper.py"],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
